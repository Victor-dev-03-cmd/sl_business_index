/**
 * G1-04 — an ISOLATED Supabase-PostgREST-shaped *read-only* adapter.
 * This is an injectable contract, NOT a live Supabase/SSR client or route.
 *
 * Only a future audited SSR call site may pass a cookie-bound, user-scoped
 * client obtained from @supabase/ssr, after independent G0 authorization.
 * NEVER supply a service-role/admin client. No secrets or network here.
 *
 * Verified auth.getUser(), explicit columns, equality filters and maybeSingle
 * match Supabase JS v2 semantics. All errors are collapsed by the resolver.
 */
import type {
  G1OwnedBusiness, G1OwnedBrand, G1OwnedProfile,
} from "./read-only-knowledge";
import {
  G1_READ_PROJECTIONS,
  type G1OwnerScopedReadPort,
} from "./knowledge-resolver-contract";

type G1Table = "businesses" | "social_brand_profiles" | "business_profile_content";
export type G1RowReply = Readonly<{ data: unknown; error: unknown }>;
export type G1QueryBuilder = {
  eq(column: string, value: string): G1QueryBuilder;
  maybeSingle(): PromiseLike<G1RowReply>;
};
export type G1SSRReadOnlyClient = Readonly<{
  auth: Readonly<{
    getUser(): PromiseLike<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  }>;
  from(table: G1Table): Readonly<{
    select(columns: string): G1QueryBuilder;
  }>;
}>;

const hasObjectShape = (row: unknown): row is Record<string, unknown> =>
  row !== null && typeof row === "object" && !Array.isArray(row);
const hasString = (row: Record<string, unknown>, key: string): boolean =>
  typeof row[key] === "string";

function readRow(
  response: G1RowReply,
  requiredKeys: readonly string[],
): Record<string, unknown> | null {
  if (response.error) throw new Error("g1_source_read_failure");
  if (response.data === null) return null;
  if (!hasObjectShape(response.data) ||
    !requiredKeys.every(key => hasString(response.data as Record<string, unknown>,key))) {
    throw new Error("g1_invalid_source_shape");
  }
  return response.data;
}

/**
 * This object can only perform three explicitly allowlisted reads, after
 * the caller's resolveG1ReadOnlyKnowledge() has authenticated and checked
 * the owned, approved business. No insert/update/delete methods are exposed.
 * The runtime is injected exclusively for synthetic tests at this milestone.
 */
export function createG1IsolatedSSRReadPort(client: G1SSRReadOnlyClient): G1OwnerScopedReadPort {
  return {
    async getAuthenticatedUserId() {
      const response = await client.auth.getUser();
      if (response.error) return null;
      const userId = response.data?.user?.id;
      return typeof userId === "string" ? userId : null;
    },
    async readOwnedBusiness(query) {
      const result = await client.from("businesses")
        .select(G1_READ_PROJECTIONS.business)
        .eq("id", query.businessId)
        .eq("owner_id", query.ownerId)
        .eq("status", "approved")
        .maybeSingle();
      const row = readRow(result,["id","owner_id","status"]);
      if (row === null) return null;
      if (row.status !== "approved" || 
        (row.verification_status != null && typeof row.verification_status !== "string")) {
        throw new Error("g1_invalid_business_state");
      }
      return row as unknown as G1OwnedBusiness;
    },
    async readOwnedBrand(query) {
      const result = await client.from("social_brand_profiles")
        .select(G1_READ_PROJECTIONS.brand)
        .eq("business_id", query.businessId)
        .eq("owner_id", query.ownerId)
        .maybeSingle();
      const row = readRow(result,["business_id","owner_id"]);
      return row === null ? null : row as unknown as G1OwnedBrand;
    },
    async readBusinessProfile(query) {
      // This table also exposes approved public business content via RLS:
      // resolver MUST verify owner first, and builder re-checks business_id.
      const result = await client.from("business_profile_content")
        .select(G1_READ_PROJECTIONS.profile)
        .eq("business_id", query.businessId)
        .maybeSingle();
      const row = readRow(result,["business_id"]);
      return row === null ? null : row as unknown as G1OwnedProfile;
    },
  };
}
