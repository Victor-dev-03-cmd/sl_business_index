/**
 * G5-01 LeadIQ — bounded, deterministic CRM attention rules.
 * NOT a lead-conversion forecast, AI score, or verification of customer intent.
 * Input records are already fetched through businesses owned by this user.
 * No PII is returned, no network calls, no automated customer messages.
 */
export type LeadIQStage='new'|'contacted'|'converted'|'lost'|string|null;
export type LeadIQRecord=Readonly<{
  id:string;
  status:LeadIQStage;
  created_at:string;
}>;
export type LeadIQFollowUp=Readonly<{
  due_at:string;
  done_at:string|null;
}>;
export type LeadIQReadiness='available'|'unavailable'|'loading';
export type LeadIQItem=Readonly<{
  id:string;
  priority:'urgent'|'attention'|'normal';
  reason:'overdue-followup'|'new-unanswered'|'new-recent'|'contacted'|'scheduled-followup';
  title:string;
  explanation:string;
  source:'recorded-stage'|'saved-follow-up';
}>;

const DAY=86_400_000;
const time=(date:string)=>{const n=Date.parse(date);return Number.isFinite(n)?n:null;};
export function classifyLeadIQ(
  lead:LeadIQRecord,
  followup:LeadIQFollowUp|undefined,
  followUpReadiness:LeadIQReadiness,
  now:number,
):LeadIQItem|null{
  if(!lead?.id||!Number.isFinite(now))return null;
  if(lead.status==='converted'||lead.status==='lost')return null;
  // Never infer follow-up schedules when the reviewed table is unavailable.
  if(followUpReadiness==='available'&&followup&&!followup.done_at){
    const due=time(followup.due_at);
    if(due!==null&&due<=now)return {
      id:lead.id,priority:'urgent',reason:'overdue-followup',
      title:'Follow-up due',explanation:'The saved follow-up time has passed. Check this enquiry.',
      source:'saved-follow-up',
    };
  }
  if(lead.status==='new'){
    const created=time(lead.created_at);
    if(created!==null&&created<=now-2*DAY)return {
      id:lead.id,priority:'urgent',reason:'new-unanswered',
      title:'New enquiry waiting',explanation:'This enquiry remains New more than 48 hours after it was recorded.',
      source:'recorded-stage',
    };
    return {
      id:lead.id,priority:'attention',reason:'new-recent',
      title:'Respond to new enquiry',
      explanation:'The CRM stage is New. Review and update its status after responding.',
      source:'recorded-stage',
    };
  }
  if(lead.status==='contacted'){
    if(followUpReadiness==='available'&&followup&&!followup.done_at
      &&time(followup.due_at)!==null)return{
      id:lead.id,priority:'normal',reason:'scheduled-followup',
      title:'Follow-up scheduled',
      explanation:'This contacted enquiry has a saved future reminder.',
      source:'saved-follow-up',
    };
    return {
      id:lead.id,priority:'normal',reason:'contacted',
      title:'Review contacted enquiry',
      explanation:'The CRM stage is Contacted. Check the next response manually.',
      source:'recorded-stage',
    };
  }
  return null;
}
const weight={urgent:0,attention:1,normal:2} as const;
export function buildLeadIQQueue(
  leads:readonly LeadIQRecord[],
  followUps:Readonly<Record<string,LeadIQFollowUp>>,
  readiness:LeadIQReadiness,
  now:number,
):readonly LeadIQItem[]{
  if(!Array.isArray(leads)||!Number.isFinite(now))return [];
  const unique=new Set<string>();
  return leads.filter(row=>row&&typeof row.id==='string'&&!unique.has(row.id)&&Boolean(unique.add(row.id)))
    .map(row=>({
      lead:row,
      item:classifyLeadIQ(row,followUps[row.id],readiness,now),
    }))
    .filter((entry):entry is {lead:LeadIQRecord;item:LeadIQItem}=>entry.item!==null)
    .sort((a,b)=>weight[a.item.priority]-weight[b.item.priority] ||
      (time(a.lead.created_at)??Number.MAX_SAFE_INTEGER) -
      (time(b.lead.created_at)??Number.MAX_SAFE_INTEGER) ||
      a.lead.id.localeCompare(b.lead.id))
    .map(entry=>entry.item);
}
