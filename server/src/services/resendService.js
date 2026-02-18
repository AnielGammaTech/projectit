import entityService from './entityService.js';

let cachedConfig = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 300000; // 5 minutes

export async function getResendConfig() {
  const now = Date.now();
  if (cachedConfig && (now - configCacheTime) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const settings = await entityService.filter('IntegrationSettings', { provider: 'resend' });
  const setting = settings[0];

  cachedConfig = {
    apiKey: setting?.api_key || process.env.RESEND_API_KEY || '',
    fromEmail: setting?.from_email || process.env.RESEND_FROM_EMAIL || 'noreply@projectit.app',
    fromName: setting?.from_name || process.env.RESEND_FROM_NAME || 'ProjectIT',
    enabled: setting?.enabled !== false && !!(setting?.api_key || process.env.RESEND_API_KEY),
  };
  configCacheTime = now;
  return cachedConfig;
}

export function clearResendConfigCache() {
  cachedConfig = null;
  configCacheTime = 0;
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const config = await getResendConfig();

  if (!config.enabled || !config.apiKey) {
    throw new Error('Resend is not configured. Please add your API key in Adminland > Integrations.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
      reply_to: replyTo || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Resend API error: ${response.status}`);
  }

  return response.json();
}

export async function sendNotificationEmail({ to, subject, body, projectName, actionUrl }) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, #0F2F44, #133F5C); padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">ProjectIT</h2>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
        ${projectName ? `<p style="color: #64748b; font-size: 13px; margin: 0 0 4px;">Project: <strong style="color: #0F2F44;">${projectName}</strong></p>` : ''}
        <h3 style="color: #0F2F44; margin: 8px 0 16px; font-size: 16px;">${subject}</h3>
        <p style="color: #334155; line-height: 1.6; margin: 0 0 24px;">${body}</p>
        ${actionUrl ? `<a href="${actionUrl}" style="display: inline-block; background: #0069AF; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">View Details</a>` : ''}
      </div>
      <div style="padding: 16px 32px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Sent by ProjectIT</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}
