import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseThreeAngles} from '../lib/marketing/caption-workspace.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const caption=read('app/vendor/marketing/captions/page.tsx');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const voice=read('app/api/marketing/poster/transcribe/route.ts');
const engine=read('lib/marketing/voice/slbi-voice-engine.ts');
const provider=read('lib/marketing/voice/slbi-gemini-transcription.ts');

test('Transcription has typed failure codes, bounded upstream calls and preserves cost boundary',()=>{
  for(const code of ['VOICE_PROVIDER_QUOTA','VOICE_DAILY_LIMIT','VOICE_TIMEOUT',
    'VOICE_NETWORK','VOICE_AUDIO_REJECTED','VOICE_BAD_RESPONSE','VOICE_EMPTY_RESULT'])
    assert.ok((voice+provider).includes(code),code);
  assert.ok(voice.indexOf("const key=process.env.GEMINI_API_KEY?.trim()") <
    voice.indexOf("admin.rpc('marketing_poster_voice_try_reserve'"));
  assert.match(provider,/AbortSignal.timeout\(TRY_TIMEOUT_MS\)/);
  assert.match(provider,/SLBI_GEMINI_VOICE_MODEL='gemini-2.5-flash'/);
  assert.match(provider,/for\(let attempt=0;attempt<2;attempt\+\+\)/);
  assert.match(provider,/console.warn\('SLBI Gemini voice upstream HTTP',provider.status\)/);
  assert.doesNotMatch(voice+provider,/console\.warn\([^)]*(?:bytes|transcript|GEMINI_API_KEY)/);
  assert.doesNotMatch(voice,/Microphone transcription temporarily unavailable/);
});

test('Both studios retain failed audio in memory and require a user retry click',()=>{
  for(const ui of [caption,poster]){
    assert.match(ui,/failedVoiceRef=useRef<Blob\|null>\(null\)/);
    assert.match(ui,/failedVoiceRef.current=blob/);
    assert.match(ui,/failedVoiceRef.current=null/);
    assert.match(ui,/const retryVoice=\(\)=>/);
    assert.match(ui,/onClick=\{retryVoice\}/);
    assert.match(ui,/new SlbiVoiceRecorder\(/);
    assert.match(ui,/requestSlbiVoiceTranscript\(/);
    assert.match(ui,/Retry transcription/);
  }
  assert.match(engine,/SLBI_VOICE_SAFE_BYTES=1_400_000/);
  assert.match(engine,/SLBI_VOICE_MAX_SECONDS=180/);
  const cb=caption.slice(caption.indexOf('  const transcribe=async(blob:Blob)=>{'),
    caption.indexOf('  const startVoice=async()=>{'));
  assert.doesNotMatch(cb,/await generate\(/);
  const pb=poster.slice(poster.indexOf('  const transcribe=async(blob:Blob)=>{'),
    poster.indexOf('  const startVoice=async()=>{'));
  assert.doesNotMatch(pb,/puter\.ai\.txt2img|await prepareWithGemini/);
});

test('Fresh poster cannot auto-load old language drafts into its live editor',()=>{
  const loader=caption.slice(caption.indexOf('  const loadDrafts=useCallback('),
    caption.indexOf('  const loadPlannerDrafts=useCallback('));
  assert.match(loader,/setDrafts\(list\)/);
  assert.doesNotMatch(loader,/setCaptions\(|setGeneratedTags\(/);
  assert.match(caption,/slbi-caption-unsaved-v3:/);
  assert.match(caption,/\(valid\?handoff:'direct'\)/);
  assert.match(caption,/slbi-caption-completed-handoff:/);
  assert.match(caption,/sessionStorage\.removeItem\(workspaceKey\)/);
  assert.match(caption,/const clearEditorAfterSave=\(\)=>/);
  assert.match(caption,/setCaptions\(emptyCaptions\(\)\);setGeneratedTags/);
});

test('Planner draft library is owned, explicit, editable and separate from AI draft library',()=>{
  assert.match(caption,/aria-label="Saved Planner Drafts"/);
  assert.match(caption,/Saved Planner Drafts \(\{plannerDrafts.length\}\)/);
  assert.match(caption,/\.eq\('business_id',businessId\)\.eq\('banner_color','caption-lab-connected-v1'\)/);
  assert.match(caption,/\.eq\('status','drafted'\)\.eq\('is_archived',false\)/);
  assert.match(caption,/onClick=\{\(\)=>void resumePlannerDraft\(item\)\}/);
  assert.match(caption,/setSavedCampaignId\(item.id\)/);
  assert.match(caption,/\.update\(editablePatch\)/);
  assert.match(caption,/setLastSavedCampaignId\(saved.data.id\)/);
  assert.match(caption,/onClick=\{\(\)=>resumeAiDraft\(draft\)\}/);
  assert.deepEqual(parseThreeAngles('Saved campaign copy.'),{
    hook:'Saved campaign copy.',story:'',short:'',
  });
});

test('Poster suggestion chips never consume Gemini quota or silently truncate a spoken prompt',()=>{
  const chips=poster.slice(poster.indexOf('  const chooseSuggestion='),poster.indexOf('  const chooseReference='));
  assert.match(chips,/if\(combined.length>1200\)/);
  assert.match(chips,/setPrompt\(combined\)/);
  assert.match(chips,/Tap Prepare with Gemini/);
  assert.doesNotMatch(chips,/puter\.ai|\/api\/marketing|prepareWithGemini\(/);
  assert.match(poster,/setPendingTranscript\(heard\)/);
  assert.match(poster,/id="poster-transcript-review"/);
  assert.match(poster,/onClick=\{applyPendingTranscript\}/);
});
