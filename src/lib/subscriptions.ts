import { db } from "@/db/db";
import { userSubscriptions } from "@/db/schema";

export async function seedFreeSubscription(userId: string): Promise<void> {
  await db
    .insert(userSubscriptions)
    .values({ userId, tier: "free" })
    .onConflictDoNothing();
}

export async function onUserCreated(user: { id: string }): Promise<void> {
  await seedFreeSubscription(user.id);
}
