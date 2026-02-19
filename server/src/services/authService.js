import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import entityService from './entityService.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
}
const JWT_EXPIRES_IN = '30d';

const authService = {
  // Invite a user (admin-only). Creates user row + TeamMember entity.
  // Returns an invite token the user can use to set their password.
  async inviteUser(email, fullName, role, avatarColor, invitedBy) {
    const lowerEmail = email.toLowerCase();

    // Check if user already exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [lowerEmail]
    );
    if (existing.length > 0) {
      throw Object.assign(new Error('User with this email already exists'), { status: 409 });
    }

    // Create invite token (valid 7 days)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Placeholder password hash — user must accept invite to set real password
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 4);

    const userRole = role === 'Admin' ? 'admin' : 'member';

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_color, invite_token, invite_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, full_name, role, avatar_color, created_date`,
      [lowerEmail, placeholderHash, fullName, userRole, avatarColor || 'bg-blue-500', inviteToken, inviteExpiry]
    );

    const user = rows[0];

    // Also create a TeamMember entity so they appear in the admin panel
    await entityService.create('TeamMember', {
      name: fullName,
      email: lowerEmail,
      role: role || '',
      avatar_color: avatarColor || 'bg-blue-500',
      user_id: user.id,
    }, invitedBy);

    return { user, inviteToken };
  },

  // Accept invite — user sets their password
  async acceptInvite(inviteToken, password) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE invite_token = $1 AND invite_expires > NOW()`,
      [inviteToken]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('Invalid or expired invite link'), { status: 400 });
    }

    const user = rows[0];
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `UPDATE users SET password_hash = $1, invite_token = NULL, invite_expires = NULL, updated_date = NOW() WHERE id = $2`,
      [passwordHash, user.id]
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password_hash, invite_token, invite_expires, ...safeUser } = user;
    return { token, user: safeUser };
  },

  async login(email, password) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password_hash, ...safeUser } = user;
    return { token, user: safeUser };
  },

  async me(userId) {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, role, avatar_url, avatar_color, theme, show_dashboard_widgets, created_date, updated_date
       FROM users WHERE id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }
    return rows[0];
  },

  async updateMe(userId, data) {
    // Only allow updating safe fields
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

    return user;
  },

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },
};

export default authService;
