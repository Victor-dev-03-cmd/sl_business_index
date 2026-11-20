import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')

test('publisher entry point verifies Supabase identity and protected admin role', () => {
  const route = read('app/business-news/publish/page.tsx')
  assert.match(route, /supabase\.auth\.getUser\(\)/)
  assert.match(route, /\.from\('profiles'\)/)
  assert.match(route, /profile\?\.role === 'admin'/)
  assert.match(route, /slbusinessindex@gmail\.com/)
  assert.match(route, /redirect\('\/admin\/business-news'\)/)
  assert.match(route, /redirect\('\/business-news\?post=vendor'\)/)
})

test('all Business News publishing buttons resolve through the server route', () => {
  const page = read('app/business-news/BusinessNewsClient.tsx')
  assert.equal((page.match(/href="\/business-news\/publish"/g) || []).length, 4)
  assert.doesNotMatch(page, /isOfficialAdmin/)
  assert.match(page, /searchParams\.get\("post"\) === "vendor"/)
  assert.match(page, /router\.replace\("\/business-news\/publish"\)/)
})

test('legacy modal sends the verified official admin to the official newsroom', () => {
  const modal = read('app/business-news/NewsEditorModal.tsx')
  assert.match(modal, /supabase\.auth\.getUser\(\)/)
  assert.match(modal, /profile\?\.role === "admin"/)
  assert.match(modal, /router\.replace\("\/admin\/business-news"\)/)
  assert.match(modal, /eq\("is_verified", true\)/)
  assert.match(modal, /A verified business is required/)
})

test('official publishing remains server and database protected', () => {
  const page = read('app/admin/business-news/page.tsx')
  const policies = read('supabase/migrations/20261120053349_business_news_official_admin_editorial_v1.sql')
  assert.match(page, /profile\?\.role\?\.toLowerCase\(\) !== 'admin'/)
  assert.match(page, /user\.email\?\.toLowerCase\(\) !== 'slbusinessindex@gmail\.com'/)
  assert.match(policies, /is_official IS TRUE/)
  assert.match(policies, /p\.role::text = 'admin'/)
})
