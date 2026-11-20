import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
test('business details use actual gallery and services without duplicate business phone',()=>{
 const page=read('app/business/[slug]/BusinessDetailsClient.tsx')
 assert.ok(page.indexOf('heroPhoto?<Image')<page.indexOf('id="business-profile-title"'))
 assert.equal((page.match(/href=\{"tel:"\+business.phone\}/g)||[]).length,1)
 assert.match(page,/galleryUrls\.slice\(0,6\)/)
 assert.match(page,/services\.map/)
 assert.match(page,/Dialog\.Content/)
 assert.match(page,/relative isolate z-0/)
 assert.match(page,/\/api\/reviews\/submit/)
 assert.match(page,/\/api\/leads\/submit/)
})
test('vendor gallery uses scoped paths, real uploads and profile table',()=>{
 const editor=read('app/vendor/my-businesses/[id]/edit/BusinessProfileEditor.tsx')
 const sql=read('supabase/migrations/20261120171221_business_profile_gallery_services_v1.sql')
 assert.match(editor,/MAX_PHOTOS=12, MAX_SERVICES=10/)
 assert.match(editor,/businessId\+'\/'\+crypto\.randomUUID/)
 assert.match(editor,/\.eq\('owner_id',user\.id\)/)
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/)
 assert.match(sql,/owner_id=\(SELECT auth\.uid\(\)\)/)
})
