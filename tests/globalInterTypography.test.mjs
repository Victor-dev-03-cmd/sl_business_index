import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('SLBI loads Inter once for the global UI with script-aware fallbacks',()=>{
  const layout=read('app/layout.tsx');
  const globals=read('app/globals.css');
  const logo=read('app/components/BrandLogo.tsx');
  assert.match(layout,/Inter, Noto_Sans_Tamil, Noto_Sans_Sinhala/);
  assert.doesNotMatch(layout,/Manrope|manrope\.variable/);
  assert.match(layout,/\$\{inter\.variable\} \$\{tamil\.variable\} \$\{sinhala\.variable\}/);
  assert.match(globals,/@theme inline/);
  assert.match(globals,/--font-sans: var\(--font-inter\), var\(--font-tamil\), var\(--font-sinhala\)/);
  assert.match(globals,/:lang\(ta\)/);
  assert.match(globals,/:lang\(si\)/);
  assert.doesNotMatch(logo,/font-manrope/);
});

test('All UI headings and micro-labels share restrained weight tokens',()=>{
  const globals=read('app/globals.css');
  for(const rule of [
    '--font-weight-normal: 400;',
    '--font-weight-medium: 500;',
    '--font-weight-semibold: 600;',
    '--font-weight-bold: 700;',
    '--font-weight-extrabold: 700;',
    '--font-weight-black: 700;',
    '.slbi-display-title',
    '.slbi-section-title',
    '.slbi-overline',
    '.slbi-field-label',
  ])assert.ok(globals.includes(rule),rule);
  assert.match(read('app/vendor/dashboard/page.tsx'),/slbi-display-title/);
  assert.match(read('app/vendor/marketing/page.tsx'),/slbi-display-title/);
  const caption=read('app/vendor/marketing/captions/page.tsx');
  assert.match(caption,/slbi-section-title/);
  assert.match(caption,/slbi-overline/);
});

test('Marketing captions use root-loaded fonts and avoid duplicate Google CSS requests',()=>{
  const fontCss=read('app/vendor/marketing/captions/caption-fonts.css');
  assert.doesNotMatch(fontCss,/@import|fonts\.googleapis\.com/);
  assert.match(fontCss,/var\(--font-tamil\)/);
  assert.match(fontCss,/var\(--font-sinhala\)/);
  assert.match(fontCss,/var\(--font-inter\)/);
  const vendor=read('app/vendor/vendor-workspace.css');
  assert.match(vendor,/\.vendor-workspace-v6[\s\S]*?font-family:var\(--font-inter\)/);
  assert.match(vendor,/font-size:14px/);
});
