import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')

test('registration only bypasses the existing-business guard for trusted admin roles', () => {
  const file = read('app/register-business/page.tsx')
  assert.match(file, /\.from\('profiles'\)/)
  assert.match(file, /\.select\('role'\)/)
  assert.match(file, /registrationRole === 'admin' \|\| registrationRole === 'ceo'/)
  assert.match(file, /if \(!isAdmin && existingBusiness/)
  assert.match(file, /Register another business/)
  assert.match(file, /window\.location\.assign\('\/register-business'\)/)
  assert.match(file, /status: 'pending'/)
})

test('business listing allowance and upgrade CTAs exempt admins, not vendors', () => {
  const file = read('app/vendor/my-businesses/page.tsx')
  assert.match(file, /user\?\.role === 'admin' \|\| user\?\.role === 'ceo'/)
  assert.match(file, /const maxListings = isStaff \? null/)
  assert.match(file, /const limitReached = !isStaff &&/)
  assert.match(file, /Unlimited business registrations/)
  assert.match(file, /\{!isStaff && <Link href="\/vendor\/billing"/)
})

test('approval preserves admin and CEO role instead of downgrading to vendor', () => {
  const file = read('app/admin/dashboard/page.tsx')
  assert.match(file, /\.update\(\{ role: "vendor" \}\)\s*\.eq\("id", owner_id\)\s*\.eq\("role", "customer"\)/)
})
