import { Router, Request, Response } from 'express';
import { getSettings, updateSettings } from '../db/database.js';
import type { AppSettings } from '../types.js';

export const settingsRouter = Router();

// GET /api/settings
settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// PUT /api/settings
settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const payload = req.body as Partial<AppSettings>;
    const updated = updateSettings(payload);
    res.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
