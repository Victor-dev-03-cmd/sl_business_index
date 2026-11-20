/* Firebase Messaging uses its own registration; /sw.js remains the PWA worker. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.stopImmediatePropagation();
  const target=new URL('/notifications',self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    const existing=list.find(c=>c.url===target);
    if(existing)return existing.focus();
    return self.clients.openWindow(target);
  }));
});
importScripts('/api/push/config?format=script');
if(self.SLBI_FIREBASE_CONFIG){
  importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');
  firebase.initializeApp(self.SLBI_FIREBASE_CONFIG);
  firebase.messaging().onBackgroundMessage(payload=>{
    // Generic lock-screen copy intentionally contains no account details.
    return self.registration.showNotification('SL Business Index',{
      body:'You have a new update. Open SLBI to view it.',
      icon:'/icons/pwa-192.png',badge:'/icons/pwa-192.png',
      tag:payload.data?.id ? 'slbi-'+payload.data.id : 'slbi-update',
      silent:false,requireInteraction:false,data:{url:'/notifications'}
    });
  });
}
