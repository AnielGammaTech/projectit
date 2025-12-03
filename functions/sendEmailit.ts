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

    if (!config?.emailit_smtp_password) {
      return Response.json({ 
        success: false, 
        error: 'Emailit API key (SMTP password) is not configured. Please enter your API key in Adminland.' 
      });
    }

    if (!config?.emailit_from_email) {
      return Response.json({ 
        success: false, 
        error: 'From email is not configured. Please set up the from email in Adminland (must be from a verified sending domain).' 
      });
    }

    const port = parseInt(config.emailit_smtp_port) || 587;
    
    // Emailit SMTP configuration:
    // Host: smtp.emailit.com
    // Port: 587 (recommended), 25, 2525, or 2587
    // Encryption: STARTTLS
    // Username: always "emailit"
    // Password: your API credential
    const client = new SMTPClient({
      user: 'emailit',
      password: config.emailit_smtp_password,
      host: config.emailit_smtp_host || 'smtp.emailit.com',
      port: port,
      ssl: false,  // Don't use implicit SSL
      tls: {
        ciphers: 'SSLv3'
      },
      timeout: 30000,
    });

    const fromAddress = config.emailit_from_name 
      ? `${config.emailit_from_name} <${config.emailit_from_email}>`
      : config.emailit_from_email;

    const message = {
      from: fromAddress,
      to: to,
      subject: subject,
      text: text || (html ? '' : 'No content'),
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
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to send email';
    
    if (errorMessage.includes('authentication') || errorMessage.includes('535')) {
      errorMessage = 'Authentication failed. Please check your API key is correct and has SMTP type.';
    } else if (errorMessage.includes('553') || errorMessage.includes('domain')) {
      errorMessage = 'Email rejected. Make sure your from email uses a verified sending domain in Emailit.';
    } else if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = 'Could not connect to SMTP server. Check your host and port settings.';
    }
    
    return Response.json({ 
      success: false, 
      error: errorMessage,
      details: error.message
    }, { status: 500 });
  }
});