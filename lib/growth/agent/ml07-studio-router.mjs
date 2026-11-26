/**
 * ML-07 12-app multilingual intent-to-review router.
 * Safe deterministic baseline, NOT the trained numeric Growth recommender or
 * an LLM and not a provider executor. Output links are a proposal only.
 * This package must never read business data or OAuth/Meta credentials.
 * Server caller uses fresh auth.getUser + owned approved business + RLS.
 */
export const ML07_STUDIO_ROUTER_VERSION='ml07-studio-intents-v1';
const SPECS=[
 {id:'campaign-planner',href:'/vendor/marketing/campaigns',kind:'draft_review',
  en:['campaign','campaign planner','offer campaign','promotional plan'],ta:['பிரச்சார','சலுகை திட்ட','கேம்பெயின்'],si:['ප්‍රචාරණ සැලැස්ම','ව්‍යාපාර ප්‍රචාර']},
 {id:'poster-editor',href:'/vendor/marketing/design/puter-lab',kind:'draft_review',
  en:['poster','design poster','creative artwork'],ta:['போஸ்டர்','சுவரொட்டி','வடிவமைப்பு'],si:['පෝස්ටර්','පෝස්ටරයක්','නිර්මාණ']},
 {id:'caption-lab',href:'/vendor/marketing/captions',kind:'draft_review',
  en:['caption','hashtag','social text'],ta:['கேப்ஷன்','குறும்பதிவு','ஹேஷ்டேக்'],si:['කැප්ෂන්','ශීර්ෂ පාඨ','හෑෂ්ටැග්']},
 {id:'brand-kit',href:'/vendor/marketing/brand',kind:'draft_review',
  en:['brand kit','brand colors','brand identity','logo palette'],ta:['பிராண்ட்','லோகோ','வணிக அடையாளம்'],si:['වෙළඳ සන්නාම','ලාංඡන','වර්ණ පටිපාටිය']},
 {id:'social-marketing',href:'/vendor/marketing-engine/social',kind:'provider_blocked',
  en:['facebook post','instagram post','publish social','social marketing'],ta:['பேஸ்புக்','இன்ஸ்டாகிராம்','சமூக ஊடகம்'],si:['ෆේස්බුක්','ඉන්ස්ටග්‍රෑම්','සමාජ මාධ්‍ය']},
 {id:'email-marketing',href:'/vendor/marketing-engine/email',kind:'provider_blocked',
  en:['email','gmail','newsletter','mail campaign','outlook'],ta:['மின்னஞ்சல்','மெயில்','ஈமெயில்','இமெயில்','ஜிமெயில்'],si:['ඊමේල්','විද්‍යුත් තැපෑල','පුවත් ලිපි','ජීමේල්']},
 {id:'voice-agent',href:'/vendor/marketing-engine/agent',kind:'provider_blocked',
  en:['call agent','voice agent','answer calls','inbound call','phone support'],ta:['கால் ஏஜென்ட்','தொலைபேசி அழைப்பு','குரல் ஏஜென்ட்'],si:['ඇමතුම් නියෝජිත','දුරකථන ඇමතුම්','හඬ නියෝජිත']},
 {id:'workflow-automation',href:'/vendor/marketing-engine/automation',kind:'provider_blocked',
  en:['automation','automate workflow','workflow rules','auto follow up'],ta:['ஆட்டோமேஷன்','தானியங்கி','பணிப்பாய்வு'],si:['ස්වයංක්‍රීයකරණ','ස්වයංක්‍රීය','කාර්ය ප්‍රවාහ']},
 {id:'plugin-connectors',href:'/vendor/marketing-engine/connections',kind:'provider_blocked',
  en:['connect apps','app connectors','plugin connectors','oauth','integrations','gmail connector','connect gmail'],ta:['கனெக்டர்ஸ்','செயலி இணைப்பு','ஆப் இணைப்பு','ஜிமெயில் கனெக்டர்','கூகுள் மெயில் இணைப்பு'],si:['යෙදුම් සම්බන්ධක','ඒකාබද්ධ කිරීම්','සම්බන්ධක','ජීමේල් සම්බන්ධක']},
 {id:'content-calendar',href:'/vendor/marketing-engine/calendar',kind:'draft_review',
  en:['content calendar','schedule content','campaign calendar'],ta:['உள்ளடக்க காலண்டர்','நாட்காட்டி','பதிவு அட்டவணை'],si:['අන්තර්ගත දින දර්ශනය','දින දර්ශනය','පළකිරීම් කාලසටහන']},
 {id:'leads-workspace',href:'/vendor/marketing-engine/leads',kind:'draft_review',
  en:['marketing leads','lead pipeline','lead intelligence'],ta:['மார்க்கெட்டிங் லீட்ஸ்','விற்பனை வாய்ப்பு','லீட் முன்னுரிமை'],si:['අලෙවි ලීඩ්','අනාගත පාරිභෝගික','ලීඩ් ප්‍රමුඛතා']},
 {id:'leads-crm',href:'/vendor/leads',kind:'draft_review',
  en:['leads crm','customer enquiry','lead followup','crm'],ta:['லீட்ஸ் சிஆர்எம்','வாடிக்கையாளர் விசாரணை','வாடிக்கையாளர் தொடர்பு'],si:['පාරිභෝගික විමසීම්','පාරිභෝගික කළමනාකරණය','සීආර්එම්']},
];
export const ML07_STUDIO_APPS=Object.freeze(SPECS.map(({id,href,kind})=>Object.freeze({id,href,kind})));
const FAIL=Object.freeze({ok:false,reason:'invalid_request'});
const LIMIT=500;
const SCRIPT_TA=/[\u0B80-\u0BFF]/u,SCRIPT_SI=/[\u0D80-\u0DFF]/u;
const SENSITIVE=/(?:delete\s+(?:the\s+)?(?:business|account|all data)|factory\s+reset|change\s+(?:password|billing|subscription)|அனைத்து\s+தரவு\s+அழி|கணக்கு\s+நீக்கு|සියලු\s+දත්ත\s+මකන්න)/iu;
function hasTerm(hay,needle){
 const t=needle.toLocaleLowerCase('en');
 let offset=hay.indexOf(t);
 if(offset<0)return false;
 if(SCRIPT_TA.test(t)||SCRIPT_SI.test(t))return true;
 while(offset>=0){
  const before=offset?hay[offset-1]:'';
  const after=hay[offset+t.length]||'';
  if((!before||!(/[\p{L}\p{N}]/u).test(before))&&
    (!after||!(/[\p{L}\p{N}]/u).test(after)))return true;
  offset=hay.indexOf(t,offset+1);
 }
 return false;
}
export function routeML07StudioRequest(input,preferred='auto'){
 if(typeof input!=='string'||!input.trim()||input.length>LIMIT||
 /[\u0000-\u001F\u007F]/u.test(input))return FAIL;
 const raw=input.normalize('NFKC').trim(),lower=raw.toLocaleLowerCase('en');
 const locale=['en','ta','si'].includes(preferred)?preferred:SCRIPT_TA.test(raw)?'ta':SCRIPT_SI.test(raw)?'si':'en';
 if(SENSITIVE.test(raw))return {ok:false,reason:'sensitive_operation_blocked',locale};
 const all=/(?:all\s+12\s+apps|all\s+marketing\s+apps|பன்னிரண்டு\s+ஆப்|அனைத்து\s+செயலிகள்|යෙදුම්\s+දොළහම)/iu.test(raw);
 const matched=SPECS.filter(spec=>all||
 [...spec[locale],...spec.en].some(term=>hasTerm(lower,term)));
 return {ok:true,version:ML07_STUDIO_ROUTER_VERSION,locale,
  actions:matched.map(spec=>({
   id:spec.id,href:spec.href,kind:spec.kind,
   requiresProviderAuthorization:spec.kind==='provider_blocked',
   requiresOwnerReview:true,executed:false,sent:false,
  })),
  abstained:matched.length===0,
  ownerApprovalGranted:false,providerCallMade:false,saved:false,
 };
}
