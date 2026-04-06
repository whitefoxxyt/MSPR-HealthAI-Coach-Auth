export const getVerificationEmailTemplate = (url: string, name: string) => {
  const brandGreen = "#22c55e";
  const brandDark = "#0f172a";

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmez votre compte HealthAI Coach</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        width: 100% !important;
        -webkit-text-size-adjust: 100%;
        background-color: #f0fdf4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      .email-wrapper {
        width: 100%;
        background-color: #f0fdf4;
        padding: 40px 20px;
        box-sizing: border-box;
      }

      .logo-container {
        text-align: center;
        margin-bottom: 28px;
      }

      .logo-wordmark {
        display: inline-block;
        font-size: 22px;
        font-weight: 700;
        color: ${brandDark};
        letter-spacing: -0.5px;
      }

      .logo-wordmark span {
        color: ${brandGreen};
      }

      .container {
        width: 100%;
        max-width: 580px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
      }

      .header-banner {
        background: linear-gradient(135deg, ${brandDark} 0%, #1e3a5f 100%);
        padding: 32px 40px;
        text-align: center;
      }

      .header-banner h1 {
        color: #ffffff;
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.3px;
      }

      .header-banner p {
        color: rgba(255,255,255,0.7);
        margin: 8px 0 0;
        font-size: 14px;
      }

      .content {
        padding: 40px 40px 32px;
        color: #374151;
        line-height: 1.7;
        font-size: 15px;
      }

      .greeting {
        color: ${brandDark};
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 18px;
        font-weight: 600;
      }

      .content p {
        margin-bottom: 20px;
        margin-top: 0;
      }

      .features-list {
        background: #f8fafc;
        border-radius: 10px;
        padding: 20px 24px;
        margin: 24px 0;
        list-style: none;
        padding-left: 24px;
      }

      .features-list li {
        padding: 4px 0;
        font-size: 14px;
        color: #4b5563;
      }

      .features-list li::before {
        content: "✓ ";
        color: ${brandGreen};
        font-weight: 700;
      }

      .button-container {
        text-align: center;
        margin: 32px 0 24px;
      }

      .button {
        display: inline-block;
        background-color: ${brandGreen};
        color: #ffffff;
        text-decoration: none;
        padding: 14px 36px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 15px;
        letter-spacing: 0.2px;
      }

      .expiry-note {
        text-align: center;
        font-size: 13px;
        color: #9ca3af;
        margin-top: 8px;
      }

      .divider {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 28px 0;
      }

      .secondary-text {
        font-size: 13px;
        color: #6b7280;
        text-align: center;
      }

      .fallback-link {
        margin-top: 16px;
        font-size: 12px;
        color: #9ca3af;
        word-break: break-all;
        text-align: center;
      }

      .fallback-link a {
        color: ${brandGreen};
        text-decoration: underline;
      }

      .footer {
        background: #f8fafc;
        padding: 20px 40px;
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
        border-top: 1px solid #e5e7eb;
      }

      .footer a {
        color: #6b7280;
        text-decoration: none;
      }

      @media only screen and (max-width: 480px) {
        .content {
          padding: 28px 24px 24px !important;
        }
        .header-banner {
          padding: 24px !important;
        }
        .footer {
          padding: 16px 24px !important;
        }
        .email-wrapper {
          padding: 24px 12px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">

      <div class="logo-container">
        <span class="logo-wordmark">HealthAI<span> Coach</span></span>
      </div>

      <div class="container">

        <div class="header-banner">
          <h1>Confirmez votre adresse email</h1>
          <p>Une dernière étape avant de commencer votre coaching</p>
        </div>

        <div class="content">
          <h2 class="greeting">Bonjour ${name},</h2>

          <p>
            Merci de vous être inscrit sur <strong>HealthAI Coach</strong>. Pour activer votre compte
            et accéder à votre espace de coaching personnalisé, veuillez confirmer votre adresse email.
          </p>

          <ul class="features-list">
            <li>Suivi nutritionnel et recommandations personnalisées</li>
            <li>Catalogue d'exercices et plans d'entraînement</li>
            <li>Tableau de bord de progression en temps réel</li>
            <li>Analyse de vos indicateurs biométriques</li>
          </ul>

          <div class="button-container">
            <a href="${url}" class="button">Confirmer mon compte</a>
          </div>
          <p class="expiry-note">Ce lien est valable 24 heures.</p>

          <hr class="divider">

          <p class="secondary-text">
            Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email —
            aucune action n'est requise.
          </p>

          <div class="fallback-link">
            <p style="margin-bottom: 6px;">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :</p>
            <a href="${url}">${url}</a>
          </div>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} HealthAI Coach — Votre coach santé intelligent</p>
          <p style="margin-top: 6px;">
            Vous recevez cet email car une inscription a été effectuée avec cette adresse.
          </p>
        </div>

      </div>

    </div>
  </body>
  </html>
    `;
};
