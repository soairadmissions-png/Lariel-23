import express from 'express';
import apiRouter from './api.ts';

const app = express();

// Body parsing with 50mb limit for binary images and json
app.use(express.raw({ type: ['image/*', 'application/octet-stream'], limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health checks
app.get(['/api/health', '/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', platform: 'vercel', time: new Date().toISOString() });
});

// Mount API router under /api and root to handle any rewrite variations
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Vercel server error:', err);
  res.setHeader('Content-Type', 'application/json');
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  if (status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Image is too large' });
  }
  return res.status(status).json({ error: err?.message || 'Internal server error' });
});

export default app;
