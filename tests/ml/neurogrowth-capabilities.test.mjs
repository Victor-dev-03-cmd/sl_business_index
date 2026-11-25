import {test,expect} from 'bun:test';
import {
  classifyAgentProposal,
  NEUROGROWTH_CAPABILITIES,
  NEUROGROWTH_CAPABILITY_VERSION,
} from '../../lib/growth/agent/capabilities.ts';

const USER='11111111-1111-4111-8111-111111111111';
const VENDOR='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const propose=(capability,businessId=VENDOR,extra={})=>({
  capability,businessId,evidenceRefs:['g2-readiness:observed'],text:'Check recorded evidence',
  ...extra,
});

test('NeuroGrowth is versioned and deny-default for unknown/excessive capability',()=>{
  expect(NEUROGROWTH_CAPABILITY_VERSION).toBe('neurogrowth-agent-capabilities-v0.1');
  expect(classifyAgentProposal(propose('execute_arbitrary_sql'),USER,[VENDOR]).kind).toBe('denied');
  expect(classifyAgentProposal(propose('read_growthscore',VENDOR,{text:'x'.repeat(2500)}),USER,[VENDOR]).kind).toBe('denied');
  expect(classifyAgentProposal(propose('read_growthscore',VENDOR,{evidenceRefs:Array(21).fill('x')}),USER,[VENDOR]).kind).toBe('denied');
});

test('All tools reject unauthenticated, cross-vendor or unverified owner scope',()=>{
  for(const capability of Object.keys(NEUROGROWTH_CAPABILITIES)){
    expect(classifyAgentProposal(propose(capability),null,[VENDOR]).kind).toBe('denied');
    expect(classifyAgentProposal(propose(capability),USER,[OTHER]).kind).toBe('denied');
    expect(classifyAgentProposal(propose(capability,OTHER),USER,[VENDOR]).kind).toBe('denied');
    expect(classifyAgentProposal(propose(capability),USER,[]).kind).toBe('denied');
  }
});

test('Read capabilities are only candidates, never executable database grants',()=>{
  for(const capability of [
    'read_business_profile','read_growthscore','read_engagement_insights',
    'read_lead_priority_summary','read_review_priority_summary','read_campaign_drafts',
  ]){
    const result=classifyAgentProposal(propose(capability),USER,[VENDOR]);
    expect(result.kind).toBe('read_candidate');
    expect(result.reason).toContain('server authentication');
    expect(result.href?.startsWith('/vendor/')).toBe(true);
  }
});

test('Agent may propose drafts but no edits or messages happen automatically',()=>{
  for(const capability of [
    'propose_listing_change','propose_followup_reminder',
    'propose_review_reply','propose_marketing_campaign',
  ]){
    const r=classifyAgentProposal(propose(capability),USER,[VENDOR]);
    expect(r.kind).toBe('draft_only');
    expect(r.reason).toContain('no write or publish');
  }
});

test('Every potentially mutating action REQUIRES exact fresh vendor approval',()=>{
  for(const capability of [
    'request_listing_update','request_followup_save',
    'request_review_reply_publish','request_campaign_publish',
  ]){
    const r=classifyAgentProposal(propose(capability),USER,[VENDOR]);
    expect(r.kind).toBe('approval_required');
    expect(r.reason).toContain('exact-action vendor approval');
  }
});

test('Billing, deletion and verification decision are ALWAYS blocked in ML-01 agent',()=>{
  for(const capability of [
    'request_billing_change','request_account_delete','request_verification_approval',
  ]){
    const r=classifyAgentProposal(propose(capability),USER,[VENDOR]);
    expect(r.kind).toBe('denied');
    expect(r.href).toBe(null);
  }
});
