import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
test('single global toast surface and mobile spacing',()=>{
 const root=read('app/RootClientLayout.tsx'),t=read('app/components/SiteToaster.tsx'),css=read('app/globals.css')
 assert.match(root,/<SiteToaster \/>/)
 assert.match(t,/mobileOffset/)
 assert.match(t,/visibleToasts=\{3\}/)
 assert.match(css,/data-type="error"/)
 assert.match(css,/data-type="success"/)
})
test('persistent web push hint and foreground update without private contents',()=>{
 const worker=read('public/firebase-messaging-sw.js'),client=read('lib/push/client.ts')
 assert.match(worker,/silent:false,requireInteraction:true/)
 assert.match(worker,/vibrate:\[180,80,180\]/)
 assert.match(client,/reg\.update\(\)/)
 assert.match(client,/toast\.info\('New notification'/)
})
test('trusted billing and critical reporting use fixed events, not arbitrary client recipients',()=>{
 const bridge=read('lib/push/alerts.ts'),route=read('app/api/notifications/critical/route.ts'),staff=read('app/api/admin/billing/hybrid/route.ts'),billing=read('app/api/billing/hybrid/route.ts'),instrument=read('instrumentation.ts')
 assert.match(bridge,/server-only/)
 assert.match(route,/auth\.getUser/)
 assert.match(route,/emitTrustedAlert\(user\.id,'critical_frontend'\)/)
 assert.match(staff,/billing\.staff_queue\(\)/)
 assert.match(staff,/billing_activated/)
 assert.match(billing,/billing_submitted/)
 assert.match(billing,/billing_cancelled/)
 assert.match(instrument,/emitTrustedAlert\(null,'critical_server'\)/)
})
