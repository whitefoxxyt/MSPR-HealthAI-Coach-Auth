import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/db";
import { openAPI, jwt } from "better-auth/plugins";
import { Resend } from "resend";
import { getVerificationEmailTemplate } from "@/lib/email/template";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        async sendVerificationEmail({ user, url, token }, request) {
            console.log("📨 Envoi de l'email de vérification à :", user.email);
            await resend.emails.send({
                from: "onboarding@resend.dev",
                to: user.email,
                subject: "Vérifiez votre adresse email",
                html: getVerificationEmailTemplate(url, user.name),
            });
        },
    },

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,

        async sendResetPassword({ user, url, token }, request) {
            console.log("📨 Envoi email reset password à :", user.email);
            await resend.emails.send({
                from: "onboarding@resend.dev",
                to: user.email,
                subject: "Réinitialisation de mot de passe",
                html: `<p>Cliquez ici pour réinitialiser : <a href="${url}">${url}</a></p>`,
            });
        }
    }
});
