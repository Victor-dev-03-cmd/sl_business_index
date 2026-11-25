import {test,expect} from 'bun:test';
import {
  buildFollowUpWorklist, followUpFocusIds, buildLeadFollowUpAdvice,
} from '../../lib/growth/g5/followup-intelligence.ts';
import {buildReviewReplyGuidance} from '../../lib/growth/g5/review-reply-guidance.ts';
const NOW=Date.parse('2026-11-25T09:00:00Z');
const lead=(id,status='new',created_at='2026-11-24T09:00:00Z')=>({id,status,created_at});
const follow=(due_at,done_at=null)=>({due_at,done_at});

test('Follow-up intelligence counts exact owner-fetched open stages and saved reminder windows',()=>{
  const data=[
    lead('overdue','new'), lead('soon','contacted'),lead('later','contacted'),
    lead('unplanned','contacted'),lead('stalled','new','2026-11-20T00:00:00Z'),
    lead('closed','converted'),lead('lost','lost'),lead('finished','contacted'),
  ];
  const rows={
    overdue:follow('2026-11-25T08:00:00Z'),
    soon:follow('2026-11-25T09:01:00Z'),
    later:follow('2026-11-28T09:00:00Z'),
    closed:follow('2026-11-24T12:00:00Z'),
    finished:follow('2026-11-24T12:00:00Z','2026-11-25T08:00:00Z'),
  };
  const r=buildFollowUpWorklist(data,rows,'available',NOW);
  expect(r.remindersAvailable).toBe(true);
  expect(r.overdue).toEqual(['overdue']);
  expect(r.next24).toEqual(['soon']);
  expect(r.stalledNew).toEqual(['stalled']);
  expect(r.contactedUnplanned).toEqual(['unplanned','finished']);
  expect(followUpFocusIds(r,'all')).toBe(null);
  expect(followUpFocusIds(r,'next24')).toEqual(['soon']);
  expect(followUpFocusIds(r,'stalled-new')).toEqual(['stalled']);
  expect(followUpFocusIds(r,'contacted-unplanned')).toEqual(['unplanned','finished']);
});
test('Missing reminder table is UNKNOWN (not saved zero), but New 48h remains real stage evidence',()=>{
  const l=[lead('old','new','2026-11-21T00:00:00Z'),lead('pending','contacted')];
  for(const readiness of ['loading','unavailable']){
    const r=buildFollowUpWorklist(l,{pending:follow('2026-11-24T00:00:00Z')},readiness,NOW);
    expect(r.remindersAvailable).toBe(false);
    expect(r.overdue).toEqual([]);
    expect(r.next24).toEqual([]);
    expect(r.contactedUnplanned).toEqual([]);
    expect(r.stalledNew).toEqual(['old']);
  }
});
test('Boundary, invalid due date, deduplication, closed statuses and invalid clock are safe',()=>{
  const l=[lead('x','contacted'),lead('x','contacted'),lead('z','new','bad-time'),lead('done','lost')];
  const r=buildFollowUpWorklist(l,{x:follow('2026-11-26T09:00:00Z'),done:follow('2026-11-24T00:00:00Z')},'available',NOW);
  expect(r.next24).toEqual(['x']); // exactly 24h
  expect(r.overdue).toEqual([]);
  expect(r.stalledNew).toEqual([]);
  const unknown=buildFollowUpWorklist([lead('bad','contacted')],{bad:follow('not-a-date')},'available',NOW);
  expect(unknown.contactedUnplanned).toEqual(['bad']);
  expect(buildFollowUpWorklist(l,{},'available',NaN).overdue).toEqual([]);
});
test('Lead guidance stays grounded in recorded stage and known saved due time',()=>{
  const old=lead('a','new','2026-11-20T00:00:00Z');
  const overdue=buildLeadFollowUpAdvice(old,follow('2026-11-25T08:00:00Z'),'available',NOW);
  expect(overdue.heading).toContain('due');
  expect(overdue.evidence).toBe('saved-reminder');
  expect(overdue.nextSteps.length).toBe(3);
  expect(overdue.manualMessage).not.toContain('guarantee');
  const unknown=buildLeadFollowUpAdvice(old,follow('2026-11-25T08:00:00Z'),'unavailable',NOW);
  expect(unknown.heading).toContain('New enquiry');
  expect(unknown.evidence).toBe('recorded-stage');
  expect(unknown.summary).toContain('does not prove');
  expect(buildLeadFollowUpAdvice(lead('done','converted'),undefined,'available',NOW).manualMessage).toBe(null);
  expect(buildLeadFollowUpAdvice(lead('c','contacted'),undefined,'available',NOW).summary)
    .toContain('no active saved reminder');
});
test('Reply templates are optional, three-language, rating-only with no invented resolution',()=>{
  for(const lang of ['en','ta','si']){
    expect(buildReviewReplyGuidance(1,lang).tone).toBe('careful');
    expect(buildReviewReplyGuidance(2,lang).tone).toBe('careful');
    expect(buildReviewReplyGuidance(3,lang).tone).toBe('balanced');
    expect(buildReviewReplyGuidance(4,lang).tone).toBe('thanks');
    expect(buildReviewReplyGuidance(5,lang).tone).toBe('thanks');
    expect(buildReviewReplyGuidance(null,lang).tone).toBe('general');
    const g=buildReviewReplyGuidance(1,lang);
    expect(g.draft.length).toBeGreaterThan(25);
    expect(g.draft.length).toBeLessThan(2000);
    expect(g.source).toBe('recorded-rating-only');
    expect(g.checklist.some(x=>x.includes('Only Publish reply'))).toBe(true);
    expect(g.draft).not.toMatch(/refund|guarantee|discount|WhatsApp|https?:\/\//i);
  }
  expect(buildReviewReplyGuidance(Number.NaN,'en').tone).toBe('general');
  expect(buildReviewReplyGuidance(6,'en').tone).toBe('general');
});
