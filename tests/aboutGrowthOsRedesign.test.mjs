import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const about = read("app/about/page.tsx");
const graphics = read("app/about/AboutGraphics.tsx");

test("About page remains lightweight, server-rendered and SEO-addressable", () => {
  assert.doesNotMatch(about, /["']use client["']/);
  assert.doesNotMatch(about, /framer-motion|motion\./);
  assert.match(about, /export const metadata/);
  assert.match(about, /https:\/\/www\.slbusinessindex\.com\/about/);
  assert.match(about, /font-\[family-name:var\(--font-inter\)\]/);
  assert.doesNotMatch(about, /font-serif/);
});

test("About mission and roadmap preserve the PDF's product pillars without pretending they have launched", () => {
  for (const name of ["Discovery", "Growth", "Marketing", "Security", "Revenue", "Learning"]) {
    assert.match(about, new RegExp('name: "' + name + '"'));
  }
  assert.match(about, /11<\/span><span className=.*Roadmap pillars/);
  assert.match(about, /10 November 2026/);
  assert.match(about, /Not all services live/);
  assert.match(about, /not claims that every engine/);
  assert.match(about, /not a promise of launch dates/);
  assert.match(about, /impression is not automatically a completed sale|click is an interaction signal/);
});

test("public CTA links use the real registration, discovery and privacy routes", () => {
  for (const href of ["/category", "/register-business", "/nearby", "/privacy-policy"]) {
    assert.ok(about.includes('href="' + href + '"'), "missing public route " + href);
  }
});

test("About illustrations are native accessible SVGs without image downloads or animation costs", () => {
  assert.equal((graphics.match(/<svg /g) || []).length, 3);
  assert.match(graphics, /function GrowthConstellation/);
  assert.match(graphics, /function GrowthJourneyIllustration/);
  assert.match(graphics, /function PrivacyShieldIllustration/);
  assert.match(graphics, /aria-labelledby/);
  assert.doesNotMatch(graphics, /<image\b|<img\b|(?:href|src)=["\x27]https?:\/\/|setInterval|requestAnimationFrame/);
});
