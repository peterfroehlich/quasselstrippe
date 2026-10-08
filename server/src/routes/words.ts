import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { getDatabase, transaction, getAllWords, getWordById, getProfileById, insertWord, insertWords, updateWord,
  deleteWord, deleteWordsByLesson, recordReview, resetReviewProgress, resetToDefaults } from '../db/database.js';
import { validateWord } from '../validation.js';

export const wordsRouter = Router();
const param = (v: unknown) => typeof v === 'string' ? v : undefined;
const profile = (req: Request) => {
  const id = param(req.query.profileId) || param(req.body?.profileId);
  if (!id || !getProfileById(id)) throw new Error('A valid profileId is required');
  return id;
};
const language = (v: unknown) => {
  if (v === undefined) return undefined;
  if (v !== 'en' && v !== 'la') throw new Error('Invalid language');
  return v;
};
const handle = (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const operationId = req.get('X-Operation-Id');
    if (!operationId || req.method === 'GET') { fn(req, res); return; }
    if (operationId.length > 128) throw new Error('Invalid operation ID');
    const fingerprint = createHash('sha256').update(req.method + req.originalUrl + JSON.stringify(req.body)).digest('hex');
    const result = transaction(() => {
      const db = getDatabase();
      const previous = db.prepare('SELECT fingerprint, response FROM operation_receipts WHERE id = ?').get(operationId);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new Error('Operation ID conflict');
        return JSON.parse(String(previous.response)) as { status: number; body: unknown };
      }
      const response = { status: 200, body: undefined as unknown };
      const capture = { status(code: number) { response.status = code; return capture; }, json(body: unknown) { response.body = body; return capture; } };
      fn(req, capture as unknown as Response);
      if (response.status < 400) db.prepare('INSERT INTO operation_receipts (id, fingerprint, response) VALUES (?, ?, ?)').run(operationId, fingerprint, JSON.stringify(response));
      return response;
    });
    res.status(result.status).json(result.body);
  } catch (error) { next(error); }
};
wordsRouter.get('/', handle((req, res) => {
  const p = param(req.query.profileId);
  if (p && !getProfileById(p)) return res.status(404).json({ error: 'Profile not found' });
  res.json(getAllWords(language(req.query.language), p));
}));
wordsRouter.post('/reset-progress', handle((req, res) => {
  res.json({ words: resetReviewProgress(profile(req)) });
}));
wordsRouter.post('/reset-defaults', handle((_req, res) => res.json({ words: resetToDefaults() })));
wordsRouter.post('/batch', handle((req, res) => {
  if (!Array.isArray(req.body?.words) || req.body.words.length > 10000) throw new Error('A words array of at most 10000 items is required');
  const words = insertWords(req.body.words);
  res.status(201).json({ count: words.length, words });
}));
const deleteLesson = handle((req, res) => {
  const source = req.method === 'DELETE' ? req.query : req.body;
  const lesson = param(source?.lesson);
  if (!lesson?.trim()) throw new Error('lesson is required');
  const scope = source.profileId === 'shared' ? null : profile(req);
  const deletedCount = deleteWordsByLesson(lesson, language(source.language), scope);
  res.json({ success: true, deletedCount });
});
wordsRouter.post('/delete-lesson', deleteLesson);
wordsRouter.delete('/by-lesson', deleteLesson);
wordsRouter.get('/:id', handle((req, res) => {
  const word = getWordById(String(req.params.id), param(req.query.profileId));
  res.status(word ? 200 : 404).json(word || { error: 'Word not found' });
}));
wordsRouter.post('/', handle((req, res) => res.status(201).json(insertWord(validateWord(req.body)))));
wordsRouter.put('/:id', handle((req, res) => {
  const id = String(req.params.id);
  const existing = getWordById(id, profile(req));
  if (!existing) return res.status(404).json({ error: 'Word not found' });
  const word = validateWord({ ...existing, ...req.body, id, box: existing.box,
    correctCount: existing.correctCount, incorrectCount: existing.incorrectCount, lastReviewedAt: existing.lastReviewedAt });
  res.json(updateWord(word));
}));
wordsRouter.delete('/:id', handle((req, res) => {
  const success = deleteWord(String(req.params.id), profile(req));
  res.status(success ? 200 : 404).json(success ? { success } : { error: 'Word not found' });
}));
wordsRouter.post('/:id/review', handle((req, res) => {
  const { wasCorrect, eventId = randomUUID(), reviewedAt = Date.now(), promote = true } = req.body || {};
  if (typeof wasCorrect !== 'boolean' || typeof promote !== 'boolean') throw new Error('Invalid review result');
  if (typeof eventId !== 'string' || !eventId || eventId.length > 128) throw new Error('Invalid review ID');
  if (!Number.isSafeInteger(reviewedAt) || reviewedAt < 0 || reviewedAt > Date.now() + 300000) throw new Error('Invalid review date');
  const word = recordReview(String(req.params.id), wasCorrect, profile(req), eventId, reviewedAt, promote);
  res.status(word ? 200 : 404).json(word || { error: 'Word not found' });
}));
wordsRouter.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: error.message });
});
