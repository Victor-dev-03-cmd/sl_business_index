/**
 * G1-01/02 ISOLATED READ-ONLY PREVIEW — not an API, database resolver, or AI prompt.
 * The caller must authenticate with SSR getUser and establish owner-scoped RLS
 * BEFORE obtaining the input. This pure module applies a second owner check.
 * No network, provider, wallet, mutation, cache or side effects.
 */
import { isApprovedVerifiedBusiness } from "../../business-verification";

export const G1_KNOWLEDGE_SCHEMA_VERSION = "g1-knowledge-preview-v0" as const;
export type G1FieldState = "vendor_asserted" | "verified_metadata" | "missing" | "withheld";
export type G1FieldSource = "businesses" | "social_brand_profiles" | "business_profile_content" | "none";
export type G1Field<T> = Readonly<{
  value: T | null;
  state: G1FieldState;
  source: G1FieldSource;
  sourceUpdatedAt: string | null;
}>;

export type G1OwnedBusiness = Readonly<{
  id: string;
  owner_id: string;
  status: "approved" | "pending" | "rejected" | "suspended";
  name: string | null;
  category?: string | null;
  description?: string | null;
  updated_at?: string | null;
  is_verified?: boolean | null;
  verification_status?: string | null;
  can_show_badge?: boolean | null;
}>;

export type G1OwnedBrand = Readonly<{
  business_id: string;
  owner_id: string;
  brand_name: string | null;
  slogan?: string | null;
  primary_color?: string | null;
  tone?: string | null;
  languages?: unknown;
  guidelines?: string | null;
  offers?: unknown;
  updated_at?: string | null;
}>;

export type G1OwnedProfile = Readonly<{
  business_id: string;
  services: unknown;
  gallery_paths: unknown;
}>;

export type G1KnowledgeInputs = Readonly<{
  requesterUserId: string;
  requestedBusinessId: string;
  business: G1OwnedBusiness | null;
  brand: G1OwnedBrand | null;
  profile: G1OwnedProfile | null;
}>;

export type G1ReadOnlyKnowledge = Readonly<{
  schemaVersion: typeof G1_KNOWLEDGE_SCHEMA_VERSION;
  usage: "owner_preview_only";
  businessId: string;
  listing: Readonly<{
    name: G1Field<string>;
    category: G1Field<string>;
    description: G1Field<string>;
    verification: G1Field<boolean>;
  }>;
  brand: Readonly<{
    name: G1Field<string>;
    slogan: G1Field<string>;
    primaryColor: G1Field<string>;
    tone: G1Field<string>;
    languages: G1Field<readonly string[]>;
  }>;
  services: G1Field<readonly string[]>;
  galleryImageCount: G1Field<number>;
  offers: G1Field<never>;
  guidelines: G1Field<never>;
}>;

export type G1KnowledgeResult =
  | Readonly<{ ok: true; context: G1ReadOnlyKnowledge }>
  | Readonly<{ ok: false; reason: "not_available" }>;

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX = /^#[0-9a-f]{6}$/i;
const TONES = new Set(["professional", "friendly", "bold", "elegant", "playful"]);
const LANGUAGES = new Set(["en", "ta", "si"]);

/** Values are data only, never instructions; any invalid/oversized value is withheld. */
function safeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || value.length > maxLength) return null;
  const trimmed = value.trim();
  if (!trimmed || /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(trimmed)) return null;
  return trimmed;
}
function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && /^\d{4}-\d\d-\d\dT/.test(value) ? new Date(epoch).toISOString() : null;
}
function field<T>(value: T | null, source: G1FieldSource, updated: string | null = null): G1Field<T> {
  return value === null
    ? { value: null, state: "missing", source: "none", sourceUpdatedAt: null }
    : { value, state: "vendor_asserted", source, sourceUpdatedAt: updated };
}
const withheld = (): G1Field<never> => ({
  value: null, state: "withheld", source: "none", sourceUpdatedAt: null,
});

function boundedServices(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const result: string[] = [];
  for (const raw of value) {
    const item = safeText(raw, 100);
    if (!item) return null;
    if (!result.includes(item)) result.push(item);
  }
  return result;
}
function boundedGalleryCount(value: unknown, businessId: string): number | null {
  if (!Array.isArray(value) || value.length > 12) return null;
  for (const path of value) {
    if (typeof path !== "string" || path.length > 300 || !path.startsWith(businessId + "/")
      || path.includes("..") || /[?#\\\u0000-\u001F]/.test(path)) return null;
  }
  return value.length;
}
function boundedLanguages(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) return null;
  if (!value.every(v => typeof v === "string" && LANGUAGES.has(v))) return null;
  if (new Set(value).size !== value.length) return null;
  return [...value];
}

/**
 * Build a narrowly allowlisted preview from rows ALREADY verified as owned.
 * No repository/service/client is imported. Not wired into production callers.
 */
export function buildG1ReadOnlyKnowledge(inputs: G1KnowledgeInputs): G1KnowledgeResult {
  const { business, brand, profile, requesterUserId, requestedBusinessId } = inputs;
  if (!UUID.test(requesterUserId) || !UUID.test(requestedBusinessId) || !business
    || business.id !== requestedBusinessId
    || business.owner_id !== requesterUserId
    || business.status !== "approved"
    || (brand !== null && (brand.business_id !== business.id || brand.owner_id !== requesterUserId))
    || (profile !== null && profile.business_id !== business.id)) {
    // One denial for missing, pending, unauthorized or cross-tenant source.
    return { ok: false, reason: "not_available" };
  }

  const businessDate = timestamp(business.updated_at);
  const brandDate = brand ? timestamp(brand.updated_at) : null;
  const verified = isApprovedVerifiedBusiness({
    status: business.status,
    is_verified: business.is_verified === true,
    verification_status: business.verification_status ?? undefined,
    can_show_badge: business.can_show_badge ?? undefined,
  });
  const primaryColor = brand && typeof brand.primary_color === "string" && HEX.test(brand.primary_color)
    ? brand.primary_color.toUpperCase() : null;
  const tone = brand && typeof brand.tone === "string" && TONES.has(brand.tone) ? brand.tone : null;
  const context: G1ReadOnlyKnowledge = {
    schemaVersion: G1_KNOWLEDGE_SCHEMA_VERSION,
    usage: "owner_preview_only",
    businessId: business.id,
    listing: {
      name: field(safeText(business.name, 150), "businesses", businessDate),
      category: field(safeText(business.category, 100), "businesses", businessDate),
      description: field(safeText(business.description, 3000), "businesses", businessDate),
      verification: verified
        ? { value: true, state: "verified_metadata", source: "businesses", sourceUpdatedAt: businessDate }
        : { value: false, state: "verified_metadata", source: "businesses", sourceUpdatedAt: businessDate },
    },
    brand: {
      name: field(brand ? safeText(brand.brand_name, 100) : null, "social_brand_profiles", brandDate),
      slogan: field(brand ? safeText(brand.slogan, 160) : null, "social_brand_profiles", brandDate),
      primaryColor: field(primaryColor, "social_brand_profiles", brandDate),
      tone: field(tone, "social_brand_profiles", brandDate),
      languages: field(brand ? boundedLanguages(brand.languages) : null, "social_brand_profiles", brandDate),
    },
    services: field(profile ? boundedServices(profile.services) : null, "business_profile_content"),
    galleryImageCount: field(profile ? boundedGalleryCount(profile.gallery_paths, business.id) : null,
      "business_profile_content"),
    // Campaign consent and offer expiry are not evidenced; do not forward raw offers.
    offers: withheld(),
    // Brand instructions are untrusted text and must not become system instructions.
    guidelines: withheld(),
  };
  return { ok: true, context };
}
