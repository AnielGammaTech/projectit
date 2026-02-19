import { createClient } from '@supabase/supabase-js';
import pool from '../config/database.js';

// Create a lightweight Supabase client for token verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAuth = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  if (!supabaseAuth) {
    return res.status(500).json({ error: 'Auth service not configured' });
  }

  try {
    // Verify the Supabase JWT and get the user
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Look up the app-level user record for role and other app data
    const { rows } = await pool.query(
      `SELECT id, email, full_name, role, avatar_url, avatar_color, theme, show_dashboard_widgets
       FROM users WHERE email = $1`,
      [user.email]
    );

    if (rows.length === 0) {
      // User exists in Supabase Auth but not in our users table
      return res.status(403).json({ error: 'User not registered in application' });
    }

    const appUser = rows[0];
    req.user = {
      userId: appUser.id,
      email: appUser.email,
      role: appUser.role || 'member',
      fullName: appUser.full_name,
      supabaseUserId: user.id,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Optional auth — sets req.user if token present, but doesn't block
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && supabaseAuth) {
    try {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

      if (!error && user) {
        const { rows } = await pool.query(
          'SELECT id, email, role, full_name FROM users WHERE email = $1',
          [user.email]
        );
        if (rows.length > 0) {
          req.user = {
            userId: rows[0].id,
            email: rows[0].email,
            role: rows[0].role || 'member',
            fullName: rows[0].full_name,
            supabaseUserId: user.id,
          };
        }
      }
    } catch {
      // Token invalid, continue without user
    }
  }
  next();
}
