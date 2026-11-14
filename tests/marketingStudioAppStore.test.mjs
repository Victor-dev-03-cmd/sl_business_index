import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  MARKETING_STUDIO_APPS,MARKETING_STUDIO_CATEGORIES,filterMarketingStudioApps,
} from '../lib/marketing/studio-apps.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Marketing Studio offers searchable, categorized distinct first-party apps',()=>{
  assert.equal(MARKETING_STUDIO_APPS.length,12);
  assert.deepEqual(new Set(MARKETING_STUDIO_APPS.map(x=>x.id)).size,12);
  assert.deepEqual(new Set(MARKETING_STUDIO_APPS.map(x=>x.href)).size,12);
  assert.ok(MARKETING_STUDIO_CATEGORIES.includes('All apps'));
  assert.deepEqual(filterMarketingStudioApps(MARKETING_STUDIO_APPS,'email','All apps')
    .filter(x=>x.id==='email-marketing').map(x=>x.href),['/vendor/marketing-engine/email']);
  assert.deepEqual(filterMarketingStudioApps(MARKETING_STUDIO_APPS,'poster','Content')
    .map(x=>x.id),['poster-editor']);
  assert.equal(filterMarketingStudioApps(MARKETING_STUDIO_APPS,'','Plugins').length,1);
  assert.equal(filterMarketingStudioApps(MARKETING_STUDIO_APPS,'UNLIKELY_MATCH_945','All apps').length,0);
  assert.ok(MARKETING_STUDIO_APPS.every(x=>x.href.startsWith('/vendor/')));
});
test('Pro entrypoints are never mistaken for already connected provider actions',()=>{
  const apps=MARKETING_STUDIO_APPS;
  assert.deepEqual(apps.filter(x=>!x.pro).map(x=>x.id).sort(),['campaign-planner','leads-crm']);
  assert.equal(apps.filter(x=>x.pro).length,10);
  for(const id of ['social-marketing','email-marketing','voice-agent','plugin-connectors','workflow-automation']){
    const app=apps.find(x=>x.id===id);
    assert.ok(app?.pro);
    assert.notEqual(app.availability,'working');
  }
  assert.ok(apps.some(x=>x.id==='poster-editor'&&x.pro&&x.availability==='working'));
  assert.match(read('app/vendor/marketing-engine/(pro)/layout.tsx'),/MarketingProOnly/);
  assert.match(read('lib/marketing/pro-access-server.ts'),/getMarketingAccessForUser/);
  assert.match(read('app/vendor/marketing/campaigns/layout.tsx'),/ManualCampaignsLayout/);
});
test('Only Marketing Studio appears in top navigation and legacy engine hubs redirect safely',()=>{
  const nav=read('app/vendor/layout.tsx');
  const studio=read('app/vendor/marketing/page.tsx');
  const ui=read('app/vendor/marketing/components/MarketingAppStore.tsx');
  assert.match(nav,/name:'Marketing Studio',href:'\/vendor\/marketing'/);
  assert.doesNotMatch(nav,/name:'Marketing Engine',href:'\/vendor\/marketing-engine'/);
  assert.match(nav,/pathname\.startsWith\('\/vendor\/marketing-engine\/'\)/);
  assert.match(read('app/vendor/marketing-engine/page.tsx'),/redirect\('\/vendor\/marketing'\)/);
  assert.match(read('app/vendor/marketing/engine/page.tsx'),/redirect\('\/vendor\/marketing'\)/);
  assert.match(studio,/MarketingAppStore/);
  assert.match(studio,/bg-\[#1D1D20\]/);
  assert.match(studio,/text-white/);
  assert.match(ui,/type="search"/);
  assert.match(ui,/aria-pressed=\{category===option\}/);
  assert.match(ui,/role="status" aria-live="polite"/);
  assert.match(ui,/href=\{app\.href\}/);
  assert.match(ui,/launchStatus===\x27live\x27/);
  assert.match(ui,/Coming soon/);
  assert.match(ui,/return <article/);
  assert.match(studio,/marketing_studio_app_rollouts/);
  assert.match(studio,/launchStatuses=\{launchStatuses\}/);
  assert.match(ui,/MARKETING_STUDIO_APPS\.map|filtered\.map/);
  assert.doesNotMatch(ui,/installPlugin|connected:true|autoPublish|sendEmail\(/);
});
