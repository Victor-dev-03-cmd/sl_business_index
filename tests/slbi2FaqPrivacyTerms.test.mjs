import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const faq = read("app/faq/page.tsx");
const faqExplorer = read("app/faq/FAQExplorer.tsx");
const faqData = read("app/faq/faqData.ts");
const faqLayout = read("app/faq/layout.tsx");
const privacy = read("app/privacy-policy/page.tsx");
const terms = read("app/terms-of-service/page.tsx");
const shell = read("app/components/LegalPageShell.tsx");

test("all three SLBI 2.0 pages preserve a consistent Inter/Tailwind design system", () => {
  for (const source of [faq, privacy, terms, shell]) {
    assert.doesNotMatch(source, /framer-motion|AnimatePresence|motion\./);
    assert.doesNotMatch(source, /font-serif/);
  }
  assert.match(faq, /SLBI 2\.0/);
  assert.match(shell, /SLBI 2\.0/);
  assert.match(faq, /font-\[family-name:var\(--font-inter\)\]/);
  assert.match(shell, /font-\[family-name:var\(--font-inter\)\]/);
  assert.match(shell, /<svg /);
});

test("FAQ remains SEO-friendly and includes current capabilities separately from GrowthOS plans", () => {
  assert.doesNotMatch(faq, /["']use client["']/);
  assert.match(faq, /application\/ld\+json/);
  assert.match(faqLayout, /canonical: "https:\/\/www\.slbusinessindex\.com\/faq"/);
  assert.match(faqData, /What is SLBI 2\.0\?/);
  assert.match(faqData, /Are all GrowthOS and AI features available right now\?/);
  assert.match(faqData, /No\. Business discovery, listings/);
  assert.match(faqData, /Does the Verified badge guarantee a higher search ranking\?/);
  assert.match(faqData, /email slbusinessindex@gmail\.com/);
  assert.doesNotMatch(faqData, /support@slbusinessindex\.com|improves your search ranking on our platform/);
  assert.match(faqExplorer, /<details/);
  assert.match(faqExplorer, /aria-label="Search frequently asked questions"/);
  assert.match(faqExplorer, /aria-pressed=\{active === category\}/);
});

test("privacy keeps the eight previous policy subjects, original date and a staged GrowthOS notice", () => {
  assert.match(privacy, /March 25, 2026/);
  for (const section of ["Information we collect", "How we use information", "Data sharing & disclosure", "Cookies & tracking", "Data security", "Your choices & requests", "Changes to this policy", "Contact us about privacy"]) {
    assert.ok(privacy.includes(section), "Missing " + section);
  }
  assert.match(privacy, /We do not sell your personal data/);
  assert.match(privacy, /not evidence of a completed sale/);
  assert.match(privacy, /Sri Lanka Data Protection Authority/);
  assert.match(privacy, /roadmap/);
});

test("terms retain key existing contractual clauses, original date and no false launch commitments", () => {
  assert.match(terms, /March 25, 2026/);
  for (const section of ["Acceptance of terms", "User accounts & registration", "Business listings & content", "QR code system usage", "Intellectual property", "Limitation of liability", "Prohibited activities", "Governing law", "Changes to these terms", "Contact information"]) {
    assert.ok(terms.includes(section), "Missing " + section);
  }
  assert.match(terms, /at least <strong className=\{legalStrong\}>18 years old/);
  assert.match(terms, /Democratic Socialist Republic of Sri Lanka/);
  assert.match(terms, /not guaranteed/);
  assert.match(terms, /Future roadmap descriptions are not purchases or entitlements/);
});

test("legal pages have useful TOCs and canonical SEO metadata", () => {
  assert.match(shell, /aria-label=\{title \+ " sections"\}/);
  assert.match(shell, /scroll-mt-\[138px\]/);
  assert.match(shell, /lg:sticky lg:top-\[105px\]/);
  assert.match(privacy, /canonical: "https:\/\/www\.slbusinessindex\.com\/privacy-policy"/);
  assert.match(terms, /canonical: "https:\/\/www\.slbusinessindex\.com\/terms-of-service"/);
  for (const page of [privacy, terms]) {
    assert.match(page, /mailto:slbusinessindex@gmail\.com/);
    assert.match(page, /href="\/contact"/);
  }
});
