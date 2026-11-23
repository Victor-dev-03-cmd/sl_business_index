/**
 * G0-17 release coordination: the public build and server must agree.
 * This guards configuration drift, not database permissions. The production
 * SECURITY DEFINER legacy RPC still requires an owner-approved revoke.
 */
export type ViewCounterMode = "legacy" | "verified" | "mismatch";

export function getViewCounterMode(
  serverFlag?: string,
  clientBuildFlag?: string,
): ViewCounterMode {
  const serverEnabled = serverFlag === "true";
  const clientEnabled = clientBuildFlag === "true";
  if (serverEnabled !== clientEnabled) return "mismatch";
  return serverEnabled ? "verified" : "legacy";
}
