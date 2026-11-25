import {test,expect} from 'bun:test';
import {buildG1ReadOnlyKnowledge} from '../../lib/growth/g1/read-only-knowledge.ts';
import {buildG2GrowthScore,G2_GROWTH_SCORE_VERSION} from '../../lib/growth/g2/growth-score.ts';
import {ownerContactEvidence} from '../../lib/growth/g2/contact-evidence.ts';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const BIZ='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const business=()=>({
  id:BIZ,owner_id:OWNER,status:'approved',name:'Jaffna Tea',
  category:'Food & Dining',description:'We offer Sri Lankan tea and snacks',
  is_verified:false,verification_status:'pending',can_show_badge:false,
});
const profile=()=>({business_id:BIZ,services:['Catering'],gallery_paths:[BIZ+'/gallery.webp']});
const brand=()=>({
  business_id:BIZ,owner_id:OWNER,brand_name:'Jaffna Tea',slogan:'Fresh everyday',
  primary_color:'#AA5500',tone:'friendly',languages:['en','ta'],offers:[],
});
const originalRow=()=>({
  id:BIZ,owner_id:OWNER,status:'approved',phone:'+94 21 2222222',
  address:'Jaffna, Sri Lanka',latitude:9.66,longitude:80.01,
  working_hours:{Monday:'09:00-17:00'},
  website_url:'https://jaffna-tea.example',logo_url:'https://assets.example/logo.webp',
});
function context(owned=business(),br=brand(),pr=profile()){
  const result=buildG1ReadOnlyKnowledge({
    requesterUserId:OWNER,requestedBusinessId:BIZ,business:owned,brand:br,profile:pr,
  });
  if(!result.ok)throw Error('Expected valid owner knowledge');
  return result.context;
}
function contact(row=originalRow()){
  const evidence=ownerContactEvidence(row,OWNER,BIZ);
  if(!evidence)throw Error('Expected owned contact evidence');
  return evidence;
}

test('G2-02 complete observed approved listing gives 100/100, three weighted dimensions',()=>{
  const result=buildG2GrowthScore(context(),contact());
  expect(result?.version).toBe(G2_GROWTH_SCORE_VERSION);
  expect(result?.totalWeight).toBe(100);
  expect(result?.score).toBe(100);
  expect(result?.evidenceCoveragePercent).toBe(100);
  expect(result?.status).toBe('ready');
  expect(result?.signals).toHaveLength(13);
  expect(result?.dimensions.map(d=>[d.dimension,d.totalWeight]))
    .toEqual([['content',40],['findability',40],['identity',20]]);
  expect(result?.recommendations).toEqual([]);
});

test('Missing description, phone, and photos reduce readiness by factual weights, not ranking',()=>{
  const changed=business();changed.description=null;
  const p=profile();p.gallery_paths=[];
  const row=originalRow();row.phone=null;
  const result=buildG2GrowthScore(context(changed,brand(),p),contact(row));
  expect(result?.score).toBe(70);
  expect(result?.observedWeight).toBe(100);
  expect(result?.recommendations.slice(0,3).map(x=>x.key))
    .toEqual(['description','phone','gallery']);
  expect(result?.recommendations[0].href).toBe('/vendor/my-businesses/'+BIZ+'/edit');
  expect(result?.recommendations[2].href).toBe('/vendor/gallery-services?business='+BIZ);
});

test('Unknown source fields reduce coverage without being scored zero or recommended',()=>{
  const known=context();
  const changed={
    ...known,
    services:{...known.services,value:null,state:'withheld',source:'none'},
    galleryImageCount:{...known.galleryImageCount,value:null,state:'withheld',source:'none'},
    brand:{...known.brand,languages:{...known.brand.languages,value:null,state:'withheld',source:'none'}},
  };
  const partly=buildG2GrowthScore(changed,contact());
  expect(partly?.score).toBe(100);
  expect(partly?.evidenceCoveragePercent).toBe(76);
  expect(partly?.recommendations).toHaveLength(0);
  const unknownContact={...contact(),mapPin:null,phone:null};
  const insufficient=buildG2GrowthScore(changed,unknownContact);
  expect(insufficient?.evidenceCoveragePercent).toBe(56);
  expect(insufficient?.score).toBe(null);
  expect(insufficient?.status).toBe('insufficient_data');
  expect(insufficient?.recommendations.every(x=>x.state==='missing')).toBe(true);
});

test('No plan, paid-tier or verified badge bias; language and Unicode input remain data only',()=>{
  const basic=context();basic.listing.verification={value:false,state:'verified_metadata',source:'businesses',sourceUpdatedAt:null};
  basic.plan='Free';
  const pro={...basic,plan:'PRO',listing:{
    ...basic.listing,
    verification:{value:true,state:'verified_metadata',source:'businesses',sourceUpdatedAt:null},
  }};
  const scoreA=buildG2GrowthScore(basic,contact());
  const scoreB=buildG2GrowthScore(pro,contact());
  expect(scoreA).toEqual(scoreB);
  expect(JSON.stringify(scoreA)).not.toContain('PRO');
});

test('Owner-bounded contact evidence fails closed on cross-business, other tenant and unapproved',()=>{
  expect(ownerContactEvidence({...originalRow(),owner_id:OTHER},OWNER,BIZ)).toBe(null);
  expect(ownerContactEvidence({...originalRow(),id:OTHER},OWNER,BIZ)).toBe(null);
  expect(ownerContactEvidence({...originalRow(),status:'pending'},OWNER,BIZ)).toBe(null);
  expect(ownerContactEvidence(null,OWNER,BIZ)).toBe(null);
  expect(buildG2GrowthScore(context(),{...contact(),businessId:OTHER})).toBe(null);
  expect(buildG2GrowthScore({...context(),usage:'public'},contact())).toBe(null);
  expect(buildG2GrowthScore({...context(),businessId:'../../admin'},contact())).toBe(null);
  expect(buildG2GrowthScore(context(),{...contact(),phone:'unknown'})).toBe(null);
});

test('Map pin requires plausible Sri Lankan coordinates; no 0,0 default or invalid URL',()=>{
  const row=originalRow();row.latitude=0;row.longitude=0;row.website_url='javascript:alert(1)';
  const data=contact(row);
  expect(data.mapPin).toBe(false);
  expect(data.website).toBe(false);
  const result=buildG2GrowthScore(context(),data);
  expect(result?.score).toBe(85);
  expect(result?.recommendations.map(item=>item.key)).toEqual(['mapPin','website']);
});

test('Brand recommendation deep link carries owned business ID and source evidence only',()=>{
  const missing=context(business(),null,profile());
  const result=buildG2GrowthScore(missing,contact());
  expect(result?.recommendations.map(x=>x.key)).toEqual(['brandName','languages']);
  expect(result?.recommendations[0].href).toBe('/vendor/marketing/brand?business='+BIZ);
  expect(JSON.stringify(result)).not.toContain('Fresh everyday');
  expect(JSON.stringify(result)).not.toContain('+94');
  expect(JSON.stringify(result)).not.toContain('Jaffna, Sri Lanka');
});
