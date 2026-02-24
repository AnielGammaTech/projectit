import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';
import pool from '../../config/database.js';

export default async function handler(req, res) {
  try {
    console.log('Starting MFA reminder check...');

    // Get all UserSecuritySettings that have a deadline and MFA not enabled
    const allSettings = await entityService.list('UserSecuritySettings');
    const pendingUsers = allSettings.filter(s =>
      s.mfa_enforcement_deadline &&
      !s.two_factor_enabled
    );

    console.log(`Found ${pendingUsers.length} users with pending MFA setup`);

    const now = new Date();
    let remindersSent = 0;

    for (const settings of pendingUsers) {
      const deadline = new Date(settings.mfa_enforcement_deadline);
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      // Send reminders at 2 days and 1 day before deadline
      if (daysLeft !== 2 && daysLeft !== 1) continue;

      // Get user details
      const { rows } = await pool.query(
        'SELECT full_name, email FROM users WHERE email = $1',
        [settings.user_email]
      );
      if (rows.length === 0) continue;

      const user = rows[0];
      const firstName = (user.full_name || '').split(' ')[0] || 'there';
      const frontendUrl = process.env.FRONTEND_URL || 'https://projectit.gtools.io';
      const securityUrl = `${frontendUrl}/SecuritySettings`;

      // Check if we already sent a reminder for this day (idempotency)
      const reminderKey = `mfa_reminder_${daysLeft}d`;
      if (settings[reminderKey]) continue;

      const urgencyText = daysLeft === 1 ? 'tomorrow' : 'in 2 days';
      const urgencyColor = daysLeft === 1 ? '#ef4444' : '#f59e0b';

      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #0F2F44 0%, #133F5C 50%, #0069AF 100%); padding: 40px 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Set Up Two-Factor Authentication</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your deadline is ${urgencyText}</p>
          </div>

          <div style="background: #ffffff; padding: 40px 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <p style="color: #0F2F44; font-size: 16px; font-weight: 600; margin: 0 0 16px;">Hi ${firstName},</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
              This is a reminder that you need to set up two-factor authentication on your <strong>ProjectIT</strong> account.
              Your deadline is <strong style="color: ${urgencyColor};">${urgencyText}</strong>.
            </p>

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 20px; margin: 0 0 28px;">
              <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">What happens after the deadline?</p>
              <p style="color: #a16207; font-size: 13px; line-height: 1.6; margin: 0;">
                You will be unable to access ProjectIT until 2FA is configured. Setting it up takes less than 2 minutes.
              </p>
            </div>

            <div style="text-align: center; margin: 0 0 28px;">
              <a href="${securityUrl}" style="display: inline-block; background: linear-gradient(135deg, #0069AF, #0080D4); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0,105,175,0.3);">
                Set Up 2FA Now
              </a>
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 24px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Sent by <strong>ProjectIT</strong></p>
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">This is an automated security reminder.</p>
          </div>
        </div>
      `;

      await emailService.send({
        to: settings.user_email,
        subject: daysLeft === 1
          ? 'Action required: Set up 2FA by tomorrow'
          : 'Reminder: Set up 2FA within 2 days',
        body: html,
        from_name: 'ProjectIT Security',
        from_email: process.env.RESEND_FROM_EMAIL || 'noreply@gamma.tech',
      });

      // Mark this reminder as sent (idempotency)
      await entityService.update('UserSecuritySettings', settings.id, {
        [reminderKey]: new Date().toISOString(),
      });

      remindersSent++;
      console.log(`Sent MFA reminder to ${settings.user_email} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining)`);
    }

    console.log(`Sent ${remindersSent} MFA reminder emails`);
    return res.json({
      success: true,
      remindersSent,
      usersChecked: pendingUsers.length,
    });
  } catch (error) {
    console.error('MFA reminder error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
