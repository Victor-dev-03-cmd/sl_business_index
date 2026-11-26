import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MARKETING_STUDIO_APPS} from '../lib/marketing/studio-apps.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const layout=read('app/vendor/layout.tsx');
const icons=read('app/vendor/components/IconsaxIcon.tsx');
const dashboard=read('app/vendor/dashboard/page.tsx');
const quick=read('app/vendor/components/VendorQuickActions.tsx');
const store=read('app/vendor/marketing/components/MarketingAppStore.tsx');

test('Iconsax Bulk is the common owner portal default, not a remote icon CDN',()=>{
  assert.match(icons,/variant = 'bulk'/);
  assert.match(icons,/import\('iconsax'\)/);
  assert.match(icons,/Fallback size=\{size\}/);
  assert.match(icons,/MutationObserver/);
  assert.match(layout,/name=\{item.icon\} size=\{mobile\?19:18\} variant="bulk"/);
  assert.match(layout,/name=\{item.icon\} size=\{18\} variant="bulk"|name=\{item.icon\} size=\{18\}/);
  assert.match(dashboard,/name=\{kpi.icon\} variant="bulk"/);
  assert.match(store,/name=\{app.icon\} size=\{33\} variant="bulk"/);
  assert.match(quick,/IconsaxIcon name=\{item.icon\}/);
  assert.doesNotMatch(layout,/from 'lucide-react'/);
});

test('Marketing Studio has twelve unique real links from the existing app inventory',()=>{
  assert.equal(MARKETING_STUDIO_APPS.length,12);
  assert.equal(new Set(MARKETING_STUDIO_APPS.map(app=>app.id)).size,12);
  assert.equal(new Set(MARKETING_STUDIO_APPS.map(app=>app.href)).size,12);
  assert.match(layout,/import \{MARKETING_STUDIO_APPS\} from '@\/lib\/marketing\/studio-apps'/);
  assert.match(layout,/MARKETING_STUDIO_APPS\.map\(app=><Link/);
  assert.match(layout,/href=\{app.href\} prefetch=\{false\}/);
  assert.match(layout,/href="\/vendor\/marketing"/);
  assert.match(layout,/name:'Marketing Studio',href:'\/vendor\/marketing'/);
  assert.ok(MARKETING_STUDIO_APPS.every(app=>app.href.startsWith('/vendor/')));
});

test('Sidebar and mobile drawer both expose toggleable keyboard-accessible app navigation',()=>{
  assert.match(layout,/const \[marketingExpanded,setMarketingExpanded\]=useState\(false\)/);
  assert.match(layout,/aria-expanded=\{expanded\}/);
  assert.match(layout,/aria-controls=\{compact\?undefined:panelId\}/);
  assert.match(layout,/vendor-marketing-apps-mobile/);
  assert.match(layout,/vendor-marketing-apps-desktop/);
  assert.match(layout,/if\(compact\)\{setSidebarCollapsed\(false\);setMarketingExpanded\(true\)\}/);
  assert.match(layout,/setMarketingExpanded\(open=>!open\)/);
  assert.match(layout,/setMarketingExpanded\(false\)/);
  assert.match(layout,/onClick=\{\(\)=>mobile&&setMobileOpen\(false\)\}/);
  assert.match(layout,/aria-current=\{pathname===app.href\?'page':undefined\}/);
  assert.match(layout,/min-h-11/);
  assert.match(layout,/sideSections\(sidebarCollapsed\)/);
  assert.match(layout,/sideSections\(false,true\)/);
  assert.match(layout,/role="dialog" aria-modal="true"/);
  assert.doesNotMatch(layout,/window\.location\.href/);
});

test('Twelve apps remain routes only; display and icons never grant provider permissions',()=>{
  assert.match(layout,/destination layouts continue to enforce plan\/owner access/);
  assert.doesNotMatch(layout,/setProEnabled\(|grantMarketingAccess\(|marketing_studio_app_rollouts.*update/);
  assert.match(store,/launchStatus===\x27live\x27/);
  assert.match(store,/Coming soon/);
  assert.match(read('app/vendor/marketing-engine/(pro)/layout.tsx'),/MarketingProOnly/);
});
