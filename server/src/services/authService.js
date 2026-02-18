import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = '30d';

const authService = {
  async register(email, password, fullName) {
    // Check if user already exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      throw Object.assign(new Error('User already exists'), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3) RETURNING id, email, full_name, role, avatar_url, avatar_color, theme, show_dashboard_widgets, created_date`,
      [email.toLowerCase(), passwordHash, fullName]
    );

    const user = rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return { token, user };
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
    return rows[0];
  },

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },
};

export default authService;
