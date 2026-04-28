import { Hono } from 'hono'
import { auth } from '@/lib/auth'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import { getEntitlements } from '@/lib/entitlements'
import { isAdmin, parseAdminEmails } from '@/lib/admin'
import { updateUserSubscription, type Tier } from '@/lib/subscriptions'
import { logSubscriptionChange } from '@/lib/audit'

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  }
}>();

// CORS
app.use(
  "/api/*",
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// MIDDLEWARE
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// ROUTES
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

app.get("/api/session", (c) => {
  const session = c.get("session")
  const user = c.get("user")

  if (!user) return c.body(null, 401);

  return c.json({
    session,
    user
  });
});

app.get("/api/entitlements/me", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const entitlements = await getEntitlements(user.id);
  return c.json(entitlements);
});

// Génère un JWT signé avec BETTER_AUTH_SECRET pour les autres microservices
app.get("/api/jwt", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  const secret = process.env.BETTER_AUTH_SECRET || "password";

  const token = await sign(payload, secret);

  return c.json({ token });
});

const ALLOWED_TIERS: Tier[] = ["free", "premium", "premium_plus"];

app.patch("/api/admin/users/:userId/subscription", async (c) => {
  const secret = process.env.BETTER_AUTH_SECRET || "password";
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice("Bearer ".length).trim();

  let payload: { email?: string; sub?: string };
  try {
    payload = (await verify(token, secret)) as typeof payload;
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!isAdmin(payload.email, adminEmails)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Invalid body" }, 400);
  }

  const { tier, expires_at } = body as { tier?: unknown; expires_at?: unknown };
  if (typeof tier !== "string" || !ALLOWED_TIERS.includes(tier as Tier)) {
    return c.json({ error: "Invalid tier" }, 400);
  }

  let expiresAt: Date | null = null;
  if (expires_at !== null && expires_at !== undefined) {
    if (typeof expires_at !== "string") {
      return c.json({ error: "Invalid expires_at" }, 400);
    }
    const parsed = new Date(expires_at);
    if (Number.isNaN(parsed.getTime())) {
      return c.json({ error: "Invalid expires_at" }, 400);
    }
    expiresAt = parsed;
  }

  const userId = c.req.param("userId");
  const result = await updateUserSubscription(userId, { tier: tier as Tier, expiresAt });

  if (!result) {
    return c.json({ error: "User not found" }, 404);
  }

  logSubscriptionChange({
    actorEmail: payload.email!,
    targetUserId: userId,
    oldTier: result.oldTier,
    newTier: result.row.tier,
  });

  return c.json({
    user_id: result.row.userId,
    tier: result.row.tier,
    started_at: result.row.startedAt.toISOString(),
    expires_at: result.row.expiresAt ? result.row.expiresAt.toISOString() : null,
    updated_at: result.row.updatedAt.toISOString(),
  });
});

export default app
