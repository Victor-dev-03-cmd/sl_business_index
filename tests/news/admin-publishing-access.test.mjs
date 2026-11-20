import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
test('verified staff never depend on a business to publish', () => {
  const entry = read('app/business-news/publish/page.tsx')
  const page = read('app/admin/business-news/page.tsx')
  const modal = read('app/business-news/NewsEditorModal.tsx')
  const editor = read('app/admin/business-news/AdminNewsEditor.tsx')
  const nav = read('app/components/Navbar.tsx')
  assert.match(entry,/auth\.getUser\(\)/)
  assert.match(entry,/profile\.role === 'admin' \|\| profile\.role === 'ceo'/)
  assert.match(entry,/redirect\('\/admin\/business-news'\)/)
  assert.match(page,/\['admin', 'ceo'\]\.includes\(profile\.role\)/)
  assert.match(editor,/business_id: null, is_official: true/)
  assert.match(modal,/profile\.role === "admin" \|\| profile\.role === "ceo"/)
  assert.match(modal,/eq\("is_verified", true\)/)
  assert.match(nav,/href="\/business-news\/publish"/)
  assert.doesNotMatch(entry + page + modal + editor,/slbusinessindex@gmail\.com/)
})
test('lead image and full story use uncropped poster and readable typography', () => {
  const news = read('app/business-news/BusinessNewsClient.tsx')
  assert.match(news,/max-w-\[1600px\]/)
  assert.match(news,/lead \|\| post\.content_format === "poster" \? "object-contain"/)
  assert.match(news,/leading-\[1\.55\]/)
})
