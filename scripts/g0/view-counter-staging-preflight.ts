#!/usr/bin/env bun
/**
 * G0-17 deploy/environment preflight, read-only and secret-redacting.
 * This is configuration evidence only, NOT a live DB ACL or legal approval.
 */
import { getViewCounterMode } from "../../lib/growth/view-counter-mode.ts";

const mode = getViewCounterMode(
  process.env.G0_VERIFIED_VIEW_COUNT_ENABLED,
  process.env.NEXT_PUBLIC_G0_VERIFIED_VIEW_COUNT_ENABLED,
);
const issues: string[] = [];

if (mode === "mismatch") {
  issues.push("Public build-time and private server-side view-counter flags differ.");
}
if (mode === "verified") {
  if (process.env.GROWTH_EVENT_INGESTION_ENABLED !== "true") {
    issues.push("Growth event ingestion is disabled.");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push("Supabase URL is missing.");
  }
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push("Server-only Supabase credential is missing.");
  }
  if ((process.env.GROWTH_RATE_LIMIT_SECRET ?? "").length < 32) {
    issues.push("Rate-limit HMAC secret is missing or too short.");
  }
  if (process.env.VERCEL !== "1") {
    issues.push("Server is not running under the required trusted Vercel proxy.");
  }
}

const result = {
  mode,
  config_status: issues.length ? "BLOCKED" : mode === "verified" ? "CONFIG_READY_ONLY" : "LEGACY_MODE",
  live_database_acl_verified: false,
  owner_cutover_approved: false,
  issues,
};
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;
