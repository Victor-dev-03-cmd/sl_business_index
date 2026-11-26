import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  SLBI_PUBLIC_ORIGIN,isPublicApprovedBusiness,
  getPublicBusinessCanonical,getPublicBusinessSEO,
  getPublicBusinessJsonLd,getSafeBusinessGeo,
} from '../lib/seo/public-business.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const approved={
 id:'11111111-1111-4111-8111-111111111111',
 slug:'jaffna-bakery',status:'approved',name:'Jaffna Bakery',
 category:'Food & Dining',description:'Fresh cakes and bread made daily.',
 address:'Main Street, Jaffna, Sri Lanka',phone:'+94771234567',
 latitude:9.6685,longitude:80.0074,
 image_url:'https://example.invalid/bakery.jpg',
};

test('exact approved business has stable www canonical, title and honest description',()=>{
 assert.equal(SLBI_PUBLIC_ORIGIN,'https://www.slbusinessindex.com');
 assert.equal(getPublicBusinessCanonical(approved),'https://www.slbusinessindex.com/business/jaffna-bakery');
 assert.equal(getPublicBusinessCanonical({...approved,slug:''}),
  'https://www.slbusinessindex.com/business/11111111-1111-4111-8111-111111111111');
 const seo=getPublicBusinessSEO(approved);
 assert.match(seo.title,/Jaffna Bakery/);
 assert.match(seo.title,/Food & Dining/);
 assert.match(seo.description,/Jaffna/);
 assert.equal(seo.canonical,getPublicBusinessCanonical(approved));
 assert.ok(seo.description.length<=160);
});

test('only approved public listings have LocalBusiness schema; pending and rejected are excluded',()=>{
 for(const status of [null,'pending','rejected','draft','suspended','under_review']){
  assert.equal(isPublicApprovedBusiness({status}),false);
  assert.equal(getPublicBusinessJsonLd({...approved,status}),null);
 }
 assert.equal(isPublicApprovedBusiness({status:'approved'}),true);
 const ld=getPublicBusinessJsonLd(approved);
 assert.equal(ld?.['@type'],'LocalBusiness');
 assert.equal(ld?.['@id'],'https://www.slbusinessindex.com/business/jaffna-bakery#business');
 assert.equal(ld?.url,'https://www.slbusinessindex.com/business/jaffna-bakery');
 assert.equal(ld?.telephone,'+94771234567');
 assert.deepEqual(ld?.geo,{'@type':'GeoCoordinates',latitude:9.6685,longitude:80.0074});
 assert.equal(ld?.aggregateRating,undefined,'Do not invent cached ratings when review parity is unresolved');
 assert.equal(ld?.sameAs,undefined,'External website ownership is not yet verified');
});

test('invalid coordinates and unsafe URLs cannot appear in schema',()=>{
 for(const geo of [
  {latitude:null,longitude:80},
  {latitude:Infinity,longitude:80},
  {latitude:95,longitude:80},
  {latitude:8,longitude:190},
 ]){
  assert.equal(getSafeBusinessGeo({...approved,...geo}),undefined);
 }
 const schema=getPublicBusinessJsonLd({...approved,latitude:null,
  image_url:'javascript:alert(1)',phone:'<script>alert(1)</script>'});
 assert.equal(schema?.geo,undefined);
 assert.equal(schema?.image,undefined);
 assert.equal(schema?.telephone,undefined);
});

test('Next.js metadata and sitemap automatic publication are aligned with approved-only URLs',()=>{
 const page=read('app/business/[slug]/page.tsx');
 const sitemap=read('app/sitemap.ts');
 const robots=read('app/robots.ts');
 assert.match(page,/getPublicBusinessSEO\(business\)/);
 assert.match(page,/getPublicBusinessJsonLd\(business\)/);
 assert.match(page,/isPublicApprovedBusiness\(business\)/);
 assert.match(page,/robots: \{index:false,follow:false/);
 assert.match(page,/alternates: \{canonical:seo\.canonical\}/);
 assert.match(page,/\{jsonLd && <script/);
 assert.match(sitemap,/export const revalidate=300/);
 assert.match(sitemap,/\.eq\('status','approved'\)/);
 assert.match(sitemap,/getPublicBusinessCanonical\(\{id:b\.id,slug:b\.slug\}\)/);
 assert.doesNotMatch(sitemap,/\/testimonials/);
 assert.doesNotMatch(sitemap,/https:\/\/slbusinessindex\.com/);
 assert.match(robots,/SLBI_PUBLIC_ORIGIN\+'\/sitemap\.xml'/);
 assert.match(robots,/\/vendor\//);
 assert.doesNotMatch(robots,/GPTBot.*allow|'Google-Other'/);
});

test('No production domain-claim, backlinks, fake indexing API or write side-effects',()=>{
 for(const path of [
  'lib/seo/public-business.ts','app/sitemap.ts','app/robots.ts',
 ]){
  const source=read(path);
  assert.doesNotMatch(source,/Indexing API|indexing\.googleapis\.com|\.insert\(|\.update\(|\.upsert\(|\.delete\(|SERVICE_ROLE_KEY/);
 }
});
