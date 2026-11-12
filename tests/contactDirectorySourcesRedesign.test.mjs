import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const page = read("app/contact/page.tsx");
const layout = read("app/contact/layout.tsx");
const directory = read("app/contact/PublicContactDirectory.tsx");
const data = read("app/contact/publicContacts.ts");
const form = read("app/contact/ContactInquiryForm.tsx");
const api = read("app/api/[[...route]]/route.ts");
const contacts = JSON.parse(data.split("export const CONTACTS: PublicContact[] = ")[1].split(";\nexport const LAST_REVIEWED")[0]);

test("all 25 districts are supported and published records have official sources", () => {
  assert.match(data, /"Kilinochchi"/);
  assert.match(data, /"Mullaitivu"/);
  assert.match(data, /"Batticaloa"/);
  assert.match(data, /"Jaffna"/);
  assert.equal((data.split("export const DISTRICTS = ")[1].split(" as const")[0].match(/","/g)||[]).length+1,25);
  assert.ok(contacts.length>=70, "expected a substantial, sourced public contact directory");
  assert.equal(new Set(contacts.map(e=>e.id)).size,contacts.length);
  for (const entry of contacts) {
    assert.ok(/^https:\/\/[a-z0-9.-]+\//.test(entry.sourceUrl), "missing official source: " + entry.id);
    assert.ok(entry.phone.match(/^[+0-9 ]+$/), "invalid phone presentation: " + entry.id);
    assert.ok(entry.coverage.length>0);
    assert.ok(["National","Regional","District"].includes(entry.scope));
  }
});

test("distinct national and regional electricity numbers are not falsely described as local breakdown numbers", () => {
  assert.match(data, /"1987"/);
  assert.match(data, /"021 222 0496"/);
  assert.match(data, /"026 222 2666"/);
  assert.match(page, /This is not a separate confirmed Jaffna City breakdown number/);
  assert.match(page, /not labeled as a Batticaloa branch line/);
  assert.match(directory, /regional offices remain visible/);
});

test("contact page uses SSR and a source-linked indexable content directory", () => {
  assert.doesNotMatch(page, /["']use client["']/);
  assert.doesNotMatch(page, /framer-motion/);
  assert.match(layout, /alternates: \{ canonical:/);
  assert.match(page, /application\/ld\+json/);
  assert.match(page, /<PublicContactDirectory\/>/);
  assert.match(directory, /Official source:/);
  assert.match(directory, /Filter contacts by district/);
  assert.match(directory, /Filter by public service category/);
});

test("SLBI WhatsApp uses the authorized number and the contact form retains server-side validation", () => {
  assert.match(data, /SLBI_WHATSAPP = "94769200572"/);
  assert.doesNotMatch(page+form+data, /94770337702/);
  assert.match(page, /"https:\/\/wa.me\/" \+ SLBI_WHATSAPP/);
  assert.match(form, /\/api\/contact\/send/);
  assert.match(form, /Turnstile/);
  assert.match(form, /turnstileToken:token/);
  assert.doesNotMatch(page+form, /navigator\.geolocation|getCurrentPosition/);
  assert.match(api, /app\.post\('\/contact\/send'/);
  assert.match(api, /verifyTurnstileToken/);
  assert.match(api, /Unable to receive the inquiry right now/);
  assert.match(api, /escapeHtml\(message\)/);
});
