import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/api.ts';
import { getDatabase } from './server/db.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || process.env.APP_PORT || process.env.DEFAULT_APP_PORT || 3000);
  const distPath = path.join(process.cwd(), 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    (fs.existsSync(path.join(distPath, 'index.html')) && process.env.npm_lifecycle_event !== 'dev');

  // Static serving for public folder and user uploads
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/fonts', express.static(path.join(process.cwd(), 'public', 'fonts')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'src', 'assets', 'images')));
  app.use('/uploads', express.static(path.join(distPath, 'uploads')));
  app.use('/public/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  app.use('/src/assets/images', express.static(path.join(process.cwd(), 'src', 'assets', 'images')));
  
  // In production, ensure compiled assets are served first
  if (isProduction) {
    app.use(express.static(distPath, { index: false }));
    app.use('/assets', express.static(path.join(distPath, 'assets')));
  } else {
    app.use('/assets', express.static(path.join(process.cwd(), 'src', 'assets')));
  }
  
  // If an /uploads request is not found, return 404 instead of letting Vite or SPA fallback return index.html
  app.use('/uploads', (req, res) => {
    res.status(404).json({ error: 'Image not found in uploads' });
  });

  // Body parsing with 50mb limit for large high-res photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Health checks for Cloud Run rollout and proxy validation
  app.get(['/health', '/api/health'], (_req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  });

  // Helper to generate bootstrap script from persistent data source safely
  const getBootstrapInjection = () => {
    try {
      const db = getDatabase();
      const payload = {
        products: db.products || [],
        categories: db.categories || [],
        settings: db.settings || null,
        timestamp: Date.now(),
      };
      const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
      return `<script id="__LARIEL_BOOTSTRAP_DATA__">try{const d=${safePayload};window.__LARIEL_INITIAL_PRODUCTS__=d.products;window.__LARIEL_INITIAL_CATEGORIES__=d.categories;window.__LARIEL_INITIAL_SETTINGS__=d.settings;}catch(e){console.error("Bootstrap data load error:",e);}</script>`;
    } catch (err) {
      console.error('Failed to read database for bootstrap injection:', err);
      return '';
    }
  };

  // Vite middleware for development vs static build in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      // Do not return HTML for missing static files (scripts, stylesheets, images, fonts, maps)
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send('Not found');
      }

      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const injection = getBootstrapInjection();
        if (injection) {
          template = template.replace('</head>', () => `${injection}\n</head>`);
        }
        res.status(200)
          .set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          })
          .end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const rootIndexPath = path.join(process.cwd(), 'index.html');
    app.use(express.static(distPath, { index: false }));
    app.use('/assets', express.static(path.join(distPath, 'assets')));
    app.get('*', (req, res) => {
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send('Not found');
      }

      const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : rootIndexPath;

      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8');
        const injection = getBootstrapInjection();
        if (injection) {
          html = html.replace('</head>', () => `${injection}\n</head>`);
        }
        res.status(200)
          .set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          })
          .end(html);
      } else {
        res.status(404).send('Not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lariel Essentials Server running on http://localhost:${PORT}`);
  });
}

startServer();
