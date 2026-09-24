import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { getDatabase, checkDatabaseHealth, closeDatabase } from './db/database.js';
import { wordsRouter } from './routes/words.js';
import { settingsRouter } from './routes/settings.js';
import { aiRouter } from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
let isShuttingDown = false;

// Initialize SQLite database
getDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Kubernetes & Docker Health & Readiness Endpoints ---

// Liveness probe: confirms the Node.js process and event loop are alive
const livenessHandler = (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'quasselstrippe-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
    },
  });
};

app.get('/healthz', livenessHandler);
app.get('/health', livenessHandler);
app.get('/api/healthz', livenessHandler);
app.get('/api/health', livenessHandler);

// Readiness probe: confirms database is reachable and server is not draining
const readinessHandler = (_req: express.Request, res: express.Response) => {
  if (isShuttingDown) {
    res.status(503).json({
      status: 'not_ready',
      reason: 'Server is terminating (SIGTERM/SIGINT received)',
      checks: { database: 'unknown', shuttingDown: true },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const isDbHealthy = checkDatabaseHealth();
  if (!isDbHealthy) {
    res.status(503).json({
      status: 'not_ready',
      reason: 'Database connectivity check failed',
      checks: { database: 'error', shuttingDown: false },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    service: 'quasselstrippe-backend',
    checks: {
      database: 'connected',
      shuttingDown: false,
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

app.get('/readyz', readinessHandler);
app.get('/ready', readinessHandler);
app.get('/api/readyz', readinessHandler);
app.get('/api/ready', readinessHandler);

// Operator info endpoint
app.get('/api/info', (_req, res) => {
  res.json({
    app: 'quasselstrippe-backend',
    version: '1.0.0',
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
  });
});

// API Routes
app.use('/api/words', wordsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);

// Resolve client dist path for static serving (when running single-container or local preview)
const potentialDistPaths = [
  process.env.CLIENT_DIST_PATH,
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), '../dist'),
].filter(Boolean) as string[];

let resolvedDistPath: string | null = null;
for (const p of potentialDistPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    resolvedDistPath = p;
    break;
  }
}

if (resolvedDistPath) {
  console.log(`[Server] Serving static client build from: ${resolvedDistPath}`);
  app.use(express.static(resolvedDistPath));

  // SPA fallback for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/ready')) {
      return next();
    }
    res.sendFile(path.join(resolvedDistPath!, 'index.html'));
  });
} else {
  console.log('[Server] Running in API-only mode (no static client build detected).');
}

// 404 for unmatched API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Quasselstrippe server listening on http://0.0.0.0:${PORT}`);
});

function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('[Server] Error during HTTP server close:', err);
      process.exit(1);
    }
    console.log('[Server] HTTP connections closed.');

    // Close SQLite database cleanly
    closeDatabase();
    console.log('[Server] Graceful shutdown completed.');
    process.exit(0);
  });

  // Force shutdown after timeout in case active sockets remain stalled
  const forceTimeout = setTimeout(() => {
    console.error('[Server] Forceful shutdown initiated after timeout.');
    closeDatabase();
    process.exit(1);
  }, 10000);
  forceTimeout.unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

