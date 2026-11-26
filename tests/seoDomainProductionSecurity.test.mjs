import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('app/api/vendor/seo/domain/route.ts');
const sql=read('supabase/migrations/20261127060000_seo_domain_connections_owner_rls.sql');
const ui=read('app/vendor/seo/SeoDomainConnector.tsx');
const layout=read('app/vendor/layout.tsx');

test('Owner verified DNS route checks origin, real auth and RLS business ownership before privileged writes',()=>{
 assert.match(api,/request\.headers\.get\('origin'\)/);
 assert.match(api,/request\.headers\.get\('content-type'\)/);
 assert.match(api,/1400/);
 assert.match(api,/auth\.getUser\(\)/);
 assert.match(api,/user\.is_anonymous/);
 assert.match(api,/\.eq\('id',body\.businessId\)\.eq\('owner_id',user\.id\)/);
 assert.match(api,/if\(!business\)return denied\(404,'business_not_owned'\)/);
 assert.match(api,/existing\.owner_id!==user\.id/);
 assert.match(api,/admin\(\)/);
 assert.match(api,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(api,/persistSession:false/);
 assert.doesNotMatch(ui,/SUPABASE_SERVICE_ROLE_KEY|SERVICE_KEY|service_role/);
});

test('Real domain claim uses crypto-random token, limited DNS TXT resolver only and never fake verify',()=>{
 assert.match(api,/randomBytes\(24\)\.toString\('hex'\)/);
 assert.match(api,/resolveTxt\(name\)/);
 assert.match(api,/hasDnsProof\(existing\.txt_record_name,existing\.verification_token\)/);
 assert.match(api,/method==='http_file'\?'verification_file_not_found':'dns_record_not_found'/);
 assert.match(api,/state:'verified',verified_at/);
 assert.match(api,/verification_expires_at:new Date\(now\.getTime\(\)\+30\*24\*60\*60_000\)/);
 assert.match(api,/verification_rate_limited/);
 assert.match(api,/\.delete\(\)\.eq\('id',existing\.id\)\.eq\('owner_id',user\.id\)/);
 assert.doesNotMatch(api,/fetch\(|exec\(|child_process|\.lookup\(|resolvedIp|http\.request\(/);
 assert.doesNotMatch(api,/indexed:true|googleRank|SearchConsoleConnected/);
});

test('SQL never allows clients to self-create verified DNS records, and RLS is owner-scoped',()=>{
 assert.match(sql,/create table if not exists public\.seo_domain_connections/);
 assert.match(sql,/unique \(business_id\)/);
 assert.match(sql,/hostname text not null unique/);
 assert.match(sql,/owner_id uuid not null references auth\.users/);
 assert.match(sql,/constraint verified_state_has_time/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.seo_domain_connections from public, anon, authenticated/);
 assert.match(sql,/grant select on public\.seo_domain_connections to authenticated/);
 assert.match(sql,/grant all on public\.seo_domain_connections to service_role/);
 assert.match(sql,/owner_id = \(select auth\.uid\(\)\)/);
 assert.match(sql,/b\.owner_id = \(select auth\.uid\(\)\)/);
 assert.doesNotMatch(sql,/grant (insert|update|delete|all) on public\.seo_domain_connections to authenticated/i);
 assert.doesNotMatch(sql,/security definer/i);
});

test('Production DNS UI has Vercel provider and real start/verify/disconnect actions',()=>{
 assert.match(ui,/const providers=\['Vercel','Cloudflare','GoDaddy'/);
 assert.match(ui,/Vercel dashboard → Domains → choose the domain → DNS Records/);
 assert.match(ui,/data-testid="seo-domain-start"/);
 assert.match(ui,/data-testid="seo-domain-verify"/);
 assert.match(ui,/void mutate\('start'\)/);
 assert.match(ui,/void mutate\('verify'\)/);
 assert.match(ui,/void mutate\('disconnect'\)/);
 assert.match(ui,/role="alert"/);
 assert.match(ui,/verified_at|verification_expires_at/);
 assert.match(ui,/Google Search Console require separate authorization/);
 assert.doesNotMatch(ui,/setVerified\(true\)|setConnected\(true\)|fake|simulation/);
});

test('Compact topbar uses flex navigation and sidebar instead of absolute overlapping menu',()=>{
 assert.match(layout,/data-slbi-ui="vendor-sidebar"/);
 assert.match(layout,/aria-label="Vendor primary navigation"/);
 assert.match(layout,/mainNav\.map/);
 assert.match(layout,/aria-label="Vendor mobile navigation"/);
 assert.match(layout,/sidebarCollapsed/);
 assert.match(layout,/flex h-\[64px\]/);
 assert.match(layout,/min-w-0 flex-1 items-center justify-center/);
 assert.doesNotMatch(layout,/vendor-topbar-center absolute left-1\/2/);
 assert.match(layout,/font/);
});


test('Both SEO verification methods remain persisted and owner-scoped',()=>{
 const migration=read('supabase/migrations/20261127090000_seo_http_file_verification.sql');
 const http=read('lib/seo/http-file-proof.ts');
 const page=read('app/vendor/seo/page.tsx');
 assert.match(migration,/add column if not exists verification_method text not null default 'dns_txt'/);
 assert.match(migration,/verification_method in \('dns_txt','http_file'\)/);
 assert.match(migration,/revoke insert, update, delete/);
 assert.match(api,/verificationMethod/);
 assert.match(api,/verification_method:method/);
 assert.match(api,/method==='http_file'/);
 assert.match(api,/hasHttpFileProof\(existing.hostname,existing.verification_token\)/);
 assert.match(api,/use_http_file_for_hosted_subdomain/);
 assert.match(page,/verification_method/);
 assert.match(ui,/HTTPS File Verification/);
 assert.match(ui,/public\/\.well-known\/slbi-verification\.txt/);
 assert.match(ui,/Verify HTTPS file/);
 assert.match(ui,/verificationMethod:method/);
 assert.match(http,/\.well-known\/slbi-verification\.txt/);
 assert.match(http,/lookup\(hostname,\{all:true,family:4,verbatim:true\}\)/);
 assert.match(http,/isAllowedPublicIPv4/);
 assert.match(http,/lookup:\(_host,_options,callback\)=>callback\(null,pinned,4\)/);
 assert.match(http,/res.statusCode!==200/);
 assert.match(http,/MAX_BYTES=512/);
 assert.match(http,/servername:hostname/);
 assert.match(http,/protocol:'https:'/);
 assert.doesNotMatch(http,/fetch\(|method:'POST'|redirect:'follow'|http:\/\//);
});
