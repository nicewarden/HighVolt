import { Router } from 'express';
import * as google from '../lib/googleCalendar.js';
import * as outlookAuth from '../lib/outlookAuth.js';
import * as outlook from '../lib/outlookCalendar.js';
import { listUpcomingFromIcs } from '../lib/icsCalendar.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({
    google: { configured: google.isConfigured(), connected: google.isConnected(), ics: !!process.env.GOOGLE_ICS_URL },
    outlook: { configured: outlookAuth.isConfigured(), connected: outlookAuth.isConnected(), ics: !!process.env.MS_ICS_URL },
  });
});

router.get('/google/auth', (req, res) => {
  if (!google.isConfigured()) {
    return res.status(400).send('Google Calendar is not configured. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.');
  }
  res.redirect(google.getAuthUrl());
});

router.get('/google/callback', async (req, res) => {
  try {
    if (req.query.error) throw new Error(String(req.query.error));
    await google.exchangeCode(req.query.code);
    res.redirect('/?calendar=google-connected');
  } catch (err) {
    res.status(400).send(`Google Calendar connection failed: ${err.message}`);
  }
});

router.post('/google/disconnect', (req, res) => {
  google.disconnect();
  res.json({ ok: true });
});

router.get('/outlook/auth', (req, res) => {
  if (!outlookAuth.isConfigured()) {
    return res.status(400).send('Outlook is not configured. Set MS_CLIENT_ID / MS_CLIENT_SECRET in .env.');
  }
  res.redirect(outlookAuth.getAuthUrl());
});

router.get('/outlook/callback', async (req, res) => {
  try {
    if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
    await outlookAuth.exchangeCode(req.query.code);
    res.redirect('/?calendar=outlook-connected');
  } catch (err) {
    res.status(400).send(`Outlook connection failed: ${err.message}`);
  }
});

router.post('/outlook/disconnect', (req, res) => {
  outlookAuth.disconnect();
  res.json({ ok: true });
});

router.get('/upcoming', async (req, res) => {
  const results = await Promise.allSettled([
    google.isConnected() ? google.listUpcomingEvents(10) : Promise.resolve([]),
    outlookAuth.isConnected() ? outlook.listUpcomingEvents(10) : Promise.resolve([]),
    process.env.GOOGLE_ICS_URL ? listUpcomingFromIcs(process.env.GOOGLE_ICS_URL, 'google', 10) : Promise.resolve([]),
    process.env.MS_ICS_URL ? listUpcomingFromIcs(process.env.MS_ICS_URL, 'outlook', 10) : Promise.resolve([]),
  ]);
  results.forEach(r => { if (r.status === 'rejected') console.error('Calendar fetch failed:', r.reason?.message); });
  const events = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  res.json(events.slice(0, 15));
});

export default router;
