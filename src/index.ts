import { Hono } from 'hono'
import { auth } from '@/lib/auth'
import { cors } from 'hono/cors'
import { sign } from 'hono/jwt'

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

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    return c.json({ error: "Server misconfiguration: BETTER_AUTH_SECRET is not set" }, 500);
  }

  const token = await sign(payload, secret, 'HS512');

  return c.json({ token });
});

export default app
