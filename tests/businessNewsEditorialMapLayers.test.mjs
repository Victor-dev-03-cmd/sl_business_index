import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const business = read("app/business/[slug]/BusinessDetailsClient.tsx");
const page = read("app/business-news/page.tsx");
const news = read("app/business-news/BusinessNewsClient.tsx");
const editor = read("app/business-news/NewsEditorModal.tsx");
const schema = read("supabase/migrations/20261112190000_business_news_editorial_formats.sql");

test("business map creates a local layer beneath the global navbar", () => {
  assert.match(business, /relative isolate z-0 h-\[290px\]/);
  assert.match(business, /wrapperClassName="relative isolate z-0/);
  assert.match(business, /<LeafletMap/);
});
test("newspaper is a server-rendered SEO route with separate client reader", () => {
  assert.match(page, /export const metadata/);
  assert.match(page, /<BusinessNewsClient/);
  assert.match(news, /The Business/);
  assert.match(news, /Journal\./);
  assert.match(news, /LeadStory/);
  assert.match(news, /FeedStory/);
  assert.match(news, /Latest dispatches/);
});
test("published stories support real articles, posters and briefs", () => {
  assert.match(editor, /type Format = "article" \| "poster" \| "brief"/);
  assert.match(editor, /post_type: kind, content_format: format/);
  assert.match(editor, /format === "poster" && !files\.length/);
  assert.match(editor, /select\("id,name"\)/);
  assert.match(editor, /\.eq\("is_verified", true\)/);
  assert.match(news, /post\.content_format === "poster"/);
  assert.match(news, /type NewsType = "news" \| "hiring" \| "looking"/);
});
test("existing permission enforcement is not weakened by editorial formats", () => {
  assert.match(schema, /CHECK \(post_type IN \('news', 'hiring', 'looking'\)\)/);
  assert.match(schema, /CHECK \(content_format IN \('article', 'poster', 'brief'\)\)/);
  assert.match(schema, /CREATE POLICY "Verified owners can publish news"/);
  assert.match(schema, /owner_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(schema, /b\.is_verified IS TRUE AND b\.status = 'approved'/);
  assert.doesNotMatch(schema, /SECURITY DEFINER/);
});
test("news reader supports search, district, category, report and deep links", () => {
  assert.match(news, /queryKey: \["business-news-editorial"\]/);
  assert.match(news, /searchParams\.get\("post_id"\)/);
  assert.match(news, /setCategory/);
  assert.match(news, /setDistrict/);
  assert.match(news, /<ReportModal/);
  assert.match(news, /<NewsEditorModal/);
  assert.match(news, /loading="lazy"/);
});
