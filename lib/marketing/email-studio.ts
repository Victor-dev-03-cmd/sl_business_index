/**
 * SLBI Email Studio V2 — display/draft helpers only.
 * These pure functions do NOT import recipients, grant consent, generate paid AI
 * output, contact Gmail, or claim that any campaign was delivered.
 */
export type EmailLanguage='en'|'ta'|'si';
export type EmailCampaignType='offer'|'launch'|'followup'|'newsletter';
export type InboxDevice='desktop'|'mobile';
export type EmailBrand={
  name:string;slogan:string;primaryColor:string;accentColor:string;
  logoUrl:string|null;address:string;city:string;profileUrl:string;
};
export type EmailDraft={
  subject:string;preheader:string;body:string;ctaLabel:string;ctaUrl:string;
};
export const EMAIL_LANGUAGES=[
  {value:'en',label:'English'},
  {value:'ta',label:'தமிழ்'},
  {value:'si',label:'සිංහල'},
] as const;
export const EMAIL_CAMPAIGNS=[
  {value:'offer',label:'Promotional offer / Festival sale'},
  {value:'launch',label:'New product / Course launch'},
  {value:'followup',label:'Follow-up to enquiries'},
  {value:'newsletter',label:'Newsletter / Update'},
] as const;
export const EMAIL_MERGE_TAGS=[
  '{{Customer_Name}}','{{Business_Name}}','{{City}}','{{SLBI_Profile_Link}}',
] as const;
export const EMAIL_TEMPLATES:Record<EmailLanguage,Record<EmailCampaignType,{
  subject:string;hello:string;lead:string;ending:string;cta:string;preheader:string;
}>>={
  en:{
    offer:{subject:'An offer from',hello:'Hello,',lead:'We would like to share this offer:',ending:'Please check the details, dates and conditions with us.',cta:'View offer',preheader:'Explore what is new from'},
    launch:{subject:'New from',hello:'Hello,',lead:'We are pleased to share a new launch:',ending:'Contact us to learn more.',cta:'Learn more',preheader:'Discover the latest update from'},
    followup:{subject:'Following up —',hello:'Hello,',lead:'Thank you for contacting us. Here is the information we discussed:',ending:'If you have questions, please reply to us.',cta:'Get in touch',preheader:'A helpful follow-up from'},
    newsletter:{subject:'News from',hello:'Hello,',lead:'Here are our latest business updates:',ending:'Thank you for staying connected.',cta:'See our business',preheader:'News and useful information from'},
  },
  ta:{
    offer:{subject:'சலுகை —',hello:'வணக்கம்,',lead:'எங்கள் புதிய சலுகை பற்றிய தகவல்:',ending:'விவரங்கள், காலக்கெடு மற்றும் நிபந்தனைகளை உறுதிப்படுத்திக் கொள்ளுங்கள்.',cta:'சலுகையைப் பார்க்க',preheader:'புதிய சலுகைகள் —'},
    launch:{subject:'புதிய அறிமுகம் —',hello:'வணக்கம்,',lead:'எங்கள் புதிய அறிமுகம் பற்றிய தகவல்:',ending:'மேலதிக விவரங்களுக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.',cta:'மேலும் அறிய',preheader:'புதிய தகவல்கள் —'},
    followup:{subject:'உங்கள் விசாரணை தொடர்பாக —',hello:'வணக்கம்,',lead:'எங்களைத் தொடர்புகொண்டதற்கு நன்றி. நீங்கள் கேட்ட தகவல்கள்:',ending:'மேலும் கேள்விகள் இருந்தால் பதில் அனுப்புங்கள்.',cta:'தொடர்புகொள்ள',preheader:'உங்கள் விசாரணைக்கு பதில் —'},
    newsletter:{subject:'செய்திமடல் —',hello:'வணக்கம்,',lead:'எங்கள் வணிகத்தின் புதிய தகவல்கள்:',ending:'எங்களுடன் இணைந்திருப்பதற்கு நன்றி.',cta:'வணிக விவரங்கள்',preheader:'சமீபத்திய தகவல்கள் —'},
  },
  si:{
    offer:{subject:'විශේෂ දීමනාව —',hello:'ආයුබෝවන්,',lead:'අපගේ දීමනාව පිළිබඳ විස්තර:',ending:'වැඩි විස්තර සහ කොන්දේසි තහවුරු කරගන්න.',cta:'දීමනාව බලන්න',preheader:'නව දීමනාවක් —'},
    launch:{subject:'නව හඳුන්වාදීම —',hello:'ආයුබෝවන්,',lead:'අපගේ නව හඳුන්වාදීම පිළිබඳ තොරතුරු:',ending:'වැඩි විස්තර සඳහා අප හා සම්බන්ධ වන්න.',cta:'වැඩි විස්තර',preheader:'නව තොරතුරු —'},
    followup:{subject:'ඔබගේ විමසීමට පිළිතුර —',hello:'ආයුබෝවන්,',lead:'ඔබගේ විමසීමට ස්තූතියි. මෙන්න වැඩිදුර විස්තර:',ending:'ප්‍රශ්න ඇත්නම් අපට පිළිතුරු එවන්න.',cta:'සම්බන්ධ වන්න',preheader:'ඔබගේ විමසීම සඳහා —'},
    newsletter:{subject:'අලුත් තොරතුරු —',hello:'ආයුබෝවන්,',lead:'අපගේ නවතම තොරතුරු:',ending:'අප සමඟ රැඳී සිටීම ගැන ස්තූතියි.',cta:'අප ගැන බලන්න',preheader:'ව්‍යාපාරික පුවත් —'},
  },
};
export const textLimit=(v:unknown,limit:number):string=>
  typeof v==='string'?v.replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,limit):'';
export const hexColor=(v:unknown,fallback='#FF7900'):string=>
  typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v)?v.toUpperCase():fallback;
export const validEmail=(v:unknown):v is string=>
  typeof v==='string'&&v.length<=254&&/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v);
export function httpsLink(raw:unknown):string|null{
  if(typeof raw!=='string'||raw.length>600)return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.'))return null;
    return url.href;
  }catch{return null;}
}
export function defaultEmailDraft(lang:EmailLanguage,type:EmailCampaignType,brand:EmailBrand,details=''):EmailDraft{
  const template=EMAIL_TEMPLATES[lang][type];
  const name=textLimit(brand.name,80)||'Your business';
  const message=textLimit(details,1600)||'[Write approved campaign details]';
  return {
    subject:(template.subject+' '+name).slice(0,140),
    preheader:(template.preheader+' '+name).slice(0,180),
    body:[template.hello,'',template.lead,message,'',template.ending,'',name].join('\n'),
    ctaLabel:template.cta,
    ctaUrl:brand.profileUrl,
  };
}
export function subjectSuggestions(draft:EmailDraft,brand:EmailBrand):string[]{
  const original=textLimit(draft.subject,140);
  const name=textLimit(brand.name,80);
  const variants=[
    original,
    [name,textLimit(draft.preheader,70)].filter(Boolean).join(' · ').slice(0,140),
    [textLimit(draft.preheader,90),name].filter(Boolean).join(' — ').slice(0,140),
  ];
  return Array.from(new Set(variants.filter(Boolean))).slice(0,3);
}
/** Heuristic content readiness, never a spam/deliverability probability. */
export function emailContentChecks(draft:EmailDraft){
  return [
    {label:'Subject under 80 characters',pass:draft.subject.trim().length>0&&draft.subject.trim().length<=80},
    {label:'Preheader provided',pass:draft.preheader.trim().length>=12},
    {label:'Clear message',pass:draft.body.trim().length>=40&&!draft.body.includes('[Write approved')},
    {label:'CTA uses secure HTTPS',pass:Boolean(httpsLink(draft.ctaUrl))},
  ];
}
export function escapeEmailHtml(input:unknown):string{
  const s=typeof input==='string'?input:'';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
/** Local-only CSV parser: supports quoted fields and CRLF, never uploads contacts. */
export function parseAudienceCsv(raw:string):{valid:number;invalid:number;declaredOptIn:number;truncated:boolean}{
  if(typeof raw!=='string'||raw.length>1_000_000)throw Error('CSV must be smaller than 1 MB.');
  const rows:string[][]=[];let field='',line:string[]=[],quoted=false;
  for(let i=0;i<raw.length;i++){
    const ch=raw[i];
    if(ch==='"'){
      if(quoted&&raw[i+1]==='"'){field+='"';i++}else quoted=!quoted;
    }else if(!quoted&&(ch===','||ch==='\n'||ch==='\r')){
      if(ch==='\r'&&raw[i+1]==='\n')i++;
      line.push(field);field='';
      if(ch!==','){if(line.some(c=>c.trim()))rows.push(line);line=[];}
    }else field+=ch;
    if(rows.length>2000)return {valid:0,invalid:0,declaredOptIn:0,truncated:true};
  }
  if(quoted)throw Error('Unclosed quoted value in CSV.');
  line.push(field);if(line.some(c=>c.trim()))rows.push(line);
  if(!rows.length)return {valid:0,invalid:0,declaredOptIn:0,truncated:false};
  const first=rows[0].map(x=>x.trim().toLowerCase().replace(/^\uFEFF/,''));
  const emailIndex=first.findIndex(x=>['email','email_address','e-mail'].includes(x));
  if(emailIndex<0)throw Error('CSV needs an email column.');
  const consentIndex=first.findIndex(x=>['marketing_opt_in','marketing_consent','opt_in'].includes(x));
  const evidenceIndex=first.findIndex(x=>['consented_at','consent_date','consent_timestamp'].includes(x));
  const unique=new Set<string>();let invalid=0,declaredOptIn=0;
  for(const row of rows.slice(1)){
    const email=(row[emailIndex]||'').trim().toLowerCase();
    if(!validEmail(email)||unique.has(email)){invalid++;continue;}
    unique.add(email);
    const opt=(row[consentIndex]||'').trim().toLowerCase();
    const timestamp=row[evidenceIndex]||'';
    if(consentIndex>=0&&evidenceIndex>=0&&['yes','true','1','opted_in'].includes(opt)
      &&Number.isFinite(Date.parse(timestamp))&&Date.parse(timestamp)<=Date.now())declaredOptIn++;
  }
  return {valid:unique.size,invalid,declaredOptIn,truncated:false};
}
export function countPastedEmails(raw:string):{valid:number;invalid:number}{
  if(raw.length>100_000)throw Error('Email paste is limited to 100 KB.');
  const tokens=raw.split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
  const unique=new Set<string>();let invalid=0;
  if(tokens.length>2000)throw Error('Preview at most 2,000 email addresses.');
  for(const token of tokens){const v=token.toLowerCase();if(validEmail(v))unique.add(v);else invalid++}
  return {valid:unique.size,invalid};
}
