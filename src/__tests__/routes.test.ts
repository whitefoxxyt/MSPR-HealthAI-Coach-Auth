import { describe, expect, it, mock, beforeEach } from "bun:test";

/** Decode a JWT payload without verifying the signature (tests only). */
function decodeJwtPayload(token: string): Record<string, any> {
  const base64 = token.split(".")[1];
  return JSON.parse(Buffer.from(base64, "base64url").toString());
}

// --- Mock auth module before importing the app ---
const mockGetSession = mock<() => any>(() => null);
const mockHandler = mock(() => new Response(JSON.stringify({ ok: true }), {
  headers: { "Content-Type": "application/json" },
}));

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
    handler: mockHandler,
    $Infer: { Session: { user: null, session: null } },
  },
}));

const { default: app } = await import("@/index");

// --- Helpers ---
const fakeUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
};

const fakeSession = {
  id: "session-456",
  token: "tok_abc",
  expiresAt: new Date(Date.now() + 3600_000),
};

function req(path: string, init?: RequestInit) {
  return app.request(path, init);
}

// --- Tests ---
describe("GET /api/session", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockHandler.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await req("/api/session");
    expect(res.status).toBe(401);
  });

  it("returns session and user when authenticated", async () => {
    mockGetSession.mockResolvedValue({ user: fakeUser, session: fakeSession });

    const res = await req("/api/session");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.id).toBe("user-123");
    expect(body.user.email).toBe("test@example.com");
    expect(body.session.id).toBe("session-456");
  });
});

describe("GET /api/jwt", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockHandler.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await req("/api/jwt");
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns a valid JWT when authenticated", async () => {
    mockGetSession.mockResolvedValue({ user: fakeUser, session: fakeSession });

    const res = await req("/api/jwt");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe("string");

    // Verify the JWT payload
    const payload = decodeJwtPayload(body.token);
    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
    expect(payload.name).toBe("Test User");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("sets JWT expiry to 1 hour", async () => {
    mockGetSession.mockResolvedValue({ user: fakeUser, session: fakeSession });

    const before = Math.floor(Date.now() / 1000) + 3600;
    const res = await req("/api/jwt");
    const after = Math.floor(Date.now() / 1000) + 3600;

    const body = await res.json();
    const payload = decodeJwtPayload(body.token);

    expect(payload.exp).toBeGreaterThanOrEqual(before);
    expect(payload.exp).toBeLessThanOrEqual(after);
  });
});

describe("CORS", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockHandler.mockReset();
  });

  it("returns CORS headers on /api/* requests", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await req("/api/session", {
      headers: {
        Origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      process.env.CORS_ORIGIN || "http://localhost:5173"
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("handles OPTIONS preflight on /api/* routes", async () => {
    const res = await req("/api/session", {
      method: "OPTIONS",
      headers: {
        Origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});

describe("Auth passthrough", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockHandler.mockReset();
    mockHandler.mockImplementation(() =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("forwards POST /api/auth/* to the auth handler", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await req("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "pass" }),
    });

    expect(mockHandler).toHaveBeenCalled();
  });

  it("forwards GET /api/auth/* to the auth handler", async () => {
    mockGetSession.mockResolvedValue(null);

    await req("/api/auth/session");
    expect(mockHandler).toHaveBeenCalled();
  });
});
