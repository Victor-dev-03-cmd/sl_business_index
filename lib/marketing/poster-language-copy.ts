import type {PosterCopyLanguage} from '@/lib/marketing/puter-poster-composer';
import type {PosterStyleId} from '@/lib/marketing/poster-reference-library';

/**
 * Enforce the explicit poster-copy language selected by the vendor.
 * Business name, verified contact details, and English-only art instructions
 * are NOT part of this validation. Digits, percentages, punctuation and
 * symbols can appear in any selected language; every nonempty copy field
 * must contain native-language text with no foreign-script words.
 */
const tamil=/\p{Script=Tamil}/u;
const sinhala=/\p{Script=Sinhala}/u;
const latin=/\p{Script=Latin}/u;
export function isPosterTextInLanguage(value:string,language:PosterCopyLanguage):boolean{
  const text=value.trim().normalize('NFC');
  if(!text)return true; // Empty offer is valid; headline/CTA are checked elsewhere.
  if(language==='ta')return tamil.test(text)&&!latin.test(text)&&!sinhala.test(text);
  if(language==='si')return sinhala.test(text)&&!latin.test(text)&&!tamil.test(text);
  return latin.test(text)&&!tamil.test(text)&&!sinhala.test(text);
}
export function isPosterCopyInLanguage(
  copy:{headline:string;offerText:string;ctaText:string},
  language:PosterCopyLanguage,
):boolean{
  return Boolean(copy.headline.trim()&&copy.ctaText.trim())&&
    isPosterTextInLanguage(copy.headline,language)&&
    isPosterTextInLanguage(copy.offerText,language)&&
    isPosterTextInLanguage(copy.ctaText,language);
}
export function isNaturalEnglishOffer(value:string):boolean{
  return !/\b(?:offer|discount)\s+for\s+(?:the\s+)?price\b/i.test(value);
}
export const STARTER_COPY:Readonly<Record<PosterCopyLanguage,{
  headline:string;cta:string;
}>>={
  ta:{headline:'தீபாவளி சிறப்பு',cta:'இன்றே தொடர்பு கொள்ளவும்'},
  si:{headline:'දීපාවලි විශේෂ',cta:'අදම අප අමතන්න'},
  en:{headline:'Deepavali Special',cta:'Contact us for details'},
};
const styleHeadlines:Readonly<Record<PosterStyleId,Record<PosterCopyLanguage,string>>>={
  christmas:{ta:'கிறிஸ்துமஸ் சிறப்புச் சலுகை',si:'නත්තල් විශේෂ දීමනා',en:'Christmas Special'},
  newyear:{ta:'புத்தாண்டுச் சிறப்புச் சலுகை',si:'අලුත් අවුරුදු විශේෂ',en:'New Year Special'},
  pongal:{ta:'தைப்பொங்கல் சிறப்பு',si:'තෛපොංගල් විශේෂ',en:'Thai Pongal Special'},
  avurudu:{ta:'சித்திரைப் புத்தாண்டுச் சிறப்பு',si:'අවුරුදු විශේෂ',en:'Avurudu Special'},
  deepavali:{ta:'தீபாவளி சிறப்பு',si:'දීපාවලි විශේෂ',en:'Deepavali Special'},
  halloween:{ta:'ஹாலோவீன் சிறப்பு',si:'හැලොවීන් විශේෂ',en:'Halloween Special'},
  flash:{ta:'ஆண்டு இறுதிச் சலுகை',si:'වසර අවසාන දීමනා',en:'Year-End Specials'},
  tech:{ta:'நவீன தொழில்நுட்பம்',si:'නවීන තාක්ෂණය',en:'Modern Tech'},
  luxury:{ta:'பிரீமியம் சிறப்பு',si:'උසස් විශේෂ',en:'Premium Luxury'},
};
export function starterHeadline(
  language:PosterCopyLanguage,style:PosterStyleId|null,
):string{
  return style?styleHeadlines[style][language]:STARTER_COPY[language].headline;
}
/** A percentage is sourced from reviewed vendor words, never invented. */
export function localizedPercentOffer(
  percentage:string,language:PosterCopyLanguage,
):string{
  if(!/^(?:100|[1-9]?\d)(?:\.\d{1,2})?%$/.test(percentage)||percentage==='0%')
    return '';
  return language==='ta'?percentage+' தள்ளுபடி':
    language==='si'?percentage+' වට්ටමක්':percentage+' OFF';
}
export function posterLanguageName(language:PosterCopyLanguage):string{
  return language==='ta'?'தமிழ்':language==='si'?'සිංහල':'English';
}
