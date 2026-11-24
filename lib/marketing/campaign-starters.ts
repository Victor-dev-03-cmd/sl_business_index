import type {CampaignLanguage,CampaignObjective} from './campaign-language';

/** Free, locally defined starter ideas. User must choose one and review/edit before sharing. */
export const CAMPAIGN_STARTERS:Record<CampaignLanguage,Record<CampaignObjective,readonly [string,string]>>={
  English:{
    awareness:['Discover our services and contact us for details.','Learn more about what we do and how to get in touch.'],
    promotion:['Contact us for current prices and service information.','Ask about available options before making a decision.'],
    enquiries:['Have a question about our services? Send us a message.','Tell us what you need and contact us for details.'],
    announcement:['Stay in touch with our business for updates.','Contact us for the latest information about our services.'],
  },
  'தமிழ்':{
    awareness:['எங்கள் சேவைகளைப் பற்றி அறிந்துகொள்ளுங்கள். மேலும் விவரங்களுக்கு தொடர்புகொள்ளுங்கள்.','நாங்கள் வழங்கும் சேவைகள் மற்றும் தொடர்பு விவரங்களை அறிந்துகொள்ளுங்கள்.'],
    promotion:['தற்போதைய விலைகள் மற்றும் சேவைகள் பற்றிய விவரங்களுக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.','உங்களுக்கு ஏற்ற சேவைகள் பற்றிய தகவல்களை எங்களிடம் கேட்டறியுங்கள்.'],
    enquiries:['எங்கள் சேவைகள் பற்றி கேள்விகள் உள்ளதா? எங்களுக்கு செய்தி அனுப்புங்கள்.','உங்களுக்குத் தேவையான தகவல்களை எங்களிடம் கேட்டறியுங்கள்.'],
    announcement:['எங்கள் வணிகத்தின் தகவல்களை அறிய எங்களுடன் தொடர்பில் இருங்கள்.','எங்கள் சேவைகள் பற்றிய புதிய விவரங்களுக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.'],
  },
  'සිංහල':{
    awareness:['අපගේ සේවා ගැන දැනගන්න. වැඩි විස්තර සඳහා අප අමතන්න.','අප කරන දේ සහ අප හා සම්බන්ධ වන ආකාරය ගැන දැනගන්න.'],
    promotion:['වත්මන් මිල ගණන් සහ සේවා පිළිබඳ අපෙන් විමසන්න.','ඔබට ගැළපෙන සේවා විකල්ප පිළිබඳ විස්තර අපෙන් අසන්න.'],
    enquiries:['අපගේ සේවා ගැන ප්‍රශ්නයක් තිබේද? අපට පණිවිඩයක් එවන්න.','ඔබට අවශ්‍ය තොරතුරු සඳහා අපෙන් විමසන්න.'],
    announcement:['අපගේ ව්‍යාපාරික තොරතුරු සඳහා අප සමඟ සම්බන්ධව සිටින්න.','අපගේ සේවා පිළිබඳ නවතම තොරතුරු සඳහා අප අමතන්න.'],
  }
};
export const CAMPAIGN_HELP:Record<CampaignLanguage,{free:string;readiness:string;business:string;message:string;channel:string;ideas:string;ideaNote:string;preview:string}>={
  English:{free:'Free planner · No Pro required',readiness:'Ready to share',business:'Business',message:'Message',channel:'Channel',ideas:'Start with an example',ideaNote:'Tap to use, then edit your own facts. No AI or credits.',preview:'Live preview · Nothing is posted automatically'},
  'தமிழ்':{free:'இலவச திட்டமிடல் · Pro தேவையில்லை',readiness:'பகிரத் தயாரா?',business:'வணிகம்',message:'செய்தி',channel:'தளம்',ideas:'உதாரணத்துடன் தொடங்குங்கள்',ideaNote:'தேர்ந்தெடுத்து உங்கள் தகவல்களுக்கு ஏற்ப திருத்துங்கள். AI அல்லது credits இல்லை.',preview:'நேரடி முன்னோட்டம் · தானாக வெளியிடப்படாது'},
  'සිංහල':{free:'නොමිලේ සැලසුම් · Pro අවශ්‍ය නැත',readiness:'බෙදාගැනීමට සූදානම්ද?',business:'ව්‍යාපාරය',message:'පණිවිඩය',channel:'මාධ්‍යය',ideas:'උදාහරණයකින් පටන් ගන්න',ideaNote:'තෝරා ඔබගේ තොරතුරු අනුව සංස්කරණය කරන්න. AI හෝ credits නැත.',preview:'සජීව පෙරදසුන · ස්වයංක්‍රීයව පළ නොවේ'}
};
export const getCampaignStarterIdeas=(language:CampaignLanguage,objective:CampaignObjective):readonly [string,string]=>CAMPAIGN_STARTERS[language][objective];
