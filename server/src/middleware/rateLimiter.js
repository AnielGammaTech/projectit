import rateLimit from 'express-rate-limit';

// Global rate limiter — 300 requests per IP per minute
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for costly external API calls (LLM, email, SMS)
// 20 requests per user per 15-minute window
export const costlyApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate limiter for file uploads
// 30 uploads per user per 15-minute window
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: { error: 'Too many uploads. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tight limiter for auth endpoints (login, OTP)
// 10 attempts per IP per 15-minute window
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General limiter for public/webhook endpoints
// 60 requests per IP per 15-minute window
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
