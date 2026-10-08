import { Router } from 'express';
import { getSettings, updateSettings } from '../db/database.js';
export const settingsRouter = Router();
const publicSettings = () => {
  const { geminiApiKey, ...settings } = getSettings();
  return { ...settings, geminiApiKey: '', aiAvailable: Boolean(process.env.GEMINI_API_KEY || geminiApiKey) };
};
settingsRouter.get('/', (_req, res) => res.json(publicSettings()));
settingsRouter.put('/', (req, res) => {
  const { activeLanguage, speechRate, autoPlayAudio } = req.body || {};
  if ((activeLanguage !== undefined && activeLanguage !== 'en' && activeLanguage !== 'la') ||
      (speechRate !== undefined && (typeof speechRate !== 'number' || !Number.isFinite(speechRate) || speechRate < 0.6 || speechRate > 1.2)) ||
      (autoPlayAudio !== undefined && typeof autoPlayAudio !== 'boolean')) return void res.status(400).json({ error: 'Invalid settings' });
  updateSettings({ ...(activeLanguage !== undefined ? { activeLanguage } : {}),
    ...(speechRate !== undefined ? { speechRate } : {}), ...(autoPlayAudio !== undefined ? { autoPlayAudio } : {}) });
  res.json(publicSettings());
});
