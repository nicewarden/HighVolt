import { Router } from 'express';
import * as procoreAuth from '../lib/procoreAuth.js';
import * as procore from '../lib/procore.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({
    configured: procoreAuth.isConfigured(),
    connected: procoreAuth.isConnected(),
    projectConfigured: procore.isProjectConfigured(),
  });
});

router.get('/auth', (req, res) => {
  if (!procoreAuth.isConfigured()) {
    return res.status(400).send('Procore is not configured. Set PROCORE_CLIENT_ID / PROCORE_CLIENT_SECRET in .env.');
  }
  res.redirect(procoreAuth.getAuthUrl());
});

router.get('/callback', async (req, res) => {
  try {
    if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
    await procoreAuth.exchangeCode(req.query.code);
    res.redirect('/?procore=connected');
  } catch (err) {
    res.status(400).send(`Procore connection failed: ${err.message}`);
  }
});

router.post('/disconnect', (req, res) => {
  procoreAuth.disconnect();
  res.json({ ok: true });
});

router.get('/schedule', async (req, res) => {
  if (!procoreAuth.isConnected()) return res.status(400).json({ error: 'Procore is not connected' });
  try {
    res.json(await procore.listScheduleTasks());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily-log', async (req, res) => {
  if (!procoreAuth.isConnected()) return res.status(400).json({ error: 'Procore is not connected' });
  try {
    res.json(await procore.getDailyLog(req.query.date));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
