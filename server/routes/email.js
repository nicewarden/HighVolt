import { Router } from 'express';
import * as outlookAuth from '../lib/outlookAuth.js';
import * as mail from '../lib/outlookMail.js';

const router = Router();

// Companies to surface on the Dashboard's Company Mail widget - configurable
// via .env, defaults cover the two the user asked to always see.
const DASHBOARD_SENDERS = (process.env.DASHBOARD_EMAIL_SENDERS || 'Energy Project Solutions,AKS Engineering and Forestry')
  .split(',').map(s => s.trim()).filter(Boolean);

router.get('/status', (req, res) => {
  res.json({ configured: outlookAuth.isConfigured(), connected: outlookAuth.isConnected() });
});

router.get('/company-mail', async (req, res) => {
  if (!outlookAuth.isConnected()) return res.status(400).json({ error: 'Outlook is not connected' });
  try {
    res.json(await mail.findEmailsFromSenders(DASHBOARD_SENDERS));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/messages', async (req, res) => {
  if (!outlookAuth.isConnected()) return res.status(400).json({ error: 'Outlook is not connected' });
  try {
    const top = Math.min(Number(req.query.top) || 25, 50);
    const skip = Number(req.query.skip) || 0;
    const messages = await mail.listInbox({ top, skip });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/messages/:id', async (req, res) => {
  if (!outlookAuth.isConnected()) return res.status(400).json({ error: 'Outlook is not connected' });
  try {
    res.json(await mail.getMessage(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', async (req, res) => {
  if (!outlookAuth.isConnected()) return res.status(400).json({ error: 'Outlook is not connected' });
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, and body are required' });
  const recipients = Array.isArray(to) ? to : String(to).split(',').map(s => s.trim()).filter(Boolean);
  if (!recipients.length) return res.status(400).json({ error: 'at least one recipient is required' });
  try {
    await mail.sendMail({ to: recipients, subject, body });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
