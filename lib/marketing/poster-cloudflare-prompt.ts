import 'server-only';
import type {PosterBusinessFacts,PosterIntelligenceBrief} from './poster-gemini-intelligence';

/**
 * Cloudflare Workers AI FLUX.2 Klein receives only the first 2048 characters
 * of a prompt in the current provider adapter. Put owner's exact business,
 * actual user request and opt-in reference semantics FIRST. Long Gemini
 * reasoning must not displace the subject or user-supplied promotion.
 */
export function buildCompactCloudflarePosterPrompt(input:{
  facts:PosterBusinessFacts;
  request:string;
  format:'square'|'portrait'|'story'|'landscape';
  outputLanguage:'ta'|'si'|'en';
  edit:boolean;
  useUploadedPixels:boolean;
  referenceSummary?:string;
  intelligence?:PosterIntelligenceBrief;
  fallbackCreative?:string;
}){
  const take=(v:string|undefined,n:number)=>(v||'').replace(/\s+/g,' ').trim().slice(0,n);
  const f=input.facts;
  const selected=[
    'Selected business: '+take(f.brandName||f.name,90),
    'Actual category: '+take(f.category,85),
    f.description?'Business services: '+take(f.description,230):'',
    f.city?'Location: '+take(f.city,65):'',
    f.phone?'Verified phone: '+take(f.phone,45):'',
    f.email?'Verified email: '+take(f.email,85):'',
    f.website?'Verified website: '+take(f.website,100):'',
  ].filter(Boolean).join('; ');
  const mode=input.edit
    ?'EDIT the ATTACHED ORIGINAL POSTER. Change only the user-requested aspects. Preserve all other subjects, business identity, layout and correct text.'
    :input.useUploadedPixels
      ?'CREATE A PREMIUM AD USING THE ATTACHED PHOTO AS SOURCE. Vendor explicitly authorized using that actual image; build a polished design around its subject.'
      :'CREATE A NEW ORIGINAL PREMIUM COMMERCIAL POSTER. No reference image pixels may be copied or embedded.';
  const notes=input.intelligence?
    'Verified creative interpretation: '+take(input.intelligence.translatedUserIntent,210)+'. '+
    'Art direction: '+take(input.intelligence.creativeDirectionEnglish,380)
    :'Art direction: '+take(input.fallbackCreative,390);
  const chunks=[
    mode,
    selected,
    'EXACT vendor request (highest priority): '+take(input.request,800),
    input.referenceSummary?'Style/context inspiration only (do NOT paste reference image): '+
      take(input.referenceSummary,380):'',
    'Poster format '+input.format+', text language '+input.outputLanguage+'.',
    notes,
    'Do not switch business category or show unrelated food/retail/services. No invented offers,',
    'discount amounts, phone numbers, URLs, addresses, certifications or logos.',
    'Make a professional detailed image with clear visual hierarchy; avoid gibberish words.',
  ];
  return chunks.filter(Boolean).join('\n').slice(0,2048);
}
