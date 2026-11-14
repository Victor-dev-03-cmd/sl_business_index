/**
 * SLBI Marketing Studio — first-party app launcher inventory.
 * A card's availability describes its current IMPLEMENTATION, not an
 * installed, authorized or production-connected third-party integration.
 * Premium access is always enforced by the destination server layout/API.
 */
export type StudioCategory='Content'|'Channels'|'AI & automation'|'Plugins'|'Customers';
export type StudioFilter='All apps'|StudioCategory;
export type StudioAvailability='working'|'foundation'|'planned';
export type MarketingAppLaunchStatus='coming_soon'|'preview'|'live';
export type MarketingStudioLaunchStatuses=Record<string,MarketingAppLaunchStatus>;
export type StudioTone='orange'|'blue'|'purple'|'teal'|'rose'|'amber';
export type MarketingStudioApp={
  id:string;title:string;subtitle:string;description:string;
  href:string;category:StudioCategory;icon:string;
  tone:StudioTone;pro:boolean;availability:StudioAvailability;
  note:string;keywords:string;
};

export const MARKETING_STUDIO_CATEGORIES:readonly StudioFilter[]=[
  'All apps','Content','Channels','AI & automation','Plugins','Customers',
];
export const MARKETING_STUDIO_APPS:readonly MarketingStudioApp[]=[
  {
    id:'campaign-planner',title:'Campaign Planner',subtitle:'Creative workspace',
    description:'Write multilingual campaigns, export promotional artwork and save planning dates.',
    href:'/vendor/marketing/campaigns',category:'Content',icon:'document-download',
    tone:'orange',pro:false,availability:'working',note:'Manual drafts & exports',
    keywords:'free campaign studio copy tamil sinhala calendar png',
  },
  {
    id:'poster-editor',title:'Poster Design Studio',subtitle:'Editable creative',
    description:'Design square, portrait and story posters with draggable text and local PNG export.',
    href:'/vendor/marketing/design',category:'Content',icon:'document',
    tone:'purple',pro:true,availability:'working',note:'Local editing & export',
    keywords:'ai poster editor creative typography artwork image designs',
  },
  {
    id:'caption-lab',title:'AI Caption Lab',subtitle:'Three languages',
    description:'Prepare business-aware Tamil, Sinhala and English caption drafts for human review.',
    href:'/vendor/marketing/captions',category:'Content',icon:'message-text',
    tone:'blue',pro:true,availability:'foundation',note:'AI usage not enabled',
    keywords:'captions ai tamil sinhala english copywriting post',
  },
  {
    id:'brand-kit',title:'Business Brand Kit',subtitle:'Your visual identity',
    description:'Organize brand colors, slogan, voice, audience, supported languages and offers.',
    href:'/vendor/marketing/brand',category:'Content',icon:'shop',
    tone:'rose',pro:true,availability:'foundation',note:'Database setup pending',
    keywords:'logo brand color profile identity guidelines',
  },
  {
    id:'social-marketing',title:'Social Media Marketing',subtitle:'Publishing workspace',
    description:'Plan content for authorized business pages and professional social accounts.',
    href:'/vendor/marketing-engine/social',category:'Channels',icon:'flash',
    tone:'orange',pro:true,availability:'foundation',note:'Provider publishing pending',
    keywords:'facebook instagram pages social content publishing',
  },
  {
    id:'email-marketing',title:'Email Marketing',subtitle:'Consented outreach',
    description:'Explore reviewed email campaigns and future authorized mailbox workflows.',
    href:'/vendor/marketing-engine/email',category:'Channels',icon:'sms',
    tone:'blue',pro:true,availability:'planned',note:'Sending not enabled',
    keywords:'gmail outlook email newsletter messages templates',
  },
  {
    id:'voice-agent',title:'Calls & Messages Agent',subtitle:'Customer conversations',
    description:'Try rules-first enquiry triage and planned human handoff for calls and messages.',
    href:'/vendor/marketing-engine/agent',category:'AI & automation',icon:'call',
    tone:'teal',pro:true,availability:'foundation',note:'Live calls & replies off',
    keywords:'voice agent whatsapp chatbot calls ai customer support messages',
  },
  {
    id:'workflow-automation',title:'Marketing Automations',subtitle:'Workflow builder',
    description:'Review lead follow-up rules and upcoming approved campaign scheduling.',
    href:'/vendor/marketing-engine/automation',category:'AI & automation',icon:'status-up',
    tone:'purple',pro:true,availability:'planned',note:'Background jobs pending',
    keywords:'flows triggers marketing automation tasks',
  },
  {
    id:'plugin-connectors',title:'Plugin & App Connectors',subtitle:'Official integrations',
    description:'Browse official Facebook, Instagram, WhatsApp, Google and Microsoft integrations.',
    href:'/vendor/marketing-engine/connections',category:'Plugins',icon:'global',
    tone:'amber',pro:true,availability:'foundation',note:'Connections not authorized',
    keywords:'plugin connector marketplace integrations connect accounts oauth',
  },
  {
    id:'content-calendar',title:'Content Calendar',subtitle:'Campaign planning',
    description:'Review a calendar foundation for planned campaigns, approvals and future jobs.',
    href:'/vendor/marketing-engine/calendar',category:'AI & automation',icon:'calendar',
    tone:'rose',pro:true,availability:'foundation',note:'Planning only, no auto-posts',
    keywords:'calendar schedule planned social marketing publish',
  },
  {
    id:'leads-workspace',title:'Marketing Leads',subtitle:'Customer pipeline',
    description:'Bridge verified business enquiries to rule-based follow-up and agent workflows.',
    href:'/vendor/marketing-engine/leads',category:'Customers',icon:'people',
    tone:'teal',pro:true,availability:'foundation',note:'Automation not connected',
    keywords:'leads enquiries conversion CRM customer contacts',
  },
  {
    id:'leads-crm',title:'Leads CRM',subtitle:'Existing vendor tool',
    description:'Manage your actual enquiries and follow-ups in the existing vendor workspace.',
    href:'/vendor/leads',category:'Customers',icon:'people',
    tone:'blue',pro:false,availability:'working',note:'Existing owner workspace',
    keywords:'free leads crm customer relationship enquiries',
  },
];
/** Deterministic client-side filtering; no customer data, cookies or network calls. */
export function filterMarketingStudioApps(
  apps:readonly MarketingStudioApp[],query:string,category:StudioFilter,
):MarketingStudioApp[]{
  const normalized=query.trim().toLocaleLowerCase();
  return apps.filter(app=>(category==='All apps'||app.category===category)
    &&(!normalized||[
      app.title,app.subtitle,app.description,app.category,app.keywords,
    ].join(' ').toLocaleLowerCase().includes(normalized)));
}
