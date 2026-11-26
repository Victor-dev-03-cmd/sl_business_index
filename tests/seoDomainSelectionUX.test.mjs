import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=source('app/vendor/seo/SeoDomainConnector.tsx');
const api=source('app/api/vendor/seo/domain/route.ts');
const layout=source('app/vendor/layout.tsx');

test('Existing owner DNS connection never disables HTTP file method selection',()=>{
  assert.match(ui,/const proofChanged=!!connection&&/);
  assert.match(ui,/const providerChanged=!!connection&&/);
  assert.match(ui,/const hasUnsavedChanges=proofChanged\|\|providerChanged/);
  assert.match(ui,/fieldset data-testid="seo-proof-method-switch" className="space-y-2" disabled=\{!!busy\}/);
  assert.match(ui,/name="seo-verification-method" value="http_file" checked=\{method==='http_file'\}/);
  assert.match(ui,/name="seo-verification-method" value="dns_txt" checked=\{method==='dns_txt'\}/);
  assert.doesNotMatch(ui,/fieldset[^>]*disabled=\{!!connection\|\|!!busy\}/);
  assert.doesNotMatch(ui,/id="seo-website-address"[^>]*disabled=\{!!connection\|\|!!busy\}/);
  assert.doesNotMatch(ui,/id="seo-dns-provider"[^>]*disabled=\{!!connection\|\|!!busy\}/);
});

test('A method change is a draft until explicit save, and verified proof requires consent to rotate',()=>{
  assert.match(ui,/hasUnsavedChanges&&<div role="status"/);
  assert.match(ui,/Your current/);
  assert.match(ui,/proofChanged&&verified&&/);
  assert.match(ui,/window\.confirm\('Changing this verified domain or method will revoke its existing proof/);
  assert.match(ui,/\(!connection\|\|hasUnsavedChanges\)&&<button/);
  assert.match(ui,/Save new verification method/);
  assert.match(ui,/Cancel changes/);
  assert.match(ui,/connection&&!hasUnsavedChanges&&<div data-testid="seo-domain-steps"/);
  assert.match(ui,/setHostname\(connection\.hostname\)/);
  assert.match(ui,/setMethod\(savedMethod\)/);
  assert.match(ui,/verificationMethod:method/);
  assert.match(ui,/setConnection\(next&&typeof next==='object'/);
});

test('Provider-only changes do not invalidate a valid domain verification',()=>{
  assert.match(api,/if\(existing\.provider===provider\)/);
  assert.match(api,/\.update\(\{provider,updated_at:new Date\(\)\.toISOString\(\)\}\)/);
  assert.match(api,/\.eq\('id',existing\.id\)\.eq\('owner_id',user\.id\)/);
  assert.match(api,/asPublicConnection\(updated as Record<string,unknown>\)/);
  assert.match(ui,/The existing ownership proof remains valid/);
});

test('Sidebar is compact on desktop but keeps 44px tap targets on mobile',()=>{
  assert.match(layout,/mobile\?'min-h-11 ':'min-h-\[36px\] '/);
  assert.match(layout,/size=\{mobile\?17:16\}/);
  assert.match(layout,/gap-2 rounded-lg px-2 text-\[11px\]/);
  assert.match(layout,/mobile\?'space-y-1':'space-y-0\.5'/);
  assert.match(layout,/space-y-1 overflow-y-auto px-2 pb-3 pt-1/);
  assert.match(layout,/sideSections\(sidebarCollapsed\)/);
  assert.match(layout,/sideSections\(false,true\)/);
  assert.match(layout,/aria-label="Vendor mobile navigation"/);
});
