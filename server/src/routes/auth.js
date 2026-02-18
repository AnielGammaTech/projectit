import { Router } from 'express';
import authService from '../services/authService.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// Admin-only: invite a new user
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

// Accept invite — set password via invite token
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { invite_token, password } = req.body;
    if (!invite_token || !password) {
      return res.status(400).json({ error: 'Invite token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await authService.acceptInvite(invite_token, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

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

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.me(req.user.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/update-me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.updateMe(req.user.userId, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Logout is client-side (clear token), but provide an endpoint for consistency
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
