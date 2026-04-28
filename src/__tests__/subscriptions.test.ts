import { describe, expect, it, mock, beforeEach } from "bun:test";
import { userSubscriptions } from "@/db/schema";

// --- Mock the db module so we can observe the insert chain ---
const insertChain = {
  values: mock<(...args: any[]) => any>(() => insertChain),
  onConflictDoNothing: mock<() => Promise<void>>(() => Promise.resolve()),
};
const mockDb = {
  insert: mock<(...args: any[]) => typeof insertChain>(() => insertChain),
};

mock.module("@/db/db", () => ({ db: mockDb, pool: {} }));

const { seedFreeSubscription, onUserCreated } = await import("@/lib/subscriptions");

describe("userSubscriptions schema", () => {
  it("exposes the columns required by the entitlements spec", () => {
    const columns = userSubscriptions as unknown as Record<string, { name: string }>;

    expect(columns.userId.name).toBe("user_id");
    expect(columns.tier.name).toBe("tier");
    expect(columns.startedAt.name).toBe("started_at");
    expect(columns.expiresAt.name).toBe("expires_at");
    expect(columns.updatedAt.name).toBe("updated_at");
  });

  it("defaults tier to 'free'", () => {
    const tier = (userSubscriptions as unknown as Record<string, { default: unknown }>).tier;
    expect(tier.default).toBe("free");
  });
});

describe("seedFreeSubscription", () => {
  beforeEach(() => {
    mockDb.insert.mockClear();
    insertChain.values.mockClear();
    insertChain.onConflictDoNothing.mockClear();
  });

  it("inserts a row in user_subscriptions with tier='free' for the given user", async () => {
    await seedFreeSubscription("user-123");

    expect(mockDb.insert).toHaveBeenCalledWith(userSubscriptions);
    expect(insertChain.values).toHaveBeenCalledWith({
      userId: "user-123",
      tier: "free",
    });
    expect(insertChain.onConflictDoNothing).toHaveBeenCalled();
  });
});

describe("onUserCreated hook", () => {
  beforeEach(() => {
    mockDb.insert.mockClear();
    insertChain.values.mockClear();
    insertChain.onConflictDoNothing.mockClear();
  });

  it("seeds a free subscription when better-auth signals a new user", async () => {
    await onUserCreated({ id: "user-xyz" });

    expect(mockDb.insert).toHaveBeenCalledWith(userSubscriptions);
    expect(insertChain.values).toHaveBeenCalledWith({
      userId: "user-xyz",
      tier: "free",
    });
  });
});
