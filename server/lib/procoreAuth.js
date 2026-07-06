import db from './db.js';

const CLIENT_ID = process.env.PROCORE_CLIENT_ID;
const CLIENT_SECRET = process.env.PROCORE_CLIENT_SECRET;
const PORT = process.env.PORT || 4000;
const REDIRECT_URI = `http://localhost:${PORT}/api/procore/callback`;
// Procore's OAuth app grants whatever the app was configured with in the
// developer portal - there's no per-request scope param like Google/Microsoft.
const AUTH_BASE = process.env.PROCORE_API_BASE || 'https://login.procore.com';
const API_BASE = process.env.PROCORE_API_BASE ? process.env.PROCORE_API_BASE.replace('login.', 'api.') : 'https://api.procore.com';

export function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function isConnected() {
  return !!db.prepare("SELECT 1 FROM calendar_auth WHERE provider = 'procore'").get();
}

export function disconnect() {
  db.prepare("DELETE FROM calendar_auth WHERE provider = 'procore'").run();
}

export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
  });
  return `${AUTH_BASE}/oauth/authorize?${params}`;
}

function saveTokens(accessToken, refreshToken, expiresInSec) {
  const expiresAt = Date.now() + expiresInSec * 1000;
  db.prepare(`
    INSERT INTO calendar_auth (provider, access_token, refresh_token, expires_at, updated_at)
    VALUES ('procore', ?, ?, ?, datetime('now'))
    ON CONFLICT(provider) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, calendar_auth.refresh_token),
      expires_at = excluded.expires_at,
      updated_at = datetime('now')
  `).run(accessToken, refreshToken || null, expiresAt);
}

export async function exchangeCode(code) {
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
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
  if (!res.ok) throw new Error(data.error_description || data.error || 'Procore token exchange failed');
  saveTokens(data.access_token, data.refresh_token, data.expires_in);
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
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
  if (!res.ok) throw new Error(data.error_description || data.error || 'Procore token refresh failed');
  saveTokens(data.access_token, data.refresh_token || refreshToken, data.expires_in);
  return data.access_token;
}

export async function getValidToken() {
  const row = db.prepare("SELECT * FROM calendar_auth WHERE provider = 'procore'").get();
  if (!row) throw new Error('Procore is not connected');
  if (Date.now() < row.expires_at - 60000) return row.access_token;
  return refreshAccessToken(row.refresh_token);
}

export function apiBase() {
  return API_BASE;
}
