import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
test('navbar removes duplicate search shortcut and uses one responsive bell',()=>{
 const s=read('app/components/Navbar.tsx')
 assert.doesNotMatch(s,/aria-label="Search businesses"/)
 assert.match(s,/<NotificationBell \/>/)
 assert.match(s,/max-w-\[1800px\]/)
})
test('push is optional and credentials stay server only',()=>{
 const c=read('lib/push/client.ts'),server=read('lib/push/config.ts'),worker=read('public/firebase-messaging-sw.js')
 assert.match(c,/Notification.requestPermission/)
 assert.match(c,/serviceWorkerRegistration:reg/)
 assert.match(c,/isIosDevice\(\)&&!isInstalled\(\)/)
 assert.doesNotMatch(c,/SLBI_FIREBASE_SERVICE_ACCOUNT_JSON/)
 assert.match(server,/SLBI_FIREBASE_SERVICE_ACCOUNT_JSON/)
 assert.match(worker,/silent:false/)
 assert.match(worker,/Open SLBI to view it/)
})
test('dispatcher authorizes server and sends generic data only',()=>{
 const route=read('app/api/internal/push/dispatch/route.ts')
 assert.match(route,/timingSafeEqual/)
 assert.match(route,/slbi_claim_fcm_jobs/)
 assert.match(route,/slbi_fcm_job_valid/)
 assert.match(route,/fcm.googleapis.com\/v1\/projects/)
 assert.doesNotMatch(route,/job\.title|job\.message/)
})
