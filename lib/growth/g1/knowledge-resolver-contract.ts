/**
 * G1-03 — MOCKABLE read-only resolver ORCHESTRATION CONTRACT.
 *
 * NOT wired to Next.js, Supabase, a live DB, an API route or AI provider.
 * Only a future audited SSR adapter may implement these read ports, using
 * auth.getUser() and user-scoped RLS; a service-role adapter is forbidden.
 * The code performs no network access and is safe for isolated CI.
 */
import {
  buildG1ReadOnlyKnowledge,
  type G1OwnedBusiness,
  type G1OwnedBrand,
  type G1OwnedProfile,
  type G1KnowledgeResult,
} from "./read-only-knowledge";

/** Exact allowlist for future owner-scoped SELECTs, never select('*'). */
export const G1_READ_PROJECTIONS = Object.freeze({
  business: "id,owner_id,status,name,category,description,updated_at,is_verified,verification_status,can_show_badge",
  brand: "business_id,owner_id,brand_name,slogan,primary_color,tone,languages,updated_at",
  profile: "business_id,services,gallery_paths",
} as const);

export type G1BusinessRead = Readonly<{
  businessId: string;
  ownerId: string;
  approvedOnly: true;
  select: typeof G1_READ_PROJECTIONS.business;
}>;
export type G1BrandRead = Readonly<{
  businessId: string;
  ownerId: string;
  select: typeof G1_READ_PROJECTIONS.brand;
}>;
export type G1ProfileRead = Readonly<{
  businessId: string;
  select: typeof G1_READ_PROJECTIONS.profile;
}>;

/**
 * For isolated tests: all ports are read-only and injectable.
 * Production adapters are deliberately not supplied in this release.
 */
export type G1OwnerScopedReadPort = Readonly<{
  getAuthenticatedUserId(): Promise<string | null>;
  readOwnedBusiness(query: G1BusinessRead): Promise<G1OwnedBusiness | null>;
  readOwnedBrand(query: G1BrandRead): Promise<G1OwnedBrand | null>;
  readBusinessProfile(query: G1ProfileRead): Promise<G1OwnedProfile | null>;
}>;

export type G1ResolverResult =
  | G1KnowledgeResult
  | Readonly<{ ok: false; reason: "source_unavailable" }>;

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const NOT_AVAILABLE = { ok: false, reason: "not_available" } as const;
const SOURCE_UNAVAILABLE = { ok: false, reason: "source_unavailable" } as const;

/**
 * Auth first, then exact business and owner scope; related records only after
 * successful ownership check. No global reads, no cache and no writes.
 * Missing/foreign/pending listings share one response (no enumeration).
 * After ownership verification, a failing optional source is distinguished
 * from an absent row so users do not get misleading "missing" metadata.
 */
export async function resolveG1ReadOnlyKnowledge(
  requestedBusinessId: string,
  reader: G1OwnerScopedReadPort,
): Promise<G1ResolverResult> {
  if (!UUID.test(requestedBusinessId)) return NOT_AVAILABLE;
  let requesterUserId: string | null;
  try {
    requesterUserId = await reader.getAuthenticatedUserId();
  } catch {
    return NOT_AVAILABLE;
  }
  if (!requesterUserId || !UUID.test(requesterUserId)) return NOT_AVAILABLE;

  let business: G1OwnedBusiness | null;
  try {
    business = await reader.readOwnedBusiness({
      businessId: requestedBusinessId,
      ownerId: requesterUserId,
      approvedOnly: true,
      select: G1_READ_PROJECTIONS.business,
    });
  } catch {
    // Until ownership has been established, never reveal read/error details.
    return NOT_AVAILABLE;
  }
  if (!business || business.id !== requestedBusinessId
    || business.owner_id !== requesterUserId || business.status !== "approved") {
    return NOT_AVAILABLE;
  }

  let brand: G1OwnedBrand | null;
  let profile: G1OwnedProfile | null;
  try {
    [brand, profile] = await Promise.all([
      reader.readOwnedBrand({
        businessId: requestedBusinessId,
        ownerId: requesterUserId,
        select: G1_READ_PROJECTIONS.brand,
      }),
      reader.readBusinessProfile({
        businessId: requestedBusinessId,
        select: G1_READ_PROJECTIONS.profile,
      }),
    ]);
  } catch {
    // Never silently convert a source outage into factually missing data.
    return SOURCE_UNAVAILABLE;
  }

  // Revalidate returned row ownership/joins inside the pure builder.
  return buildG1ReadOnlyKnowledge({
    requesterUserId,
    requestedBusinessId,
    business,
    brand,
    profile,
  });
}
