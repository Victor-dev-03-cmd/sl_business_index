import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const home = read("app/HomePageClient.tsx");
const nextConfig = read("next.config.ts");
const serverHome = read("app/page.tsx");
const nearby = read("app/nearby/NearbyExplorer.tsx");
const map = read("components/LeafletMap.tsx");
const card = read("app/components/BusinessCard.tsx");
const helper = read("lib/businessAddress.ts");
const migration = read("supabase/migrations/20261112173000_nearby_v3_readable_business_addresses.sql");

test("discovery steps display larger, high-contrast numbers", () => {
  assert.match(home, /text-\[36px\].*sm:text-\[44px\]/);
  assert.match(home, /<Icon size=\{25\}/);
});
test("featured photos do not eager-load offscreen portraits or double-animate scrolling", () => {
  assert.match(home, /\[content-visibility:auto\]/);
  assert.match(home, /\[contain-intrinsic-size:237px_422px\]/);
  assert.match(home, /loading="lazy"/);
  assert.doesNotMatch(home, /loading=\{index < 3 \? "eager"/);
  assert.doesNotMatch(home, /snap-proximity scroll-smooth/);
  assert.match(home, /requestAnimationFrame/);
  assert.match(home, /React\.memo/);
  assert.match(nextConfig, /qualities: \[55, 65, 75\]/);
  assert.match(nextConfig, /imageSizes: \[16, 32, 48, 64, 96, 128, 256, 384, 512\]/);
});
test("the featured server and client share detailed address fields", () => {
  for (const source of [home, serverHome])
    assert.match(source, /address, detailed_address, city, image_url/);
});
test("nearby search keeps v2 fallback with new invoker-secured address fields", () => {
  assert.match(nearby, /get_nearby_businesses_v3/);
  assert.match(nearby, /get_nearby_businesses_v2/);
  assert.match(migration, /public\.get_nearby_businesses_v2\(/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.match(migration, /b\.detailed_address, b\.city/);
});
test("all public result cards use coordinate-safe address presentation", () => {
  assert.match(helper, /isCoordinateAddress/);
  assert.match(helper, /business\.detailed_address, business\.address, business\.city/);
  for (const source of [home, nearby, map, card])
    assert.match(source, /getBusinessDisplayAddress/);
  assert.doesNotMatch(nearby, /business\.detailed_address \|\| business\.address \|\| business\.city/);
});
