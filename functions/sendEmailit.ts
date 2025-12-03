import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.8';

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
        error: 'Emailit API key is not configured. Please enter your API key in Adminland.' 
      });
    }

    if (!config?.emailit_from_email) {
      return Response.json({ 
        success: false, 
        error: 'From email is not configured. Please set up the from email in Adminland (must be from a verified sending domain).' 
      });
    }

    const port = parseInt(config.emailit_smtp_port) || 587;
    const host = config.emailit_smtp_host || 'smtp.emailit.com';
    
    // Create transporter using nodemailer
    // Emailit SMTP: host=smtp.emailit.com, port=587, user="emailit", pass=API_KEY
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: false, // Use STARTTLS, not implicit TLS
      auth: {
        user: 'emailit',
        pass: config.emailit_smtp_password,
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });

    const fromAddress = config.emailit_from_name 
      ? `${config.emailit_from_name} <${config.emailit_from_email}>`
      : config.emailit_from_email;

    const mailOptions = {
      from: fromAddress,
      to: to,
      subject: subject,
      text: text || '',
      html: html || '<p>No content</p>',
    };

    if (config.emailit_reply_to) {
      mailOptions.replyTo = config.emailit_reply_to;
    }

    await transporter.sendMail(mailOptions);

    return Response.json({ 
      success: true, 
      message: testOnly ? 'Test email sent successfully!' : 'Email sent successfully'
    });

  } catch (error) {
    console.error('Email error:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to send email';
    
    if (errorMessage.includes('Invalid login') || errorMessage.includes('535') || errorMessage.includes('authentication')) {
      errorMessage = 'Authentication failed. Please check your API key is correct and has SMTP type (not API type).';
    } else if (errorMessage.includes('553') || errorMessage.includes('domain') || errorMessage.includes('sender')) {
      errorMessage = 'Email rejected. Make sure your from email uses a verified sending domain in Emailit.';
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('connect')) {
      errorMessage = 'Could not connect to SMTP server. The server may be temporarily unavailable.';
    } else if (errorMessage.includes('ENOTFOUND')) {
      errorMessage = 'Could not resolve SMTP hostname. Check your host setting.';
    }
    
    return Response.json({ 
      success: false, 
      error: errorMessage,
      details: error.message
    }, { status: 500 });
  }
});