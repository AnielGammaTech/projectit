import pool from '../config/database.js';
import supabase from '../config/supabase.js';
import entityService from './entityService.js';
import emailService from './emailService.js';

// In-memory OTP store (codes expire after 10 minutes)
const otpStore = new Map(); // email → { code, expiresAt }

const authService = {
  /**
   * Generate and send a 6-digit OTP code via Resend (not Supabase).
   * This avoids email scanners consuming one-time links.
   */
  async sendOtpCode(email) {
    const lowerEmail = email.toLowerCase();

    // Verify user exists
    const { rows } = await pool.query(
      'SELECT id, full_name FROM users WHERE email = $1',
      [lowerEmail]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('No account found with this email'), { status: 404 });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(lowerEmail, { code, expiresAt });

    // Clean up expired codes periodically
    for (const [key, val] of otpStore) {
      if (val.expiresAt < Date.now()) otpStore.delete(key);
    }

    const firstName = rows[0].full_name?.split(' ')[0] || 'there';

    // Send code via Resend
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0F2F44 0%, #133F5C 50%, #0069AF 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ProjectIT</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #0F2F44; font-size: 16px; font-weight: 600; margin: 0 0 12px;">Hi ${firstName}!</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Here's your verification code to activate your ProjectIT account:
          </p>
          <div style="background: #f8fafc; border: 2px dashed #0069AF; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #0F2F44; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
            This code expires in 10 minutes. If you didn't request this, ignore this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">Sent by ProjectIT</p>
        </div>
      </div>
    `;

    await emailService.send({
      to: lowerEmail,
      subject: `${code} — Your ProjectIT verification code`,
      body: html,
      from_name: 'ProjectIT',
      from_email: process.env.RESEND_FROM_EMAIL || 'noreply@gamma.tech',
    });

    return { success: true, email: lowerEmail };
  },

  /**
   * Verify OTP code and return Supabase session tokens.
   * Signs in the user via Supabase admin API after code verification.
   */
  async verifyOtpCode(email, code) {
    const lowerEmail = email.toLowerCase();

    const stored = otpStore.get(lowerEmail);
    if (!stored) {
      throw Object.assign(new Error('No verification code found. Please request a new one.'), { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(lowerEmail);
      throw Object.assign(new Error('Code has expired. Please request a new one.'), { status: 400 });
    }

    if (stored.code !== code.trim()) {
      throw Object.assign(new Error('Invalid code. Please check and try again.'), { status: 400 });
    }

    // Code is valid — consume it
    otpStore.delete(lowerEmail);

    // Get the user's Supabase UID
    const { rows } = await pool.query(
      'SELECT supabase_uid FROM users WHERE email = $1',
      [lowerEmail]
    );
    if (rows.length === 0 || !rows[0].supabase_uid) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }

    // Generate a magic link for this user (server-side only, not emailed)
    // Then immediately verify it to create a session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: lowerEmail,
    });

    if (linkError) {
      throw Object.assign(new Error('Could not create session'), { status: 500 });
    }

    // Use the hashed_token to verify OTP server-side, creating a session
    // We return the token so the frontend can verify it client-side
    const hashedToken = linkData?.properties?.hashed_token;
    if (!hashedToken) {
      throw Object.assign(new Error('Could not generate auth token'), { status: 500 });
    }

    return { success: true, token: hashedToken, email: lowerEmail };
  },
  /**
   * Invite a user (admin-only).
   * Creates the user in Supabase Auth, our local users table, and TeamMember entity.
   * Supabase will send the invite email automatically.
   */
  async inviteUser(email, fullName, role, avatarColor, invitedBy) {
    const lowerEmail = email.toLowerCase();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Check if user already exists in our users table
    const { rows: existing } = await pool.query(
      'SELECT id, supabase_uid FROM users WHERE email = $1',
      [lowerEmail]
    );

    // If user exists in local DB but no TeamMember entity, they were previously deleted
    // Clean them up first so they can be re-invited
    if (existing.length > 0) {
      const { rows: teamMembers } = await pool.query(
        `SELECT id FROM "TeamMember" WHERE data->>'email' = $1`,
        [lowerEmail]
      );

      if (teamMembers.length > 0) {
        // User AND TeamMember both exist — genuinely duplicate
        throw Object.assign(new Error('User with this email already exists'), { status: 409 });
      }

      // TeamMember was deleted but user record remains — clean up for re-invite
      console.log(`Cleaning up orphaned user record for ${lowerEmail} (re-invite)`);
      if (existing[0].supabase_uid) {
        try {
          await supabase.auth.admin.deleteUser(existing[0].supabase_uid);
        } catch (e) {
          console.warn('Could not delete old Supabase auth user:', e.message);
        }
      }
      await pool.query('DELETE FROM users WHERE id = $1', [existing[0].id]);
    }

    // Create user in Supabase Auth directly (no Supabase invite email)
    // We use createUser with email_confirm:true so they can log in immediately
    // after setting their password via our own magic link
    const tempPassword = `TempInvite_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: lowerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role || 'member',
        avatar_color: avatarColor || 'bg-blue-500',
      },
    });

    if (authError) {
      console.error('Supabase create user error:', authError);
      throw Object.assign(new Error(authError.message), { status: 400 });
    }

    // Build a simple link to the accept-invite page (no token in URL).
    // Tokens in email links get consumed by security scanners (Inky, Mimecast, etc).
    // Instead, the AcceptInvite page will request a fresh OTP code when the user arrives.
    const frontendUrl = process.env.FRONTEND_URL || 'https://projectit.gtools.io';
    const inviteUrl = `${frontendUrl}/accept-invite?email=${encodeURIComponent(lowerEmail)}`;

    const userRole = role === 'Admin' ? 'admin' : 'member';

    // Create local user record
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_color, supabase_uid)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, avatar_color, created_date`,
      [lowerEmail, 'supabase-managed', fullName, userRole, avatarColor || 'bg-blue-500', authData.user?.id || null]
    );

    const user = rows[0];

    // Create TeamMember entity
    await entityService.create('TeamMember', {
      name: fullName,
      email: lowerEmail,
      role: role || '',
      avatar_color: avatarColor || 'bg-blue-500',
      user_id: user.id,
    }, invitedBy);

    // Send welcome email via Resend (not Supabase — avoids quarantine)
    try {
      await this.sendWelcomeEmail(lowerEmail, fullName, invitedBy, inviteUrl);
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr.message);
    }

    return { user, inviteToken: 'sent-via-resend' };
  },

  /**
   * Fully delete a user — removes from Supabase Auth, users table, and TeamMember entity.
   */
  async deleteUser(email) {
    const lowerEmail = email.toLowerCase();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Find the local user record
    const { rows: users } = await pool.query(
      'SELECT id, supabase_uid FROM users WHERE email = $1',
      [lowerEmail]
    );

    // Delete from Supabase Auth if we have a supabase_uid
    if (users.length > 0 && users[0].supabase_uid) {
      try {
        await supabase.auth.admin.deleteUser(users[0].supabase_uid);
      } catch (e) {
        console.warn('Could not delete Supabase auth user:', e.message);
      }
    }

    // Delete from local users table
    if (users.length > 0) {
      await pool.query('DELETE FROM users WHERE id = $1', [users[0].id]);
    }

    // Delete TeamMember entity
    const { rows: teamMembers } = await pool.query(
      `SELECT id FROM "TeamMember" WHERE data->>'email' = $1`,
      [lowerEmail]
    );
    for (const tm of teamMembers) {
      await pool.query('DELETE FROM "TeamMember" WHERE id = $1', [tm.id]);
    }

    return { success: true, deleted: lowerEmail };
  },

  /**
   * Resend invite — generates a new recovery token and sends a fresh welcome email.
   * Does NOT delete or recreate the user — just sends a new activation link.
   */
  async resendInvite(email, requestedBy) {
    const lowerEmail = email.toLowerCase();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Verify the user exists in our DB
    const { rows: users } = await pool.query(
      'SELECT id, full_name, supabase_uid FROM users WHERE email = $1',
      [lowerEmail]
    );
    if (users.length === 0) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }

    const user = users[0];

    // Build simple link — no token (immune to email security scanners)
    const frontendUrl = process.env.FRONTEND_URL || 'https://projectit.gtools.io';
    const inviteUrl = `${frontendUrl}/accept-invite?email=${encodeURIComponent(lowerEmail)}`;

    // Send the welcome email again
    await this.sendWelcomeEmail(lowerEmail, user.full_name, requestedBy, inviteUrl);

    return { success: true, email: lowerEmail };
  },

  /**
   * Send a branded welcome email to a newly invited user.
   */
  async sendWelcomeEmail(email, fullName, invitedByEmail, inviteUrl) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://projectit.gtools.io';
    const firstName = fullName.split(' ')[0];
    const activateUrl = inviteUrl || `${frontendUrl}/accept-invite`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0F2F44 0%, #133F5C 50%, #0069AF 100%); padding: 40px 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to ProjectIT</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 15px;">Your project management workspace is ready</p>
        </div>

        <!-- Body -->
        <div style="background: #ffffff; padding: 40px 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="color: #0F2F44; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Hi ${firstName}! 👋</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            You've been invited to join your team on <strong style="color: #0F2F44;">ProjectIT</strong>${invitedByEmail ? ` by <strong style="color: #0069AF;">${invitedByEmail}</strong>` : ''}.
            ProjectIT helps your team manage projects, track tasks, and collaborate seamlessly.
          </p>

          <!-- What you can do -->
          <div style="background: #f0f7ff; border-radius: 10px; padding: 24px; margin: 0 0 28px;">
            <p style="color: #0F2F44; font-weight: 600; font-size: 14px; margin: 0 0 16px;">Here's what you can do:</p>
            <table style="width: 100%;" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 6px 0; color: #334155; font-size: 14px;">📋 View and manage your assigned tasks</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-size: 14px;">💬 Collaborate with your team on projects</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-size: 14px;">⏱️ Track time and log your work</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-size: 14px;">📁 Share files and documents</td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 0 0 28px;">
            <a href="${activateUrl}" style="display: inline-block; background: linear-gradient(135deg, #0069AF, #0080D4); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0,105,175,0.3);">
              Activate Your Account
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
            Click the button above to set your password and get started.<br/>
            This link expires in 24 hours.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 24px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 4px;">Sent by <strong>ProjectIT</strong></p>
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">You received this email because an admin added you to the team.</p>
        </div>
      </div>
    `;

    return emailService.send({
      to: email,
      subject: `You're invited to ProjectIT — Activate your account`,
      body: html,
      from_name: 'ProjectIT',
      from_email: process.env.RESEND_FROM_EMAIL || 'noreply@gamma.tech',
    });
  },

  /**
   * Accept invite — user sets their password via Supabase Auth.
   * The frontend handles the Supabase auth flow directly.
   * This endpoint is kept for backward compatibility.
   */
  async acceptInvite(accessToken, refreshToken) {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Set the session using the tokens from the invite email redirect
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw Object.assign(new Error('Invalid or expired invite link'), { status: 400 });
    }

    return {
      token: data.session.access_token,
      user: {
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
      },
    };
  },

  /**
   * Login — delegates to Supabase Auth.
   * The frontend calls supabase.auth.signInWithPassword() directly,
   * but this server endpoint is provided as a proxy.
   */
  async login(email, password) {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    // Fetch app user data
    const appUser = await this.me(null, data.user.email);

    return {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: appUser,
    };
  },

  /**
   * Get current user profile from app's users table.
   */
  async me(userId, email) {
    let query, params;
    if (userId) {
      query = `SELECT id, email, full_name, role, avatar_url, avatar_color, theme, show_dashboard_widgets, created_date, updated_date
               FROM users WHERE id = $1`;
      params = [userId];
    } else if (email) {
      query = `SELECT id, email, full_name, role, avatar_url, avatar_color, theme, show_dashboard_widgets, created_date, updated_date
               FROM users WHERE email = $1`;
      params = [email];
    } else {
      throw Object.assign(new Error('User ID or email required'), { status: 400 });
    }

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }
    return rows[0];
  },

  /**
   * Update current user profile.
   */
  async updateMe(userId, data) {
    const allowedFields = ['full_name', 'avatar_url', 'avatar_color', 'theme', 'show_dashboard_widgets'];
    const updates = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    if (updates.length === 0) {
      return this.me(userId);
    }

    values.push(userId);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_date = NOW() WHERE id = $${paramIdx}
       RETURNING id, email, full_name, role, avatar_url, avatar_color, theme, show_dashboard_widgets, created_date, updated_date`,
      values
    );
    const user = rows[0];

    // Sync avatar_url and avatar_color to the matching TeamMember entity
    if (user && (data.avatar_url !== undefined || data.avatar_color !== undefined)) {
      try {
        const { rows: members } = await pool.query(
          `SELECT id FROM "TeamMember" WHERE data->>'email' = $1`,
          [user.email]
        );
        if (members.length > 0) {
          const patch = {};
          if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
          if (data.avatar_color !== undefined) patch.avatar_color = data.avatar_color;
          if (data.full_name !== undefined) patch.name = data.full_name;
          await pool.query(
            `UPDATE "TeamMember" SET data = data || $1::jsonb, updated_date = NOW() WHERE id = $2::uuid`,
            [JSON.stringify(patch), members[0].id]
          );
        }
      } catch (err) {
        console.error('Failed to sync avatar to TeamMember:', err.message);
      }
    }

    // Sync to Supabase user_metadata if available
    if (supabase && user) {
      try {
        const { rows: uidRows } = await pool.query(
          'SELECT supabase_uid FROM users WHERE id = $1',
          [userId]
        );
        if (uidRows[0]?.supabase_uid) {
          await supabase.auth.admin.updateUserById(uidRows[0].supabase_uid, {
            user_metadata: {
              full_name: user.full_name,
              avatar_url: user.avatar_url,
              avatar_color: user.avatar_color,
            },
          });
        }
      } catch (err) {
        console.error('Failed to sync to Supabase user_metadata:', err.message);
      }
    }

    return user;
  },

  /**
   * Change password — delegates to Supabase Auth.
   */
  async changePassword(supabaseUserId, newPassword) {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { error } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      password: newPassword,
    });

    if (error) {
      throw Object.assign(new Error(error.message), { status: 400 });
    }

    return { success: true };
  },

  /**
   * Admin-only: reset another user's password by email.
   */
  async adminResetPassword(email, newPassword) {
    const lowerEmail = email.toLowerCase();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { rows } = await pool.query(
      'SELECT supabase_uid FROM users WHERE email = $1',
      [lowerEmail]
    );

    if (rows.length === 0 || !rows[0].supabase_uid) {
      throw Object.assign(new Error('User not found or has no Supabase account'), { status: 404 });
    }

    const { error } = await supabase.auth.admin.updateUserById(rows[0].supabase_uid, {
      password: newPassword,
    });

    if (error) {
      throw Object.assign(new Error(error.message), { status: 400 });
    }

    return { success: true };
  },
};

export default authService;
