import pool from '../config/database.js';
import supabase from '../config/supabase.js';
import entityService from './entityService.js';

const authService = {
  /**
   * Invite a user (admin-only).
   * Creates the user in Supabase Auth, our local users table, and TeamMember entity.
   * Supabase will send the invite email automatically.
   */
  async inviteUser(email, fullName, role, avatarColor, invitedBy) {
    const lowerEmail = email.toLowerCase();

    // Check if user already exists in our users table
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [lowerEmail]
    );
    if (existing.length > 0) {
      throw Object.assign(new Error('User with this email already exists'), { status: 409 });
    }

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Create user in Supabase Auth via invite
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      lowerEmail,
      {
        data: {
          full_name: fullName,
          role: role || 'member',
          avatar_color: avatarColor || 'bg-blue-500',
        },
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite`,
      }
    );

    if (authError) {
      console.error('Supabase invite error:', authError);
      throw Object.assign(new Error(authError.message), { status: 400 });
    }

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

    return { user, inviteToken: 'sent-via-supabase-email' };
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
};

export default authService;
