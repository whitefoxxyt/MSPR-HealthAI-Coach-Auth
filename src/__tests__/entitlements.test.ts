import { describe, expect, it } from "bun:test";
import { featuresForTier } from "@/lib/entitlements";

describe("featuresForTier", () => {
  it("returns the free-tier features for tier 'free'", () => {
    expect(featuresForTier("free")).toEqual(["analyze_meal"]);
  });

  it("adds meal_plan_basic for tier 'premium'", () => {
    expect(featuresForTier("premium")).toEqual([
      "analyze_meal",
      "meal_plan_basic",
    ]);
  });

  it("adds meal_plan_premium for tier 'premium_plus'", () => {
    expect(featuresForTier("premium_plus")).toEqual([
      "analyze_meal",
      "meal_plan_basic",
      "meal_plan_premium",
    ]);
  });
});
