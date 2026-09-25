import { Router, Request, Response } from 'express';
import {
  getAllProfiles,
  getProfileById,
  insertProfile,
  updateProfile,
  deleteProfile,
  getLearnerStats,
} from '../db/database.js';
import type { UserProfile, Language } from '../types.js';


export const profilesRouter = Router();

// GET /api/profiles - List all user profiles
profilesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const profiles = getAllProfiles();
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// GET /api/profiles/:id - Get profile by ID
profilesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const profile = getProfileById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/profiles/:id/stats - Get learning statistics & history for a profile
profilesRouter.get('/:id/stats', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const profile = getProfileById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const language = typeof req.query.language === 'string' && (req.query.language === 'en' || req.query.language === 'la')
      ? (req.query.language as Language)
      : undefined;

    const stats = getLearnerStats(id, language);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching learner stats:', error);
    res.status(500).json({ error: 'Failed to fetch learner stats' });
  }
});


// POST /api/profiles - Create a new user profile
profilesRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, avatar, color } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Profile name is required' });
    }

    const newProfile: UserProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      avatar: (avatar && typeof avatar === 'string' ? avatar.trim() : '🦊'),
      color: (color && typeof color === 'string' ? color.trim() : '#6366f1'),
      createdAt: Date.now(),
      isDefault: false,
    };

    const created = insertProfile(newProfile);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// PUT /api/profiles/:id - Update profile
profilesRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = getProfileById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { name, avatar, color } = req.body;
    const updated: UserProfile = {
      ...existing,
      name: (name && typeof name === 'string') ? name.trim() : existing.name,
      avatar: (avatar && typeof avatar === 'string') ? avatar.trim() : existing.avatar,
      color: (color && typeof color === 'string') ? color.trim() : existing.color,
    };

    const saved = updateProfile(updated);
    res.json(saved);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/profiles/:id - Delete profile
profilesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = deleteProfile(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to delete profile' });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});
