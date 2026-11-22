#!/usr/bin/env bash
# Owner workstation only. Never run in CI or upload archive/credentials.
set -euo pipefail
set +x
umask 077
fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ $# == 2 ]] || fail "Usage: bash scripts/g0/manual-db-backup.sh <database-host> <private-backup-directory>"
[[ -t 0 && -t 1 ]] || fail "Interactive trusted workstation required"
ref=oofxhragafekazwjikae
host=$1
case "$host" in
  "db.$ref.supabase.co") user=postgres ;;
  *.pooler.supabase.com) user="postgres.$ref" ;;
  *) fail "Use the exact direct or session-pooler host shown in Supabase Connect" ;;
esac
for cmd in psql pg_dump pg_restore gpg sha256sum realpath stat mktemp git; do
  command -v "$cmd" >/dev/null || fail "Missing command: $cmd"
done
for cmd in pg_dump pg_restore; do
  version=$("$cmd" --version | awk '{print $NF}' | cut -d. -f1)
  [[ "$version" == 17 ]] || fail "Use PostgreSQL 17 client tools"
done
[[ -n "${PGSSLROOTCERT:-}" && -f "$PGSSLROOTCERT" ]] || fail "Set PGSSLROOTCERT to the trusted CA file from Supabase"
ca=$(realpath "$PGSSLROOTCERT")
pass=$(realpath "${PGPASSFILE:-$HOME/.pgpass}")
[[ -f "$pass" && $(stat -c %a "$pass") == 600 && -O "$pass" ]] || fail "Use owner-only 0600 .pgpass; never pass passwords on the command line"
repo=$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)
out=$(realpath -m "$2")
[[ "$out" != "$repo" && "$out" != "$repo/"* ]] || fail "Backup directory must be outside the repository"
mkdir -p -- "$out"
[[ -d "$out" && -O "$out" && $(stat -c %a "$out") == 700 ]] || fail "Backup directory must be owner-only mode 0700"
unset PGPASSWORD PGSERVICE PGSERVICEFILE PGHOSTADDR PGOPTIONS PGCLIENTENCODING
export PGSSLROOTCERT="$ca" PGPASSFILE="$pass" PGSSLMODE=verify-full PGCONNECT_TIMEOUT=15
export GPG_TTY
GPG_TTY=$(tty)
conn=(--host="$host" --port=5432 --username="$user" --dbname=postgres --no-password)
[[ $(psql -X -At -v ON_ERROR_STOP=1 "${conn[@]}" -c "select current_setting('server_version_num')::integer / 10000") == 17 ]] || fail "Unexpected server version or connection failure"
read -r -p "Confirm dashboard host belongs to SLBusinessIndex production ($ref); type BACKUP: " answer
[[ "$answer" == BACKUP ]] || fail "Cancelled"
started=$(date -u +%FT%TZ)
dir=$(mktemp -d -- "$out/slbi-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXXXX")
partial="$dir/database.dump.gpg.partial"
trap 'rm -f -- "$partial"' EXIT
# Single logical database snapshot. No plaintext dump on disk.
pg_dump "${conn[@]}" --format=custom --lock-wait-timeout=5s |
  gpg --no-symkey-cache --symmetric --cipher-algo AES256 --output "$partial"
# Decode all archive contents offline; this is NOT a successful database restore.
gpg --no-symkey-cache --decrypt "$partial" | pg_restore --exit-on-error --file=/dev/null
mv -- "$partial" "$dir/database.dump.gpg"
(
  cd "$dir"
  sha256sum database.dump.gpg > SHA256SUMS
  sha256sum -c SHA256SUMS
)
{
  printf 'project_ref=%s\nstarted_utc=%s\nfinished_utc=%s\n' "$ref" "$started" "$(date -u +%FT%TZ)"
  printf 'scope=postgres logical custom-format archive; not cluster globals or storage objects\n'
  printf 'cipher=AES256 encrypted GPG archive\narchive_decode=pass\n'
  printf 'encrypted_bytes=%s\n' "$(stat -c %s "$dir/database.dump.gpg")"
  printf 'encrypted_sha256=%s\n' "$(cut -d' ' -f1 "$dir/SHA256SUMS")"
  printf 'isolated_restore=NOT_RUN\nrelease_gate=BLOCKED\n'
} > "$dir/evidence.txt"
printf 'Encrypted backup and local evidence saved in %s\n' "$dir"
printf 'Keep a separate encrypted copy; only share evidence metadata, never the archive, passphrase, credentials or customer rows.\n'
