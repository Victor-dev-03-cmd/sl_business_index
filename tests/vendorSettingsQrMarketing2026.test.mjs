import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const settings=read('app/vendor/settings/page.tsx');
const style=read('app/vendor/settings/settings-studio.css');
const qr=read('app/vendor/qr-code/page.tsx');
const marketing=read('app/vendor/marketing/page.tsx');

test('settings studio profile form is aligned and independent from prior CSS layers',()=>{
  assert.match(settings,/className="slbi-settings"/);
  assert.match(settings,/ss-form-grid/);
  assert.match(settings,/htmlFor="vendor-email"/);
  assert.match(settings,/htmlFor="vendor-name"/);
  assert.match(settings,/ss-profile-identity/);
  assert.match(style,/\.slbi-settings \.ss-form-grid/);
  assert.match(style,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(style,/@media\(max-width:590px\)/);
  assert.match(style,/box-shadow:inset 3px 3px 7px/);
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
