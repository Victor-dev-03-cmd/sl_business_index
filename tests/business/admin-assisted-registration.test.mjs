import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read = p => readFileSync(new URL('../../'+p,import.meta.url),'utf8')
test('assisted registration is staff-authorized and does not switch session',()=>{
  const route=read('app/api/admin/businesses/assisted/route.ts')
  const form=read('app/register-business/page.tsx')
  assert.match(route,/client\.auth\.getUser\(\)/)
  assert.match(route,/!staff\(profile\?\.role\)/)
  assert.match(route,/isolated\.auth\.admin\.createUser/)
  assert.match(route,/email_confirm:false/)
  assert.match(route,/persistSession:false,autoRefreshToken:false/)
  assert.match(route,/owner_id:ownerId,status:'pending'/)
  assert.match(route,/ownerId === user\.id/)
  assert.match(route,/isolated\.auth\.admin\.getUserById/)
  assert.doesNotMatch(route,/auth\.signInWithPassword|auth\.signUp\(/)
  assert.doesNotMatch(form,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/)
  assert.match(form,/fetch\('\/api\/admin\/businesses\/assisted'/)
  assert.match(form,/useState\(true\)/)
})
