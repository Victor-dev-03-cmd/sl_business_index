/**
 * Marketing Engine / Agent — local rules-only enquiry routing foundation.
 * NOT a neural network, LLM or real inbound provider integration.
 * No customer message is stored, sent or billed by this classifier.
 */
export const ENQUIRY_INTENTS=[
  'opening_hours','location','contact','pricing','booking','complaint','general'
] as const;
export type EnquiryIntent=(typeof ENQUIRY_INTENTS)[number];
export type EnquiryTriage={
  intent:EnquiryIntent;
  action:'human_review'|'faq_lookup'|'create_lead';
  risk:'ordinary'|'requires_human';
  matched:number;
  reason:string;
};
const patterns:ReadonlyArray<{intent:EnquiryIntent;words:readonly string[]}>= [
  {intent:'opening_hours',words:['open now','opening time','opening hours','when open','what time','hours','நேரம்','திறப்பு','திறந்திரு','எத்தனை மணிக்கு','வேලාව','විවෘත','කීයට','පැය']},
  {intent:'location',words:['location','address','where is','located','where are','directions','find you','முகவரி','எங்கே','இடம்','போக','ලිපිනය','කොහෙද','ස්ථානය','තැන']},
  {intent:'contact',words:['phone','call you','contact','number','தொலைபேசி','தொடர்பு','போன் நம்பர்','இலக்கம்','අංකය','දුරකථන','ඇමතුම්']},
  {intent:'pricing',words:['price','cost','discount','how much','rate','விலை','எவ்வளவு','தள்ளுபடி','මිල','ගාණ','වට්ටම්','කීයද']},
  {intent:'booking',words:['booking','book now','appointment','reserve','reservation','முன்பதிவு','புக்','அப்பாயின்மெண்ட்','වෙන්කර','පොත්','හමුවීමක්']},
  {intent:'complaint',words:['complaint','refund','scam','fraud','problem','unhappy','issue','புகார்','பிரச்சினை','பிரச்சனை','பணம் திருப்ப','ஏமாற்று','පැමිණිලි','ආපසු','ගැටලුව','වංචාව']},
];
export function triageMarketingEnquiry(message:string):EnquiryTriage{
  const normalized=message.normalize('NFKC').toLocaleLowerCase().trim().slice(0,1200);
  if(!normalized)return {intent:'general',action:'human_review',risk:'requires_human',matched:0,reason:'Enter a customer message first.'};
  const hits=patterns.map(rule=>{
    const matched=rule.words.filter(word=>normalized.includes(word)).length;
    return {intent:rule.intent,matched};
  }).filter(hit=>hit.matched>0).sort((a,b)=>b.matched-a.matched);
  if(!hits.length)return {intent:'general',action:'human_review',risk:'requires_human',matched:0,reason:'No reliable FAQ intent matched; human review required.'};
  // Never let another lower-risk keyword override a complaint or payment issue.
  if(hits.some(h=>h.intent==='complaint')){
    const match=hits.find(h=>h.intent==='complaint')!;
    return {intent:'complaint',action:'human_review',risk:'requires_human',matched:match.matched,reason:'Complaints, refunds or disputes must go to a human.'};
  }
  if(hits.some(h=>h.intent==='pricing')){
    const match=hits.find(h=>h.intent==='pricing')!;
    return {intent:'pricing',action:'human_review',risk:'requires_human',matched:match.matched,reason:'Prices and discounts require current business-owner verification.'};
  }
  const best=hits[0];
  // Multiple unrelated intents are ambiguous, not permission to auto-answer.
  if(hits.length>1)return {intent:best.intent,action:'human_review',risk:'requires_human',matched:best.matched,reason:'Several customer intents detected; review the full request.'};
  if(best.intent==='booking')return {intent:best.intent,action:'create_lead',risk:'requires_human',matched:best.matched,reason:'Create a lead for confirmation; do not promise a booking automatically.'};
  return {intent:best.intent,action:'faq_lookup',risk:'ordinary',matched:best.matched,reason:'Look up verified business facts and draft a reply for owner approval.'};
}
