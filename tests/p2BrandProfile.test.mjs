import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  BRAND_DEFAULTS,BRAND_LANGUAGES,BRAND_TONES,validateBrandProfile,
} from '../lib/marketing/brand-profile.ts';
const read = p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const businessId='11111111-1111-4111-8111-111111111111';
const good={
  businessId,brandName:'Jaffna Spices',slogan:'Quality in every meal',
  primaryColor:'#202024',secondaryColor:'#FFFFFF',accentColor:'#FF7900',
  audience:'Local retail customers',tone:'friendly',languages:['en','ta','si'],
  guidelines:'Use real approved offers, never invented prices.',offers:[],
};
test('P2-01 legitimate Tamil/Sinhala/English brand profiles are valid',()=>{
  assert.deepEqual(BRAND_LANGUAGES,['en','ta','si']);
  assert.equal(BRAND_TONES.length,5);
  assert.equal(validateBrandProfile(good).ok,true,JSON.stringify(validateBrandProfile(good)));
  assert.equal(validateBrandProfile({...good,brandName:'யாழ்ப்பாணம் கடை'}).ok,true);
  assert.equal(validateBrandProfile({...good,brandName:'යාපනය වෙළඳසැල'}).ok,true);
  assert.equal(validateBrandProfile({...good,offers:[{
    title:'New product',details:'Price only as verified by owner',validUntil:'2027-12-31',
  }]}).ok,true);
  assert.equal(validateBrandProfile({...good,primaryColor:'#aabbcc'}).value?.primaryColor,'#AABBCC');
});
test('Invalid colors, repeated languages, unexpected fields and forged owner references fail',()=>{
  for(const value of [
    {...good,businessId:'1'},
    {...good,primaryColor:'javascript:alert(1)'},
    {...good,secondaryColor:'#FFF'},
    {...good,tone:'admin'},
    {...good,languages:['en','en']},
    {...good,languages:['fr']},
    {...good,languages:[]},
    {...good,ownerId:businessId},
    {...good,credits:100000},
    {...good,brandName:'x'},
    {...good,offers:Array.from({length:6},()=>({title:'Offer',details:'Details',validUntil:null}))},
    {...good,offers:[{title:'Offer',details:'Terms',validUntil:'2026-02-30'}]},
    {...good,offers:[{title:'Offer',details:'Terms',validUntil:'2027-12-31-sneaky'}]},
    {...good,offers:[{title:'Offer',details:'Terms'}]},
    {...good,offers:[{title:'Offer',details:'Terms',validUntil:null,discount:'100%'}]},
  ]) assert.equal(validateBrandProfile(value).ok,false,JSON.stringify(value).slice(0,110));
});
test('Exact offer conditions and allowed brand guidelines, not AI or provider connections',()=>{
  const v=validateBrandProfile({...good,offers:[{title:'Trial',details:'Valid for local pickup only',validUntil:null}]});
  assert.equal(v.ok,true,JSON.stringify(v));
  if(v.ok)assert.deepEqual(v.value.offers,[{title:'Trial',details:'Valid for local pickup only',validUntil:null}]);
  assert.deepEqual(BRAND_DEFAULTS.languages,['en','ta','si']);
});

test('Marketing brand API verifies owner server-side and rejects client owner_id and forged cross-site writes',()=>{
  const s=read('app/api/marketing/brand-profile/route.ts');
  assert.match(s,/auth\.getUser\(\)/);
  assert.match(s,/\.eq\('owner_id',user\.id\)/);
  assert.match(s,/validateBrandProfile\(parsed\)/);
  assert.match(s,/isSameOrigin\(request\.url,request\.headers\.get\('origin'\)\)/);
  assert.match(s,/business_id:v\.businessId,owner_id:user\.id/);
  assert.match(s,/\.eq\('business_id',v\.businessId\)\.eq\('owner_id',user\.id\)/);
  assert.doesNotMatch(s,/SERVICE_ROLE|SUPABASE_SECRET_KEY|NEXT_PUBLIC_GROQ/);
  assert.match(s,/tableMissing/);
  assert.match(s,/Brand Profiles are not enabled/);
});

test('UI binds to real owned businesses; no fake AI generations, published campaigns or credit charges',()=>{
  const s=read('app/vendor/marketing/brand/page.tsx');
  assert.match(s,/\.eq\('owner_id',user\.id\)/);
  assert.match(s,/\/api\/marketing\/brand-profile\?businessId=/);
  assert.match(s,/method:'PUT',credentials:'same-origin'/);
  assert.match(s,/BRAND_LANGUAGES\.map/);
  assert.match(s,/profile\.offers\.length>=5/);
  assert.match(s,/logo_url/);
  assert.match(s,/Marketing Studio/);
  const homepage=read('app/vendor/marketing/page.tsx');
  assert.match(homepage,/MarketingAppStore/);
  const apps=read('lib/marketing/studio-apps.ts');
  assert.match(apps,/href:'\/vendor\/marketing\/brand'/);
  assert.match(apps,/Business Brand Kit/);
});

test('SQL guards tenant isolation, immutable owner identity and no anonymous writes',()=>{
  const sql=read('docs/growth/p2/P2_01_SOCIAL_BRAND_PROFILES_STAGING_ONLY.sql');
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.social_brand_profiles FROM PUBLIC, anon, authenticated/);
  assert.match(sql,/owner_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/b\.owner_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/GRANT INSERT \(/);
  assert.match(sql,/GRANT SELECT ON public\.social_brand_profiles TO authenticated/);
  assert.match(sql,/GRANT UPDATE \(/);
  assert.match(sql,/business_id uuid PRIMARY KEY/);
  assert.match(sql,/REVIEW \/ DISPOSABLE DOCKER DATABASE ONLY/);
  assert.doesNotMatch(sql,/GRANT ALL ON public\.social_brand_profiles TO authenticated/);
});
