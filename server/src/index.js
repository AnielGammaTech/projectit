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
import { optionalAuth } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
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
app.use('/api/functions', optionalAuth, functionRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ProjectIT API server running on port ${PORT}`);
});
