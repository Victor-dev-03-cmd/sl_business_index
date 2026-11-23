#!/usr/bin/env bash
# Owner-only encrypted copy. No credentials/decryption. Never run with production data in CI.
set -euo pipefail
set +x
umask 077
fail(){ printf 'BLOCKED: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 3 && ( "$1" == --verify || "$1" == --copy ) ]] || fail 'Usage: --verify SOURCE COPY_DIR | --copy SOURCE EXTERNAL_MOUNT_ROOT'
mode=$1
for cmd in realpath stat sha256sum cmp grep sed mountpoint findmnt lsblk cp mv mktemp git; do
  command -v "$cmd" >/dev/null || fail "Missing tool: $cmd"
done
src=$(realpath -e -- "$2") || fail 'Source does not exist'
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
[[ -d "$src" && ! -L "$2" && -O "$src" && "$(stat -c %a "$src")" == 700 ]] || fail 'Source directory must be owner-only 0700, without symlink'
[[ "$src" != "$repo" && "$src" != "$repo/"* ]] || fail 'Source must be outside git checkout'
verify_archive(){
  local dir=$1 line expected size
  [[ -d "$dir" && -O "$dir" && "$(stat -c %a "$dir")" == 700 ]] || fail 'Copy directory must be owner-only 0700'
  for name in database.dump.gpg SHA256SUMS evidence.txt; do
    [[ -f "$dir/$name" && ! -L "$dir/$name" && -O "$dir/$name" && "$(stat -c %a "$dir/$name")" == 600 ]] || fail "Unsafe backup file: $name"
  done
  line=$(cat -- "$dir/SHA256SUMS")
  [[ "$line" =~ ^[a-f0-9]{64}[[:space:]][[:space:]]database\.dump\.gpg$ ]] || fail 'Unexpected SHA manifest'
  expected=$(printf '%s\n' "$line" | cut -d' ' -f1)
  [[ "$(sha256sum -- "$dir/database.dump.gpg" | cut -d' ' -f1)" == "$expected" ]] || fail 'Encrypted archive checksum mismatch'
  grep -Fxq 'project_ref=oofxhragafekazwjikae' "$dir/evidence.txt" || fail 'Wrong project ref'
  grep -Fxq "encrypted_sha256=$expected" "$dir/evidence.txt" || fail 'Evidence checksum mismatch'
  size=$(sed -n 's/^encrypted_bytes=//p' "$dir/evidence.txt")
  [[ "$size" =~ ^[0-9]+$ && "$size" == "$(stat -c %s "$dir/database.dump.gpg")" ]] || fail 'Evidence archive size mismatch'
}
verify_copy(){
  local copy=$1
  [[ ! -L "$copy" ]] || fail 'Symlink copy directory denied'
  verify_archive "$copy"
  cmp -s "$src/SHA256SUMS" "$copy/SHA256SUMS" || fail 'Copied manifest differs'
  cmp -s "$src/evidence.txt" "$copy/evidence.txt" || fail 'Copied evidence differs'
}
verify_archive "$src"
if [[ "$mode" == --verify ]]; then
  copy=$(realpath -e -- "$3") || fail 'Copy directory missing'
  [[ "$src" != "$copy" ]] || fail 'A copy cannot equal source'
  verify_copy "$copy"
  echo 'COPY_BYTES_VERIFIED (independent physical storage not attested by verify-only)'
  exit 0
fi

[[ -t 0 && -t 1 ]] || fail 'Interactive owner terminal required'
root=$(realpath -e -- "$3") || fail 'Destination not found'
[[ -d "$root" && ! -L "$3" && -O "$root" ]] || fail 'External destination must be owner-controlled'
[[ "$root" != "$repo" && "$root" != "$repo/"* ]] || fail 'Destination must be outside git'
mountpoint -q -- "$root" || fail 'Destination must be mounted external filesystem root'
[[ "$(stat -c %d "$src")" != "$(stat -c %d "$root")" ]] || fail 'Destination is on same filesystem'
src_dev=$(findmnt -n -o SOURCE -T "$src")
dst_dev=$(findmnt -n -o SOURCE -T "$root")
[[ "$src_dev" == /dev/* && "$dst_dev" == /dev/* ]] || fail 'Cannot identify independent physical block devices'
# Follow the entire single-parent block-device chain, including LUKS/dm mappings.
# Unknown or multi-parent LVM/RAID topologies are blocked for separate manual review.
physical_disk(){
  local dev=$1 parents next kind i=0
  [[ -b "$dev" ]] || fail 'Backing filesystem device is not a block device'
  while (( i < 12 )); do
    parents=$(lsblk -n -o PKNAME "$dev" | sed '/^[[:space:]]*$/d')
    if [[ -z "$parents" ]]; then
      kind=$(lsblk -ndo TYPE "$dev")
      [[ "$kind" == disk ]] || fail 'Backing device is loop/virtual/unknown, not proven separate physical disk'
      printf '%s\n' "$(basename "$dev")"
      return 0
    fi
    [[ "$parents" != *
printf 'Source disk %s; destination disk %s. Confirm secure independently controlled storage; type COPY: ' "$src_disk" "$dst_disk"
read -r confirm
[[ "$confirm" == COPY ]] || fail 'Cancelled'
base=$(basename "$src")
[[ "$base" =~ ^slbi-[0-9]{8}T[0-9]{6}Z-[[:alnum:]]+$ ]] || fail 'Unexpected backup directory name'
copies="$root/slbi-encrypted-copies"
if [[ ! -e "$copies" ]]; then mkdir -m 700 -- "$copies"; fi
[[ -d "$copies" && ! -L "$copies" && -O "$copies" && "$(stat -c %a "$copies")" == 700 ]] || fail 'Destination folder must be owner-only 0700'
target="$copies/$base"
[[ ! -e "$target" && ! -L "$target" ]] || fail 'Copy exists: never overwrite verified backup'
tmp=$(mktemp -d "$copies/.partial.XXXXXXXX")
cleanup(){ if [[ -n "$tmp" && -d "$tmp" ]]; then rm -f -- "$tmp/database.dump.gpg" "$tmp/SHA256SUMS" "$tmp/evidence.txt"; rmdir -- "$tmp" || true; fi; }
trap cleanup EXIT
cp -- "$src/database.dump.gpg" "$src/SHA256SUMS" "$src/evidence.txt" "$tmp/"
chmod 600 -- "$tmp/database.dump.gpg" "$tmp/SHA256SUMS" "$tmp/evidence.txt"
verify_copy "$tmp"
mv -- "$tmp" "$target"
tmp=''
echo 'COPY_VERIFIED_SEPARATE_PHYSICAL_DRIVE (owner-attested, keep medium disconnected)'
\n'* ]] || fail 'Ambiguous multi-parent block device'
    next=$(printf '%s' "$parents" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [[ "$next" =~ ^[[:alnum:]_.-]+$ && -b "/dev/$next" ]] || fail 'Unresolvable physical device ancestry'
    dev="/dev/$next"
    i=$((i+1))
  done
  fail 'Block device ancestry exceeded safe depth'
}
src_disk=$(physical_disk "$src_dev")
dst_disk=$(physical_disk "$dst_dev")
[[ "$src_disk" != "$dst_disk" ]] || fail 'Source and backup resolve to the same physical device'
printf 'Source disk %s; destination disk %s. Confirm secure independently controlled storage; type COPY: ' "$src_disk" "$dst_disk"
read -r confirm
[[ "$confirm" == COPY ]] || fail 'Cancelled'
base=$(basename "$src")
[[ "$base" =~ ^slbi-[0-9]{8}T[0-9]{6}Z-[[:alnum:]]+$ ]] || fail 'Unexpected backup directory name'
copies="$root/slbi-encrypted-copies"
if [[ ! -e "$copies" ]]; then mkdir -m 700 -- "$copies"; fi
[[ -d "$copies" && ! -L "$copies" && -O "$copies" && "$(stat -c %a "$copies")" == 700 ]] || fail 'Destination folder must be owner-only 0700'
target="$copies/$base"
[[ ! -e "$target" && ! -L "$target" ]] || fail 'Copy exists: never overwrite verified backup'
tmp=$(mktemp -d "$copies/.partial.XXXXXXXX")
cleanup(){ if [[ -n "$tmp" && -d "$tmp" ]]; then rm -f -- "$tmp/database.dump.gpg" "$tmp/SHA256SUMS" "$tmp/evidence.txt"; rmdir -- "$tmp" || true; fi; }
trap cleanup EXIT
cp -- "$src/database.dump.gpg" "$src/SHA256SUMS" "$src/evidence.txt" "$tmp/"
chmod 600 -- "$tmp/database.dump.gpg" "$tmp/SHA256SUMS" "$tmp/evidence.txt"
verify_copy "$tmp"
mv -- "$tmp" "$target"
tmp=''
echo 'COPY_VERIFIED_SEPARATE_PHYSICAL_DRIVE (owner-attested, keep medium disconnected)'
