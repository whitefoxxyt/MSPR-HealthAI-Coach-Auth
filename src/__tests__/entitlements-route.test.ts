import { describe, expect, it, mock, beforeEach } from "bun:test";

// --- Mock auth module before importing the app ---
const mockGetSession = mock<() => any>(() => null);
const mockHandler = mock(
  () =>
    new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    }),
);

mock.module("@/lib/auth", () => ({
  auth: {
    api: { getSession: mockGetSession },
    handler: mockHandler,
    $Infer: { Session: { user: null, session: null } },
  },
}));

// --- Mock db: chainable select(...).from(...).where(...).limit(...) ---
const selectChain = {
  from: mock<(...args: any[]) => any>(() => selectChain),
  where: mock<(...args: any[]) => any>(() => selectChain),
  limit: mock<(...args: any[]) => Promise<any[]>>(() => Promise.resolve([])),
};
const mockDb = {
  select: mock<(...args: any[]) => typeof selectChain>(() => selectChain),
};
mock.module("@/db/db", () => ({ db: mockDb, pool: {} }));

const { default: app } = await import("@/index");

describe("GET /api/entitlements/me", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    selectChain.from.mockClear();
    selectChain.where.mockClear();
    selectChain.limit.mockReset();
    selectChain.limit.mockImplementation(() => Promise.resolve([]));
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await app.request("/api/entitlements/me");
    expect(res.status).toBe(401);
  });

  it("returns the user's free tier with derived features", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-123", email: "u@e.com", name: "U" },
      session: { id: "s", token: "t", expiresAt: new Date(Date.now() + 1000) },
    });
    const startedAt = new Date("2026-01-01T00:00:00Z");
    selectChain.limit.mockResolvedValueOnce([
      { tier: "free", startedAt, expiresAt: null },
    ]);

    const res = await app.request("/api/entitlements/me");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tier).toBe("free");
    expect(body.started_at).toBe(startedAt.toISOString());
    expect(body.expires_at).toBeNull();
    expect(body.features).toEqual(["analyze_meal"]);
  });

  it("returns the user's premium tier with the right features and expiry", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-456", email: "p@e.com", name: "P" },
      session: { id: "s", token: "t", expiresAt: new Date(Date.now() + 1000) },
    });
    const startedAt = new Date("2026-04-01T00:00:00Z");
    const expiresAt = new Date("2027-04-01T00:00:00Z");
    selectChain.limit.mockResolvedValueOnce([
      { tier: "premium", startedAt, expiresAt },
    ]);

    const res = await app.request("/api/entitlements/me");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tier).toBe("premium");
    expect(body.expires_at).toBe(expiresAt.toISOString());
    expect(body.features).toEqual(["analyze_meal", "meal_plan_basic"]);
  });

  it("falls back to tier 'free' when the user has no subscription row", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-legacy", email: "l@e.com", name: "L" },
      session: { id: "s", token: "t", expiresAt: new Date(Date.now() + 1000) },
    });
    selectChain.limit.mockResolvedValueOnce([]);

    const res = await app.request("/api/entitlements/me");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tier).toBe("free");
    expect(body.expires_at).toBeNull();
    expect(body.features).toEqual(["analyze_meal"]);
  });
});
