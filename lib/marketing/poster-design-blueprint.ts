/**
 * SLBI Poster Design Blueprint v2
 * The vendor approves all AI-proposed copy. AI NEVER supplies verified
 * contacts, price truth, credits, auth, or model billing instructions.
 * Font values and layout choices are strictly server/client allowlisted.
 */
import type {PosterFormat} from '@/lib/marketing/poster-design';
import type {PosterCopyLanguage} from '@/lib/marketing/puter-poster-composer';
import {isPosterCopyInLanguage,isNaturalEnglishOffer} from '@/lib/marketing/poster-language-copy';

export const POSTER_VIBES=['festive','modern_tech','luxury','bold_sale','warm_retail'] as const;
export type PosterVibe=typeof POSTER_VIBES[number];
export const POSTER_OVERLAYS=['dark_bottom_top','subtle_vignette'] as const;
export type PosterOverlay=typeof POSTER_OVERLAYS[number];
export const SAFE_ZONE_LAYOUTS=['top_center_hero','bottom_left_editorial','split_card'] as const;
export type SafeZoneLayout=typeof SAFE_ZONE_LAYOUTS[number];

/** All families are served with SIL OFL fonts by Google Fonts, on demand. */
export const POSTER_FONT_PAIRS={
  ta:[
    {label:'Tamil modern',headlineFont:'Noto Sans Tamil',bodyFont:'Hind Madurai'},
    {label:'Tamil festive',headlineFont:'Noto Serif Tamil',bodyFont:'Mukta Malar'},
    {label:'Tamil hand-lettered',headlineFont:'Kavivanar',bodyFont:'Mukta Malar'},
  ],
  si:[
    {label:'Sinhala modern',headlineFont:'Gemunu Libre',bodyFont:'Noto Sans Sinhala'},
    {label:'Sinhala classic',headlineFont:'Abhaya Libre',bodyFont:'Noto Sans Sinhala'},
  ],
  en:[
    {label:'Impact sale',headlineFont:'Anton',bodyFont:'Montserrat'},
    {label:'Modern commercial',headlineFont:'Montserrat',bodyFont:'Poppins'},
    {label:'Luxury editorial',headlineFont:'Playfair Display',bodyFont:'Plus Jakarta Sans'},
    {label:'Tech condensed',headlineFont:'Bebas Neue',bodyFont:'Inter'},
  ],
} as const;
const enumFonts={
  ta:['Noto Sans Tamil','Noto Serif Tamil','Kavivanar','Hind Madurai','Mukta Malar'],
  si:['Gemunu Libre','Abhaya Libre','Noto Sans Sinhala'],
  en:['Anton','Bebas Neue','Montserrat','Poppins','Playfair Display','Plus Jakarta Sans','Inter'],
} as const;
const globalFonts=Object.values(enumFonts).flat();
export type PosterBlueprint={
  posterCopy:{headline:string;offerText:string;ctaText:string};
  styling:{
    vibe:PosterVibe;headlineFont:string;bodyFont:string;
    primaryColor:string;accentColor:string;textColor:string;
    overlayGradient:PosterOverlay;
  };
  imagePrompt:string;
};
/** Client-side override NEVER chooses unvalidated arbitrary font/gradient. */
export type VerifiedPosterDesign={
  styling:PosterBlueprint['styling'];
  layout:SafeZoneLayout;
};
export const POSTER_BLUEPRINT_JSON_SCHEMA={
  type:'object',
  properties:{
    posterCopy:{
      type:'object',properties:{
        headline:{type:'string'},offerText:{type:'string'},ctaText:{type:'string'},
      },required:['headline','offerText','ctaText'],additionalProperties:false,
    },
    styling:{
      type:'object',properties:{
        vibe:{type:'string',enum:[...POSTER_VIBES]},
        headlineFont:{type:'string',enum:[...globalFonts]},
        bodyFont:{type:'string',enum:[...globalFonts]},
        primaryColor:{type:'string'},accentColor:{type:'string'},textColor:{type:'string'},
        overlayGradient:{type:'string',enum:[...POSTER_OVERLAYS]},
      },
      required:['vibe','headlineFont','bodyFont','primaryColor','accentColor',
        'textColor','overlayGradient'],additionalProperties:false,
    },
    imagePrompt:{type:'string'},
  },required:['posterCopy','styling','imagePrompt'],additionalProperties:false,
} as const;
function record(v:unknown):Record<string,unknown>{
  return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
}
function clean(v:unknown,max:number):string{
  return typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
}
function hex(v:unknown):string{
  if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Gemini returned an invalid design color.');
  return v.toUpperCase();
}
const includes=<T extends string>(values:readonly T[],value:unknown):value is T=>
  typeof value==='string'&&values.includes(value as T);
const percentages=(text:string)=>Array.from(
  text.matchAll(/(\d{1,3}(?:\.\d{1,2})?)\s*(?:%|percent(?:age)?\b|சதவீதம்|ප්‍රතිශතයක්)/giu),
  m=>Number(m[1]),
);
export function validatePosterBlueprint(value:unknown,input:{
  language:PosterCopyLanguage;vendorPrompt:string;approvedOffer?:string;
}):PosterBlueprint{
  const obj=record(value),copy=record(obj.posterCopy),style=record(obj.styling);
  const headline=clean(copy.headline,120);
  const offerText=clean(copy.offerText,60);
  const ctaText=clean(copy.ctaText,105);
  const imagePrompt=clean(obj.imagePrompt,2300);
  if(!headline||!ctaText||imagePrompt.length<80)
    throw Error('Gemini blueprint is incomplete. Keep your edited original prompt.');
  // Selected copy language is a validated content contract, not just a font
  // preference. No English headline/offer sneaking into Tamil/Sinhala posters.
  if(!isPosterCopyInLanguage({headline,offerText,ctaText},input.language))
    throw Error('Gemini poster copy does not match the selected language. Retry Prepare with Gemini or edit the exact copy.');
  if(input.language==='en'&&!isNaturalEnglishOffer(offerText))
    throw Error('Gemini returned unnatural English offer copy. Please retry.');
  if(!includes(POSTER_VIBES,style.vibe)||!includes(POSTER_OVERLAYS,style.overlayGradient))
    throw Error('Gemini blueprint contains an unsupported design style.');
  if(!enumFonts[input.language].includes(style.headlineFont as never)||
     !enumFonts[input.language].includes(style.bodyFont as never))
    throw Error('Gemini suggested a font not approved for the selected language.');
  // Gemini sometimes mixes two separately allowed families that were not a
  // tested pairing. Keep its headline selection where possible and normalize
  // the accompanying body face to the verified family-specific partner.
  const approvedPairs=POSTER_FONT_PAIRS[input.language];
  const pairing=approvedPairs.find(pair=>pair.headlineFont===style.headlineFont&&
    pair.bodyFont===style.bodyFont)||
    approvedPairs.find(pair=>pair.headlineFont===style.headlineFont)||
    approvedPairs[0];
  const requestedPercent=new Set(percentages(input.vendorPrompt+' '+(input.approvedOffer||'')));
  for(const found of percentages([headline,offerText,ctaText].join(' '))){
    if(!requestedPercent.has(found))
      throw Error('Gemini invented or changed a percentage. Keep the approved vendor offer.');
  }
  if(/(?:https?:\/\/|www\.|@[\w.-]+\.[a-z]{2,}|\+?\d[\d()\s-]{8,})/i.test(
    [headline,offerText,ctaText].join(' ')))
    throw Error('Gemini added contact information. Only owner-verified business contacts can appear.');
  return {
    posterCopy:{headline,offerText,ctaText},
    styling:{
      vibe:style.vibe,headlineFont:pairing.headlineFont,bodyFont:pairing.bodyFont,
      primaryColor:hex(style.primaryColor),accentColor:hex(style.accentColor),
      textColor:hex(style.textColor),overlayGradient:style.overlayGradient,
    },
    imagePrompt,
  };
}
export function selectLayout(format:PosterFormat,vibe:PosterVibe):SafeZoneLayout{
  if(format==='landscape')return 'bottom_left_editorial';
  if(format==='square'&&vibe==='modern_tech')return 'split_card';
  return 'top_center_hero';
}
export function fontsFor(language:PosterCopyLanguage){
  return POSTER_FONT_PAIRS[language];
}
export function shufflePosterDesign(
  current:VerifiedPosterDesign|null,language:PosterCopyLanguage,index:number,
  format:PosterFormat,
):VerifiedPosterDesign{
  const pairs=POSTER_FONT_PAIRS[language],i=((index%pairs.length)+pairs.length)%pairs.length;
  const pair=pairs[i];
  const palettes=[
    ['#07070C','#FF5E00','#FFFFFF'],
    ['#081C30','#36C5EF','#FFFFFF'],
    ['#2B192E','#F7BE76','#FFFFFF'],
    ['#184133','#E6B969','#FFFFFF'],
  ] as const;
  const [primaryColor,accentColor,textColor]=palettes[i%palettes.length];
  const layouts:SafeZoneLayout[]=
    format==='landscape'?['bottom_left_editorial']:['top_center_hero','split_card','bottom_left_editorial'];
  return {
    styling:{
      vibe:current?.styling.vibe||'modern_tech',
      headlineFont:pair.headlineFont,bodyFont:pair.bodyFont,
      primaryColor,accentColor,textColor,
      overlayGradient:i%2?'subtle_vignette':'dark_bottom_top',
    },
    layout:layouts[i%layouts.length],
  };
}
export type PosterSuggestion={
  id:string;label:string;months:readonly number[];categories:readonly string[];
  prompt:string;
};
export const POSTER_ACTION_SUGGESTIONS:readonly PosterSuggestion[]=[
  {id:'opening',label:'Grand Opening',months:[],categories:[],
    prompt:'Design a sophisticated Grand Opening announcement for my business. Only use date, location or offers that I explicitly provide.'},
  {id:'sale',label:'Mega Clearance Sale',months:[],categories:['retail','fashion','clothing','store','shop'],
    prompt:'Create a bold, modern clearance sale artwork. Do not invent discount percentages or pricing; I will supply my actual offer.'},
  {id:'arrivals',label:'New Arrivals',months:[],categories:['retail','fashion','clothing','store','shop'],
    prompt:'Create a trendy premium new-arrivals marketing design showcasing my actual product category; do not make up products or prices.'},
  {id:'admissions',label:'Admissions Open',months:[],categories:['education','school','training','college','tuition','academy'],
    prompt:'Create an elegant admissions campaign for my verified educational institution. Do not invent class dates, fees or credentials.'},
  {id:'delivery',label:'Free Delivery',months:[],categories:['food','restaurant','delivery','retail','store','shop'],
    prompt:'Create a vibrant local delivery service campaign. Only mention FREE DELIVERY if I confirm it is actually offered.'},
  {id:'pongal',label:'Thai Pongal Special',months:[1],categories:[],
    prompt:'Create an original culturally respectful Thai Pongal promotion for my actual business with warm harvest, pot and golden lighting; do not invent a discount.'},
  {id:'avurudu',label:'Avurudu Offer',months:[3,4],categories:[],
    prompt:'Create a modern Sinhala and Tamil New Year (Avurudu) campaign with tasteful Sri Lankan festive details; do not invent offers.'},
  {id:'vesak',label:'Vesak Campaign',months:[5],categories:[],
    prompt:'Create a culturally respectful Sri Lankan Vesak themed community campaign featuring tasteful lantern lighting. Avoid inappropriate commercial use of religious imagery.'},
  {id:'ramadan',label:'Ramadan Greetings',months:[2,3,4],categories:[],
    prompt:'Create a respectful Ramadan season greeting design with tasteful crescent, subtle gold accents and generous typography space. Avoid inventing discounts.'},
  {id:'christmas',label:'Christmas Offer',months:[11,12],categories:[],
    prompt:'Create a premium Christmas campaign with evergreen colors, warm golden bokeh and a modern hero composition; do not invent discounts.'},
  {id:'newyear',label:'New Year Promotion',months:[12,1],categories:[],
    prompt:'Create an elegant New Year promotion with premium midnight colors and festive light. Do not invent a specific date or offer.'},
  {id:'blackfriday',label:'Black Friday',months:[11],categories:[],
    prompt:'Create a dramatic Black Friday-inspired dark premium retail campaign. Use only my approved price and discount.'},
];
export function posterSuggestions(date:Date,category:string,max=8):PosterSuggestion[]{
  const month=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Colombo',month:'numeric'}).format(date));
  const next=month%12+1;
  const cat=category.toLowerCase();
  const score=(v:PosterSuggestion)=>
    v.months.includes(month)?0:v.months.includes(next)?1:
      v.categories.some(c=>cat.includes(c))?2:v.categories.length===0?3:4;
  return [...POSTER_ACTION_SUGGESTIONS].sort((a,b)=>score(a)-score(b)).slice(0,max);
}
