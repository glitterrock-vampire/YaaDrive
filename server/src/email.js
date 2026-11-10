const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export function isEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM && process.env.APP_URL);
}

export async function sendVerificationEmail({ email, name, token }) {
  if (!isEmailConfigured()) {
    throw new Error('Email verification is not configured (BREVO_API_KEY, EMAIL_FROM, and APP_URL are required)');
  }

  const verificationUrl = new URL('/verify-email', process.env.APP_URL);
  verificationUrl.searchParams.set('token', token);
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verificationUrl.toString());

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'YaadDrive', email: process.env.EMAIL_FROM },
      to: [{ email, name }],
      subject: 'Verify your YaadDrive email',
      htmlContent: `<p>Hi ${safeName},</p><p>Verify your YaadDrive account by clicking the button below. This link expires in 24 hours.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#0f4a34;color:#fff;text-decoration:none;border-radius:8px">Verify email</a></p><p>If you did not create a YaadDrive account, you can ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo email request failed (${response.status}): ${body.slice(0, 500)}`);
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
