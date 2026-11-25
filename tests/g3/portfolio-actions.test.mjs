import {test,expect} from 'bun:test';
import {buildG3PortfolioActions} from '../../lib/growth/g3/portfolio-actions.ts';

const baseline={
  views:70,calls:0,leads:0,reviews:1,
  ownedCount:1,approvedCount:1,pendingCount:0,
};
test('G3 snapshot 70 views/0 calls surfaces the actual contact opportunity without claiming sales',()=>{
  const actions=buildG3PortfolioActions(baseline);
  expect(actions.map(a=>a.id)).toEqual(['contact','reputation']);
  expect(actions[0].href).toBe('/vendor/my-businesses');
  expect(actions[0].description).toContain('70 recorded profile view(s)');
  expect(actions[0].description).toContain('no recorded phone clicks');
  expect(actions.every(a=>a.source==='portfolio')).toBe(true);
  expect(JSON.stringify(actions)).not.toMatch(/guaranteed|confirmed sales|unique customers/i);
});
test('No business, pending listing, and enquiries each create grounded next action',()=>{
  expect(buildG3PortfolioActions({...baseline,ownedCount:0,approvedCount:0,pendingCount:0})[0].href)
    .toBe('/register-business');
  const a=buildG3PortfolioActions({...baseline,pendingCount:1,approvedCount:0,leads:2});
  expect(a.map(item=>item.id)).toEqual(['review-listings','contact','respond']);
  expect(a[2].href).toBe('/vendor/leads');
});
test('No recorded views means optional manual campaign not an invented performance result',()=>{
  const a=buildG3PortfolioActions({...baseline,views:0,reviews:0});
  expect(a[0].id).toBe('campaign');
  expect(a[0].href).toBe('/vendor/marketing');
});
test('Malformed or negative counters never produce confident action advice',()=>{
  for(const bad of [
    {...baseline,views:-1},{...baseline,leads:Number.NaN},
    {...baseline,calls:Infinity},
  ])expect(buildG3PortfolioActions(bad)).toEqual([]);
});
test('Zero recorded activity still offers existing insights without fabricated conversion',()=>{
  const a=buildG3PortfolioActions({...baseline,views:0,reviews:0,approvedCount:0});
  expect(a[0].id).toBe('insights');
});
