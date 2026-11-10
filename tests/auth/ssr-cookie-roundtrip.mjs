import { createServerClient, createBrowserClient } from '@supabase/ssr';
import assert from 'node:assert/strict';

const cookieJar = new Map();
const origin = 'https://test-supabase.supabase.co';
const anonKey = 'synthetic-public-anon-key-for-tests';
const userId = '00000000-0000-4000-8000-000000000012';
const expires = Math.floor(Date.now() / 1000) + 3600;
const jwt = [
  Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url'),
  Buffer.from(JSON.stringify({iss: origin + '/auth/v1',sub: userId,role:'authenticated',
    aud:'authenticated',exp:expires,iat:expires-3600})).toString('base64url'),
  'synthetic-signature-not-a-real-token',
].join('.');
const user = {
  id: userId,
  email: 'qa@example.invalid',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { large_test_field: 'T'.repeat(6000) },
  created_at: new Date().toISOString(),
};
const session = {access_token:jwt,refresh_token:'synthetic-refresh-token',token_type:'bearer',
  expires_in:3600,expires_at:expires,user};
let serverVerified = false;
async function fakeFetch(resource, init) {
  const url = String(resource instanceof Request ? resource.url : resource);
  const method = (init?.method || 'GET').toUpperCase();
  if (url.includes('/auth/v1/token') && url.includes('grant_type=password') && method === 'POST') {
    return new Response(JSON.stringify(session),
      {status:200,headers:{'Content-Type':'application/json'}});
  }
  if (url.endsWith('/auth/v1/user') && method === 'GET') {
    const headers = new Headers(init?.headers ?? (resource instanceof Request ? resource.headers : undefined));
    assert.equal(headers.get('authorization'), 'Bearer ' + jwt);
    serverVerified = true;
    return new Response(JSON.stringify(user),
      {status:200,headers:{'Content-Type':'application/json'}});
  }
  throw new Error('Unexpected synthetic Supabase request type');
}
function freshClient() {
  return createServerClient(origin,anonKey,{
    global:{fetch:fakeFetch},
    cookies:{
      getAll() {return [...cookieJar].map(([name,value])=>({name,value}));},
      setAll(items) {
        for (const {name,value,options} of items) {
          if (!value || (options?.maxAge !== undefined && options.maxAge <= 0)) {
            cookieJar.delete(name);
          } else {
            cookieJar.set(name,value);
          }
        }
      },
    },
  });
}
const loggedIn = await freshClient().auth.signInWithPassword({
  email: user.email, password: 'test-only-not-a-real-password',
});
assert.equal(loggedIn.error,null,'Synthetic Auth login should succeed');
assert.equal(loggedIn.data.user?.id,userId);
const chunks = [...cookieJar].filter(([name])=>name.startsWith('sb-test-supabase-auth-token.'));
assert.ok(chunks.length>=2,'Large session must be split into cookie chunks');
assert.ok(chunks.some(([,value])=>value.startsWith('base64-')),
  'Modern SSR should encode the session in base64 URL form');
const verified = await freshClient().auth.getUser();
assert.equal(verified.error,null,'Second independent server request must reconstruct cookies');
assert.equal(verified.data.user?.id,userId);
assert.equal(serverVerified,true,'Auth verification must call the server, not trust an unverified cookie');

// Version 0.3.0 stored raw JSON instead of base64url; users upgrading from
// that version must be able to verify an older unexpired session safely.
// A compact fixture stays under a standard browser per-cookie size limit.
cookieJar.clear();
const legacySession = {
  ...session,
  user: { ...user, user_metadata: {} },
};
cookieJar.set('sb-test-supabase-auth-token', JSON.stringify(legacySession));
serverVerified = false;
const legacy = await freshClient().auth.getUser();
assert.equal(legacy.error,null,'Legacy raw JSON SSR session must remain readable after upgrade');
assert.equal(legacy.data.user?.id,userId);
assert.equal(serverVerified,true,'Legacy cookies must still require remote Auth verification');
// Test the actual app boundary: an official browser client writes cookies,
// then a new server client must reconstruct and independently verify them.
cookieJar.clear();
serverVerified = false;
const browserClient = createBrowserClient(origin, anonKey, {
  isSingleton: false,
  global: { fetch: fakeFetch },
  cookies: {
    getAll() { return [...cookieJar].map(([name,value]) => ({name,value})); },
    setAll(items) {
      for (const {name,value,options} of items) {
        if (!value || (options?.maxAge !== undefined && options.maxAge <= 0)) {
          cookieJar.delete(name);
        } else cookieJar.set(name,value);
      }
    },
  },
});
const browserLogin = await browserClient.auth.signInWithPassword({
  email: user.email, password: 'synthetic-browser-password',
});
assert.equal(browserLogin.error, null);
const browserCookies = [...cookieJar].filter(([name]) => name.startsWith('sb-test-supabase-auth-token.'));
assert.ok(browserCookies.length >= 2, 'Browser client should write a chunked session');
const crossBoundary = await freshClient().auth.getUser();
assert.equal(crossBoundary.error, null, 'Server must read the browser SSR cookie');
assert.equal(crossBoundary.data.user?.id, userId);
assert.equal(serverVerified, true, 'Server must verify token with Auth');
console.log('PASS: multi-chunk SSR, legacy raw cookie, and browser-to-server Auth verification');
