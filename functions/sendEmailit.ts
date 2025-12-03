import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { SMTPClient } from 'npm:emailjs@4.0.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, text, testOnly } = body;

    // Get integration settings
    const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];

    if (!config?.emailit_enabled) {
      return Response.json({ 
        success: false, 
        error: 'Emailit integration is not enabled. Please enable it in Adminland.' 
      });
    }

    if (!config?.emailit_smtp_host || !config?.emailit_smtp_username || !config?.emailit_smtp_password) {
      return Response.json({ 
        success: false, 
        error: 'Emailit SMTP settings are not configured. Please set up SMTP host, username, and password in Adminland.' 
      });
    }

    if (!config?.emailit_from_email) {
      return Response.json({ 
        success: false, 
        error: 'From email is not configured. Please set up the from email in Adminland.' 
      });
    }

    const client = new SMTPClient({
      user: config.emailit_smtp_username,
      password: config.emailit_smtp_password,
      host: config.emailit_smtp_host,
      port: parseInt(config.emailit_smtp_port) || 587,
      tls: true,
    });

    const fromAddress = config.emailit_from_name 
      ? `${config.emailit_from_name} <${config.emailit_from_email}>`
      : config.emailit_from_email;

    const message = {
      from: fromAddress,
      to: to,
      subject: subject,
      text: text || '',
      attachment: [
        { data: html || '<p>No content</p>', alternative: true }
      ]
    };

    if (config.emailit_reply_to) {
      message['reply-to'] = config.emailit_reply_to;
    }

    await client.sendAsync(message);

    return Response.json({ 
      success: true, 
      message: testOnly ? 'Test email sent successfully!' : 'Email sent successfully'
    });

  } catch (error) {
    console.error('Email error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
});