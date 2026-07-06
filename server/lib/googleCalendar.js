import db from './db.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = process.env.PORT || 4000;
const REDIRECT_URI = `http://localhost:${PORT}/api/calendar/google/callback`;
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function isConnected() {
  return !!db.prepare("SELECT 1 FROM calendar_auth WHERE provider = 'google'").get();
}

export function disconnect() {
  db.prepare("DELETE FROM calendar_auth WHERE provider = 'google'").run();
}

export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function saveTokens(accessToken, refreshToken, expiresInSec) {
  const expiresAt = Date.now() + expiresInSec * 1000;
  db.prepare(`
    INSERT INTO calendar_auth (provider, access_token, refresh_token, expires_at, updated_at)
    VALUES ('google', ?, ?, ?, datetime('now'))
    ON CONFLICT(provider) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, calendar_auth.refresh_token),
      expires_at = excluded.expires_at,
      updated_at = datetime('now')
  `).run(accessToken, refreshToken || null, expiresAt);
}

export async function exchangeCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Google token exchange failed');
  saveTokens(data.access_token, data.refresh_token, data.expires_in);
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Google token refresh failed');
  saveTokens(data.access_token, refreshToken, data.expires_in);
  return data.access_token;
}

async function getValidToken() {
  const row = db.prepare("SELECT * FROM calendar_auth WHERE provider = 'google'").get();
  if (!row) throw new Error('Google Calendar is not connected');
  if (Date.now() < row.expires_at - 60000) return row.access_token;
  return refreshAccessToken(row.refresh_token);
}

export async function listUpcomingEvents(maxResults = 10) {
  const token = await getValidToken();
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map(e => ({
    id: `google-${e.id}`,
    title: e.summary || '(no title)',
    start: e.start?.dateTime || e.start?.date,
    allDay: !e.start?.dateTime,
    source: 'google',
    link: e.htmlLink || null,
  }));
}
