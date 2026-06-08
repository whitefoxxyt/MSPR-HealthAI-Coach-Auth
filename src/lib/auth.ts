import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/db";
import { openAPI, jwt } from "better-auth/plugins";
import { Resend } from "resend";
import { getVerificationEmailTemplate } from "@/lib/email/template";
import { onUserCreated } from "@/lib/subscriptions";

const resend = new Resend(process.env.RESEND_API_KEY);

// Mode offline (config performance/offline MSPR3) : desactive la verification email
// et les envois Resend pour une demo sans connexion internet.
const OFFLINE = process.env.AUTH_OFFLINE === "true";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [process.env.CORS_ORIGIN || "http://localhost:5173"],
    plugins: [
        openAPI(),
        jwt(),
    ],

    databaseHooks: {
        user: {
            create: {
                after: onUserCreated,
            },
        },
    },

    emailVerification: {
        sendOnSignUp: !OFFLINE,
        autoSignInAfterVerification: true,
        async sendVerificationEmail({ user, url, token }, request) {
            if (OFFLINE) {
                console.log("[offline] verification email desactivee pour", user.email);
                return;
            }
            const frontUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
            const verificationUrl = new URL(url);
            verificationUrl.searchParams.set("callbackURL", frontUrl);
            const finalUrl = verificationUrl.toString();

            console.log("📨 Envoi de l'email de vérification à :", user.email);
            try {
                const result = await resend.emails.send({
                    from: "noreply@arthurponcin.me",
                    to: user.email,
                    subject: "Vérifiez votre adresse email",
                    html: getVerificationEmailTemplate(finalUrl, user.name),
                });
                console.log("📬 Résultat Resend:", JSON.stringify(result));
            } catch (e) {
                console.error("❌ Erreur Resend:", e);
            }
        },
    },

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: !OFFLINE,

        async sendResetPassword({ user, url, token }, request) {
            if (OFFLINE) {
                console.log("[offline] reset password email desactive pour", user.email);
                return;
            }
            console.log("📨 Envoi email reset password à :", user.email);
            await resend.emails.send({
                from: "noreply@arthurponcin.me",
                to: user.email,
                subject: "Réinitialisation de mot de passe",
                html: `<p>Cliquez ici pour réinitialiser : <a href="${url}">${url}</a></p>`,
            });
        }
    }
});
