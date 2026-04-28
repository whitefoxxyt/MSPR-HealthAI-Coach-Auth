import { describe, expect, it, mock, beforeEach } from "bun:test";
import { sign } from "hono/jwt";

process.env.BETTER_AUTH_SECRET = "test_secret_min_32_chars_test_secret_min_32_chars";
process.env.ADMIN_EMAILS = "admin@example.com,boss@example.com";

const SECRET = process.env.BETTER_AUTH_SECRET;

// --- Mock auth (the better-auth handler / session) ---
const mockGetSession = mock<() => any>(() => null);
const mockHandler = mock(() => new Response(null, { status: 204 }));
mock.module("@/lib/auth", () => ({
  auth: {
    api: { getSession: mockGetSession },
    handler: mockHandler,
    $Infer: { Session: { user: null, session: null } },
  },
}));

// --- Mock @/db/db with chainable select + update + insert. We avoid mocking
//     @/lib/subscriptions because Bun's mock.module is global to the test
//     process; mocking that module here would shadow it for other test files. ---
type DbState = {
  current: { tier: string } | undefined;
  updated: any;
};
const dbState: DbState = { current: undefined, updated: null };

const selectChain = {
  from: mock(() => selectChain),
  where: mock(() => Promise.resolve(dbState.current ? [dbState.current] : [])),
};
const updateChain = {
  set: mock(() => updateChain),
  where: mock(() => updateChain),
  returning: mock(() => Promise.resolve(dbState.updated ? [dbState.updated] : [])),
};
const insertChain = {
  values: mock(() => insertChain),
  onConflictDoNothing: mock(() => Promise.resolve()),
};
const mockDb = {
  select: mock(() => selectChain),
  update: mock(() => updateChain),
  insert: mock(() => insertChain),
};
mock.module("@/db/db", () => ({ db: mockDb, pool: {} }));

const { default: app } = await import("@/index");

async function adminToken(email = "admin@example.com") {
  return sign(
    { sub: "admin-user-id", email, name: "Admin", exp: Math.floor(Date.now() / 1000) + 3600 },
    SECRET!,
  );
}

function patchSubscription(userId: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return app.request(`/api/admin/users/${userId}/subscription`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function resetDb() {
  dbState.current = undefined;
  dbState.updated = null;
  mockDb.select.mockClear();
  mockDb.update.mockClear();
  selectChain.from.mockClear();
  selectChain.where.mockClear();
  updateChain.set.mockClear();
  updateChain.where.mockClear();
  updateChain.returning.mockClear();
}

describe("PATCH /api/admin/users/:userId/subscription — happy path", () => {
  beforeEach(resetDb);

  it("admin upgrades a user to premium and gets the updated row", async () => {
    const updatedAt = new Date("2026-04-28T12:00:00Z");
    const expiresAt = new Date("2027-04-28T12:00:00Z");
    dbState.current = { tier: "free" };
    dbState.updated = {
      userId: "user-123",
      tier: "premium",
      startedAt: new Date("2026-01-01T00:00:00Z"),
      expiresAt,
      updatedAt,
    };

    const token = await adminToken();
    const res = await patchSubscription(
      "user-123",
      { tier: "premium", expires_at: expiresAt.toISOString() },
      token,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user_id).toBe("user-123");
    expect(body.tier).toBe("premium");
    expect(body.expires_at).toBe(expiresAt.toISOString());
    expect(body.updated_at).toBe(updatedAt.toISOString());

    expect(mockDb.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalled();
    const setArg = (updateChain.set as any).mock.calls[0][0];
    expect(setArg.tier).toBe("premium");
    expect(setArg.expiresAt).toEqual(expiresAt);
  });

  it("accepts expires_at: null (lifetime) and clears any prior expiry", async () => {
    dbState.current = { tier: "premium" };
    dbState.updated = {
      userId: "user-123",
      tier: "premium_plus",
      startedAt: new Date("2026-01-01T00:00:00Z"),
      expiresAt: null,
      updatedAt: new Date("2026-04-28T12:00:00Z"),
    };

    const token = await adminToken();
    const res = await patchSubscription(
      "user-123",
      { tier: "premium_plus", expires_at: null },
      token,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expires_at).toBeNull();
    const setArg = (updateChain.set as any).mock.calls[0][0];
    expect(setArg.expiresAt).toBeNull();
  });
});

describe("PATCH /api/admin/users/:userId/subscription — non-admin", () => {
  beforeEach(resetDb);

  it("returns 403 when JWT email is not in ADMIN_EMAILS and does not touch the DB", async () => {
    dbState.current = { tier: "free" };
    const token = await adminToken("not-admin@example.com");

    const res = await patchSubscription(
      "user-123",
      { tier: "premium", expires_at: null },
      token,
    );

    expect(res.status).toBe(403);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users/:userId/subscription — auth", () => {
  beforeEach(resetDb);

  it("returns 401 when Authorization header is missing", async () => {
    const res = await patchSubscription("user-123", { tier: "premium", expires_at: null });
    expect(res.status).toBe(401);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns 401 when JWT signature is invalid", async () => {
    const tamperedToken = await sign(
      { email: "admin@example.com", exp: Math.floor(Date.now() / 1000) + 3600 },
      "wrong_secret_wrong_secret_wrong_secret_xx",
    );
    const res = await patchSubscription(
      "user-123",
      { tier: "premium", expires_at: null },
      tamperedToken,
    );
    expect(res.status).toBe(401);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users/:userId/subscription — not found", () => {
  beforeEach(resetDb);

  it("returns 404 when no user_subscriptions row exists for the target user", async () => {
    dbState.current = undefined;
    const token = await adminToken();

    const res = await patchSubscription(
      "ghost-user",
      { tier: "premium", expires_at: null },
      token,
    );

    expect(res.status).toBe(404);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users/:userId/subscription — invalid body", () => {
  beforeEach(resetDb);

  it("returns 400 when tier is not in the allowed enum", async () => {
    dbState.current = { tier: "free" };
    const token = await adminToken();

    const res = await patchSubscription(
      "user-123",
      { tier: "gold", expires_at: null },
      token,
    );

    expect(res.status).toBe(400);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns 400 when expires_at is not a parseable date", async () => {
    dbState.current = { tier: "free" };
    const token = await adminToken();

    const res = await patchSubscription(
      "user-123",
      { tier: "premium", expires_at: "not-a-date" },
      token,
    );

    expect(res.status).toBe(400);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users/:userId/subscription — audit log", () => {
  beforeEach(resetDb);

  it("emits one structured log with actor, target, old/new tier, and timestamp", async () => {
    dbState.current = { tier: "free" };
    dbState.updated = {
      userId: "user-123",
      tier: "premium_plus",
      startedAt: new Date("2026-01-01T00:00:00Z"),
      expiresAt: null,
      updatedAt: new Date("2026-04-28T12:00:00Z"),
    };

    const logSpy = mock<(...args: any[]) => void>(() => {});
    const original = console.log;
    console.log = logSpy;

    try {
      const token = await adminToken("admin@example.com");
      const res = await patchSubscription(
        "user-123",
        { tier: "premium_plus", expires_at: null },
        token,
      );
      expect(res.status).toBe(200);
    } finally {
      console.log = original;
    }

    const auditCalls = (logSpy.mock.calls as unknown as string[][])
      .map((args) => args[0])
      .filter((s) => typeof s === "string" && s.includes("admin.subscription_change"));

    expect(auditCalls).toHaveLength(1);
    const entry = JSON.parse(auditCalls[0]!);
    expect(entry.event).toBe("admin.subscription_change");
    expect(entry.actor_email).toBe("admin@example.com");
    expect(entry.target_user_id).toBe("user-123");
    expect(entry.old_tier).toBe("free");
    expect(entry.new_tier).toBe("premium_plus");
    expect(typeof entry.timestamp).toBe("string");
    expect(Number.isNaN(new Date(entry.timestamp).getTime())).toBe(false);
  });
});
