import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('lib/push/client.ts');
let serial=0;
async function fixture(permission='granted'){
 const data=new Map();let prompts=0;let posts=0;let deletes=0;let workers=0;let rejectPost=false;
 const notice={permission,requestPermission:async()=>{prompts++;notice.permission='granted';return 'granted';}};
 const worker={active:{},scope:'https://example.invalid/firebase-push/',pushManager:{getSubscription:async()=>null},unregister:async()=>true};
 const device={getToken:async()=> 'synthetic-device-token',onMessage:()=>()=>{}};
 const firebase={apps:[{}],messaging:Object.assign(()=>device,{isSupported:()=>true})};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'desktop test',maxTouchPoints:0,serviceWorker:{register:async()=>{workers++;return worker},getRegistration:async()=>worker}}});
 Object.assign(globalThis,{Notification:notice,window:{Notification:notice,PushManager:{},firebase,matchMedia:()=>({matches:false}),dispatchEvent:()=>true},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},fetch:async(url,options)=>{
 if(url==='/api/push/config')return {ok:true,json:async()=>({enabled:true,config:{},vapidKey:'synthetic'})};
 assert.equal(url,'/api/push/device');const b=JSON.parse(options.body);assert.equal(b.expectedUid,'account-a');
 if(options.method==='DELETE'){deletes++;return {ok:true}}
 posts++;return {ok:!rejectPost};
 }});
 const js=stripTypeScriptTypes(source.replace("import {toast} from 'sonner'","const toast={info:()=>{}}"));
 const mod=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64')+'#'+(++serial));
 return {mod,notice,counts:()=>({prompts,posts,deletes,workers}),reject:()=>{rejectPost=true},data};
}
test('already-granted browser restores a missing device without permission prompt and respects opt-out',async()=>{
 const f=await fixture();
 assert.equal(f.mod.readPushRegistration(),null);
 await f.mod.refreshPush('account-a');
 assert.equal(f.mod.devicePushReady('account-a'),true);
 assert.deepEqual(f.counts(),{prompts:0,posts:1,deletes:0,workers:1});
 await f.mod.refreshPush('account-a');
 assert.equal(f.counts().posts,1);
 await f.mod.disablePush('account-a');
 await f.mod.refreshPush('account-a');
 assert.equal(f.mod.devicePushReady('account-a'),false);
 assert.equal(f.counts().posts,1);
 assert.equal(f.counts().deletes,1);
 await f.mod.enablePush('account-a');
 assert.equal(f.mod.devicePushReady('account-a'),true);
 assert.equal(f.counts().posts,2);
 assert.equal(f.counts().prompts,0);
});
test('initial load does not prompt; explicit enable does, failed server registration stays off',async()=>{
 const f=await fixture('default');
 await f.mod.refreshPush('account-a');
 assert.equal(f.counts().prompts,0);assert.equal(f.counts().posts,0);
 f.reject();
 await assert.rejects(()=>f.mod.enablePush('account-a'),/Could not register/);
 assert.equal(f.counts().prompts,1);
 assert.equal(f.mod.devicePushReady('account-a'),false);
 assert.equal(f.mod.readPushRegistration(),null);
});
test('profile inline controls and main notification refresh retain consent and account boundaries',()=>{
 const profile=read('app/business/[slug]/BusinessDetailsClient.tsx');
 const control=read('app/components/audience/BusinessAudienceControls.tsx');
 const session=read('app/components/SessionContext.tsx');
 const route=read('app/api/push/device/route.ts');
 const inbox=read('app/notifications/page.tsx');
 assert.match(profile,/<h1 id="business-profile-title"[^>]*>\{business.name\}<\/h1>\{business.status==="approved"&&<BusinessAudienceControls/);
 assert.doesNotMatch(control,/type="checkbox"|Stay connected|Update preferences/);
 assert.match(control,/state\?\.following&&<button/);
 // The disclosure must not participate in the mobile title/button width calculation.
 assert.match(profile,/grid-cols-\[minmax\(0,max-content\)_auto\]/);
 assert.match(profile,/data-slbi-mobile-profile-header className="grid grid-cols-\[auto_minmax\(0,1fr\)\]/);
 assert.match(profile,/data-slbi-profile-details className="min-w-0/);
 assert.match(profile,/data-slbi-business-actions="true"[^>]*className="col-span-2 grid/);
 assert.match(profile,/w-\[64px\].*min-\[350px\]:w-\[76px\].*sm:w-full/);
 assert.match(control,/contents text-neutral-900 sm:inline-flex/);
 assert.match(control,/col-start-2 row-start-1 flex shrink-0/);
 assert.match(control,/col-span-2 row-start-2 min-w-0/);
 assert.match(control,/px-2 text-\[11px\] sm:gap-1.5 sm:px-3 sm:text-xs/);
 assert.match(control,/await enablePush\(user.id\);await change\('push_on'\)/);
 assert.match(control,/slbi-bell-ring/);
 assert.match(control,/consentVersion:'slbi-follow-email-v3'/);
 assert.match(control,/Follow shares your verified email/);
 assert.match(session,/visibilitychange/);assert.match(session,/refreshPush\(uid\)/);
 assert.match(route,/expectedUid!==undefined&&expectedUid!==user.id/);
 assert.match(route,/auth.getUser\(\)/);assert.match(route,/session_id/);
 assert.match(inbox,/slbi-push-received/);assert.match(inbox,/user_id=eq\./);
});
