/**
 * Caption Lab display/brief contracts. Pure code: no API, no publishing,
 * claims enrichment or credits. Only provider-generated text is labeled AI.
 */
import type {CaptionLanguage,CaptionObjective} from './caption-contract.ts';
export type CaptionAngle='hook'|'story'|'short';
export type SocialPlatform='facebook'|'instagram'|'whatsapp';
export type CampaignGoal='flash_sale'|'new_arrival'|'festival'|'trust'|'education';
export type TonePosition=0|1|2;
export type AngleSet=Record<CaptionAngle,string>;
export type CaptionSet=Record<CaptionLanguage,AngleSet>;
export const ANGLES:readonly CaptionAngle[]=['hook','story','short'];
export const LANGUAGES:readonly CaptionLanguage[]=['ta','si','en'];
export const PLATFORMS:readonly SocialPlatform[]=['facebook','instagram','whatsapp'];
export const GOALS:readonly CampaignGoal[]=['flash_sale','new_arrival','festival','trust','education'];
export const labels:Record<CaptionLanguage,string>={ta:'தமிழ்',si:'සිංහල',en:'English'};
export const goalLabel:Record<CampaignGoal,string>={
  flash_sale:'Flash Sale / Offer',new_arrival:'New Arrival',
  festival:'Festival Greeting',trust:'Customer Trust',education:'Educational / Tip',
};
export const goalObjective:Record<CampaignGoal,CaptionObjective>={
  flash_sale:'promotion',new_arrival:'announcement',festival:'awareness',
  trust:'awareness',education:'awareness',
};
export const toneLabels=['Friendly & Local','Professional & Corporate','Urgent & High-Energy'] as const;
export const angleLabels:Record<CaptionAngle,{title:string;subtitle:string}>={
  hook:{title:'The Hook',subtitle:'Attention grabber'},
  story:{title:'Story & Value',subtitle:'Trust builder'},
  short:{title:'Short & Punchy',subtitle:'WhatsApp / IG'},
};
export const promptChips=[
  {label:'Weekend offer',text:'Weekend promotional campaign (only use confirmed dates and discount terms).'},
  {label:'Limited stock',text:'Highlight stock availability only if confirmed by the shop owner.'},
  {label:'Admissions open',text:'Announce admissions for confirmed courses only.'},
  {label:'New arrivals',text:'Introduce the verified new arrivals and invite enquiries.'},
  {label:'Festival special',text:'Prepare a culturally appropriate Sri Lankan seasonal greeting.'},
] as const;
export const emptyAngleSet=():AngleSet=>({hook:'',story:'',short:''});
export const emptyCaptions=():CaptionSet=>({ta:emptyAngleSet(),si:emptyAngleSet(),en:emptyAngleSet()});
const cap=(v:string,n:number)=>v.trim().slice(0,n);
export function parseThreeAngles(raw:string):AngleSet{
  const text=cap(raw,3000);
  const match=text.match(/^\s*\[\[HOOK\]\]\s*([\s\S]*?)\s*\[\[STORY\]\]\s*([\s\S]*?)\s*\[\[SHORT\]\]\s*([\s\S]+?)\s*$/i);
  if(!match)return {hook:text,story:'',short:''};
  return {hook:cap(match[1],900),story:cap(match[2],1100),short:cap(match[3],600)};
}
export function hashtagsFrom(text:string):string[]{
  return Array.from(new Set((text.match(/#[\p{L}\p{N}_]+/gu)||[]).map(x=>x.slice(0,48)))).slice(0,14);
}
export function removeHashtags(text:string):string{
  return text.replace(/(^|\s)#[\p{L}\p{N}_]+/gu,' ').replace(/ {2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
export function normalizedTag(raw:string):string|null{
  const word=raw.trim().replace(/^#+/,'').replace(/[^\p{L}\p{N}_]/gu,'');
  if(word.length<2||word.length>40)return null;
  return '#'+word;
}
export function withHashtags(text:string,tags:readonly string[]):string{
  const clean=removeHashtags(text);
  return [clean,tags.filter(t=>normalizedTag(t)===t).slice(0,12).join(' ')].filter(Boolean).join('\n\n');
}
export function safeLocalPolish(
 text:string,kind:'shorten'|'urgency'|'emojis'|'contact',
 language:CaptionLanguage,contact:{phone:string;city:string;website:string},
):string{
  const base=text.trim().slice(0,3000);
  if(!base)return base;
  if(kind==='shorten'){
    if(base.length<=180)return base;
    const first=base.slice(0,190);
    const stop=Math.max(first.lastIndexOf('. '),first.lastIndexOf('। '),
      first.lastIndexOf('! '),first.lastIndexOf('? '),first.lastIndexOf('\n'));
    return (stop>80?first.slice(0,stop+1):first.slice(0,180)).trim();
  }
  if(kind==='urgency'){
    // An invitation to ACT is safe; inventing deadlines, scarce stock,
    // guaranteed price or sales pressure is not.
    const cta=language==='ta'?'மேலும் அறிய இன்றே தொடர்புகொள்ளுங்கள்.':
      language==='si'?'වැඩි විස්තර සඳහා අදම අමතන්න.':'Contact us today to learn more.';
    return (base+'\n\n'+cta).slice(0,3000);
  }
  if(kind==='emojis')return ('✨ '+base).slice(0,3000);
  const verified=[contact.city.trim(),
    contact.phone.trim(),contact.website.trim()].filter(Boolean);
  return verified.length?(base+'\n\n'+verified.join(' · ')).slice(0,3000):base;
}
export function previewFold(text:string,expanded:boolean):{visible:string;folded:boolean}{
  if(expanded||text.length<=180)return {visible:text,folded:false};
  // Approximation only: social networks control their own fold mechanics.
  const head=text.slice(0,180);
  const end=head.lastIndexOf(' ');
  return {visible:(end>95?head.slice(0,end):head).trimEnd()+'…',folded:true};
}
export function languageBundle(captions:CaptionSet,angle:CaptionAngle,
 languages:readonly CaptionLanguage[]):string{
 return languages.map(lang=>captions[lang][angle].trim()?
   (languages.length>1?labels[lang]+'\n':'')+captions[lang][angle].trim():''
 ).filter(Boolean).join('\n\n');
}
