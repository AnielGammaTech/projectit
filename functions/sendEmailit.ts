import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    if (!config?.emailit_enabled || !config?.emailit_api_key) {
      return Response.json({ 
        success: false, 
        error: 'Emailit integration is not configured. Please set up API key in Adminland.' 
      });
    }

    const fromEmail = config.emailit_from_name 
      ? `${config.emailit_from_name} <${config.emailit_from_email}>`
      : config.emailit_from_email;

    const emailPayload = {
      from: fromEmail,
      to: to,
      subject: subject,
      html: html || '',
      text: text || ''
    };

    if (config.emailit_reply_to) {
      emailPayload.reply_to = config.emailit_reply_to;
    }

    const response = await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.emailit_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to send email';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return Response.json({ 
        success: false, 
        error: errorMessage,
        status: response.status
      });
    }

    const result = await response.json();

    return Response.json({ 
      success: true, 
      message: testOnly ? 'Test email sent successfully!' : 'Email sent successfully',
      data: result
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});