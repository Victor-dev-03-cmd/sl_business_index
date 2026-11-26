import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Only the verified owner identity and existing trusted QA grant unlock owner Studio routes',()=>{
 const guard=read('lib/marketing/pro-access-server.ts');
 const identity=read('lib/marketing/owner-studio-identity.ts');
 assert.match(guard,/import 'server-only'/);
 assert.match(identity,/import 'server-only'/);
 assert.match(guard,/auth\.getUser\(\)/);
 assert.match(guard,/identity\.user\?\.id===userId/);
 assert.match(guard,/payment_reference==='SLBI_INTERNAL_QA_NO_PAYMENT_20261114'/);
 assert.match(guard,/isApprovedOwnerStudioIdentity\(identity\.user\)/);
 assert.match(guard,/ownerStudioAccess:true/);
 assert.match(identity,/user\.email_confirmed_at/);
 assert.match(identity,/user\.is_anonymous!==true/);
 assert.match(identity,/user\.email\.trim\(\)\.toLowerCase\(\)/);
 assert.doesNotMatch(guard,/service_role|NEXT_PUBLIC_.*OWNER|(?:user|identity)\.user_metadata/);
 // Every other vendor continues to require verified unexpired paid entitlement.
 assert.match(guard,/evaluateMarketingEntitlement\(data\)/);
 assert.match(guard,/reason:'upgrade_required'/);
});

test('Owner receives all twelve routes without Pro labels; normal launch gating remains unchanged',()=>{
 const page=read('app/vendor/marketing/page.tsx');
 const tiles=read('app/vendor/marketing/components/MarketingAppStore.tsx');
 assert.match(page,/ownerStudioAccess=\{ownerStudioAccess\}/);
 assert.match(tiles,/launched=launchStatus==='live'\|\|review\|\|qa\|\|ownerStudioAccess/);
 assert.match(tiles,/premiumBadge=app\.pro&&!ownerStudioAccess/);
 assert.match(tiles,/premiumBadge\?'PRO':'INCLUDED'/);
 assert.match(tiles,/Workspace opens · features still in development/);
 assert.match(tiles,/href=\{app\.href\}/);
 assert.match(tiles,/!proEnabled&&!ownerStudioAccess/);
 assert.match(page,/href="\/vendor\/marketing-engine\/connections"/);
 assert.doesNotMatch(tiles,/sendEmail\(|autoPublish\(/);
});

test('Connectors shows app grid and requirements, without AI command box or fake provider activation',()=>{
 const page=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
 const grid=read('app/vendor/marketing/engine/components/ConnectorGrid.tsx');
 const whatsapp=read('app/vendor/marketing/whatsapp/page.tsx');
 assert.match(page,/ConnectorGrid/);
 assert.match(grid,/MARKETING_CONNECTORS\.map/);
 assert.match(grid,/onClick=\{\(\)=>setSelected\(item\.id\)\}/);
 assert.match(grid,/current\.requirements/);
 assert.match(grid,/Dialog.Root/);
 assert.match(grid,/WhatsAppConnectorSetup/);
 assert.match(grid,/ProviderLogo/);
 assert.match(grid,/disabled aria-disabled="true"/);
 assert.match(whatsapp,/disabled aria-disabled="true"/);
 assert.doesNotMatch(whatsapp,/WhatsAppGrowthOperator|WhatsAppConnectionLab|<textarea/);
 assert.doesNotMatch(page,/WhatsAppGrowthOperator|<textarea/);
 assert.doesNotMatch(grid,/OAuth.*window\.location\.assign|sendMessage\(|sendEmail\(/);
 assert.match(page,/getGoogleConnectorConfig\(\)/);
});
