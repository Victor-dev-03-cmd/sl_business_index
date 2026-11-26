import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

const analytics=read('app/vendor/insights/page.tsx');
const globals=read('app/globals.css');
const root=read('app/layout.tsx');
const legalShell=read('app/components/LegalPageShell.tsx');
const legalCss=read('app/legal-dark-theme.css');
const privacy=read('app/privacy-policy/page.tsx');
const terms=read('app/terms-of-service/page.tsx');

test('Analytics filter controls align in a real responsive grid; metadata is a separate row',()=>{
  assert.match(analytics,/data-testid="vendor-analytics-filters"/);
  assert.match(analytics,/grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-/);
  assert.match(analytics,/lg:grid-cols-\[minmax\(0,1fr\)_220px\]/);
  assert.match(analytics,/htmlFor="analytics-business-select"/);
  assert.match(analytics,/id="analytics-business-select"/);
  assert.match(analytics,/htmlFor="analytics-period-select"/);
  assert.match(analytics,/id="analytics-period-select"/);
  assert.match(analytics,/border-t border-\[#F0ECEA\] pt-3/);
  assert.match(analytics,/Owner-scoped · RLS protected/);
  assert.match(analytics,/Equal rolling windows · Snapshot/);
  assert.doesNotMatch(analytics,/flex flex-wrap items-center gap-3 p-4/);
  assert.match(analytics,/\.eq\('owner_id', user\.id\)/);
  assert.match(analytics,/INSIGHT_MAX_ROWS/);
});

test('Site-wide native single selects reserve inset text clearance and a consistent chevron',()=>{
  assert.match(globals,/SLBI SELECT CONTROL CONTRACT/);
  assert.match(globals,/select:not\(\[multiple\]\):not\(\[size\]\):not\(\.appearance-none\):not\(\[data-slbi-custom-arrow\]\)/);
  assert.match(globals,/padding-inline-end: 48px !important/);
  assert.match(globals,/background-position: right 16px center !important/);
  assert.match(globals,/background-repeat: no-repeat !important/);
  assert.match(globals,/-webkit-appearance: none !important/);
  assert.match(globals,/html\[data-slbi-theme="dark"\] select:not/);
  assert.doesNotMatch(globals,/select\s*\{\s*appearance: none !important/);
});

test('Privacy and Terms share a scoped legal dark appearance; light mode and content remain unchanged',()=>{
  assert.match(privacy,/LegalPageShell kind="privacy"/);
  assert.match(terms,/LegalPageShell kind="terms"/);
  assert.match(legalShell,/data-slbi-legal-page=\{kind\}/);
  assert.match(legalShell,/data-slbi-legal-hero/);
  assert.match(legalShell,/data-slbi-legal-announcement/);
  assert.match(legalShell,/data-slbi-legal-nav/);
  assert.match(legalShell,/data-slbi-legal-content/);
  assert.match(legalShell,/legal-vector h-auto w-full/);
  assert.match(root,/import "\.\/legal-dark-theme\.css"/);
  assert.match(legalCss,/html\[data-slbi-theme="dark"\] body \[data-slbi-legal-page\]/);
  assert.match(legalCss,/\[data-slbi-legal-hero\] \{/);
  assert.match(legalCss,/\[data-slbi-legal-announcement\] \{/);
  assert.match(legalCss,/\[data-slbi-legal-content\] h2/);
  assert.match(legalCss,/\.legal-vector > rect/);
  assert.match(legalCss,/background: radial-gradient/);
  assert.doesNotMatch(legalCss,/^\s*html:not\(/m);
  assert.match(privacy,/effectiveDate="March 25, 2026"/);
  assert.match(terms,/effectiveDate="March 25, 2026"/);
});
