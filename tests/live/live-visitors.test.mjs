import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
test('presence unique connection key, no fake count or identity',()=>{
 const s=read('app/components/LivePresenceProvider.tsx')
 assert.match(s,/key:crypto\.randomUUID\(\)/)
 assert.match(s,/channel\.track\(\{active:true\}\)/)
 assert.match(s,/channel\.untrack\(\)/)
 assert.match(s,/globalPrivacyControl/)
 assert.doesNotMatch(s,/key: ['"]user['"]|setCount\(1\)|user\.id/)
})
test('report only sends aggregate buckets and uses server credentials',()=>{
 const s=read('app/api/live-visitors/route.ts')
 assert.match(s,/const MIN_GROUP=5/)
 assert.match(s,/n<MIN_GROUP/)
 assert.match(s,/v1beta\/properties\//)
 assert.match(s,/SLBI_GA4_PRIVATE_KEY/)
 assert.match(s,/minuteRanges:\[\{startMinutesAgo:29,endMinutesAgo:0\}\]/)
 assert.doesNotMatch(s,/NEXT_PUBLIC_.*PRIVATE_KEY/)
})
test('interactive map and responsive accessible dialog',()=>{
 const s=read('app/components/LiveVisitorsPanel.tsx')
 assert.match(s,/Dialog\.Content/)
 assert.match(s,/onPointerMove=\{pointerMove\}/)
 assert.match(s,/Zoom in/)
 assert.match(s,/setInterval/)
 assert.match(s,/not_configured/)
})
