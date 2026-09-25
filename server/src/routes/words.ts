import { Router, Request, Response } from 'express';
import {
  getAllWords,
  getWordById,
  insertWord,
  insertWords,
  updateWord,
  deleteWord,
  deleteWordsByLesson,
  recordReview,
  resetReviewProgress,
  resetToDefaults,
} from '../db/database.js';
import type { WordItem } from '../types.js';

export const wordsRouter = Router();

// GET /api/words - List all words (optional filter by language and profileId)
wordsRouter.get('/', (req: Request, res: Response) => {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    const profileId = typeof req.query.profileId === 'string' ? req.query.profileId : undefined;
    const words = getAllWords(language, profileId);
    res.json(words);
  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

// POST /api/words/reset-progress - Reset Leitner review progress (optionally for a specific profile)
wordsRouter.post('/reset-progress', (req: Request, res: Response) => {
  try {
    const profileId =
      typeof req.body?.profileId === 'string'
        ? req.body.profileId
        : (typeof req.query.profileId === 'string' ? req.query.profileId : undefined);
    const words = resetReviewProgress(profileId);
    res.json({ message: 'Review progress reset successfully', words });
  } catch (error) {
    console.error('Error resetting progress:', error);
    res.status(500).json({ error: 'Failed to reset progress' });
  }
});

// POST /api/words/reset-defaults - Reset to seed default words
wordsRouter.post('/reset-defaults', (_req: Request, res: Response) => {
  try {
    const words = resetToDefaults();
    res.json({ message: 'Reset to initial defaults successfully', words });
  } catch (error) {
    console.error('Error resetting to defaults:', error);
    res.status(500).json({ error: 'Failed to reset to defaults' });
  }
});

// POST /api/words/batch - Batch insert/import words
wordsRouter.post('/batch', (req: Request, res: Response) => {
  try {
    const { words } = req.body;
    if (!Array.isArray(words)) {
      return res.status(400).json({ error: 'Body must contain a "words" array' });
    }
    const inserted = insertWords(words);
    res.status(201).json({ count: inserted.length, words: inserted });
  } catch (error) {
    console.error('Error batch inserting words:', error);
    res.status(500).json({ error: 'Failed to batch insert words' });
  }
});

// GET /api/words/:id - Get word by ID
wordsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const profileId = typeof req.query.profileId === 'string' ? req.query.profileId : undefined;
    const word = getWordById(id, profileId);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }
    res.json(word);
  } catch (error) {
    console.error('Error fetching word:', error);
    res.status(500).json({ error: 'Failed to fetch word' });
  }
});

// POST /api/words - Create a new word
wordsRouter.post('/', (req: Request, res: Response) => {
  try {
    const payload = req.body as Partial<WordItem>;
    if (!payload.word || !payload.translation || !payload.language) {
      return res.status(400).json({ error: 'word, translation, and language are required' });
    }

    const wordItem: WordItem = {
      id: payload.id || `${payload.language}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      word: payload.word.trim(),
      translation: payload.translation.trim(),
      language: payload.language,
      lesson: payload.lesson || 'Lerneinheit',
      partOfSpeech: payload.partOfSpeech || 'other',
      exampleSentence: payload.exampleSentence,
      exampleTranslation: payload.exampleTranslation,
      phonetic: payload.phonetic,
      notes: payload.notes,
      box: payload.box ?? 1,
      correctCount: payload.correctCount ?? 0,
      incorrectCount: payload.incorrectCount ?? 0,
      lastReviewedAt: payload.lastReviewedAt,
      createdAt: payload.createdAt ?? Date.now(),
      profileId: payload.profileId || null,
    };

    const created = insertWord(wordItem);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating word:', error);
    res.status(500).json({ error: 'Failed to create word' });
  }
});

// PUT /api/words/:id - Update word
wordsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const wordId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const profileId = typeof req.query.profileId === 'string' ? req.query.profileId : undefined;
    const existing = getWordById(wordId, profileId);
    if (!existing) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const updatedWord: WordItem = {
      ...existing,
      ...req.body,
      id: wordId,
      profileId: req.body.profileId !== undefined ? req.body.profileId : existing.profileId,
    };

    const saved = updateWord(updatedWord);
    res.json(saved);
  } catch (error) {
    console.error('Error updating word:', error);
    res.status(500).json({ error: 'Failed to update word' });
  }
});

// POST /api/words/delete-lesson - Delete entire lesson with all words
wordsRouter.post('/delete-lesson', (req: Request, res: Response) => {
  try {
    const { lesson, language } = req.body;
    if (!lesson || typeof lesson !== 'string') {
      return res.status(400).json({ error: 'lesson name is required' });
    }
    const lang = typeof language === 'string' ? language : undefined;
    const deletedCount = deleteWordsByLesson(lesson, lang);
    res.json({ success: true, lesson, deletedCount });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// DELETE /api/words/by-lesson - Delete entire lesson via query
wordsRouter.delete('/by-lesson', (req: Request, res: Response) => {
  try {
    const lesson = typeof req.query.lesson === 'string' ? req.query.lesson : undefined;
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    if (!lesson) {
      return res.status(400).json({ error: 'lesson query parameter is required' });
    }
    const deletedCount = deleteWordsByLesson(lesson, language);
    res.json({ success: true, lesson, deletedCount });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// DELETE /api/words/:id - Delete word
wordsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const wordId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = deleteWord(wordId);
    if (!success) {
      return res.status(404).json({ error: 'Word not found' });
    }
    res.json({ success: true, id: wordId });
  } catch (error) {
    console.error('Error deleting word:', error);
    res.status(500).json({ error: 'Failed to delete word' });
  }
});

// POST /api/words/:id/review - Record review progress
wordsRouter.post('/:id/review', (req: Request, res: Response) => {
  try {
    const wordId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { wasCorrect, profileId } = req.body;
    if (typeof wasCorrect !== 'boolean') {
      return res.status(400).json({ error: 'wasCorrect boolean is required' });
    }

    const pId =
      typeof profileId === 'string'
        ? profileId
        : (typeof req.query.profileId === 'string' ? req.query.profileId : undefined);

    const updated = recordReview(wordId, wasCorrect, pId);
    if (!updated) {
      return res.status(404).json({ error: 'Word not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error recording review:', error);
    res.status(500).json({ error: 'Failed to record review' });
  }
});
