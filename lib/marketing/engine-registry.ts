/**
 * Marketing Engine — first-party provider adapter discovery registry.
 * Describes potential integrations, never reports that an account is connected.
 * Provider authorization and OAuth callback/credential storage are NOT implemented.
 */
export const MARKETING_CONNECTORS=[
  {id:'facebook_pages',name:'Facebook Pages',group:'social',icon:'flash',account:'Managed Facebook Page',api:'Meta Graph API',capabilities:['Page posts','Media','Insights'],requirements:'Official Facebook Login, approved Page permissions and a Page role',status:'planned'},
  {id:'instagram',name:'Instagram Professional',group:'social',icon:'flash',account:'Eligible Professional account',api:'Instagram Platform API',capabilities:['Feed media','Reels where eligible','Insights'],requirements:'Professional account and provider-approved scopes',status:'planned'},
  {id:'whatsapp_business',name:'WhatsApp Business',group:'messages',icon:'message-text',account:'WhatsApp Business Platform account',api:'WhatsApp Cloud API',capabilities:['Business messages','Approved templates','Handoff'],requirements:'Meta business onboarding, consent, eligible number and permitted templates',status:'planned'},
  {id:'messenger',name:'Facebook Messenger',group:'messages',icon:'message-text',account:'Authorized Facebook Page',api:'Meta Messenger Platform',capabilities:['Page inbox','Authorized replies'],requirements:'Eligible Page, app permissions and messaging policy compliance',status:'planned'},
  {id:'instagram_messages',name:'Instagram Messages',group:'messages',icon:'message-text',account:'Authorized Professional account',api:'Instagram Messaging API',capabilities:['Eligible business DMs','Handoff'],requirements:'Professional account, messaging scopes and conversation windows',status:'planned'},
  {id:'gmail',name:'Gmail',group:'email',icon:'sms',account:'Google mailbox',api:'Gmail API',capabilities:['Send with permission','Draft replies','Consented inbox classification'],requirements:'Google OAuth; minimum requested scopes, restricted-scope verification where required',status:'planned'},
  {id:'outlook',name:'Outlook & Microsoft 365',group:'email',icon:'sms',account:'Microsoft account or tenant mailbox',api:'Microsoft Graph',capabilities:['Delegated sending','Draft replies','Inbox classification'],requirements:'Microsoft OAuth and minimum Mail.Send / mail-read scopes',status:'planned'},
  {id:'verified_email',name:'Verified-domain Email',group:'email',icon:'sms',account:'Owned, verified sending domain',api:'Approved mail delivery provider',capabilities:['Opt-in campaigns','Delivery reports','Unsubscribe and suppression'],requirements:'Domain verification, SPF/DKIM/DMARC, explicit consent and delivery provider',status:'planned'},
  {id:'voice',name:'Phone & Voice',group:'voice',icon:'call',account:'Owned or properly forwarded phone number',api:'Official programmable telephony API',capabilities:['Inbound call routing','Consented transcription','Human transfer'],requirements:'Supported local numbering, provider verification and call/recording consent',status:'planned'},
  {id:'linkedin',name:'LinkedIn Company Pages',group:'social',icon:'flash',account:'Managed company page',api:'LinkedIn Marketing API',capabilities:['Eligible company posts'],requirements:'Approved organization/page access and API program',status:'research'},
  {id:'youtube',name:'YouTube',group:'social',icon:'flash',account:'Channel with OAuth authorization',api:'YouTube Data API',capabilities:['Approved video uploads'],requirements:'OAuth verification and provider quotas',status:'research'},
  {id:'tiktok',name:'TikTok',group:'social',icon:'flash',account:'Creator account eligible for posting API',api:'TikTok Content Posting API',capabilities:['Approved video posting'],requirements:'Approved developer app and authorized account',status:'research'},
] as const;
export type MarketingConnector=(typeof MARKETING_CONNECTORS)[number];
export type MarketingConnectorGroup=MarketingConnector['group'];

export const ENGINE_MODULES=[
  {slug:'social',title:'Social Media Marketing',icon:'flash',phase:'P2-07',description:'Business-aware posts, creative workflows and official account publishing',state:'foundation'},
  {slug:'email',title:'Email Marketing',icon:'sms',phase:'P2-09',description:'Connected mailboxes, opt-in campaigns and reviewed AI replies',state:'planned'},
  {slug:'agent',title:'Calls & Messages AI Agent',icon:'call',phase:'P2-Agent',description:'Inbound enquiries, low-cost routing rules and human handoff',state:'foundation'},
  {slug:'connections',title:'Plugin Connections',icon:'global',phase:'P2-07',description:'Connect eligible social, messaging, mail and phone provider accounts',state:'catalogue'},
  {slug:'automation',title:'Lead & Campaign Automation',icon:'status-up',phase:'P2-06',description:'Lead triggers, durable scheduled jobs, retries and audit trail',state:'planned'},
] as const;

export const PRO_MARKETING_PLANS=['Professional','Enterprise'] as const;
export function isMarketingProPlan(plan:unknown):boolean{
  return typeof plan==='string'&&PRO_MARKETING_PLANS.some(v=>v===plan);
}

/** Pure entitlement decision: independent of UI, cookies, or client-supplied plan. */
export function evaluateMarketingEntitlement(record:unknown,nowMs:number=Date.now()):boolean{
  if(!record||typeof record!=='object'||Array.isArray(record))return false;
  const v=record as Record<string,unknown>;
  if(!isMarketingProPlan(v.plan_name)
    ||typeof v.payment_reference!=='string'||v.payment_reference.trim().length<3
    ||typeof v.verified_at!=='string'||typeof v.expires_at!=='string')return false;
  const verified=Date.parse(v.verified_at),expires=Date.parse(v.expires_at);
  return Number.isFinite(verified)&&Number.isFinite(expires)
    &&verified<=nowMs&&expires>nowMs&&verified<=expires;
}
