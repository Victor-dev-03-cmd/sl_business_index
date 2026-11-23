import type { Business } from "@/lib/types";

/**
 * A public verification seal means that the BUSINESS itself is approved and
 * its verification was completed. Registration alone is not verification.
 *
 * The historical can_show_badge flag is NOT written by the verification
 * approval trigger/action. Requiring it hides genuinely approved businesses;
 * conversely it can be true for a business whose verification is not approved.
 *
 * Do not infer verification from an owner profile, registration number,
 * listing approval by itself, or can_show_badge by itself.
 */
export function isApprovedVerifiedBusiness(
  business: Pick<Business, "status" | "is_verified" | "verification_status" | "can_show_badge">,
): boolean {
  const verification = business.verification_status?.trim().toLowerCase();
  return (
    business.status === "approved" &&
    business.is_verified === true &&
    (verification === "approved" || verification === "verified")
  );
}
