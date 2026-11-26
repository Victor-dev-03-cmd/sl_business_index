/**
 * WA-04: deterministic, multilingual owner *planning* entrypoint.
 * NOT a generative model, executor, WhatsApp reply, provider connector or
 * authorisation. All tools resolve to existing vendor review screens.
 * Caller must fetch current owner+business via authenticated SSR RLS.
 */
export const WA04_VERSION='slbi-wa04-owner-review-v1';
const LOCALES=['en','ta','si'];
const BLOCKED=/(?:factory\s*reset|delete\s*(?:my|all|every|the)?\s*(?:account|business|users?|database)|change\s*(?:password|billing|subscription)|remove\s*verification|கணக்கு\s*நீக்கு|அழி(?:த்து|க்க)|ගිණුම\s*මකන්න|දත්ත\s*මකන්න)/iu;
const SPECS=Object.freeze([
 {id:'campaign',href:'/vendor/marketing/campaigns',group:'draft',
  words:['poster','caption','campaign','marketing','promotion','offer','social','போஸ்டர்','கேப்ஷன்','பிரச்சாரம்','விளம்பரம்','சலுகை','சமூக','පෝස්ටර්','දැන්වීම','ප්‍රචාර','ප්‍රවර්ධන','වට්ටම්']},
 {id:'email',href:'/vendor/marketing-engine/email',group:'external',
  words:['email','e-mail','gmail','mailbox','newsletter','மெயில்','இமெயில்','மின்னஞ்சல்','ஈமெயில்','ඊමේල්','විද්‍යුත්','ලිපි']},
 {id:'leads',href:'/vendor/leads',group:'draft',
  words:['lead','customer enquiry','inquiry','follow-up','விசாரணை','லீட்','வாடிக்கையாளர்','தொடர்பு','පාරිභෝගික','විමසීම්','ලීඩ්']},
 {id:'reviews',href:'/vendor/reviews',group:'draft',
  words:['review','reputation','rating','feedback','மதிப்புரை','ரிவியூ','பின்னூட்ட','விமர்சனம்','සමාලෝචන','ඇගයීම්','ප්‍රතිචාර']},
 {id:'insights',href:'/vendor/insights',group:'read',
  words:['insights','analytics','growthscore','performance','report','analysis','வளர்ச்சி','பகுப்பாய்வு','அறிக்கை','செயல்திறன்','විශ්ලේෂණ','වාර්තාව','වර්ධනය','කාර්යසාධන']},
]);
const COPY=Object.freeze({
 en:{campaign:'Prepare campaign, poster and captions for review',email:'Review email draft and consented mailing readiness',
  leads:'Review owned enquiries and follow-up draft',reviews:'Review customer feedback and proposed replies',
  insights:'Open owner-scoped business insights',
  note:'Proposed steps only. No WhatsApp or email reply, publication or provider API call was made.',
  unknown:'Describe a campaign, email, lead, review or insights task.'},
 ta:{campaign:'போஸ்டர், கேப்ஷன் மற்றும் பிரச்சார வரைவைப் பரிசீலிக்கவும்',
  email:'மின்னஞ்சல் வரைவு மற்றும் பெறுநர் ஒப்புதலைச் சரிபார்க்கவும்',
  leads:'விசாரணைகள் மற்றும் follow-up வரைவைப் பரிசீலிக்கவும்',
  reviews:'மதிப்புரைகள் மற்றும் பதில் வரைவைப் பரிசீலிக்கவும்',
  insights:'உங்கள் வணிக வளர்ச்சி பகுப்பாய்வைப் பார்க்கவும்',
  note:'இவை பரிந்துரைகள் மட்டுமே. WhatsApp அல்லது மின்னஞ்சல் அனுப்பப்படவில்லை; எதுவும் வெளியிடப்படவில்லை.',
  unknown:'பிரச்சாரம், மின்னஞ்சல், லீட்ஸ், மதிப்புரை அல்லது பகுப்பாய்வு பற்றி எழுதுங்கள்.'},
 si:{campaign:'ප්‍රචාරණ, පෝස්ටර් සහ කැප්ෂන් කෙටුම්පත් සමාලෝචනය කරන්න',
  email:'ඊමේල් කෙටුම්පත සහ ලබන්නන්ගේ කැමැත්ත පරීක්ෂා කරන්න',
  leads:'පාරිභෝගික විමසීම් සහ පසු විපරම් කෙටුම්පත් බලන්න',
  reviews:'සමාලෝචන සහ යෝජිත පිළිතුරු පරීක්ෂා කරන්න',
  insights:'ඔබේ ව්‍යාපාරයේ වර්ධන විශ්ලේෂණ බලන්න',
  note:'මෙය යෝජනාවක් පමණි. WhatsApp හෝ ඊමේල් පණිවිඩ යවා නැත; කිසිවක් පළ කර නැත.',
  unknown:'ප්‍රචාරණ, ඊමේල්, පාරිභෝගික විමසීම්, සමාලෝචන හෝ විශ්ලේෂණ ඉල්ලීමක් ඇතුළත් කරන්න.'},
});
export function resolveWA04Locale(raw,preferred='auto'){
 if(LOCALES.includes(preferred))return preferred;
 if(/[\u0B80-\u0BFF]/u.test(raw))return 'ta';
 if(/[\u0D80-\u0DFF]/u.test(raw))return 'si';
 return 'en';
}
const matchesWord=(request,word)=>request.includes(word);
export function planWA04OwnerRequest(input,preferred='auto'){
 if(typeof input!=='string')return {ok:false,reason:'invalid_request'};
 const source=input.normalize('NFKC').trim();
 if(!source||source.length>500||/[\u0000-\u0008\u000B-\u001F\u007F]/u.test(source))
  return {ok:false,reason:'invalid_request'};
 const locale=resolveWA04Locale(source,preferred);
 const lower=source.toLocaleLowerCase('en');
 if(BLOCKED.test(lower))return {ok:false,reason:'unsupported_sensitive_operation',locale};
 const copy=COPY[locale];
 const actions=SPECS.filter(spec=>spec.words.some(word=>matchesWord(lower,word))).map(spec=>({
  id:spec.id,href:spec.href,title:copy[spec.id],
  kind:spec.group==='external'?'review_only_external_blocked':spec.group==='read'?'read_link':'draft_review',
  requiresFreshApproval:spec.group==='external',executed:false,
 }));
 return {ok:true,version:WA04_VERSION,locale,actions,
  summary:actions.length?copy.note:copy.unknown,
  externallyDispatched:false,persisted:false,approved:false};
}
