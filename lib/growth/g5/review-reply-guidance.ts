/**
 * G5-02 — OPTIONAL, manually editable public reply guidance.
 *
 * Uses ONLY the recorded numeric rating; never interprets untrusted comments,
 * hallucinates a service resolution, issues refunds, writes reviews, or posts.
 * The vendor must read the actual review and explicitly publish any reply.
 */
export type ReviewReplyLanguage='en'|'ta'|'si';
export type ReviewReplyTone='careful'|'balanced'|'thanks'|'general';
export type ReviewReplyGuidance=Readonly<{
  tone:ReviewReplyTone;
  heading:string;
  checklist:readonly string[];
  draft:string;
  source:'recorded-rating-only';
}>;
const validRating=(rating:number|null):number|null=>
  typeof rating==='number'&&Number.isFinite(rating)&&rating>=1&&rating<=5?rating:null;
const bank:Record<ReviewReplyLanguage,Record<ReviewReplyTone,{heading:string;draft:string}>>={
  en:{
    careful:{
      heading:'Respond with care',
      draft:'Thank you for sharing your feedback. We are sorry your experience did not meet your expectations. We would appreciate the opportunity to understand your concerns and discuss them with you privately.',
    },
    balanced:{
      heading:'Acknowledge mixed feedback',
      draft:'Thank you for taking the time to leave a review. We appreciate your feedback and would welcome any additional details you wish to share so we can better understand your experience.',
    },
    thanks:{
      heading:'Thank the reviewer',
      draft:'Thank you for taking the time to share a review. We appreciate your feedback and your support.',
    },
    general:{
      heading:'Respond without assumptions',
      draft:'Thank you for taking the time to share your feedback. We value your perspective and welcome any additional details you would like us to know.',
    },
  },
  ta:{
    careful:{
      heading:'கவனத்துடன் பதிலளிக்கவும்',
      draft:'உங்கள் கருத்தைப் பகிர்ந்ததற்கு நன்றி. உங்கள் எதிர்பார்ப்புக்கு ஏற்ப அனுபவம் அமையாததற்கு வருந்துகிறோம். உங்கள் கவலைகளை மேலும் புரிந்துகொள்வதற்காகத் தனிப்பட்ட முறையில் பேச விரும்புகிறோம்.',
    },
    balanced:{
      heading:'கருத்தை மரியாதையுடன் ஏற்கவும்',
      draft:'மதிப்புரையைப் பகிர நேரம் ஒதுக்கியதற்கு நன்றி. உங்கள் கருத்தை மதிக்கிறோம். உங்கள் அனுபவத்தை நன்றாகப் புரிந்துகொள்ள விரும்பினால் கூடுதல் விவரங்களைப் பகிரலாம்.',
    },
    thanks:{
      heading:'வாடிக்கையாளருக்கு நன்றி கூறவும்',
      draft:'உங்கள் மதிப்புரைக்கும் கருத்துக்கும் மிக்க நன்றி. கருத்தைப் பகிர நேரம் ஒதுக்கியதையும் நீங்கள் அளித்த ஆதரவையும் மதிக்கிறோம்.',
    },
    general:{
      heading:'ஊகிக்காமல் பதிலளிக்கவும்',
      draft:'உங்கள் கருத்தைப் பகிர்ந்ததற்கு நன்றி. உங்கள் பார்வையை மதிக்கிறோம். நீங்கள் விரும்பினால் கூடுதல் விவரங்களை எங்களுடன் பகிரலாம்.',
    },
  },
  si:{
    careful:{
      heading:'සැලකිල්ලෙන් පිළිතුරු දෙන්න',
      draft:'ඔබගේ අදහස් බෙදාගත්තාට ස්තුතියි. ඔබ අපේක්ෂා කළ අත්දැකීම නොලැබීම ගැන කනගාටු වෙමු. ඔබගේ ගැටලු වඩා හොඳින් අවබෝධ කරගැනීමට පෞද්ගලිකව සාකච්ඡා කිරීමට අපි කැමැත්තෙමු.',
    },
    balanced:{
      heading:'ප්‍රතිචාරය ගෞරවයෙන් පිළිගන්න',
      draft:'සමාලෝචනයක් ලබාදීමට කාලය වෙන් කළාට ස්තුතියි. ඔබගේ අදහස් අපි අගය කරමු. ඔබ කැමති නම් වැඩි විස්තර අප සමඟ බෙදාගන්න.',
    },
    thanks:{
      heading:'පාරිභෝගිකයාට ස්තුති කරන්න',
      draft:'ඔබගේ සමාලෝචනයට ස්තුතියි. ඔබගේ අදහස් සහ සහයෝගය අපි අගය කරමු.',
    },
    general:{
      heading:'අනුමාන නොකර පිළිතුරු දෙන්න',
      draft:'ඔබගේ අදහස් බෙදාගත්තාට ස්තුතියි. ඔබගේ මතය අපි අගය කරමු. ඔබට අවශ්‍ය නම් වැඩි විස්තර අප සමඟ බෙදාගත හැක.',
    },
  },
};
export function buildReviewReplyGuidance(
  rating:number|null,
  language:ReviewReplyLanguage,
):ReviewReplyGuidance {
  const value=validRating(rating);
  const tone:ReviewReplyTone=value===null?'general':value<=2?'careful':value===3?'balanced':'thanks';
  const phrases=bank[language]||bank.en;
  return {
    tone,
    heading:phrases[tone].heading,
    checklist:[
      'Read the full customer review before using this suggestion.',
      'Do not publish customer private details, promises, discounts or unverified claims.',
      'Edit this draft for the actual situation. Only Publish reply sends it publicly.',
    ],
    draft:phrases[tone].draft,
    source:'recorded-rating-only',
  };
}
