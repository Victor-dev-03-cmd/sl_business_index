import { describe, expect, test } from "bun:test";
import { getViewCounterMode } from "../../lib/growth/view-counter-mode.ts";

describe("G0-17 verified view counter activation contract", () => {
  test("default flags remain legacy (no activation)", () => {
    expect(getViewCounterMode()).toBe("legacy");
    expect(getViewCounterMode("false", "false")).toBe("legacy");
  });

  test("both flags on are required to enter verified mode", () => {
    expect(getViewCounterMode("true", "true")).toBe("verified");
    expect(getViewCounterMode("true", "false")).toBe("mismatch");
    expect(getViewCounterMode("false", "true")).toBe("mismatch");
    expect(getViewCounterMode("true", undefined)).toBe("mismatch");
    expect(getViewCounterMode(undefined, "true")).toBe("mismatch");
  });

  test("unexpected flag values do not turn verified mode on", () => {
    expect(getViewCounterMode("TRUE", "true")).toBe("mismatch");
    expect(getViewCounterMode("yes", "yes")).toBe("legacy");
  });
});
