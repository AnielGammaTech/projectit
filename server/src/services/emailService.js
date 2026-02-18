import { Resend } from 'resend';

let client = null;

function getClient() {
  if (!client && process.env.RESEND_API_KEY) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

const emailService = {
  /**
   * Send an email via Resend — mirrors Base44's SendEmail integration
   * @param {Object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.subject - Email subject
   * @param {string} params.body - Email body (HTML)
   * @param {string} [params.from_name] - Sender name
   * @param {string} [params.from_email] - Sender email
   */
  async send({ to, subject, body, from_name, from_email }) {
    const resend = getClient();
    if (!resend) {
      console.warn('Email service not configured (RESEND_API_KEY missing)');
      return { success: false, error: 'Email service not configured' };
    }

    const fromEmail = from_email || process.env.RESEND_FROM_EMAIL || 'noreply@projectit.app';
    const fromName = from_name || process.env.RESEND_FROM_NAME || 'ProjectIT';

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: body,
    });

    return result;
  },
};

export default emailService;
