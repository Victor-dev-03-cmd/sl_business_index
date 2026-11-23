import { expect, test } from "bun:test";
import { isApprovedVerifiedBusiness } from "../../lib/business-verification";

const approved = {
  status: "approved" as const,
  is_verified: true,
  verification_status: "approved",
};

// Real production legacy combination: can_show_badge was not set by approval.
test("approved and actually verified businesses show blue tick even when legacy badge flag is false", () => {
  expect(isApprovedVerifiedBusiness({ ...approved, can_show_badge: false })).toBe(true);
  expect(isApprovedVerifiedBusiness({ ...approved, can_show_badge: undefined })).toBe(true);
});

test("legacy verified spelling is accepted for previously verified businesses", () => {
  expect(isApprovedVerifiedBusiness({ ...approved, verification_status: "verified" })).toBe(true);
  expect(isApprovedVerifiedBusiness({ ...approved, verification_status: " APPROVED " })).toBe(true);
});

test("listing approval, registration, or badge flag alone never implies verification", () => {
  expect(isApprovedVerifiedBusiness({ status: "approved", is_verified: false, verification_status: "none" })).toBe(false);
  expect(isApprovedVerifiedBusiness({
    status: "approved", is_verified: false, verification_status: "none", can_show_badge: true,
  })).toBe(false);
  expect(isApprovedVerifiedBusiness({ status: "approved", is_verified: false, verification_status: "approved" })).toBe(false);
  expect(isApprovedVerifiedBusiness({ status: "approved", is_verified: true, verification_status: "pending" })).toBe(false);
  expect(isApprovedVerifiedBusiness({ status: "approved", is_verified: true, verification_status: "rejected" })).toBe(false);
  expect(isApprovedVerifiedBusiness({ status: "approved", is_verified: true, verification_status: "none" })).toBe(false);
});

test("suspended, pending or rejected listings never display blue verified badge", () => {
  for (const status of ["pending", "rejected", "suspended"] as const) {
    expect(isApprovedVerifiedBusiness({ ...approved, status })).toBe(false);
  }
});
