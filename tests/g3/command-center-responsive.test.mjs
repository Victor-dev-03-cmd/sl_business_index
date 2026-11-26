import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const overview=read('app/vendor/dashboard/page.tsx');
const layout=read('app/vendor/layout.tsx');
const settings=read('app/vendor/settings/page.tsx');
const css=read('app/vendor/vendor-workspace.css');
const score=read('app/vendor/components/G2GrowthScorePanel.tsx');
const actions=read('app/vendor/components/G3PortfolioActions.tsx');
const domain=read('lib/growth/g3/portfolio-actions.ts');

test('G3 is the EXISTING Overview, not a disconnected fake command-center page',()=>{
  assert.match(overview,/data-g3-command-center="true"/);
  assert.match(overview,/Growth Command Center/);
  assert.match(overview,/aria-label="Select business for GrowthScore"/);
  assert.match(overview,/approvedForGrowth=useMemo\(\(\)=>businesses\.filter\(b=>b\.status==='approved'\)/);
  assert.match(overview,/<G2GrowthScorePanel businessId=\{growthBusiness\.id\} variant="compact"\/>/);
  assert.match(overview,/<G3PortfolioActions/);
  assert.match(overview,/snapshot=\{\{/);
  assert.match(overview,/pendingCount:businesses\.length-activeCount/);
  assert.match(overview,/Portfolio pulse/);
  assert.match(overview,/VendorAnalytics businessIds=\{businessIds\}/);
  assert.match(overview,/Business performance/);
  assert.match(overview,/Recent customer activity/);
  assert.match(overview,/Quick actions/);
  assert.match(overview,/Export report/);
  assert.match(overview,/Directory publication/);
  assert.doesNotMatch(overview,/href="\/vendor\/command-center"/);
  assert.match(score,/if\(variant==='compact'\)/);
  assert.match(score,/data-g3-growth-score="compact"/);
  assert.match(score,/evidenceCoveragePercent/);
  assert.match(actions,/data-g3-portfolio-actions="true"/);
});

test('Portfolio tips use actual owner counters, never inferred sales or paid ranking',()=>{
  assert.match(domain,/export function buildG3PortfolioActions/);
  assert.match(domain,/input\.views>0&&input\.calls===0/);
  assert.match(domain,/input\.leads>0/);
  assert.match(domain,/input\.pendingCount>0/);
  assert.match(domain,/input\.reviews>0/);
  assert.match(domain,/return actions\.slice\(0,3\)/);
  assert.doesNotMatch(domain,/\.from\(|\/api\/|service_role|premium_weight|\.update\(/);
  assert.match(actions,/buildG3PortfolioActions\(snapshot\)/);
  assert.match(actions,/Recorded portfolio signals, not verified sales or unique visitors/);
  assert.match(overview,/GrowthScore measures selected business listing readiness/);
});

test('Vendor shell fixes 320px topbar and controls without wider-than-screen min width',()=>{
  assert.match(layout,/h-\[64px\]/);
  assert.match(layout,/aria-label="Open navigation"/);
  assert.match(layout,/aria-label="Vendor mobile navigation"/);
  assert.match(layout,/overflow-x-clip overflow-y-auto/);
  assert.match(layout,/data-slbi-ui="vendor-sidebar"/);
  assert.doesNotMatch(layout,/vendor-topbar-center absolute left-1\/2/);
  assert.match(layout,/min-w-0 flex-1/);
  assert.match(css,/\.vendor-workspace-v6 \.vendor-content \.grid > \*/);
  assert.match(css,/\.vendor-workspace-v6 \.vendor-content \.vendor-status-badge/);
  assert.match(css,/white-space:nowrap/);
  assert.match(css,/word-break:normal/);
  assert.match(css,/@media \(max-width:639px\)/);
  assert.match(css,/touch-action:manipulation/);
  assert.doesNotMatch(css,/word-break:break-all/);
});

test('Settings mobile verification badge wraps as a whole not one glyph per line',()=>{
  assert.match(settings,/data-testid="vendor-settings-studio"/);
  assert.match(settings,/min-w-\[152px\] shrink-0 items-center/);
  assert.match(settings,/vendor-status-badge self-start/);
  assert.match(settings,/vendor-status-badge col-span-2 justify-self-start/);
  assert.match(settings,/data-testid="settings-profile-summary"/);
  assert.match(settings,/sm:\[&_\.min-w-0\]:min-w-\[190px\]/);
  assert.match(settings,/max-w-full truncate/);
  assert.doesNotMatch(settings,/\[&_span\]:break-all/);
  assert.doesNotMatch(settings,/\[&_\.min-w-0\]:min-w-\[190px\] \[&_\.min-w-0\]:flex-1/);
});

test('Overview mobile uses one column at 320, two at >=390; activity chart is deferred',()=>{
  assert.match(overview,/grid-cols-1 gap-2 min-\[390px\]:grid-cols-2/);
  assert.match(overview,/data-g3-deferred-timeline="true"/);
  assert.match(overview,/IntersectionObserver/);
  assert.match(overview,/rootMargin:'240px 0px'/);
  assert.match(overview,/timelineInView\?<VendorAnalytics/);
  assert.match(overview,/Engagement timeline loads when you reach this section/);
  assert.match(score,/grid-cols-1 gap-2 min-\[390px\]:grid-cols-3/);
  assert.doesNotMatch(overview,/document\.body\.style\.overflow/);
});
