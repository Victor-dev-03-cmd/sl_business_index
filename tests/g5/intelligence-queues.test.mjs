import {test,expect} from 'bun:test';
import {classifyLeadIQ,buildLeadIQQueue} from '../../lib/growth/g5/lead-iq.ts';
import {classifyReputationAction,buildReputationQueue} from '../../lib/growth/g5/reputation-actions.ts';

const NOW=Date.parse('2026-11-25T12:00:00Z');
const lead=(id,status,created_at='2026-11-24T13:00:00Z')=>({id,status,created_at});
const review=(id,rating,created_at='2026-11-24T10:00:00Z',replied=false)=>({
  id,rating,created_at,review_replies:replied?[{id:'reply-'+id}]:[],
});

test('LeadIQ overdue saved reminder is urgent, regardless of New or Contacted stage',()=>{
  const saved={due_at:'2026-11-25T11:00:00Z',done_at:null};
  expect(classifyLeadIQ(lead('l1','contacted'),saved,'available',NOW)?.reason).toBe('overdue-followup');
  expect(classifyLeadIQ(lead('l2','new'),saved,'available',NOW)?.source).toBe('saved-follow-up');
  expect(classifyLeadIQ(lead('l2','converted'),saved,'available',NOW)).toBe(null);
  expect(classifyLeadIQ(lead('l2','lost'),saved,'available',NOW)).toBe(null);
  expect(classifyLeadIQ(lead('l2','contacted'),{...saved,done_at:'2026-11-25T11:10:00Z'},'available',NOW)?.reason).toBe('contacted');
});
test('LeadIQ stage urgency is transparent, no prediction and no fabricated reminder',()=>{
  expect(classifyLeadIQ(lead('old','new','2026-11-20T01:00:00Z'),undefined,'unavailable',NOW)?.reason)
    .toBe('new-unanswered');
  expect(classifyLeadIQ(lead('recent','new'),undefined,'loading',NOW)?.priority).toBe('attention');
  expect(classifyLeadIQ(lead('active','contacted'),undefined,'unavailable',NOW)?.source).toBe('recorded-stage');
  expect(classifyLeadIQ(lead('active','contacted'),
    {due_at:'2026-11-27T09:00:00Z',done_at:null},'available',NOW)?.reason).toBe('scheduled-followup');
  expect(classifyLeadIQ(lead('u','unknown'),undefined,'available',NOW)).toBe(null);
});
test('LeadIQ sorted urgent before others and deduplicates records',()=>{
  const queue=buildLeadIQQueue([
    lead('c','contacted'),lead('new','new'),lead('old','new','2026-11-21T00:00:00Z'),
    lead('c','contacted'),lead('done','converted'),
  ],{c:{due_at:'2026-11-25T10:00:00Z',done_at:null}},'available',NOW);
  expect(queue.map(x=>x.id)).toEqual(['old','c','new']);
  expect(queue.map(x=>x.priority)).toEqual(['urgent','urgent','attention']);
  expect(queue.every(x=>!('phone' in x)&&!('email' in x))).toBe(true);
});
test('LeadIQ fails closed on invalid clock/rows',()=>{
  expect(buildLeadIQQueue([lead('x','new')],{},'unavailable',NaN)).toEqual([]);
  expect(buildLeadIQQueue([],{},'available',NOW)).toEqual([]);
});
test('Reputation starts with unanswered 1–2 star published records, then other unanswered',()=>{
  const q=buildReputationQueue([
    review('high-five',5),review('replied-low',1,undefined,true),
    review('low',2,'2026-11-23T09:00:00Z'),review('mid',3),
    review('low',2),review('unrated',null),
  ]);
  expect(q.map(x=>x.id)).toEqual(['low','high-five','mid','unrated']);
  expect(q[0].reason).toBe('low-rating-unanswered');
  expect(q[0].explanation).toContain('1–2 star');
  expect(q.every(x=>x.source==='published-rating-and-reply')).toBe(true);
});
test('Reputation does not infer sentiment or queue already replied review',()=>{
  expect(classifyReputationAction(review('a',5,undefined,true))).toBe(null);
  expect(classifyReputationAction(review('b',2))?.priority).toBe('high');
  expect(classifyReputationAction(review('c',null))?.priority).toBe('normal');
  expect(buildReputationQueue([])).toEqual([]);
  expect(buildReputationQueue([review('a',1,undefined,true)])).toEqual([]);
});
