/**
 * G5-01 Reputation Intelligence: action ordering grounded ONLY in
 * owner-visible, published review rating and saved reply records.
 * No LLM sentiment claims, no rating manipulation and no auto-replies.
 */
export type ReputationReview=Readonly<{
  id:string;
  rating:number|null;
  created_at:string;
  review_replies:readonly {id:string}|null;
}>;
export type ReputationAction=Readonly<{
  id:string;
  priority:'high'|'normal';
  reason:'low-rating-unanswered'|'unanswered';
  title:string;
  explanation:string;
  source:'published-rating-and-reply';
}>;
const parseTime=(v:string)=>{
  const n=Date.parse(v);
  return Number.isFinite(n)?n:0;
};
const rating=(n:number|null)=>n!==null&&Number.isFinite(n)&&n>=1&&n<=5?n:null;
export function classifyReputationAction(review:ReputationReview):ReputationAction|null{
  if(!review||!review.id||review.review_replies?.length)return null;
  const value=rating(review.rating);
  if(value!==null&&value<=2)return{
    id:review.id,priority:'high',reason:'low-rating-unanswered',
    title:'Review needs careful reply',
    explanation:'Published 1–2 star rating with no recorded public response.',
    source:'published-rating-and-reply',
  };
  return{
    id:review.id,priority:'normal',reason:'unanswered',
    title:'Reply to customer feedback',
    explanation:value===null?'Published review with no valid rating or reply.':'Published review without a recorded public reply.',
    source:'published-rating-and-reply',
  };
}
export function buildReputationQueue(reviews:readonly ReputationReview[]):readonly ReputationAction[]{
  if(!Array.isArray(reviews))return [];
  const visited=new Set<string>();
  return reviews.filter(r=>{
    if(!r||typeof r.id!=='string'||!r.id||visited.has(r.id))return false;
    visited.add(r.id);return true;
  })
    .map(r=>({review:r,action:classifyReputationAction(r)}))
    .filter((r):r is {review:ReputationReview;action:ReputationAction}=>r.action!==null)
    .sort((a,b)=>(a.action.priority==='high'?0:1)-(b.action.priority==='high'?0:1)||
      parseTime(a.review.created_at)-parseTime(b.review.created_at)||
      a.review.id.localeCompare(b.review.id))
    .map(r=>r.action);
}
