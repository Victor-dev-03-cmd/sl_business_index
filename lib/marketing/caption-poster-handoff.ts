/**
 * Owner-browser-only poster→caption handoff. A high-resolution PNG can be
 * several MB: never put the Blob/base64, contacts, or raw business facts in
 * URL params, search analytics or localStorage. No cloud image upload.
 *
 * A UUID query ref points to a short-lived IndexedDB entry on THIS device.
 * Caption Lab re-verifies that the selected business is currently owned by
 * the logged-in account before displaying any imported context.
 */
export type LinkedPosterContext={
  businessId:string;
  businessName:string;
  category:string;
  city:string;
  address:string;
  phone:string;
  website:string;
  headline:string;
  offer:string;
  cta:string;
  vibe:string;
  language:'ta'|'si'|'en';
  sample:boolean;
  source:'poster_studio'|'device_upload';
  format:string;
};
export type LinkedPosterRecord={
  id:string;createdAt:number;context:LinkedPosterContext;image:Blob;
};
const DB_NAME='slbi-growthos-local-creative-handoff';
const STORE='linked-posters';
const MAX_AGE=2*60*60*1000;
const MAX_SIZE=15_000_000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean=(s:unknown,n:number)=>typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
export const validHandoffId=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
function openDb():Promise<IDBDatabase>{
  if(typeof indexedDB==='undefined')return Promise.reject(Error('Local poster storage is not supported in this browser.'));
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE,{keyPath:'id'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(Error('Browser blocked temporary poster storage.'));
  });
}
async function operation<T>(mode:IDBTransactionMode,callback:(store:IDBObjectStore,finish:(r:T)=>void)=>void):Promise<T>{
  const db=await openDb();
  return new Promise<T>((resolve,reject)=>{
    let pending:T;let hasValue=false;let settled=false;
    const tx=db.transaction(STORE,mode);
    const finish=(value:T)=>{pending=value;hasValue=true;};
    // Wait for the *transaction commit*, not the early IDB put success.
    // Navigation before commit would otherwise intermittently lose the PNG.
    tx.oncomplete=()=>{
      db.close();
      if(!settled){settled=true;hasValue?resolve(pending):reject(Error('Poster storage returned no value.'));}
    };
    tx.onerror=()=>{
      db.close();
      if(!settled){settled=true;reject(Error('Unable to access this browser’s linked poster.'));}
    };
    tx.onabort=tx.onerror;
    try{callback(tx.objectStore(STORE),finish);}catch(e){db.close();reject(e);}
  });
}
export async function saveLinkedPoster(context:LinkedPosterContext,image:Blob):Promise<string>{
  if(!validHandoffId(context.businessId))throw Error('Choose a valid owned business.');
  if(image.type!=='image/png'||image.size<100||image.size>MAX_SIZE)
    throw Error('Poster must be a PNG smaller than 15 MB.');
  const id=crypto.randomUUID();
  const sanitized:LinkedPosterContext={
    businessId:context.businessId,businessName:clean(context.businessName,100),
    category:clean(context.category,100),city:clean(context.city,80),
    address:clean(context.address,180),phone:clean(context.phone,45),
    website:clean(context.website,180),headline:clean(context.headline,180),
    offer:clean(context.offer,180),cta:clean(context.cta,180),
    vibe:clean(context.vibe,80),language:context.language,
    sample:Boolean(context.sample),
    source:context.source==='device_upload'?'device_upload':'poster_studio',
    format:clean(context.format,20),
  };
  await operation<void>('readwrite',(store,done)=>{
    // Remove old short-lived private poster assets. Limit retained records
    // so repeated experiments do not silently fill low-end phone storage.
    const cutoff=Date.now()-MAX_AGE;
    const cursor=store.openCursor();
    let scanned=0;
    cursor.onsuccess=()=>{
      const current=cursor.result;
      if(current&&scanned<300){
        const record=current.value as Partial<LinkedPosterRecord>;
        if(typeof record.createdAt!=='number'||record.createdAt<cutoff||scanned>=12)
          current.delete();
        scanned++;
        current.continue();
      }else{
        const put=store.put({id,createdAt:Date.now(),context:sanitized,image} satisfies LinkedPosterRecord);
        put.onsuccess=()=>done(undefined);
      }
    };
  });
  return id;
}
export async function loadLinkedPoster(id:string):Promise<LinkedPosterRecord|null>{
  if(!validHandoffId(id))return null;
  const found=await operation<unknown>('readonly',(store,done)=>{
    const get=store.get(id);get.onsuccess=()=>done(get.result);
  });
  if(!found||typeof found!=='object')return null;
  const item=found as Partial<LinkedPosterRecord>;
  if(item.id!==id||typeof item.createdAt!=='number'||
    item.createdAt>Date.now()+60_000||Date.now()-item.createdAt>MAX_AGE||
    !item.context||!validHandoffId(item.context.businessId)||
    item.image?.type!=='image/png'||item.image.size>MAX_SIZE)return null;
  return item as LinkedPosterRecord;
}
export async function removeLinkedPoster(id:string):Promise<void>{
  if(!validHandoffId(id))return;
  await operation<void>('readwrite',(store,done)=>{
    const del=store.delete(id);del.onsuccess=()=>done(undefined);
  });
}

/** Recent private browser assets. Caller must still verify current business
 * ownership via its authenticated business list before rendering a thumbnail. */
export async function listLinkedPosters(businessId:string):Promise<LinkedPosterRecord[]>{
  if(!validHandoffId(businessId))return [];
  const rows=await operation<unknown[]>('readonly',(store,done)=>{
    const request=store.getAll();
    request.onsuccess=()=>done(request.result);
  });
  return rows.filter((value):value is LinkedPosterRecord=>{
    if(!value||typeof value!=='object')return false;
    const item=value as Partial<LinkedPosterRecord>;
    return validHandoffId(item.id)&&!!item.context&&item.context.businessId===businessId&&
      item.context.source==='poster_studio'&&
      typeof item.createdAt==='number'&&item.createdAt<=Date.now()+60_000&&
      Date.now()-item.createdAt<=MAX_AGE&&
      item.image?.type==='image/png'&&item.image.size<=MAX_SIZE;
  }).sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
}
