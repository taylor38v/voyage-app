// Resend integration for transactional emails (direct API, no Replit proxy)
import { Resend } from 'resend';

const APP_URL = process.env.APP_URL || 'https://voyageo.app';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Voyageo <noreply@voyageo.app>';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — emails disabled');
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
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
  const client = getResendClient();
  if (!client) return false;
  try {
    const name = firstName || 'Bonjour';
    await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Bienvenue sur Voyageo !',
      html: emailWrapper(`
        <p style="font-size: 16px; line-height: 1.6;">${name},</p>
        <p style="font-size: 15px; line-height: 1.6;">Bienvenue sur <strong>Voyageo</strong> ! Votre compte a été créé avec succès.</p>
        <p style="font-size: 15px; line-height: 1.6;">Vous pouvez dès maintenant créer votre premier voyage et l'envoyer à vos clients.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${APP_URL}/admin" style="display: inline-block; background: #FF6B6B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Accéder à mon espace</a>
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
  const client = getResendClient();
  if (!client) return false;
  try {
    const from = senderName || 'Votre travel planner';
    await client.emails.send({
      from: FROM_EMAIL,
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
  const client = getResendClient();
  if (!client) return false;
  try {
    const name = firstName || 'Bonjour';
    await client.emails.send({
      from: FROM_EMAIL,
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
