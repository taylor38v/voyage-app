// Resend integration for transactional emails
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@voyageo.app'
  };
}

const emailWrapper = (content: string) => `
  <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #e0e0e0; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #FF6B6B; margin: 0; font-size: 28px;">Voyageo</h1>
    </div>
    ${content}
    <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
    <p style="font-size: 12px; color: #666; text-align: center;">Voyageo — Votre espace travel planner</p>
  </div>
`;

export async function sendWelcomeEmail(toEmail: string, firstName?: string | null) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const name = firstName || 'Bonjour';

    await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Bienvenue sur Voyageo !',
      html: emailWrapper(`
        <p style="font-size: 16px; line-height: 1.6;">${name},</p>
        <p style="font-size: 15px; line-height: 1.6;">Bienvenue sur <strong>Voyageo</strong> ! Votre compte a été créé avec succès.</p>
        <p style="font-size: 15px; line-height: 1.6;">Vous pouvez dès maintenant créer votre premier voyage et l'envoyer à vos clients.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://voyageo.replit.app/admin" style="display: inline-block; background: #FF6B6B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Accéder à mon espace</a>
        </div>
        <p style="font-size: 13px; color: #999; line-height: 1.5;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      `),
    });

    console.log(`[Email] Welcome email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send welcome email:', err);
    return false;
  }
}

export async function sendTripSharedEmail(toEmail: string, tripTitle: string, shareUrl: string, senderName?: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const from = senderName || 'Votre travel planner';

    await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Votre voyage "${tripTitle}" est prêt !`,
      html: emailWrapper(`
        <p style="font-size: 16px; line-height: 1.6;">Bonjour,</p>
        <p style="font-size: 15px; line-height: 1.6;"><strong>${from}</strong> a préparé votre voyage <strong>"${tripTitle}"</strong> et vous invite à le consulter.</p>
        <p style="font-size: 15px; line-height: 1.6;">Vous y trouverez l'itinéraire complet, le budget, les activités jour par jour, et votre check-list de préparation.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${shareUrl}" style="display: inline-block; background: #FF6B6B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Voir mon voyage</a>
        </div>
        <p style="font-size: 13px; color: #999; line-height: 1.5;">Ce lien est personnel. Vous pouvez le consulter à tout moment depuis votre téléphone.</p>
      `),
    });

    console.log(`[Email] Trip shared email sent to ${toEmail} for "${tripTitle}"`);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send trip shared email:', err);
    return false;
  }
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string, firstName?: string | null) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const name = firstName || 'Bonjour';

    await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Réinitialisation de votre mot de passe - Voyageo',
      html: emailWrapper(`
        <p style="font-size: 16px; line-height: 1.6;">${name},</p>
        <p style="font-size: 15px; line-height: 1.6;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #FF6B6B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Réinitialiser mon mot de passe</a>
        </div>
        <p style="font-size: 13px; color: #999; line-height: 1.5;">Ce lien est valable 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
      `),
    });

    console.log(`[Email] Password reset sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send password reset:', err);
    return false;
  }
}
