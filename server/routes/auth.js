import { Router } from 'express';
import { loginLimiter, recordFailedLogin, clearFailedLogins } from '../middleware/loginLimiter.js';

const router = Router();

router.post('/login', loginLimiter, (req, res) => {
  const { pin } = req.body;
  const expected = process.env.HIGHVOLT_PIN || 'changeme';
  if (typeof pin === 'string' && pin === expected) {
    clearFailedLogins(req);
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  recordFailedLogin(req);
  return res.status(401).json({ error: 'Incorrect PIN' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/status', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

export default router;
