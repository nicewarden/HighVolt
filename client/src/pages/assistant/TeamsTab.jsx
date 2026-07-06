import { useEffect, useState } from 'react';
import { AtSign, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TeamsTab() {
  const [status, setStatus] = useState(null);
  const [mentions, setMentions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.get('/teams/mentions')
      .then(setMentions)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/teams/status').then((s) => {
      setStatus(s);
      if (s.connected) load();
    }).catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <AtSign size={18} /> Teams Mentions
      </h2>

      {!status.configured && (
        <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
          Not set up yet. Add <code>MS_CLIENT_ID</code> / <code>MS_CLIENT_SECRET</code> in <code>.env</code> (see
          README) to connect Microsoft Teams.
        </p>
      )}

      {status.configured && !status.connected && (
        <>
          <a className="btn" href="/api/calendar/outlook/auth" style={{ display: 'inline-block' }}>Connect Outlook</a>
          <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: 6 }}>
            Uses the same Outlook connection as Calendar/Email. If you connected it before Teams support was added,
            click Connect again to grant the extra Chat.Read permission.
          </p>
        </>
      )}

      {status.connected && (
        <>
          <button className="btn secondary" onClick={load} disabled={loading} style={{ marginBottom: 12 }}>
            {loading ? <Loader2 size={14} className="spin" /> : 'Check now'}
          </button>

          {error && <p className="login-error">{error}</p>}

          {!loading && !error && mentions.length === 0 && (
            <p className="empty-state">No recent @mentions in your Teams chats.</p>
          )}

          {mentions.map((m, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>{m.from}</strong>
                <span style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap' }}>{formatWhen(m.createdAt)}</span>
              </div>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '2px 0' }}>{m.chatTopic}</p>
              <p>{m.preview}</p>
              {m.webUrl && <a href={m.webUrl} target="_blank" rel="noreferrer">Open in Teams</a>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
