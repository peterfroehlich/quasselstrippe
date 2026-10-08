import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response, type RequestHandler } from 'express';

export function createAuth(password: string) {
  if (!password || password === 'CHANGE_ME') throw new Error('Configure APP_PASSWORD before starting the server');
  const salt = randomBytes(32);
  const passwordHash = scryptSync(password, salt, 32);
  const secret = randomBytes(32);
  const cookieName = 'quasselstrippe_session';
  const maxAge = 7 * 86400000;
  const attempts = new Map<string, { count: number; until: number }>();
  const revoked = new Map<string, number>();
  const tokenFor = (req: Request) => req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const sign = (value: string) => createHmac('sha256', secret).update(value).digest('base64url');
  const authenticated = (req: Request) => {
    const token = tokenFor(req);
    for (const [key, expiry] of revoked) if (expiry <= Date.now()) revoked.delete(key);
    if (!token || revoked.has(token)) return false;
    const [expires, nonce, signature] = token.split('.');
    if (!expires || !nonce || !signature || !Number.isFinite(Number(expires)) || Number(expires) <= Date.now()) return false;
    const expected = Buffer.from(sign(`${expires}.${nonce}`));
    const actual = Buffer.from(signature);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  };
  const sameOrigin: RequestHandler = (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) return void res.status(403).json({ error: 'Invalid request origin' }); }
      catch { return void res.status(403).json({ error: 'Invalid request origin' }); }
    }
    next();
  };
  const requireAuth: RequestHandler = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!authenticated(req)) return void res.status(401).json({ error: 'Bitte melde dich an.' });
    next();
  };
  const router = Router();
  router.use(sameOrigin);
  router.get('/session', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ authenticated: authenticated(req) }); });
  router.post('/login', (req, res) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip || 'unknown';
    const entry = attempts.get(key) || { count: 0, until: now + 600000 };
    if (entry.count >= 10) return void res.status(429).json({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' });
    entry.count++; attempts.set(key, entry);
    const supplied = req.body?.password;
    if (typeof supplied !== 'string' || supplied.length > 1024 || !timingSafeEqual(scryptSync(supplied, salt, 32), passwordHash)) {
      return void res.status(401).json({ error: 'Das Passwort ist falsch.' });
    }
    attempts.delete(key);
    const value = `${now + maxAge}.${randomBytes(24).toString('base64url')}`;
    res.cookie(cookieName, `${value}.${sign(value)}`, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true' || req.secure, maxAge, path: '/api' });
    res.json({ authenticated: true });
  });
  router.post('/logout', (req, res: Response) => {
    const token = tokenFor(req);
    if (token && authenticated(req)) revoked.set(token, Number(token.split('.')[0]));
    res.clearCookie(cookieName, { path: '/api' });
    res.json({ authenticated: false });
  });
  return { router, requireAuth, sameOrigin };
}
