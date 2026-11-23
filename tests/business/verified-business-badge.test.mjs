import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('verified business displays a blue seal with an interior white check, not a shield', () => {
  const badge = read('app/components/VerifiedBadge.tsx');
  const detail = read('app/business/[slug]/BusinessDetailsClient.tsx');

  assert.match(badge, /<svg viewBox="0 0 24 24"/);
  assert.match(badge, /fill="#1685F5"/);
  assert.match(badge, /stroke="#FFFFFF"/);
  assert.match(badge, /strokeLinecap="round"/);
  assert.match(badge, /aria-hidden="true"/);

  assert.doesNotMatch(detail, /ShieldCheck/);
  assert.match(detail, /\{verified&&<div[^>]*><VerifiedBadge size=\{15\}\/> <span>Verified Business<\/span><\/div>\}/);
  assert.match(detail, /business\.status === "approved" && business\.can_show_badge === true/);
  assert.match(detail, /business\.is_registered&&!verified&&<p[^>]*><Building2/);
});
