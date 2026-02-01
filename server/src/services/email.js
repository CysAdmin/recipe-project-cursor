import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Cookmarker <no-reply@cookmarker.com>';
const VERIFICATION_TEMPLATE_ID = process.env.RESEND_VERIFICATION_TEMPLATE_ID || '58d1be20-87e7-459d-90ef-0c124896f071';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

/**
 * Send verification email with link. Uses Resend template; VERIFIY_EMAIL_TOKEN = full URL, USER_NAME = display name.
 * @param {string} to - Recipient email
 * @param {string} verificationLink - Full URL e.g. https://app.cookmarker.de/verify-email?token=xxx
 * @param {string} userName - Display name for greeting (e.g. "Hi USER_NAME,")
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendVerificationEmail(to, verificationLink, userName = '') {
  if (!resend) {
    console.warn('RESEND_API_KEY not set; skipping verification email');
    return { success: false, error: 'Email not configured' };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      template: {
        id: VERIFICATION_TEMPLATE_ID,
        variables: {
          VERIFIY_EMAIL_TOKEN: verificationLink,
          USER_NAME: userName || 'User',
        },
      },
    });
    if (error) {
      console.error('Resend send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Send verification email error:', err);
    return { success: false, error: err.message };
  }
}
