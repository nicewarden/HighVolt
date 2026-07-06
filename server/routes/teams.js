import { Router } from 'express';
import * as outlookAuth from '../lib/outlookAuth.js';
import { listRecentMentions } from '../lib/teamsChat.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({ configured: outlookAuth.isConfigured(), connected: outlookAuth.isConnected() });
});

router.get('/mentions', async (req, res) => {
  if (!outlookAuth.isConnected()) return res.status(400).json({ error: 'Outlook is not connected' });
  try {
    res.json(await listRecentMentions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
