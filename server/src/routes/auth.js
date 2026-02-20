import { Router } from 'express';
import authService from '../services/authService.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// Admin-only: invite a new user (sends Supabase invite email)
router.post('/invite', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite users' });
    }

    const { email, full_name, role, avatar_color } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email and full name are required' });
    }

    const result = await authService.inviteUser(email, full_name, role, avatar_color, req.user.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin-only: resend invite email with a fresh activation link
router.post('/resend-invite', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can resend invites' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.resendInvite(email, req.user.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Send OTP verification code to invited user (via Resend, not Supabase email)
router.post('/send-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const result = await authService.sendOtpCode(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Verify OTP code and return auth token for session creation
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    const result = await authService.verifyOtpCode(email, code);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Accept invite — handle Supabase auth tokens from invite email redirect
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { access_token, refresh_token } = req.body;
    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: 'Access token and refresh token are required' });
    }

    const result = await authService.acceptInvite(access_token, refresh_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Login — proxy to Supabase Auth (frontend can also call Supabase directly)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.me(req.user.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Update current user profile
router.put('/update-me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.updateMe(req.user.userId, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Change password (requires authentication)
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await authService.changePassword(req.user.supabaseUserId, new_password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin-only: fully delete a user (Supabase Auth + users table + TeamMember)
router.delete('/users/:email', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    const result = await authService.deleteUser(req.params.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Logout is client-side (Supabase handles session), but provide endpoint for consistency
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
