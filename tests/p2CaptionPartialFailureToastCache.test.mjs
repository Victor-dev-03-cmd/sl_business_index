import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyCaptions,polishCaptionSelections} from '../lib/marketing/caption-workspace.ts';
import {captionIssueMessage,failedCaptionLanguages} from '../lib/marketing/caption-generation-feedback.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const caption=read('app/vendor/marketing/captions/page.tsx');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const layout=read('app/vendor/layout.tsx');
const feedback=read('lib/ui/vendor-feedback.ts');

test('Per-language failure leaves other successful caption outputs editable',()=>{
  const generator=caption.slice(caption.indexOf('  const generate=async('),
    caption.indexOf('  const editTags='));
  assert.match(generator,/for\(const language of targets\)/);
  assert.match(generator,/failures\.push\(/);
  assert.match(generator,/continue;/);
  assert.match(generator,/setCaptions\(previous=>/);
  assert.match(generator,/completed\.push\(language\)/);
  assert.match(generator,/setFailedGenerations\(/);
  assert.match(generator,/setPreviewLanguage\(completed\[0\]\)/);
  assert.match(generator,/vendorFeedback\.warning\(failures\.map\(captionIssueMessage\)\.join\(' '\)\)/);
  assert.match(generator,/await loadDrafts\(\)/);
  assert.doesNotMatch(generator,/throw Error\(data\.error/);
});

test('Unavailable language retry never regenerates successful languages automatically',()=>{
  assert.match(caption,/retryFailedOnly&&canRetryLanguages&&failedGenerations\?/);
  assert.match(caption,/failedGenerations\.languages:chosenLanguages/);
  assert.match(caption,/onClick=\{\(\)=>void generate\(true\)\}/);
  assert.match(caption,/Retry only unavailable caption languages/);
  assert.match(caption,/requestKey:crypto\.randomUUID\(\)/);
  assert.match(caption,/generationSignature=JSON\.stringify/);
  assert.deepEqual(failedCaptionLanguages([
    {language:'si',status:503,code:'GEMINI_PROVIDER_FAILED',detail:'provider error'},
    {language:'si',status:503,code:'GEMINI_PROVIDER_FAILED',detail:'provider error'},
  ]),['si']);
  assert.match(captionIssueMessage({
    language:'si',status:503,code:'GEMINI_PROVIDER_FAILED',detail:'provider error',
  }),/^සිංහල caption is temporarily unavailable\. Please try again\.$/);
  assert.match(captionIssueMessage({
    language:'ta',status:400,code:'CTA_PHONE_NOT_VERIFIED',detail:'phone invalid',
  }),/saved business phone/);
});

test('Quick Polish applies to all generated languages and never silently loses content',()=>{
  const original=emptyCaptions();
  original.ta.hook='எங்கள் வணிகத்தின் சிறப்பான சேவைகளை இன்று அறியுங்கள்.';
  original.si.hook='අපගේ ව්‍යාපාරයේ සේවා පිළිබඳ වැඩි විස්තර දැනගන්න.';
  const all=polishCaptionSelections({
    captions:original,selectedLanguages:['ta','si','en'],previewLanguage:'all',
    angle:'hook',kind:'emojis',contact:{phone:'',city:'',website:''},
  });
  assert.deepEqual(all.changed,['ta','si']);
  assert.equal(all.captions.ta.hook,'✨ '+original.ta.hook);
  assert.equal(all.captions.si.hook,'✨ '+original.si.hook);
  assert.equal(all.captions.en.hook,'');
  assert.equal(original.ta.hook.startsWith('✨'),false);
  const repeated=polishCaptionSelections({
    captions:all.captions,selectedLanguages:['ta','si'],
    previewLanguage:'all',angle:'hook',kind:'emojis',
    contact:{phone:'',city:'',website:''},
  });
  assert.deepEqual(repeated.changed,[]);
  const unverified=polishCaptionSelections({
    captions:original,selectedLanguages:['ta','si'],
    previewLanguage:'all',angle:'hook',kind:'contact',
    contact:{phone:'',city:'Jaffna',website:''},
  });
  assert.deepEqual(unverified.changed,[]);

  const single=polishCaptionSelections({
    captions:original,selectedLanguages:['ta','si'],previewLanguage:'si',
    angle:'hook',kind:'urgency',contact:{phone:'',city:'',website:''},
  });
  assert.deepEqual(single.changed,['si']);
  assert.equal(single.captions.ta.hook,original.ta.hook);
  assert.match(caption,/const canPolish=previewLanguage==='all'\?/);
  assert.match(caption,/chosenLanguages\.find\(lang=>Boolean\(captions\[lang\]\[angle\]\?\.trim\(\)\)\)/);
  assert.match(caption,/disabled=\{!canPolish\}/);
  assert.match(caption,/All \{chosenLanguages.length\} Combined/);
});

test('Planner save tombstones old handoff and removes stale draft snapshots before editor reset',()=>{
  const cleared=caption.slice(caption.indexOf('  const clearEditorAfterSave=()=>{'),
    caption.indexOf('  const savePlanner=async()=>{'));
  assert.match(cleared,/skipWorkspaceRecoveryRef\.current=true/);
  assert.match(cleared,/setWorkspaceKey\(''\)/);
  assert.match(cleared,/for\(const version of \['v2','v3'\]\)/);
  assert.match(cleared,/sessionStorage\.removeItem\(prefix\+'direct'\)/);
  assert.match(cleared,/sessionStorage\.removeItem\(workspaceKey\)/);
  assert.match(cleared,/slbi-caption-completed-handoff:/);
  assert.match(cleared,/window\.history\.replaceState\(window\.history\.state/);
  assert.match(cleared,/setCaptions\(emptyCaptions\(\)\)/);
  assert.match(cleared,/setGeneratedTags\(\{ta:\[\],si:\[\],en:\[\]\}\)/);
  assert.match(cleared,/setCustomTags\(/);
  assert.match(cleared,/setAngle\('hook'\);setPreviewLanguage\('all'\)/);
  assert.match(cleared,/setWorkspaceEpoch\(epoch=>epoch\+1\)/);
  assert.match(caption,/slbi-caption-unsaved-v3:/);
  assert.match(caption,/const recoveryKey='slbi-caption-unsaved-v3:'/);
  assert.match(caption,/if\(skip\)sessionStorage\.removeItem\(key\)/);
  const loader=caption.slice(caption.indexOf('  const loadDrafts=useCallback('),
    caption.indexOf('  const loadPlannerDrafts=useCallback('));
  assert.doesNotMatch(loader,/setCaptions\(/);
});

test('Vendor marketing feedback is compact, dismissible, auto-hiding and routed to top right',()=>{
  assert.match(layout,/id="vendor-portal"/);
  assert.match(layout,/position="top-right"/);
  assert.match(layout,/duration=\{4300\}/);
  assert.match(layout,/closeButton/);
  assert.match(layout,/maxWidth: 'min\(340px/);
  assert.match(feedback,/toasterId:'vendor-portal'/);
  assert.match(feedback,/toast\.error/);
  assert.match(feedback,/toast\.warning/);
  assert.match(caption,/vendorFeedback\.error\(error\)/);
  assert.match(poster,/vendorFeedback\.error\(error\)/);
  assert.doesNotMatch(caption,/\{error&&<div role="alert"/);
  assert.doesNotMatch(poster,/\(error\|\|status\|\|designAdvisory\)&&<div/);
});
