import { sendEmail, sendNotificationEmail, getResendConfig, clearResendConfigCache } from '../../services/resendService.js';
import entityService from '../../services/entityService.js';

export default async function handler(req, res) {
  try {
    const { action } = req.body;

    if (action === 'testConnection') {
      const config = await getResendConfig();
      if (!config.apiKey) {
        return res.json({ success: false, error: 'No API key configured' });
      }

      // Test by fetching API key info
      const response = await fetch('https://api.resend.com/api-keys', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
      });

      if (response.ok) {
        return res.json({ success: true, message: 'Connected to Resend successfully' });
      } else {
        const err = await response.json().catch(() => ({}));
        return res.json({ success: false, error: err.message || 'Invalid API key' });
      }
    }

    if (action === 'saveSettings') {
      const { fromEmail, fromName } = req.body;

      const existing = await entityService.filter('IntegrationSettings', { provider: 'resend' });
      // API key is stored ONLY as env var (RESEND_API_KEY) — never saved to DB
      const data = {
        provider: 'resend',
        from_email: fromEmail || 'noreply@projectit.app',
        from_name: fromName || 'ProjectIT',
        enabled: true,
      };

      if (existing[0]) {
        await entityService.update('IntegrationSettings', existing[0].id, data);
      } else {
        await entityService.create('IntegrationSettings', data);
      }

      clearResendConfigCache();
      return res.json({ success: true, message: 'Resend settings saved' });
    }

    if (action === 'checkEnvStatus') {
      return res.json({
        success: true,
        hasApiKey: !!process.env.RESEND_API_KEY,
      });
    }

    if (action === 'sendTestEmail') {
      const { to } = req.body;
      if (!to) return res.status(400).json({ error: 'Recipient email required' });

      await sendNotificationEmail({
        to,
        subject: 'Test Email from ProjectIT',
        body: 'This is a test email to verify your Resend integration is working correctly. If you received this, your email notifications are properly configured!',
        actionUrl: process.env.FRONTEND_URL || 'https://frontend-production-2a650.up.railway.app',
      });

      return res.json({ success: true, message: `Test email sent to ${to}` });
    }

    if (action === 'send') {
      const { to, subject, html, text } = req.body;
      if (!to || !subject) return res.status(400).json({ error: 'Recipient and subject required' });

      const result = await sendEmail({ to, subject, html, text });
      return res.json({ success: true, ...result });
    }

    if (action === 'sendNotification') {
      const { to, subject, body, projectName, actionUrl } = req.body;
      if (!to || !subject) return res.status(400).json({ error: 'Recipient and subject required' });

      const result = await sendNotificationEmail({ to, subject, body, projectName, actionUrl });
      return res.json({ success: true, ...result });
    }

    return res.status(400).json({ error: 'Invalid action. Use: testConnection, saveSettings, sendTestEmail, send, or sendNotification' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
