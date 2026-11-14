import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const settings=read('app/vendor/settings/page.tsx');
const qr=read('app/vendor/qr-code/page.tsx');
const marketing=read('app/vendor/marketing/campaigns/page.tsx');

test('settings profile form uses Tailwind, responsive grid and named fields',()=>{
  assert.match(settings,/data-testid="vendor-settings-studio"/);
  assert.match(settings,/md:grid-cols-2/);
  assert.match(settings,/htmlFor="vendor-email"/);
  assert.match(settings,/htmlFor="vendor-name"/);
  assert.match(settings,/Complete your profile/);
  assert.match(settings,/shadow-\[inset_4px_4px_8px_/);
  assert.doesNotMatch(settings,/settings-studio\.css|settings-v8-|vendor-settings-v10/);
});
test('QR studio exports high-res raster, independent SVG and fitted A4 PDF',()=>{
  assert.match(qr,/QRCodeCanvas, QRCodeSVG/);
  assert.match(qr,/const renderPosterCanvas=/);
  assert.match(qr,/const exportSVG=/);
  assert.match(qr,/const exportPDF=async/);
  assert.match(qr,/new jsPDF\(\{orientation:'portrait',unit:'mm',format:'a4'\}\)/);
  assert.match(qr,/const factor=Math\.min\(maxWidth\/image\.width,maxHeight\/image\.height\)/);
  assert.match(qr,/Download SVG/);
  assert.match(qr,/Download PDF/);
  assert.match(qr,/disabled=\{!assigned\} onClick=\{exportSVG\}/);
});

test('marketing creates owner-provided copy as exportable reviewed image, not a simulated AI post',()=>{
  assert.match(marketing,/const exportBrandedCreative=/);
  assert.match(marketing,/square:\[1080,1080\]/);
  assert.match(marketing,/portrait:\[1080,1350\]/);
  assert.match(marketing,/story:\[1080,1920\]/);
  assert.match(marketing,/DRAFT — REVIEW BEFORE PUBLISHING/);
  assert.match(marketing,/Download branded PNG draft/);
  assert.doesNotMatch(marketing,/MarketingDesignEditor/);
  assert.doesNotMatch(marketing,/PromotionUploadForm/);
});
