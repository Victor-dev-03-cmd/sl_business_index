import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const grid=read('app/vendor/marketing/engine/components/ConnectorGrid.tsx');
const gmail=read('app/vendor/marketing/engine/components/GoogleMailPreviewConnect.tsx');
const page=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
const email=read('app/vendor/marketing/engine/(pro)/email/page.tsx');

test('Linked Gmail: one compact account row + Disconnect, never another Connect action',()=>{
  const start=gmail.indexOf('    {connected.length>0?(');
  const pivot=gmail.indexOf('    ):(',start);
  assert.ok(start>=0&&pivot>start,'connected/unconnected UI branches must be explicit');
  const linked=gmail.slice(start,pivot);
  const notLinked=gmail.slice(pivot);
  assert.match(linked,/connected\.map\(c=>/);
  assert.match(linked,/c\.account_display_name/);
  assert.match(linked,/Connected/);
  assert.match(linked,/onClick=\{\(\)=>void disconnect\(c\.id,c\.business_id\)\}/);
  assert.match(linked,/Disconnect/);
  assert.doesNotMatch(linked,/onClick=\{\(\)=>void connect\(\)\}/);
  assert.match(notLinked,/onClick=\{\(\)=>void connect\(\)\}/);
  assert.doesNotMatch(notLinked,/onClick=\{\(\)=>void disconnect\(/);
  assert.match(gmail,/if\(!enabled\|\|busy\|\|connected\.length>0\)return/);
});

test('Gmail popup is minimal, mobile-friendly and has no how-to / preview / duplicate CTA',()=>{
  assert.match(grid,/current\.id==='gmail'\?'max-h-\[min\(85dvh,570px\)\] max-w-\[460px\]'/);
  assert.match(grid,/current\.id==='gmail'\?gmailPreview/);
  assert.match(grid,/<Dialog\.Title/);
  assert.match(grid,/aria-label="Close connection popup"/);
  const branch=grid.indexOf("current.id==='gmail'?gmailPreview");
  const requirements=grid.indexOf('current.requirements');
  assert.ok(branch>=0&&requirements>branch,'Gmail renders independently from explanatory panels');
  assert.doesNotMatch(gmail,/GoogleMailInboxPreview|Continue to Email Marketing|Plugin & App Connectors|What you need|How to connect/);
  assert.match(email,/GoogleMailInboxPreview/,'AI inbox panel remains in Email Marketing');
  assert.match(gmail,/data-testid="gmail-connector-compact"/);
  assert.match(gmail,/min-h-10/);
  assert.match(gmail,/min-h-11/);
});

test('OAuth and database security are unaffected by the presentational simplification',()=>{
  const start=read('app/api/marketing/oauth/google_mail/start/route.ts');
  const stop=read('app/api/marketing/oauth/google_mail/disconnect/route.ts');
  assert.match(page,/auth\.getUser\(\)/);
  assert.match(page,/\.eq\('user_id',user\.id\)/);
  assert.match(page,/googleConnected=\{googleConnected\}/);
  assert.match(page,/googleConnected=connectionSummaries\.some\(c=>c\.status==='connected'\)/);
  assert.match(grid,/oauthNotice\?'gmail':null/);
  assert.match(gmail,/credentials:'same-origin'/);
  assert.match(gmail,/window\.location\.assign\(next\.href\)/);
  assert.match(gmail,/JSON\.stringify\(\{businessId:ownedBusinessId,connectionId\}\)/);
  assert.match(gmail,/window\.confirm/);
  assert.match(gmail,/router\.refresh\(\)/);
  assert.match(start,/getMarketingAccessForUser/);
  assert.match(stop,/slbi_disconnect_google_mail_connection/);
  assert.doesNotMatch(gmail,/sendEmail\(|messages\/send|NEXT_PUBLIC_.*SECRET|localStorage|sessionStorage/);
});
