import { Router } from 'express';
import db from '../lib/db.js';
import { runCommand } from '../lib/execRunner.js';

const router = Router();

router.post('/run', async (req, res) => {
  const { command } = req.body;
  if (!command || !command.trim()) return res.status(400).json({ error: 'command is required' });
  const result = await runCommand(command);
  res.json(result);
});

router.get('/log', (req, res) => {
  const rows = db.prepare('SELECT * FROM command_log ORDER BY id DESC LIMIT 50').all();
  res.json(rows);
});

export default router;
