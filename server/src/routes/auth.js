import { Router } from 'express';
import authService from '../services/authService.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.register(email, password, full_name);
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
