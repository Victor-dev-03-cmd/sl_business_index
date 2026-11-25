/** G3-01 deterministic owner-portfolio action guidance.
 * This uses recorded dashboard counters, not sales, unique-user conversion,
 * inferred lead quality, rank, or a new analytics endpoint.
 */
export type G3MetricSnapshot=Readonly<{
  views:number;calls:number;leads:number;reviews:number;
  ownedCount:number;approvedCount:number;pendingCount:number;
}>;
export type G3Action=Readonly<{
  id:'register'|'review-listings'|'contact'|'respond'|'reputation'|'campaign'|'insights';
  title:string;description:string;href:string;
  priority:'high'|'normal';
  source:'portfolio';
}>;
const valid=(n:number)=>Number.isFinite(n)&&n>=0;
export function buildG3PortfolioActions(input:G3MetricSnapshot):readonly G3Action[]{
  if(!Object.values(input).every(valid))return [];
  const actions:G3Action[]=[];
  if(input.ownedCount===0){
    return [{id:'register',title:'Add your first business',description:'Create a directory listing to start being discovered.',href:'/register-business',priority:'high',source:'portfolio'}];
  }
  if(input.pendingCount>0)actions.push({
    id:'review-listings',title:'Review pending listings',
    description:input.pendingCount+' owned listing(s) are not yet published.',
    href:'/vendor/my-businesses',priority:'high',source:'portfolio',
  });
  if(input.views>0&&input.calls===0)actions.push({
    id:'contact',title:'Make contact easier',
    description:input.views+' recorded profile view(s), but no recorded phone clicks. Review the number and contact options.',
    href:'/vendor/my-businesses',priority:'high',source:'portfolio',
  });
  if(input.leads>0)actions.push({
    id:'respond',title:'Review customer enquiries',
    description:input.leads+' recorded enquiries across your listings. Open your inbox to check follow-ups.',
    href:'/vendor/leads',priority:'high',source:'portfolio',
  });
  if(input.reviews>0)actions.push({
    id:'reputation',title:'Stay on top of reviews',
    description:input.reviews+' recorded review(s) across your listings. Read and reply where appropriate.',
    href:'/vendor/reviews',priority:'normal',source:'portfolio',
  });
  if(input.approvedCount>0&&input.views===0)actions.push({
    id:'campaign',title:'Share your published listing',
    description:'No profile views are recorded yet. Prepare a campaign and share it manually.',
    href:'/vendor/marketing',priority:'normal',source:'portfolio',
  });
  if(actions.length===0)actions.push({
    id:'insights',title:'Review engagement signals',
    description:'Explore recorded profile activity before planning the next promotion.',
    href:'/vendor/insights',priority:'normal',source:'portfolio',
  });
  return actions.slice(0,3);
}
