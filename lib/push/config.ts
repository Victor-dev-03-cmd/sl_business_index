import 'server-only'
export function firebaseConfig(){
  try{
    const c=JSON.parse(process.env.SLBI_FIREBASE_WEB_CONFIG||'{}')
    const key=process.env.SLBI_FIREBASE_VAPID_PUBLIC_KEY||''
    const service=JSON.parse(process.env.SLBI_FIREBASE_SERVICE_ACCOUNT_JSON||'{}')
    if(!['apiKey','projectId','messagingSenderId','appId'].every(k=>typeof c[k]==='string'&&c[k].length>0)||
      !/^[A-Za-z0-9_-]{80,100}$/.test(key)||service.project_id!==c.projectId||!service.client_email||!service.private_key||
      !(process.env.SLBI_FCM_DISPATCH_SECRET||'').match(/^.{32,}$/))return null
    return {config:{apiKey:c.apiKey,projectId:c.projectId,messagingSenderId:c.messagingSenderId,appId:c.appId},vapidKey:key}
  }catch{return null}
}
