import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import integrationRoutes from './routes/integrations.js';
import functionRoutes from './routes/functions/index.js';
import webhookRoutes from './routes/webhooks.js';
import authMiddleware from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import { runDueReminders } from './routes/functions/sendDueReminders.js';
// File uploads now go to Supabase Storage (no local UPLOAD_DIR needed)

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File uploads are served directly from Supabase Storage CDN

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/entities', authMiddleware, entityRoutes);
app.use('/api/integrations', authMiddleware, integrationRoutes);
app.use('/api/functions', functionRoutes); // Auth handled per-function inside router
app.use('/api/webhooks', webhookRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ProjectIT API server running on port ${PORT}`);

  // --- Overdue email reminder scheduler (every 4 hours) ---
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  // Run first check 60 seconds after startup (let DB connections settle)
  setTimeout(async () => {
    try {
      console.log('[Scheduler] Running initial due reminder check...');
      const result = await runDueReminders();
      console.log('[Scheduler] Initial check complete:', result);
    } catch (err) {
      console.error('[Scheduler] Initial due reminder check failed:', err.message);
    }
  }, 60000);

  // Then run every 4 hours
  setInterval(async () => {
    try {
      console.log('[Scheduler] Running scheduled due reminder check...');
      const result = await runDueReminders();
      console.log('[Scheduler] Scheduled check complete:', result);
    } catch (err) {
      console.error('[Scheduler] Scheduled due reminder check failed:', err.message);
    }
  }, FOUR_HOURS_MS);

  console.log('[Scheduler] Due reminder checks scheduled every 4 hours');
});
