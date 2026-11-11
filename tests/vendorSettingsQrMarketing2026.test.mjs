import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const settings=read('app/vendor/settings/page.tsx');
const style=read('app/vendor/vendor-workspace.css');
const qr=read('app/vendor/qr-code/page.tsx');
const marketing=read('app/vendor/marketing/page.tsx');

test('settings profile has aligned controls, explicit borders and restrained corners',()=>{
  assert.match(settings,/const field='vendor-field block h-11 w-full/);
  assert.match(settings,/grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2/);
  assert.match(settings,/vendor-setting-section w-full min-w-0 space-y-6 border/);
  assert.match(settings,/className="min-w-0"><label className=\{label\} htmlFor="vendor-email"/);
  assert.match(settings,/lg:grid-cols-\[238px_minmax\(0,1fr\)\]/);
  assert.match(style,/\.vendor-workspace \.vendor-settings input\.vendor-field/);
  assert.match(style,/border-radius:5px/);
  assert.match(style,/border:1px solid #c5d5c9/);
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
