import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getSeoPreparation,getWebsiteGuideHostname} from '../lib/seo/owner-readiness.ts';
import {getPublicBusinessSEO,getPublicBusinessJsonLd} from '../lib/seo/public-business.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ordinary={
 id:'16ea8e32-8ddf-4936-bf7f-457e73aa2181',
 slug:'jaffna-tailors',
 name:'Jaffna Tailors',status:'approved',is_verified:false,
 category:'Clothing & Brands',
 description:'Tailoring and alterations available in Jaffna. We provide made-to-measure garments and clothing repairs.',
 address:'Main Road, Jaffna, Sri Lanka',
 phone:'+94770000000',logo_url:'https://example.com/logo.png',
 working_hours:'Monday to Saturday 9am-5pm',
};

test('Normal published business qualifies for SEO regardless of blue badge or paid plan',()=>{
 const seo=getSeoPreparation(ordinary);
 assert.equal(seo.published,true);
 assert.equal(seo.listingVisibility,'published');
 assert.equal(seo.googleIndexed,'unknown');
 assert.equal(seo.domainConnected,false);
 assert.equal(seo.score,95);
 const withoutBadge=getSeoPreparation({...ordinary,is_verified:null});
 const withBadge=getSeoPreparation({...ordinary,is_verified:true});
 assert.equal(withoutBadge.score,seo.score);
 assert.equal(withBadge.score,seo.score);
 assert.ok(getPublicBusinessJsonLd(ordinary),'Approved ordinary listing generates schema without any verified badge');
 const metadata=getPublicBusinessSEO({...ordinary,description:null});
 assert.doesNotMatch(metadata.description,/verified public/i);
});

test('Not yet published business gets SEO preparation but stays excluded from public crawl',()=>{
 for(const status of ['pending','rejected','suspended',null]){
  const value={...ordinary,status,is_verified:true};
  const result=getSeoPreparation(value);
  assert.equal(result.published,false);
  assert.equal(result.listingVisibility,'not_public');
  assert.equal(getPublicBusinessJsonLd(value),null);
  assert.equal(result.score,95,'Preparation is accessible while unpublished');
 }
});

test('Incomplete profile suggestions are factual and score is not Google ranking',()=>{
 const result=getSeoPreparation({id:1,status:'approved',name:'Cafe',category:'Food & Dining'});
 assert.equal(result.score,25);
 assert.ok(result.missing.some(x=>x.key==='description'));
 assert.ok(result.missing.some(x=>x.key==='address'));
 assert.ok(result.missing.some(x=>x.key==='phone'));
 assert.ok(result.missing.some(x=>x.key==='photo'));
 assert.ok(result.missing.some(x=>x.key==='hours'));
 assert.ok(result.missing.some(x=>x.key==='website'));
 assert.equal(result.checks.reduce((acc,x)=>acc+x.points,0),100);
});

test('Domain guide recognizes ordinary domains without claiming ownership',()=>{
 for(const [input,expected] of [
  ['mybusiness.lk','mybusiness.lk'],
  ['https://www.example.com','www.example.com'],
  ['http://test.org/','test.org'],
  ['SHOP.EXAMPLE.LK','shop.example.lk'],
 ]){
  assert.equal(getWebsiteGuideHostname(input),expected,input);
 }
 for(const bad of [
  '', 'localhost','http://127.0.0.1','http://10.0.0.1',
  'https://user:pass@example.org','https://example.org:8443',
  'example.org/path','example.org?pass=secret',
  'http://example.org/#oops','http://localhost.local',
  'http://[::1]/','javascript:alert(1)',
  'http://some..domain.org','https://bad_domain.com',
 ])assert.equal(getWebsiteGuideHostname(bad),null,bad);
});

test('Owner SEO route uses fresh auth, RLS owner scope, no Pro/Verified eligibility gate',()=>{
 const page=read('app/vendor/seo/page.tsx');
 assert.match(page,/auth\.getUser\(\)/);
 assert.match(page,/\.eq\('owner_id',user\.id\)/);
 assert.match(page,/\.limit\(100\)/);
 assert.match(page,/SeoEngineWorkspace/);
 assert.match(page,/robots:\{index:false,follow:false\}/);
 assert.doesNotMatch(page,/\.eq\('is_verified',true\)/);
 assert.doesNotMatch(page,/getMarketingAccessForUser|subscription_plans|service_role/);
});

test('SEO engine page clearly distinguishes publication from verification and indexing',()=>{
 const page=read('app/vendor/seo/SeoEngineWorkspace.tsx');
 assert.match(page,/Verified badge not required/);
 assert.match(page,/badge optional|Badge optional/);
 assert.match(page,/isPublished\?\'Published on SLBI\'/);
 assert.match(page,/Google indexing/);
 assert.match(page,/Not yet verified/);
 assert.match(page,/getSeoPreparation\(listing\)/);
 assert.match(page,/getPublicBusinessSEO\(listing\)/);
 assert.match(page,/getWebsiteGuideHostname\(website\)/);
 assert.match(page,/Guide preview only — no domain is connected/);
 assert.match(page,/A verification token and a real/);
 assert.match(page,/No external website edits, Google API submissions/);
 assert.match(page,/setWebsite\(''\)/,'Must reset domain inputs when changing vendor context');
});

test('Easy navigation shows SEO Engine as primary tab and searchable quick action',()=>{
 const nav=read('app/vendor/layout.tsx');
 const quick=read('app/vendor/components/VendorQuickActions.tsx');
 assert.match(nav,/name:'SEO Engine',href:'\/vendor\/seo'/);
 assert.match(quick,/title:'SEO Engine'.*href:'\/vendor\/seo'/);
});

test('Sitemap continues approved-only discovery and de-duplicates identical category slugs',()=>{
 const sitemap=read('app/sitemap.ts');
 assert.match(sitemap,/\.eq\('status','approved'\)/);
 assert.match(sitemap,/export const revalidate=300/);
 assert.match(sitemap,/seenCategorySlugs/);
 assert.match(sitemap,/seenCategorySlugs\.has\(key\)/);
 assert.match(sitemap,/seenCategorySlugs\.add\(key\)/);
});

test('No pretend domain verification or privileged commands in first SEO-01 workspace',()=>{
 const files=[
  'lib/seo/owner-readiness.ts',
  'app/vendor/seo/page.tsx',
  'app/vendor/seo/SeoEngineWorkspace.tsx',
 ];
 for(const path of files){
  const content=read(path);
  assert.doesNotMatch(content,/SERVICE_ROLE_KEY|googleapis\.com\/indexing|\.insert\(|\.update\(|\.upsert\(|\.delete\(|dns\.resolve|fetch\(website/);
 }
});
