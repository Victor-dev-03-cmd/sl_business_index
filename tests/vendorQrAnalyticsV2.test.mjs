import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const qr=source('app/vendor/qr-code/page.tsx');
const insights=source('app/vendor/insights/page.tsx');
const charts=source('app/vendor/insights/VendorAnalyticsCharts.tsx');
const analytics=source('app/vendor/analytics/page.tsx');
const layout=source('app/vendor/layout.tsx');
const icons=source('app/vendor/components/IconsaxIcon.tsx');

test('Professional QR Studio retains all genuine owner-scoped assignment/export flows',()=>{
  assert.match(qr,/data-testid="vendor-qr-studio-professional"/);
  assert.match(qr,/from 'qrcode.react'/);
  assert.match(qr,/QRCodeCanvas, QRCodeSVG/);
  assert.match(qr,/supabase\.auth\.getUser\(\)/);
  assert.match(qr,/\.eq\('owner_id',user\.id\)/);
  assert.match(qr,/\.eq\('status','assigned'\)\.order\('created_at'/);
  assert.match(qr,/\.limit\(1\)\.maybeSingle\(\)/);
  assert.match(qr,/fetch\('\/api\/qr\/request'/);
  assert.match(qr,/setAssigned\(result\.qr\)/);
  assert.match(qr,/const eligible=business\?\.status==='approved'/);
  assert.match(qr,/disabled=\{requesting\|\|!eligible\}/);
  for(const action of ['Download PNG','Download SVG','Download PDF','Print layout','Copy profile link','Share link'])
    assert.ok(qr.includes(action),'missing QR action '+action);
  assert.match(qr,/disabled=\{!assigned\} onClick=\{exportSVG\}/);
  assert.match(qr,/disabled=\{!assigned\} onClick=\{printCard\}/);
});

test('QR colors use orange/charcoal and all export quality presets render honest artwork',()=>{
  assert.match(qr,/SLBI Orange/);
  assert.match(qr,/Graphite/);
  assert.match(qr,/Royal Blue/);
  assert.match(qr,/Burnt Copper/);
  assert.doesNotMatch(qr,/name:'Forest'/);
  assert.match(qr,/const scale=size\/256,margin=42/);
  assert.match(qr,/const renderPosterCanvas=/);
  assert.match(qr,/const exportSVG=/);
  assert.match(qr,/const exportPDF=async/);
  assert.match(qr,/new jsPDF\(\{orientation:'portrait',unit:'mm',format:'a4'\}\)/);
  assert.match(qr,/const factor=Math\.min\(maxWidth\/image\.width,maxHeight\/image\.height\)/);
  assert.match(qr,/includeLogo\?\{src:'\/slbi-mark\.svg'/);
  assert.match(qr,/SC[Aa]N|SCAN TO VIEW OUR BUSINESS/);
  assert.doesNotMatch(qr,/VERIFIED DIRECTORY LINK|100% scans|total QR scans|verified revenue/);
});

test('Analytics Center owns a route and uses the protected existing Growth Insights data source',()=>{
  assert.match(analytics,/export \{default\} from '\.\.\/insights\/page'/);
  assert.match(layout,/name:'Analytics',href:'\/vendor\/analytics',icon:'chart'/);
  assert.match(insights,/supabase\.auth\.getUser\(\)/);
  assert.match(insights,/\.eq\('owner_id', user\.id\)/);
  assert.match(insights,/\.eq\('status', 'approved'\)/);
  assert.match(insights,/analytics_logs/);
  assert.match(insights,/readGrowthWindow/);
  assert.match(insights,/INSIGHT_MAX_ROWS/);
  assert.match(insights,/!loading&&!error&&businesses\.length>0&&<VendorAnalyticsCharts/);
  assert.match(insights,/dynamic\(\(\)=>import\('\.\/VendorAnalyticsCharts'\)/);
  assert.match(insights,/Comparison unavailable/);
  assert.doesNotMatch(insights,/mockData|Math\.random\(|sampleData|generateFake/);
});

test('Chart library is existing Recharts, with area/bar/pie/line and GitHub-style UTC activity heatmap',()=>{
  for(const chart of ['AreaChart','BarChart','PieChart','LineChart','ResponsiveContainer'])
    assert.match(charts,new RegExp('\\b'+chart+'\\b'));
  assert.match(charts,/gridAutoFlow:'column'/);
  assert.match(charts,/repeat\(7,14px\)/);
  assert.match(charts,/new Date\(daily\[0\]\.key\+'T00:00:00Z'\)\.getUTCDay\(\)/);
  assert.match(charts,/day\.views\+day\.calls\+day\.directions/);
  assert.match(charts,/No recorded activity for the selected period/);
  assert.match(charts,/logged events only/);
  assert.match(charts,/No chart implies unique visitors/);
  assert.match(icons,/variant = 'bulk'/);
  assert.doesNotMatch(charts,/Math\.random|fake|mockSeries/);
});
