import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Resend } from 'npm:resend@2.0.0';

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

    if (!config?.resend_enabled) {
      return Response.json({ 
        success: false, 
        error: 'Resend integration is not enabled. Please enable it in Adminland.' 
      });
    }

    if (!config?.resend_api_key) {
      return Response.json({ 
        success: false, 
        error: 'Resend API Key is not configured. Please enter it in Adminland.' 
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
      text: text || undefined
    });

    if (error) {
      console.error('Resend error:', error);
      return Response.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      message: testOnly ? 'Test email sent successfully via Resend!' : 'Email sent successfully via Resend',
      id: data.id
    });

  } catch (error) {
    console.error('Email error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      details: error.message
    }, { status: 500 });
  }
});