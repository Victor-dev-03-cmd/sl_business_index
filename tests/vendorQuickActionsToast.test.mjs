import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const layout = read('app/vendor/layout.tsx');
const dialog = read('app/vendor/components/VendorQuickActions.tsx');
const dashboard = read('app/vendor/dashboard/page.tsx');

test('Search and Quick Actions share a working opening handler and do not close on mount', () => {
  assert.match(layout, /aria-label="Search actions and tools"/);
  assert.match(layout, /aria-label="Open quick actions"/);
  assert.match(layout, /setQuickOpen\(true\)/);
  assert.match(layout, /quickOpen&&<VendorQuickActions open=\{quickOpen\}/);
  assert.doesNotMatch(dialog, /useEffect\(\(\)=>\{if\(open\)onClose\(\)\},\[pathname\]\)/);
  assert.match(layout, /setQuickOpen\(false\);\},\[pathname\]/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /inputRef\.current\?\.focus\(\)/);
  assert.match(dialog, /onClose\(\)/);
});

test('Vendor dashboard action feedback uses the dedicated elevated toast layer', () => {
  assert.match(layout, /<Toaster[\s\S]*?id="vendor-portal"/);
  assert.match(layout, /position="top-right"/);
  assert.match(layout, /borderLeft: '3px solid #FF7900'/);
  assert.match(dashboard, /toast\.success\(business\.is_open \? 'Business marked as closed'/);
  assert.match(dashboard, /toast\.error\('Update failed'/);
  assert.match(dashboard, /toast\.success\('Dashboard refreshed'/);
  assert.match(dashboard, /toast\.success\('Report download started'/);
  assert.match(dashboard, /toasterId: 'vendor-portal'/);
  assert.match(dashboard, /onClick=\{\(\)=>void load\(true\)\}/);
});
