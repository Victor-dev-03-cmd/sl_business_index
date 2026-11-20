import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')

test('official news editing requires verified authentication and database staff role', () => {
  const page = read('app/admin/business-news/page.tsx')
  const sql = read('supabase/migrations/20261120053349_business_news_official_admin_editorial_v1.sql')
  assert.match(page, /supabase\.auth\.getUser\(\)/)
  assert.match(page, /\['admin', 'ceo'\]\.includes\(profile\.role\)/)
  assert.doesNotMatch(page, /slbusinessindex@gmail\.com/)
  assert.match(sql, /Official SLBI admin can publish news/)
  assert.match(sql, /is_official IS TRUE/)
  assert.match(sql, /p\.role::text = 'admin'/)
  assert.match(sql, /slbusinessindex@gmail\.com/)
  assert.match(sql, /is_official IS FALSE/)
})

test('official admin can publish all-district updates without a business category', () => {
  const editor = read('app/admin/business-news/AdminNewsEditor.tsx')
  assert.match(editor, /business_id: null, is_official: true/)
  assert.match(editor, /district === 'all' \? null : district/)
  assert.match(editor, /category: topic === 'Official Announcement' \? null : topic/)
  assert.match(editor, /SL Business Index Admin/)
  assert.match(editor, /news-images/)
  assert.match(editor, /content_format: format/)
})

test('vendor form retains verified publisher requirement, with optional general news', () => {
  const vendor = read('app/business-news/NewsEditorModal.tsx')
  assert.match(vendor, /A verified business is required/)
  assert.match(vendor, /district === "all" \? null : district/)
  assert.match(vendor, /category: category \|\| null/)
  assert.match(vendor, /is_official: false/)
})

test('reader feed includes official posts while excluding unapproved vendor stories', () => {
  const client = read('app/business-news/BusinessNewsClient.tsx')
  assert.match(client, /businesses\(name,logo_url,is_verified,status\)/)
  assert.doesNotMatch(client, /businesses!inner/)
  assert.match(client, /post\.is_official === true/)
  assert.match(client, /post\.businesses\?\.is_verified === true/)
  assert.match(client, /SL Business Index Admin/)
  assert.match(client, /district !== "all" && post\.district && post\.district !== district/)
  assert.match(client, /order-first/)
})

test('news image uploads are owner-folder scoped and not open to all users', () => {
  const sql = read('supabase/migrations/20261120053823_business_news_publisher_image_owner_paths_v1.sql')
  assert.match(sql, /Authorized publishers upload their own news images/)
  assert.match(sql, /\(storage\.foldername\(name\)\)\[2\]/)
  assert.match(sql, /auth\.uid\(\)/)
  assert.match(sql, /b\.is_verified IS TRUE/)
})
