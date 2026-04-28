import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { userSubscriptions } from "@/db/schema";

export type Tier = "free" | "premium" | "premium_plus";

const TIER_FEATURES: Record<Tier, readonly string[]> = {
  free: ["analyze_meal"],
  premium: ["analyze_meal", "meal_plan_basic"],
  premium_plus: ["analyze_meal", "meal_plan_basic", "meal_plan_premium"],
};

export function featuresForTier(tier: Tier): string[] {
  return [...TIER_FEATURES[tier]];
}

export interface Entitlements {
  tier: Tier;
  started_at: string;
  expires_at: string | null;
  features: string[];
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const rows = await db
    .select({
      tier: userSubscriptions.tier,
      startedAt: userSubscriptions.startedAt,
      expiresAt: userSubscriptions.expiresAt,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  const row = rows[0];
  const tier = (row?.tier as Tier | undefined) ?? "free";
  const startedAt = row?.startedAt ?? new Date();
  const expiresAt = row?.expiresAt ?? null;

  return {
    tier,
    started_at: startedAt.toISOString(),
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    features: featuresForTier(tier),
  };
}
