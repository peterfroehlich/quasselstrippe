import { Router, Request, Response } from 'express';
import {
  getAllWords,
  getWordById,
  insertWord,
  insertWords,
  updateWord,
  deleteWord,
  recordReview,
  resetReviewProgress,
  resetToDefaults,
} from '../db/database.js';
import type { WordItem } from '../types.js';

export const wordsRouter = Router();

// GET /api/words - List all words (optional filter by language)
wordsRouter.get('/', (req: Request, res: Response) => {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    const words = getAllWords(language);
    res.json(words);
  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

// POST /api/words/reset-progress - Reset all Leitner review progress
wordsRouter.post('/reset-progress', (_req: Request, res: Response) => {
  try {
    const words = resetReviewProgress();
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
    const word = getWordById(id);
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
    const existing = getWordById(wordId);
    if (!existing) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const updatedWord: WordItem = {
      ...existing,
      ...req.body,
      id: wordId,
    };

    const saved = updateWord(updatedWord);
    res.json(saved);
  } catch (error) {
    console.error('Error updating word:', error);
    res.status(500).json({ error: 'Failed to update word' });
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
    const { wasCorrect } = req.body;
    if (typeof wasCorrect !== 'boolean') {
      return res.status(400).json({ error: 'wasCorrect boolean is required' });
    }

    const updated = recordReview(wordId, wasCorrect);
    if (!updated) {
      return res.status(404).json({ error: 'Word not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error recording review:', error);
    res.status(500).json({ error: 'Failed to record review' });
  }
});
