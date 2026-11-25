/**
 * NeuroGrowth WA-01 — SERVER-SIDE DESIGN / SYNTHETIC APPROVAL CONTRACT ONLY.
 *
 * There is intentionally NO WhatsApp webhook, Supabase client, provider token,
 * persistent nonce store, external send, publication, money movement or executor.
 * The model's suggestions are UNTRUSTED. Real callers MUST authenticate with
 * auth.getUser(), owner-scoped RLS, verified WhatsApp link/session, real OAuth
 * capability, recipient consent and separately audited DB transactions.
 *
 * The mock approval issuer below accepts synthetic trusted context ONLY and
 * NEVER authorizes production effects. The returned result is always dry_run.
 * All content hashes must later be verified against actual immutable asset
 * bytes and exact rendered email/social content by a trusted service.
 */
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

export const WA01_VERSION='neurogrowth-wa01-v1';
export const WA01_TOOLS=Object.freeze({
  read_business_profile:{kind:'read',href:'/vendor/my-businesses'},
  read_growthscore:{kind:'read',href:'/vendor/dashboard'},
  read_crm_summary:{kind:'read',href:'/vendor/leads'},
  read_review_summary:{kind:'read',href:'/vendor/reviews'},
  read_business_analytics:{kind:'read',href:'/vendor/insights'},
  read_marketing_studio:{kind:'read',href:'/vendor/marketing'},
  read_campaign_calendar:{kind:'read',href:'/vendor/marketing/campaigns'},
  read_brand_profile:{kind:'read',href:'/vendor/marketing/brand'},
  read_safe_settings:{kind:'read',href:'/vendor/settings'},
  read_provider_connection_metadata:{kind:'read',href:'/vendor/marketing/engine/connections'},
  prepare_poster:{kind:'draft',href:'/vendor/marketing/design'},
  prepare_caption:{kind:'draft',href:'/vendor/marketing/captions'},
  prepare_campaign:{kind:'draft',href:'/vendor/marketing/campaigns'},
  prepare_email:{kind:'draft',href:'/vendor/marketing/engine/email'},
  propose_settings_change:{kind:'draft',href:'/vendor/settings'},
  publish_facebook:{kind:'external',provider:'facebook_pages',href:'/vendor/marketing/engine/social'},
  publish_instagram:{kind:'external',provider:'instagram',href:'/vendor/marketing/engine/social'},
  send_email:{kind:'external',provider:'verified_email',href:'/vendor/marketing/engine/email'},
  send_customer_whatsapp:{kind:'blocked',href:null},
  modify_billing:{kind:'blocked',href:null},
  change_security_settings:{kind:'blocked',href:null},
  delete_business_or_account:{kind:'blocked',href:null},
  approve_verified_badge:{kind:'blocked',href:null},
  arbitrary_database_access:{kind:'blocked',href:null},
});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const REF=/^[a-zA-Z0-9:_-]{3,80}$/;
const ACTION_ID=/^[a-z][a-z0-9_-]{1,63}$/;
const MAX_ACTIONS=12;
const PLAN_KEYS=['planId','revision','businessId','expiresAt','currency','maxTotalCostMinor','actions'];
const ACTION_KEYS=['id','tool','contentSha256','previewSha256','providerAccountRef',
  'audienceSegmentRef','audienceCount','recipientConsentSnapshotSha256',
  'scheduledAt','estimatedCostMinor'];
const MANIFEST_KEYS=['version','planId','revision','ownerId','businessId','channelBindingId',
  'expiresAt','currency','maxTotalCostMinor','actions','digest'];
const RECEIPT_KEYS=['v','syntheticOnly','kind','planId','revision','manifestDigest',
  'ownerId','businessId','channelBindingId','actionId','interactionId','nonce',
  'approvedAt','expiresAt','signature'];
const fail=reason=>({ok:false,reason});
const keysAre=(obj,expected)=>obj!==null&&typeof obj==='object'&&!Array.isArray(obj)
  &&Object.keys(obj).length===expected.length&&expected.every(k=>Object.hasOwn(obj,k));
const validTime=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)||
     !Number.isFinite(Date.parse(value)))return false;
  const canonical=new Date(value).toISOString();
  return value===canonical||value===canonical.replace('.000Z','Z');
};
const validMoney=value=>Number.isSafeInteger(value)&&value>=0&&value<=1_000_000;
const digest=data=>createHash('sha256').update(data).digest('hex');

function canonicalManifest(m) {
  return JSON.stringify([
    m.version,m.planId,m.revision,m.ownerId,m.businessId,m.channelBindingId,
    m.expiresAt,m.currency,m.maxTotalCostMinor,
    m.actions.map(a=>ACTION_KEYS.map(k=>a[k])),
  ]);
}
function validateContext(ctx,businessId) {
  if(!ctx||!UUID.test(ctx.ownerId)||!UUID.test(businessId)||
     !Array.isArray(ctx.ownedApprovedBusinessIds)||!ctx.ownedApprovedBusinessIds.includes(businessId)||
     !REF.test(ctx.channelBindingId)||!Array.isArray(ctx.providerAccounts)||
     !Array.isArray(ctx.consentedAudienceSegments))return false;
  return true;
}
function providerAndAudienceOK(action,ctx){
  const spec=Object.hasOwn(WA01_TOOLS,action.tool)?WA01_TOOLS[action.tool]:null;
  if(!spec||spec.kind!=='external')return true;
  const connected=ctx.providerAccounts.some(p=>p&&p.ref===action.providerAccountRef
    &&p.provider===spec.provider&&p.status==='connected'
    &&Array.isArray(p.permittedTools)&&p.permittedTools.includes(action.tool));
  if(!connected)return false;
  if(action.tool!=='send_email')return true;
  return ctx.consentedAudienceSegments.some(s=>s&&s.ref===action.audienceSegmentRef
    &&s.count===action.audienceCount&&s.consentSnapshotSha256===action.recipientConsentSnapshotSha256
    &&s.optInVerifiedByServer===true&&s.unsubscribeReady===true
    &&s.status==='active');
}
function validateAction(a,ctx,nowMs,planExpires){
  if(!keysAre(a,ACTION_KEYS)||!ACTION_ID.test(a.id)||!Object.hasOwn(WA01_TOOLS,a.tool))
    return 'unknown_action_or_extra_fields';
  const spec=WA01_TOOLS[a.tool];
  if(!['draft','external'].includes(spec.kind))return 'not_an_executable_plan_tool';
  if(!SHA.test(a.contentSha256)||
     !(a.previewSha256===null||SHA.test(a.previewSha256))||
     !validMoney(a.estimatedCostMinor))return 'invalid_content_or_cost';
  if(a.scheduledAt!==null&&(!validTime(a.scheduledAt)||
       Date.parse(a.scheduledAt)<nowMs||Date.parse(a.scheduledAt)>nowMs+90*86400000))
    return 'invalid_schedule';
  if(spec.kind==='draft'){
    if(a.providerAccountRef!==null||a.audienceSegmentRef!==null||a.audienceCount!==null||
       a.recipientConsentSnapshotSha256!==null||a.estimatedCostMinor!==0||
       a.scheduledAt!==null)return 'draft_has_delivery_side_effects';
    return null;
  }
  if(!REF.test(a.providerAccountRef)||!providerAndAudienceOK(a,ctx))
    return 'provider_or_consent_not_verified';
  if(a.tool==='send_email'){
    if(!REF.test(a.audienceSegmentRef)||!Number.isSafeInteger(a.audienceCount)||
       a.audienceCount<1||a.audienceCount>100000||!SHA.test(a.recipientConsentSnapshotSha256))
      return 'missing_consented_email_segment';
  }else if(a.audienceSegmentRef!==null||a.audienceCount!==null||
            a.recipientConsentSnapshotSha256!==null)return 'social_action_cannot_inherit_email_consent';
  // A scheduled action may execute after plan expiry only if a future outbox
  // validates a fresh authorization at execution time; WA-01 never dispatches.
  if(planExpires<nowMs)return 'expired_plan';
  return null;
}

/** Prepare a version-pinned manifest. Proposals are DATA, not authorizations. */
export function prepareWA01Manifest(proposal,serverContext,nowMs){
  if(!Number.isSafeInteger(nowMs)||!keysAre(proposal,PLAN_KEYS))return fail('malformed_plan');
  if(!validateContext(serverContext,proposal.businessId))return fail('owner_or_business_not_verified');
  if(!UUID.test(proposal.planId)||!Number.isSafeInteger(proposal.revision)||
     proposal.revision<1||proposal.revision>10000||!['LKR','USD'].includes(proposal.currency)||!validMoney(proposal.maxTotalCostMinor))
    return fail('invalid_plan_identity_or_budget');
  if(!validTime(proposal.expiresAt)||Date.parse(proposal.expiresAt)<=nowMs||
     Date.parse(proposal.expiresAt)>nowMs+30*60000)return fail('plan_expiry_invalid');
  if(!Array.isArray(proposal.actions)||proposal.actions.length<1||proposal.actions.length>MAX_ACTIONS)
    return fail('action_count_out_of_range');
  let total=0;const unique=new Set();const normalized=[];
  for(const action of proposal.actions){
    const reason=validateAction(action,serverContext,nowMs,Date.parse(proposal.expiresAt));
    if(reason)return fail(reason);
    if(unique.has(action.id))return fail('duplicate_action_id');
    unique.add(action.id);
    total+=action.estimatedCostMinor;
    if(!Number.isSafeInteger(total)||total>proposal.maxTotalCostMinor)return fail('total_budget_exceeded');
    normalized.push(Object.freeze(Object.fromEntries(ACTION_KEYS.map(key=>[key,action[key]]))));
  }
  const base={
    version:WA01_VERSION,planId:proposal.planId,revision:proposal.revision,
    ownerId:serverContext.ownerId,businessId:proposal.businessId,
    channelBindingId:serverContext.channelBindingId,expiresAt:proposal.expiresAt,
    currency:proposal.currency,maxTotalCostMinor:proposal.maxTotalCostMinor,
    actions:Object.freeze(normalized),
  };
  const manifest=Object.freeze({...base,digest:digest(canonicalManifest(base))});
  return {ok:true,manifest};
}
function validManifest(m,ctx,nowMs){
  if(!keysAre(m,MANIFEST_KEYS)||m.version!==WA01_VERSION||
     !UUID.test(m.planId)||!SHA.test(m.digest)||!validateContext(ctx,m.businessId)||
     m.ownerId!==ctx.ownerId||m.channelBindingId!==ctx.channelBindingId||
     !validTime(m.expiresAt)||Date.parse(m.expiresAt)<=nowMs||
     !Array.isArray(m.actions)||m.actions.length<1||m.actions.length>MAX_ACTIONS)return false;
  if(!Number.isSafeInteger(m.revision)||m.revision<1||m.revision>10000||!['LKR','USD'].includes(m.currency)||
     !validMoney(m.maxTotalCostMinor))return false;
  const seen=new Set();let total=0;
  for(const action of m.actions){
    if(!action||typeof action!=='object'||seen.has(action.id)||
       validateAction(action,ctx,nowMs,Date.parse(m.expiresAt)))return false;
    seen.add(action.id);total+=action.estimatedCostMinor;
  }
  return total<=m.maxTotalCostMinor&&digest(canonicalManifest(m))===m.digest;
}
function checkedSecret(secret){
  return typeof secret==='string'&&Buffer.byteLength(secret,'utf8')>=32;
}
function payloadOf(receipt){
  return JSON.stringify(RECEIPT_KEYS.filter(k=>k!=='signature').map(k=>receipt[k]));
}
function makeSignature(receipt,serverSecret){
  return createHmac('sha256',serverSecret).update(payloadOf(receipt)).digest('base64url');
}

/**
 * SIMULATED vendor-approval issuer for tests only. verifiedByServer is a mocked
 * input: a real API MUST obtain signed WhatsApp webhook identity / dashboard
 * session and a persisted explicit user click, not accept this from a model.
 */
export function issueSyntheticWA01Approval(manifest,serverContext,interaction,serverSecret,nowMs){
  if(!checkedSecret(serverSecret)||!validManifest(manifest,serverContext,nowMs)||
     !interaction||interaction.verifiedByServer!==true||
     interaction.ownerId!==manifest.ownerId||
     interaction.channelBindingId!==manifest.channelBindingId||
     !REF.test(interaction.interactionId))return fail('unverified_vendor_interaction');
  const kind=interaction.kind;
  if(!['item','final'].includes(kind)||
     !((kind==='final'&&interaction.actionId===null)||
        (kind==='item'&&manifest.actions.some(a=>a.id===interaction.actionId))))
    return fail('invalid_approval_target');
  const receipt={
    v:WA01_VERSION,syntheticOnly:true,kind,planId:manifest.planId,
    revision:manifest.revision,manifestDigest:manifest.digest,
    ownerId:manifest.ownerId,businessId:manifest.businessId,
    channelBindingId:manifest.channelBindingId,
    actionId:interaction.actionId,interactionId:interaction.interactionId,
    nonce:randomBytes(16).toString('hex'),approvedAt:new Date(nowMs).toISOString(),
    expiresAt:new Date(Math.min(nowMs+5*60000,Date.parse(manifest.expiresAt))).toISOString(),
  };
  return {ok:true,receipt:Object.freeze({...receipt,signature:makeSignature(receipt,serverSecret)})};
}
function verifyReceipt(receipt,kind,actionId,manifest,ctx,secret,nowMs){
  if(!keysAre(receipt,RECEIPT_KEYS)||receipt.v!==WA01_VERSION||receipt.syntheticOnly!==true||
    receipt.kind!==kind||receipt.actionId!==actionId||
    receipt.planId!==manifest.planId||receipt.revision!==manifest.revision||
    receipt.ownerId!==ctx.ownerId||receipt.businessId!==manifest.businessId||
    receipt.channelBindingId!==ctx.channelBindingId||
    receipt.manifestDigest!==manifest.digest||!REF.test(receipt.interactionId)||
    !/^[a-f0-9]{32}$/.test(receipt.nonce)||
    !validTime(receipt.approvedAt)||!validTime(receipt.expiresAt)||
    Date.parse(receipt.approvedAt)>nowMs||Date.parse(receipt.expiresAt)<=nowMs||
    Date.parse(receipt.expiresAt)>Date.parse(manifest.expiresAt)||
    Date.parse(receipt.expiresAt)>Date.parse(receipt.approvedAt)+5*60000||
    typeof receipt.signature!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(receipt.signature))
    return false;
  try{
    const expected=Buffer.from(makeSignature(receipt,secret),'base64url');
    const provided=Buffer.from(receipt.signature,'base64url');
    return provided.length===32&&timingSafeEqual(expected,provided);
  }catch{return false;}
}

/**
 * Does NOT execute an operation. The supplied atomicClaimOnce callback is a
 * trusted SERVER-ONLY transaction adapter; no production implementation exists
 * in WA-01. A missing/failed claim DENIES. It must atomically consume the item
 * approval and reserve the plan/action idempotency key exactly once.
 * Final manifest approval is reusable for other individually approved items.
 */
export async function evaluateWA01DryRunQueue({manifest,actionId,itemApproval,finalApproval,
                                               serverContext,serverSecret,nowMs,atomicClaimOnce}){
  if(!Number.isSafeInteger(nowMs)||!checkedSecret(serverSecret)||
     !validManifest(manifest,serverContext,nowMs))return fail('invalid_or_expired_manifest');
  const action=manifest.actions.find(a=>a.id===actionId);
  if(!action||WA01_TOOLS[action.tool]?.kind!=='external')
    return fail('only_external_actions_need_queue_approval');
  if(!verifyReceipt(itemApproval,'item',actionId,manifest,serverContext,serverSecret,nowMs)||
     !verifyReceipt(finalApproval,'final',null,manifest,serverContext,serverSecret,nowMs))
    return fail('missing_expired_mismatched_or_forged_approval');
  if(itemApproval.nonce===finalApproval.nonce||
     itemApproval.interactionId===finalApproval.interactionId)
    return fail('approval_interactions_must_be_distinct');
  if(!providerAndAudienceOK(action,serverContext))
    return fail('provider_or_consent_revoked');
  if(typeof atomicClaimOnce!=='function')return fail('atomic_replay_store_required');
  const claimed={
    ownerId:manifest.ownerId,businessId:manifest.businessId,planId:manifest.planId,
    revision:manifest.revision,actionId,manifestDigest:manifest.digest,
    itemNonce:itemApproval.nonce,finalNonce:finalApproval.nonce,
  };
  try{
    if(await atomicClaimOnce(Object.freeze(claimed))!==true)return fail('replayed_or_unavailable');
  }catch{return fail('replay_store_unavailable');}
  return {ok:true,status:'synthetic_dry_run_queue_candidate',actionId,
          manifestDigest:manifest.digest,externalDispatchPerformed:false};
}

/** Privacy-minimized owner preview descriptor; no media or WhatsApp is sent. */
export function describeWA01Preview(manifest){
  if(!manifest||!Array.isArray(manifest.actions))return [];
  return manifest.actions.map(a=>({
    id:a.id,tool:a.tool,
    contentSha256:a.contentSha256,previewSha256:a.previewSha256,
    requiresFinalApproval:WA01_TOOLS[a.tool]?.kind==='external',
    status:'prepared_preview_only',
  }));
}
