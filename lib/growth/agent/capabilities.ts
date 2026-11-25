/**
 * ML-01: SERVER-INTEGRATION-DESIGN-ONLY capability registry.
 *
 * Agent/model output is ALWAYS an untrusted proposal, not authority.
 * This file executes NO reads/writes. Before a future real tool call:
 * - server must use auth.getUser() and RLS-verified owner/business scope
 * - validate capability resource and every mutation against an allowlist
 * - bind authorization to exact action+payload, approval expiry and nonce
 * - consume approval nonce atomically so a replay cannot execute twice
 * - audit the action and its rollback/compensation state where applicable
 * No model, user prompt or browser flag may mint/forge these approvals.
 */
export const NEUROGROWTH_CAPABILITY_VERSION='neurogrowth-agent-capabilities-v0.1' as const;
export const NEUROGROWTH_CAPABILITIES={
  read_business_profile:{kind:'read',href:'/vendor/my-businesses'},
  read_growthscore:{kind:'read',href:'/vendor/dashboard'},
  read_engagement_insights:{kind:'read',href:'/vendor/insights'},
  read_lead_priority_summary:{kind:'read',href:'/vendor/leads'},
  read_review_priority_summary:{kind:'read',href:'/vendor/reviews'},
  read_campaign_drafts:{kind:'read',href:'/vendor/marketing/campaigns'},
  propose_listing_change:{kind:'draft',href:'/vendor/my-businesses'},
  propose_followup_reminder:{kind:'draft',href:'/vendor/leads'},
  propose_review_reply:{kind:'draft',href:'/vendor/reviews'},
  propose_marketing_campaign:{kind:'draft',href:'/vendor/marketing/campaigns'},
  request_listing_update:{kind:'mutation',href:'/vendor/my-businesses'},
  request_followup_save:{kind:'mutation',href:'/vendor/leads'},
  request_review_reply_publish:{kind:'mutation',href:'/vendor/reviews'},
  request_campaign_publish:{kind:'mutation',href:'/vendor/marketing/campaigns'},
  request_billing_change:{kind:'blocked',href:'/vendor/billing'},
  request_account_delete:{kind:'blocked',href:'/vendor/settings'},
  request_verification_approval:{kind:'blocked',href:'/vendor/my-businesses'},
} as const;
export type NeuroGrowthCapability=keyof typeof NEUROGROWTH_CAPABILITIES;
export type AgentProposal=Readonly<{
  capability:string;
  businessId:string;
  evidenceRefs:readonly string[];
  text:string;
}>;
export type AgentDecision=Readonly<{
  kind:'denied'|'draft_only'|'read_candidate'|'approval_required';
  capability:NeuroGrowthCapability|null;
  href:string|null;
  reason:string;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny=(reason:string):AgentDecision=>({
  kind:'denied',capability:null,href:null,reason,
});
/**
 * Pure proposal filter ONLY; does NOT grant a DB read or mutation.
 * currentUserId, approvedBusinessIds MUST originate from fresh server
 * auth.getUser() / RLS-owned records, NEVER model output or client claims.
 */
export function classifyAgentProposal(
  proposal:AgentProposal,
  serverVerifiedUserId:string|null,
  serverOwnedBusinessIds:readonly string[],
):AgentDecision {
  if(!proposal||!serverVerifiedUserId||!UUID.test(serverVerifiedUserId)){
    return deny('Authenticated owner scope is required.');
  }
  if(!UUID.test(proposal.businessId)||!Array.isArray(serverOwnedBusinessIds)||
    !serverOwnedBusinessIds.includes(proposal.businessId)){
    return deny('This business is outside the authenticated owner scope.');
  }
  if(!Object.prototype.hasOwnProperty.call(NEUROGROWTH_CAPABILITIES,proposal.capability)){
    return deny('Tool capability is not registered.');
  }
  if(!Array.isArray(proposal.evidenceRefs)||proposal.evidenceRefs.length>20||
    proposal.evidenceRefs.some(x=>typeof x!=='string'||x.length>120)||
    typeof proposal.text!=='string'||proposal.text.length>2000){
    return deny('Malformed or excessive model proposal.');
  }
  const cap=proposal.capability as NeuroGrowthCapability;
  const entry=NEUROGROWTH_CAPABILITIES[cap];
  if(entry.kind==='blocked')return deny('This operation is not available to the agent.');
  if(entry.kind==='mutation')return {
    kind:'approval_required',capability:cap,href:entry.href,
    reason:'A separate explicit, fresh, exact-action vendor approval and server execution gate are required.',
  };
  if(entry.kind==='draft')return {
    kind:'draft_only',capability:cap,href:entry.href,
    reason:'The vendor must inspect and accept the proposed draft; no write or publish occurs.',
  };
  return {
    kind:'read_candidate',capability:cap,href:entry.href,
    reason:'A future executor still needs server authentication, RLS checks and field-level minimization.',
  };
}
