import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/api.ts';
import { getDatabase } from './server/db.ts';

process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Dev server address in use warning: ${err.message}`);
  } else {
    console.warn('Dev server caught uncaughtException:', err?.message || err);
  }
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('Dev server caught unhandledRejection:', reason?.message || reason);
});

function parseArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  const prefix = `${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  if (match) {
    return match.slice(prefix.length);
  }
  return undefined;
}

async function startServer() {
  const app = express();
  const cliPort = parseArg('--port') || parseArg('-p');
  const cliHost = parseArg('--host') || parseArg('-h');

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start';

  // In development, the AI Studio dev server runs on port 3000 unless explicitly overridden via CLI.
  // In production, fallback to process.env.PORT || 3000.
  const PORT = cliPort
    ? Number(cliPort)
    : !isProduction
      ? 3000
      : Number(process.env.PORT || process.env.APP_PORT || process.env.DEFAULT_APP_PORT || 3000);

  const HOST = cliHost || '0.0.0.0';
  const distPath = path.join(process.cwd(), 'dist');

  // Static serving for public folder and canonical user uploads
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/fonts', express.static(path.join(process.cwd(), 'public', 'fonts')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  }));
  app.use('/images/products', express.static(path.join(process.cwd(), 'public', 'uploads'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  }));
  app.use('/public/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  // Legacy /src/assets/images static fallback (without intercepting Vite ?import)
  app.use('/src/assets/images', (req, res, next) => {
    if (req.originalUrl.includes('?import') || req.query.import !== undefined) {
      return next();
    }
    express.static(path.join(process.cwd(), 'public', 'uploads'))(req, res, () => {
      express.static(path.join(process.cwd(), 'src', 'assets', 'images'))(req, res, next);
    });
  });
  
  // In production, ensure compiled assets are served first
  if (isProduction) {
    app.use(express.static(distPath, { index: false }));
    app.use('/assets', express.static(path.join(distPath, 'assets')));
  }
  
  // If an /uploads request is not found, return 404 instead of letting Vite or SPA fallback return index.html
  app.use('/uploads', (req, res) => {
    res.status(404).json({ error: 'Image not found in uploads' });
  });

  // Body parsing with 50mb limit for large high-res photos
  app.use(express.raw({ type: ['image/*', 'application/octet-stream'], limit: '50mb' }));
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
      server: {
        middlewareMode: true,
        hmr: false,
      },
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

  const server = app.listen(PORT, HOST, () => {
    console.log(`Lariel Essentials Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`Error: Port ${PORT} is already in use.`);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
