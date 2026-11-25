/** WA-01 design-only JS module declarations. All authorizations remain synthetic. */
export const WA01_VERSION:'neurogrowth-wa01-v1';
export type WA01ToolKind='read'|'draft'|'external'|'blocked';
export type WA01ToolSpec=Readonly<{kind:WA01ToolKind;href:string|null;provider?:string}>;
export const WA01_TOOLS:Readonly<Record<string,WA01ToolSpec>>;
export type WA01Action=Readonly<{
  id:string;tool:string;contentSha256:string;previewSha256:string|null;
  providerAccountRef:string|null;audienceSegmentRef:string|null;
  audienceCount:number|null;recipientConsentSnapshotSha256:string|null;
  scheduledAt:string|null;estimatedCostMinor:number;
}>;
export type WA01PlanProposal=Readonly<{
  planId:string;revision:number;businessId:string;expiresAt:string;
  maxTotalCostMinor:number;actions:readonly WA01Action[];
}>;
export type WA01ServerContext=Readonly<{
  ownerId:string;ownedApprovedBusinessIds:readonly string[];channelBindingId:string;
  providerAccounts:readonly Readonly<{
    ref:string;provider:string;status:string;permittedTools:readonly string[];
  }>[];
  consentedAudienceSegments:readonly Readonly<{
    ref:string;count:number;consentSnapshotSha256:string;
    optInVerifiedByServer:boolean;unsubscribeReady:boolean;status:string;
  }>[];
}>;
export type WA01Manifest=Readonly<{
  version:typeof WA01_VERSION;planId:string;revision:number;ownerId:string;
  businessId:string;channelBindingId:string;expiresAt:string;
  maxTotalCostMinor:number;actions:readonly WA01Action[];digest:string;
}>;
export type WA01ApprovalReceipt=Readonly<{
  v:typeof WA01_VERSION;syntheticOnly:true;kind:'item'|'final';
  planId:string;revision:number;manifestDigest:string;ownerId:string;
  businessId:string;channelBindingId:string;actionId:string|null;
  interactionId:string;nonce:string;approvedAt:string;expiresAt:string;
  signature:string;
}>;
export type WA01Result<T>=Readonly<{ok:true}&T>|Readonly<{ok:false;reason:string}>;
export function prepareWA01Manifest(
  proposal:WA01PlanProposal,serverContext:WA01ServerContext,nowMs:number
):WA01Result<{manifest:WA01Manifest}>;
export function issueSyntheticWA01Approval(
  manifest:WA01Manifest,serverContext:WA01ServerContext,
  interaction:Readonly<{
    kind:'item'|'final';actionId:string|null;ownerId:string;channelBindingId:string;
    interactionId:string;verifiedByServer:true;
  }>,
  serverSecret:string,nowMs:number
):WA01Result<{receipt:WA01ApprovalReceipt}>;
export type WA01AtomicClaim=Readonly<{
  ownerId:string;businessId:string;planId:string;revision:number;
  actionId:string;manifestDigest:string;itemNonce:string;finalNonce:string;
}>;
export function evaluateWA01DryRunQueue(args:Readonly<{
  manifest:WA01Manifest;actionId:string;
  itemApproval:WA01ApprovalReceipt;finalApproval:WA01ApprovalReceipt;
  serverContext:WA01ServerContext;serverSecret:string;nowMs:number;
  atomicClaimOnce:(claim:WA01AtomicClaim)=>Promise<boolean>|boolean;
}>):Promise<WA01Result<{status:'synthetic_dry_run_queue_candidate';actionId:string;
  manifestDigest:string;externalDispatchPerformed:false}>>;
export function describeWA01Preview(manifest:WA01Manifest):readonly Readonly<{
  id:string;tool:string;contentSha256:string;previewSha256:string|null;
  requiresFinalApproval:boolean;status:'prepared_preview_only';
}>[];
