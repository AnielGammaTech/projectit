import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  try {
    const { to, subject, html, text, testOnly } = req.body;

    // Get integration settings
    const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
    const config = settings[0];

    if (!config?.resend_enabled) {
      return res.json({
        success: false,
        error: 'Resend integration is not enabled. Please enable it in Adminland.',
      });
    }

    if (!config?.resend_api_key) {
      return res.json({
        success: false,
        error: 'Resend API Key is not configured. Please enter it in Adminland.',
      });
    }

    const resend = new Resend(config.resend_api_key);

    const fromEmail = config.resend_from_email || 'onboarding@resend.dev';
    const fromName = config.resend_from_name || 'IT Projects';
    const from = `${fromName} <${fromEmail}>`;

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html: html || text,
      text: text || undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error,
      });
    }

    return res.json({
      success: true,
      message: testOnly ? 'Test email sent successfully via Resend!' : 'Email sent successfully via Resend',
      id: data.id,
    });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.message,
    });
  }
}
