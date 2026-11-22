import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('app/vendor/marketing/captions/page.tsx');
const route=read('app/api/marketing/caption/route.ts');
const contract=read('lib/marketing/caption-contract.ts');
const picker=read('lib/marketing/caption-poster-handoff.ts');

test('Generate Caption CTA has explicit spacing, keyboard focus and accessible disabled styling',()=>{
  assert.match(page,/onClick=\{\(\)=>void generate\(\)\}/);
  assert.match(page,/aria-label="Generate Caption Variations with Gemini AI"/);
  assert.match(page,/className="group mt-4 flex min-h-11 w-full/);
  assert.match(page,/focus-visible:outline-offset-2 focus-visible:outline-\[#F97316\]/);
  assert.match(page,/disabled:border-\[#E5E7EB\] disabled:bg-\[#F3F4F6\] disabled:text-\[#9CA3AF\]/);
});

test('Credits and help are contained in a balanced inset strip below Generate, not cramped against it',()=>{
  const start=page.indexOf('aria-label="Generate Caption Variations with Gemini AI"');
  const credit=page.indexOf('aria-label="Gemini generation and credit information"');
  const suggestions=page.indexOf('Quick brief suggestions');
  const terms=page.indexOf('Offer terms & CTA');
  assert.ok(start>0&&credit>start&&suggestions>credit&&terms>suggestions);
  assert.match(page,/className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-\[#F3F4F6\] bg-\[#F9FAFB\] px-3 py-2\.5/);
  assert.match(page,/slbi-caption-disclosure mt-3 rounded-xl border border-\[#E5E7EB\] bg-white p-3/);
  assert.match(page,/slbi-caption-disclosure rounded-xl border border-\[#E5E7EB\] p-3/);
  assert.match(page,/Gemini AI · \{chosenLanguages.length\}/);
  assert.match(page,/3 variations each · Credits on Generate/);
  assert.match(page,/One provider request and applicable credit reservation per selected language/);
});

test('Caption button is already wired to real Gemini with isolated internal QA gate and credit ledger',()=>{
  assert.match(page,/const generate=async\(retryFailedOnly=false\)=>/);
  assert.match(page,/fetch\('\/api\/marketing\/caption'/);
  assert.match(page,/mode:'three_angles'/);
  assert.match(page,/requestKey=crypto\.randomUUID\(\)/);
  assert.match(route,/process\.env\.SLBI_MARKETING_AI_ENABLED!=='true'/);
  assert.match(route,/isPosterInternalQAAccount\(user\.id,client\)/);
  assert.match(route,/process\.env\.GEMINI_API_KEY\?\.trim\(\)/);
  assert.match(route,/const useGemini=brief\.mode==='three_angles'/);
  assert.match(route,/GEMINI_POSTER_MODEL\+':generateContent'/);
  assert.match(route,/responseMimeType:'application\/json'/);
  assert.match(route,/responseSchema:captionGeminiResponseSchema\(brief\.language\)/);
  assert.match(route,/marketing_reserve_ai_draft/);
  assert.match(route,/marketing_complete_ai_draft/);
  assert.match(route,/marketing_refund_ai_draft/);
  assert.match(route,/if\(!triple\.hook\|\|!triple\.story\|\|!triple\.short\)/);
  assert.match(contract,/Never invent prices, discounts, statistics/);
  assert.match(contract,/Return JSON ONLY/);
});

test('Existing image choices use private Studio handoff or device upload, not external unapproved AI search',()=>{
  assert.match(page,/listLinkedPosters\(businessId\)/);
  assert.match(page,/imageFileToPng\(file\)/);
  assert.match(page,/href="\/vendor\/marketing\/design\/puter-lab"/);
  assert.match(picker,/indexedDB\.open\(DB_NAME,1\)/);
  assert.match(picker,/MAX_AGE=2\*60\*60\*1000/);
  assert.doesNotMatch(page,/openai\.com\/v1\/images|api\.openai\.com|unsplash\.com\/search/);
  assert.match(page,/Nothing is automatically published/);
});
