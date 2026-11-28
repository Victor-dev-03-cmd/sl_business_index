'use client'
import {toast} from 'sonner'
type WebConfig={apiKey:string;projectId:string;messagingSenderId:string;appId:string}
type Messaging={getToken(options:{vapidKey:string;serviceWorkerRegistration:ServiceWorkerRegistration}):Promise<string>;deleteToken():Promise<boolean>;onMessage(cb:(payload:{data?:{id?:string}})=>void):()=>void}
type Firebase={apps:{name:string}[];initializeApp(config:WebConfig):unknown;messaging:(()=>Messaging)&{isSupported?:()=>boolean}}
type Saved={token:string;uid:string}
const key='slbi-fcm-registration-v1';
const version='12.6.0';
let pending:Promise<Messaging>|null=null;
let unsubscribe:(()=>void)|null=null;
function loadScript(name:string){
  return new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://www.gstatic.com/firebasejs/'+version+'/'+name;
    script.async=true;script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('Could not load Firebase.'))};document.head.appendChild(script);
  });
}
async function config(){
  const r=await fetch('/api/push/config',{cache:'no-store'});
  const data=await r.json();
  if(!r.ok||!data.enabled)throw new Error('Push notifications are not connected yet.');
  return data as {enabled:boolean;config:WebConfig;vapidKey:string};
}
async function messaging(){
  if(!pending)pending=(async()=>{
    const c=await config();
    const w=window as unknown as {firebase?:Firebase};
    if(!w.firebase)await loadScript('firebase-app-compat.js');
    if(!w.firebase?.messaging)await loadScript('firebase-messaging-compat.js');
    const f=w.firebase;
    if(!f||f.messaging.isSupported?.()===false)throw new Error('This browser does not support Firebase push.');
    if(!f.apps.length)f.initializeApp(c.config);
    const m=f.messaging();
    if(!unsubscribe)unsubscribe=m.onMessage(payload=>{
      window.dispatchEvent(new Event('slbi-push-received'));
      if(document.visibilityState==='visible'&&readPushRegistration())toast.info('New notification',{id:payload.data?.id?'push-'+payload.data.id:undefined,description:'Open Notifications to view your latest update.'});
    });
    return m;
  })().catch(e=>{pending=null;throw e});
  return pending;
}
export function readPushRegistration():Saved|null{
  try{const item=JSON.parse(localStorage.getItem(key)||'null');return item&&typeof item.token==='string'&&typeof item.uid==='string'?item:null}catch{return null}
}
export function isIosDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)}
export function isInstalled(){return window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true}
export function supportsPush(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
function waitActive(reg:ServiceWorkerRegistration){
  return new Promise<void>((resolve,reject)=>{
    if(reg.active){resolve();return;}
    const worker=reg.installing||reg.waiting;if(!worker){reject(new Error('Push worker not available.'));return;}
    const timeout=window.setTimeout(()=>{worker.removeEventListener('statechange',check);reject(new Error('Push worker did not start.'));},15000);
    function check(){if(worker?.state==='activated'||worker?.state==='redundant'){window.clearTimeout(timeout);worker.removeEventListener('statechange',check);worker.state==='activated'?resolve():reject(new Error('Push worker could not start.'))}}
    worker.addEventListener('statechange',check);check();
  });
}
const optOutKey='slbi-fcm-disabled-v1';
let registration:Promise<void>|null=null;
let registeredFor:string|null=null;
let lastSuccess=0;
let generation=0;
export function devicePushReady(uid:string){return registeredFor===uid&&readPushRegistration()?.uid===uid&&supportsPush()&&Notification.permission==='granted'}
function optedOut(uid:string){try{return localStorage.getItem(optOutKey+':'+uid)==='1'}catch{return true}}
function markOptOut(uid:string,disabled:boolean){try{if(disabled)localStorage.setItem(optOutKey+':'+uid,'1');else localStorage.removeItem(optOutKey+':'+uid)}catch{}}
async function registerGranted(uid:string){
  if(registration){await registration.catch(()=>{});if(devicePushReady(uid))return;}
  if(devicePushReady(uid)&&Date.now()-lastSuccess<300000)return;
  const current=generation;
  const task=(async()=>{
    if(!supportsPush()||Notification.permission!=='granted'||optedOut(uid))return;
    const saved=readPushRegistration();
    if(saved&&saved.uid!==uid)throw new Error('Device account changed. Reopen Notifications.');
    const c=await config();
    const reg=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/firebase-push/',updateViaCache:'none'});
    await waitActive(reg);
    const m=await messaging();
    const token=await m.getToken({vapidKey:c.vapidKey,serviceWorkerRegistration:reg});
    if(!token)throw new Error('No device registration token was received.');
    if(current!==generation||optedOut(uid))return;
    const response=await fetch('/api/push/device',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,expectedUid:uid})});
    if(!response.ok)throw new Error('Could not register this device. Try again.');
    if(current!==generation||optedOut(uid)){
      if(optedOut(uid))await fetch('/api/push/device',{method:'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,expectedUid:uid})}).catch(()=>undefined);
      return;
    }
    localStorage.setItem(key,JSON.stringify({token,uid}));
    registeredFor=uid;lastSuccess=Date.now();
    window.dispatchEvent(new Event('slbi-push-state'));
  })();
  registration=task;
  try{await task}finally{if(registration===task)registration=null}
}
export async function enablePush(uid:string){
  if(!supportsPush())throw new Error('Notifications are not supported by this browser.');
  if(isIosDevice()&&!isInstalled())throw new Error('Add SLBI to your Home Screen first.');
  // Native prompt only from an explicit click; never on initial page load.
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Allow notifications in your browser settings.');
  markOptOut(uid,false);
  await registerGranted(uid);
  if(!devicePushReady(uid))throw new Error('Device registration is not ready. Try again.');
}
export async function disablePush(uid?:string){
  const saved=readPushRegistration();const account=uid||saved?.uid;
  if(account)markOptOut(account,true);
  generation++;registeredFor=null;lastSuccess=0;
  if(registration)await registration.catch(()=>{});
  const current=readPushRegistration();
  if(current&&(!account||current.uid===account)){
    const response=await fetch('/api/push/device',{method:'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:current.token,expectedUid:current.uid})});
    if(!response.ok){if(account)markOptOut(account,false);throw new Error('Could not disable notifications. Try again.');}
  }
  await clearLocalPush();
}
export async function clearLocalPush(){
  generation++;registeredFor=null;
  try{localStorage.removeItem(key)}catch{}
  try{
    const worker=await navigator.serviceWorker.getRegistration('/firebase-push/');
    if(worker?.scope.endsWith('/firebase-push/')){
      const subscription=await worker.pushManager.getSubscription();
      await subscription?.unsubscribe();await worker.unregister();
    }
  }catch{}
  window.dispatchEvent(new Event('slbi-push-state'));
}
export async function refreshPush(uid:string){
  const saved=readPushRegistration();
  if(saved&&saved.uid!==uid){await clearLocalPush();}
  if(!supportsPush()||Notification.permission!=='granted'||optedOut(uid)||(isIosDevice()&&!isInstalled()))return;
  // Recover missing local registration, missing worker, stale token or renewed auth session.
  // No requestPermission here: only recover an already granted browser permission.
  await registerGranted(uid);
}
