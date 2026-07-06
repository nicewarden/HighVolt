import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';

import { ensureCert } from './lib/certs.js';
import { syncPlaudEmails } from './lib/plaudEmailSync.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import safetyRoutes from './routes/safety.js';
import schedulingRoutes from './routes/scheduling.js';
import referenceRoutes from './routes/reference.js';
import notesRoutes from './routes/notes.js';
import chatRoutes from './routes/chat.js';
import execRoutes from './routes/exec.js';
import recordingsRoutes from './routes/recordings.js';
import todosRoutes from './routes/todos.js';
import calendarRoutes from './routes/calendar.js';
import emailRoutes from './routes/email.js';
import teamsRoutes from './routes/teams.js';
import procoreRoutes from './routes/procore.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const HTTPS_PORT = process.env.HTTPS_PORT || 4443;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }, // 30 days, stay logged in on your own devices
}));

// Auth routes are open (need to be reachable before login)
app.use('/api/auth', authRoutes);

// Everything else requires an authenticated session
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/safety', requireAuth, safetyRoutes);
app.use('/api/scheduling', requireAuth, schedulingRoutes);
app.use('/api/reference', requireAuth, referenceRoutes);
app.use('/api/notes', requireAuth, notesRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/exec', requireAuth, execRoutes);
app.use('/api/recordings', requireAuth, recordingsRoutes);
app.use('/api/todos', requireAuth, todosRoutes);
app.use('/api/calendar', requireAuth, calendarRoutes);
app.use('/api/email', requireAuth, emailRoutes);
app.use('/api/teams', requireAuth, teamsRoutes);
app.use('/api/procore', requireAuth, procoreRoutes);

// Serve the built client in production (npm run build && npm start)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HighVolt AI server running on http://0.0.0.0:${PORT}`);
});

// A second HTTPS listener, self-signed and local-only. Browsers block
// microphone access on any origin that isn't a secure context or localhost,
// so recording from a phone (a LAN IP, not localhost) needs this even though
// the cert is unknown to the phone and will show a one-time warning.
ensureCert()
  .then(({ cert, key }) => {
    https.createServer({ cert, key }, app).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`HighVolt AI server (HTTPS, for phone microphone access) running on https://0.0.0.0:${HTTPS_PORT}`);
    });
  })
  .catch(err => {
    console.error('Could not start HTTPS server - recording from a phone browser will not work:', err.message);
  });

// Auto-pull Plaud recordings emailed to the connected Outlook inbox (subject
// contains "plaud", has an audio attachment) every 5 minutes, on top of the
// manual "Check email now" button on the Recordings tab. isConnected() is
// checked inside syncPlaudEmails() itself, so this is a harmless no-op until
// Outlook is connected.
const PLAUD_EMAIL_POLL_MS = 5 * 60 * 1000;
setInterval(() => {
  syncPlaudEmails().catch(err => console.error('Plaud email sync failed:', err.message));
}, PLAUD_EMAIL_POLL_MS);
