import db from './db.js';

const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const PORT = process.env.PORT || 4000;
const REDIRECT_URI = `http://localhost:${PORT}/api/calendar/outlook/callback`;
// Calendars.Read powers the Upcoming Events widget; Mail.Read/Mail.Send power
// the Plaud-recording-by-email import and the Email tab; Chat.Read powers the
// Teams mentions widget. All live under one "Connect Outlook" consent screen
// since they're the same Microsoft account. If you connected Outlook before
// these scopes were added, click "Connect Outlook" again to re-consent.
const SCOPE = 'offline_access Calendars.Read Mail.Read Mail.Send Chat.Read';

export function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function isConnected() {
  return !!db.prepare("SELECT 1 FROM calendar_auth WHERE provider = 'outlook'").get();
}

export function disconnect() {
  db.prepare("DELETE FROM calendar_auth WHERE provider = 'outlook'").run();
}

export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPE,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

function saveTokens(accessToken, refreshToken, expiresInSec) {
  const expiresAt = Date.now() + expiresInSec * 1000;
  db.prepare(`
    INSERT INTO calendar_auth (provider, access_token, refresh_token, expires_at, updated_at)
    VALUES ('outlook', ?, ?, ?, datetime('now'))
    ON CONFLICT(provider) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, calendar_auth.refresh_token),
      expires_at = excluded.expires_at,
      updated_at = datetime('now')
  `).run(accessToken, refreshToken || null, expiresAt);
}

export async function exchangeCode(code) {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: SCOPE,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Outlook token exchange failed');
  saveTokens(data.access_token, data.refresh_token, data.expires_in);
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      scope: SCOPE,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Outlook token refresh failed');
  saveTokens(data.access_token, data.refresh_token || refreshToken, data.expires_in);
  return data.access_token;
}

export async function getValidToken() {
  const row = db.prepare("SELECT * FROM calendar_auth WHERE provider = 'outlook'").get();
  if (!row) throw new Error('Outlook is not connected');
  if (Date.now() < row.expires_at - 60000) return row.access_token;
  return refreshAccessToken(row.refresh_token);
}
