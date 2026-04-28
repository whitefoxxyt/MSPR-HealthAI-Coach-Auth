import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { userSubscriptions } from "@/db/schema";

export type Tier = "free" | "premium" | "premium_plus";

export type SubscriptionRow = {
  userId: string;
  tier: string;
  startedAt: Date;
  expiresAt: Date | null;
  updatedAt: Date;
};

export async function seedFreeSubscription(userId: string): Promise<void> {
  await db
    .insert(userSubscriptions)
    .values({ userId, tier: "free" })
    .onConflictDoNothing();
}

export async function onUserCreated(user: { id: string }): Promise<void> {
  await seedFreeSubscription(user.id);
}

export async function updateUserSubscription(
  userId: string,
  patch: { tier: Tier; expiresAt: Date | null },
): Promise<{ oldTier: string; row: SubscriptionRow } | null> {
  const [current] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (!current) return null;

  const [row] = await db
    .update(userSubscriptions)
    .set({ tier: patch.tier, expiresAt: patch.expiresAt, updatedAt: new Date() })
    .where(eq(userSubscriptions.userId, userId))
    .returning();

  return { oldTier: current.tier, row: row as SubscriptionRow };
}
