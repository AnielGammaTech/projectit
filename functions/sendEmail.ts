import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, body: emailBody, testOnly } = body;

    // Get integration settings
    const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const integrationSettings = settings[0];

    if (!integrationSettings?.sendgrid_enabled || !integrationSettings?.sendgrid_api_key) {
      return Response.json({ 
        success: false, 
        error: 'SendGrid is not configured. Please set up SendGrid in Adminland → Integrations.' 
      });
    }

    const apiKey = integrationSettings.sendgrid_api_key;
    const fromEmail = integrationSettings.sendgrid_from_email;
    const fromName = integrationSettings.sendgrid_from_name || 'IT Projects';

    if (!fromEmail) {
      return Response.json({ 
        success: false, 
        error: 'SendGrid from email is not configured.' 
      });
    }

    // Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: emailBody
        }]
      })
    });

    if (response.status === 202 || response.status === 200) {
      return Response.json({ 
        success: true, 
        message: testOnly ? 'Test email sent successfully!' : 'Email sent successfully' 
      });
    } else {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      return Response.json({ 
        success: false, 
        error: 'Failed to send email via SendGrid',
        details: errorDetails
      });
    }

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});