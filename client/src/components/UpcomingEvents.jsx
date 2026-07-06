import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { api } from '../api/client.js';

function formatWhen(event) {
  const d = new Date(event.start);
  if (event.allDay) return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function UpcomingEvents() {
  const [status, setStatus] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/calendar/status').then(setStatus).catch(() => {});
    api.get('/calendar/upcoming').then(setEvents).catch(err => setError(err.message));
  }, []);

  if (!status) return null;

  const googleActive = status.google.connected || status.google.ics;
  const outlookActive = status.outlook.connected || status.outlook.ics;
  const anyConnected = googleActive || outlookActive;
  const anyConfigured = anyConnected || status.google.configured || status.outlook.configured;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarDays size={17} /> Upcoming Events
      </h3>

      {!anyConfigured && (
        <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
          Not set up yet. Add Google/Outlook OAuth credentials in <code>.env</code> to connect your calendars
          (see README).
        </p>
      )}

      {anyConfigured && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: events.length ? 12 : 0 }}>
          {status.google.configured && !status.google.connected && (
            <a className="btn secondary" href="/api/calendar/google/auth">Connect Google Calendar</a>
          )}
          {status.outlook.configured && !status.outlook.connected && (
            <a className="btn secondary" href="/api/calendar/outlook/auth">Connect Outlook Calendar</a>
          )}
        </div>
      )}
      {!anyConnected && !status.google.configured && !status.outlook.configured && (
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: -4 }}>
          Easiest option: paste your calendar's private "secret address in iCal format" (Google) or "publish
          calendar" link (Outlook) as <code>GOOGLE_ICS_URL</code> / <code>MS_ICS_URL</code> in <code>.env</code> —
          no app registration needed.
        </p>
      )}

      {error && <p className="login-error">{error}</p>}

      {anyConnected && events.length === 0 && !error && (
        <p className="empty-state" style={{ padding: '8px 0' }}>Nothing on your calendar in the next 30 days.</p>
      )}

      {events.map(e => (
        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderTop: '1px solid var(--panel-border, #333)' }}>
          <span>{e.link ? <a href={e.link} target="_blank" rel="noreferrer">{e.title}</a> : e.title}</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap' }}>
            {formatWhen(e)} · {e.source === 'google' ? 'Google' : 'Outlook'}
          </span>
        </div>
      ))}
    </div>
  );
}
