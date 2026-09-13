import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { gamesRouter } from './routes/games.js';
import { planRouter } from './routes/plan.js';
import { careCircleRouter } from './routes/careCircle.js';
import { notificationsRouter } from './routes/notifications.js';
import { syncRouter } from './routes/sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Smriti Platform Backend',
    region: 'North Eastern Region (NER), India',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api', gamesRouter);
app.use('/api', planRouter);
app.use('/api', careCircleRouter);
app.use('/api', notificationsRouter);
app.use('/api', syncRouter);

// Error Handling Fallback
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err?.message || 'An unexpected error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Smriti Backend server running at http://localhost:${PORT}`);
  console.log(`📡 Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`🔄 Offline-First Sync: http://localhost:${PORT}/api/sync`);
});

export default app;
