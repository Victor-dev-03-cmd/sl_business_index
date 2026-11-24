import {test,expect} from 'bun:test';
import {buildG2ContentChecklist,G2_CONTENT_CHECKLIST_VERSION} from '../../lib/growth/g2/listing-content-checklist.ts';

const BIZ='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const value=(v,state='vendor_asserted')=>({
  value:v,state,source:v===null?'none':'businesses',sourceUpdatedAt:null,
});
const base=()=>({
  schemaVersion:'g1-knowledge-preview-v0',
  usage:'owner_preview_only',
  businessId:BIZ,
  listing:{name:value('தமிழ் உணவு'),category:value('Food'),description:value('A local restaurant')},
  brand:{name:value(null)},
  services:value(['Catering']),
  galleryImageCount:value(2),
  offers:value(null,'withheld'),
  guidelines:value(null,'withheld'),
});

test('All available listing content is ready; not marketed as a GrowthScore',()=>{
  const r=buildG2ContentChecklist(base());
  expect(r?.version).toBe(G2_CONTENT_CHECKLIST_VERSION);
  expect(r?.readyCount).toBe(5);
  expect(r?.observedCount).toBe(5);
  expect(r?.unavailableCount).toBe(0);
  expect(r?.nextActions).toEqual([]);
  expect(r?.description).toContain('not a GrowthScore');
});

test('Missing description, empty services and gallery produce actual owner edit routes',()=>{
  const c=base();
  c.listing.description=value(null,'missing');
  c.services=value([]);
  c.galleryImageCount=value(0);
  const r=buildG2ContentChecklist(c);
  expect(r?.readyCount).toBe(2);
  expect(r?.nextActions.map(x=>x.key)).toEqual(['description','services','gallery']);
  expect(r?.nextActions[0].href).toBe('/vendor/my-businesses/'+BIZ+'/edit');
  expect(r?.nextActions[1].href).toBe('/vendor/gallery-services?business='+BIZ);
  expect(r?.nextActions[2].href).toBe('/vendor/gallery-services?business='+BIZ);
});

test('Unavailable facts are excluded from observed count and never marked failure',()=>{
  const c=base();
  c.listing.category=value(null,'withheld');
  c.services=value(null,'withheld');
  const r=buildG2ContentChecklist(c);
  expect(r?.observedCount).toBe(3);
  expect(r?.readyCount).toBe(3);
  expect(r?.unavailableCount).toBe(2);
  expect(r?.checks.filter(x=>x.state==='unavailable').map(x=>x.key)).toEqual(['category','services']);
  expect(r?.nextActions.length).toBe(0);
});

test('Unpublished/non-owner context shape and malformed business IDs never render actions',()=>{
  for (const change of [
    {businessId:'../admin'}, {schemaVersion:'unknown'}, {usage:'public'},
  ])expect(buildG2ContentChecklist({...base(),...change})).toBe(null);
});

test('G2 checklist ignores verification, brand, offers, plan and unknown performance',()=>{
  const a=base();
  a.listing.verification=value(false,'verified_metadata');
  a.brand.name=value('Premium');
  a.brand.offers=value([{secret:'unsafe'}]);
  a.plan='PRO';
  const b=base();
  b.listing.verification=value(true,'verified_metadata');
  expect(buildG2ContentChecklist(a)?.checks).toEqual(buildG2ContentChecklist(b)?.checks);
  expect(JSON.stringify(buildG2ContentChecklist(a))).not.toContain('unsafe');
  expect(JSON.stringify(buildG2ContentChecklist(a))).not.toContain('Premium');
});
