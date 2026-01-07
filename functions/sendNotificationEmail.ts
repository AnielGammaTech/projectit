import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { to, type, title, message, projectId, projectName, fromUserName, link } = body;

    if (!to || !title) {
      return Response.json({ success: false, error: 'Missing required fields: to, title' }, { status: 400 });
    }

    // Get user notification preferences using service role
    let prefs = {};
    try {
      const userSettings = await base44.asServiceRole.entities.NotificationSettings.filter({ user_email: to });
      prefs = userSettings[0] || {};
    } catch (e) {
      console.log('Could not fetch user preferences, using defaults:', e.message);
    }

    // Check if user wants this type of notification
    const notificationTypeMap = {
      'mention': 'notify_mentions',
      'task_assigned': 'notify_task_assigned',
      'task_due': 'notify_task_due_soon',
      'task_overdue': 'notify_task_overdue',
      'task_completed': 'notify_task_completed',
      'part_status': 'notify_part_status_change',
      'project_update': 'notify_project_updates',
      'comment': 'notify_new_comments'
    };

    const prefKey = notificationTypeMap[type];
    if (prefKey && prefs[prefKey] === false) {
      console.log(`User ${to} has disabled ${type} notifications`);
      return Response.json({ success: true, skipped: true, reason: 'User disabled this notification type' });
    }

    // Check email frequency - if digest, don't send instant emails
    if (prefs.email_frequency && prefs.email_frequency !== 'instant') {
      console.log(`User ${to} prefers ${prefs.email_frequency}, skipping instant email`);
      return Response.json({ success: true, skipped: true, reason: 'User prefers digest emails' });
    }

    // Get app settings for branding using service role
    let appConfig = {};
    try {
      const appSettings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
      appConfig = appSettings[0] || {};
    } catch (e) {
      console.log('Could not fetch app settings, using defaults:', e.message);
    }

    // Get integration settings for email configuration
    let integrationConfig = {};
    try {
      const integrationSettings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
      integrationConfig = integrationSettings[0] || {};
    } catch (e) {
      console.log('Could not fetch integration settings:', e.message);
    }

    const appName = appConfig.app_name || 'ProjectIT';
    const fromEmail = integrationConfig.resend_from_email || 'no-reply@projectit.gtools.io';
    const fromName = integrationConfig.resend_from_name || appName;

    // Build email body
    const emailBody = buildEmailHtml({
      appName,
      appLogo: appConfig.app_logo_url,
      type,
      title,
      message,
      projectName,
      fromUserName,
      link
    });

    // Send email via Base44's built-in SendEmail integration using service role
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: fromName,
      to: to,
      subject: `${appName}: ${title}`,
      body: emailBody
    });

    console.log(`Notification email sent to ${to}: ${title}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('Notification email error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

function buildEmailHtml({ appName, appLogo, type, title, message, projectName, fromUserName, link }) {
  const typeColors = {
    'mention': '#6366f1',
    'task_assigned': '#3b82f6',
    'task_due': '#f59e0b',
    'task_overdue': '#ef4444',
    'task_completed': '#10b981',
    'part_status': '#f97316',
    'project_update': '#8b5cf6',
    'comment': '#14b8a6'
  };

  const typeLabels = {
    'mention': 'Mention',
    'task_assigned': 'Task Assigned',
    'task_due': 'Due Soon',
    'task_overdue': 'Overdue',
    'task_completed': 'Completed',
    'part_status': 'Part Update',
    'project_update': 'Project Update',
    'comment': 'New Comment'
  };

  const color = typeColors[type] || '#6366f1';
  const label = typeLabels[type] || 'Notification';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              ${appLogo ? `<img src="${appLogo}" alt="${appName}" style="height: 40px; margin-bottom: 16px;">` : `<h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700;">${appName}</h1>`}
              <span style="display: inline-block; padding: 4px 12px; background-color: ${color}20; color: ${color}; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 600;">${title}</h2>
              
              ${projectName ? `<p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">Project: <strong style="color: #334155;">${projectName}</strong></p>` : ''}
              
              ${fromUserName ? `<p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">From: <strong style="color: #334155;">${fromUserName}</strong></p>` : ''}
              
              <div style="padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${color};">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">${message || ''}</p>
              </div>
              
              ${link ? `
              <div style="margin-top: 24px; text-align: center;">
                <a href="${link}" style="display: inline-block; padding: 12px 32px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Details</a>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                You received this because you have notifications enabled for ${appName}.<br>
                <a href="#" style="color: #64748b;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}