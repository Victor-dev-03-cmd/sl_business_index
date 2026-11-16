/**
 * Strict Gemini JSON contract for SLBI's Sri Lankan social copywriter.
 * One authenticated, credit-reserved provider request handles one chosen
 * language. The three-language UI combines these independently saved drafts.
 * Never persist unvalidated model JSON directly to a user-visible draft.
 */
import type {CaptionLanguage} from './caption-contract.ts';
import {normalizedTag} from './caption-workspace.ts';

export const CAPTION_OUTPUT_LANGUAGE:Record<CaptionLanguage,'Tamil'|'Sinhala'|'English'>={
  ta:'Tamil',si:'Sinhala',en:'English',
};
export type GeminiCaptionAngles={hook:string;story:string;short:string};
export type GeminiCaptionOutput={
  variations:Partial<Record<'Tamil'|'Sinhala'|'English',GeminiCaptionAngles>>;
  hashtags:string[];
};
const ANGLE_LIMITS={hook:700,story:1000,short:450} as const;
const hasOnlyKeys=(value:Record<string,unknown>,keys:readonly string[])=>
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const record=(value:unknown):Record<string,unknown>|null=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)?
    value as Record<string,unknown>:null;

/** Gemini GenerateContent supports responseMimeType + responseSchema. */
export function captionGeminiResponseSchema(language:CaptionLanguage){
  const key=CAPTION_OUTPUT_LANGUAGE[language];
  return {
    type:'object',
    properties:{
      variations:{
        type:'object',
        properties:{
          [key]:{
            type:'object',
            properties:{
              hook:{type:'string',description:'Attention-first factual caption; compelling first 110 characters'},
              story:{type:'string',description:'Trust, useful value or problem-solving without invented evidence'},
              short:{type:'string',description:'Punchy 2-3-line social/WhatsApp caption'},
            },
            required:['hook','story','short'],
          },
        },
        required:[key],
      },
      hashtags:{
        type:'array',
        items:{type:'string'},
        minItems:6,maxItems:8,
      },
    },
    required:['variations','hashtags'],
  };
}

/** Reject invalid keys/angles/scripts/hashtag markup instead of trusting
 * superficial model JSON compliance. Per-language prompts require real script.
 */
export function parseGeminiCaptionOutput(raw:unknown,language:CaptionLanguage):GeminiCaptionOutput|null{
  if(typeof raw!=='string'||raw.length>16000||raw.length<25)return null;
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{return null;}
  const root=record(parsed);
  if(!root||!hasOnlyKeys(root,['variations','hashtags']))return null;
  const variations=record(root.variations);
  const key=CAPTION_OUTPUT_LANGUAGE[language];
  if(!variations||!hasOnlyKeys(variations,[key]))return null;
  const selected=record(variations[key]);
  if(!selected||!hasOnlyKeys(selected,['hook','story','short']))return null;
  const angles={} as GeminiCaptionAngles;
  for(const angle of ['hook','story','short'] as const){
    const value=selected[angle];
    if(typeof value!=='string')return null;
    const clean=value.replace(/\u0000/g,'').trim();
    if(clean.length<12||clean.length>ANGLE_LIMITS[angle]||
      clean.includes('[[HOOK]]')||clean.includes('[[STORY]]')||clean.includes('[[SHORT]]'))return null;
    // A selected Tamil/Sinhala draft must be actual native-language copy,
    // rather than mostly English text merely labeled as that language.
    if(language==='ta'&&!/[\u0B80-\u0BFF]/u.test(clean))return null;
    if(language==='si'&&!/[\u0D80-\u0DFF]/u.test(clean))return null;
    angles[angle]=clean;
  }
  if(!Array.isArray(root.hashtags)||root.hashtags.length<6||root.hashtags.length>8)return null;
  const tags:string[]=[];
  for(const value of root.hashtags){
    if(typeof value!=='string'||normalizedTag(value)!==value||tags.includes(value))return null;
    tags.push(value);
  }
  return {variations:{[key]:angles},hashtags:tags};
}

/** Keep the existing DB caption text column and [[ANGLE]] reader backwards
 * compatible; hashtag metadata is retained in a final [[HASHTAGS]] segment.
 */
export function serializeGeminiCaptionOutput(output:GeminiCaptionOutput,language:CaptionLanguage):string|null{
  const selected=output.variations[CAPTION_OUTPUT_LANGUAGE[language]];
  if(!selected)return null;
  const text=[
    '[[HOOK]] '+selected.hook,
    '[[STORY]] '+selected.story,
    '[[SHORT]] '+selected.short,
    '[[HASHTAGS]] '+output.hashtags.join(' '),
  ].join('\n');
  return text.length<=3000?text:null;
}
