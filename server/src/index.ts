import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { getDatabase } from './db/database.js';
import { wordsRouter } from './routes/words.js';
import { settingsRouter } from './routes/settings.js';
import { aiRouter } from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Initialize SQLite database
getDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'quasselstrippe',
    time: new Date().toISOString(),
    database: 'sqlite',
  });
});

// API Routes
app.use('/api/words', wordsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);

// Resolve client dist path for static serving
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

  // SPA fallback for all other non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Quasselstrippe server listening on http://0.0.0.0:${PORT}`);
});
