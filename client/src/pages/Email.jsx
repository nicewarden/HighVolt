import { useEffect, useState } from 'react';
import { Mail, Send, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { api } from '../api/client.js';

const EMPTY_COMPOSE = { to: '', subject: '', body: '' };

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function Email() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState(null);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState(EMPTY_COMPOSE);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const loadStatus = () => api.get('/email/status').then(setStatus).catch(() => {});
  const loadMessages = () => {
    setLoadingList(true);
    api.get('/email/messages')
      .then(setMessages)
      .catch(err => setError(err.message))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { loadStatus(); }, []);
  useEffect(() => { if (status?.connected) loadMessages(); }, [status?.connected]);

  const openMessage = async (m) => {
    setSelected({ ...m, loading: true });
    try {
      const full = await api.get(`/email/messages/${m.id}`);
      setSelected({ ...full, loading: false });
    } catch (err) {
      setSelected({ ...m, loading: false, loadError: err.message });
    }
  };

  const submitCompose = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      await api.post('/email/send', compose);
      setSendResult({ ok: true });
      setCompose(EMPTY_COMPOSE);
      setComposing(false);
    } catch (err) {
      setSendResult({ ok: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  if (!status) return null;

  return (
    <div>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={24} /> Email</h1>

      {!status.configured && (
        <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
          Not set up yet. Add <code>MS_CLIENT_ID</code> / <code>MS_CLIENT_SECRET</code> in <code>.env</code> to
          connect your Outlook / Microsoft 365 inbox (see README).
        </p>
      )}

      {status.configured && !status.connected && (
        <a className="btn" href="/api/calendar/outlook/auth" style={{ display: 'inline-block' }}>Connect Outlook</a>
      )}
      {status.configured && !status.connected && (
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: 6 }}>
          Uses the same Outlook connection as Calendar/Recordings. If you connected it before Email support was
          added, click Connect again to grant the extra Mail.Send permission.
        </p>
      )}

      {status.connected && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button className="btn secondary" onClick={loadMessages} disabled={loadingList}>
              {loadingList ? <Loader2 size={14} className="spin" /> : 'Refresh'}
            </button>
            <button className="btn" onClick={() => setComposing(c => !c)}>
              {composing ? 'Cancel' : 'Compose'}
            </button>
          </div>

          {composing && (
            <form onSubmit={submitCompose} className="card">
              <div className="form-row"><label>To</label><input required value={compose.to} onChange={e => setCompose({ ...compose, to: e.target.value })} placeholder="name@example.com, another@example.com" /></div>
              <div className="form-row"><label>Subject</label><input required value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} /></div>
              <div className="form-row"><label>Body</label><textarea required rows={6} value={compose.body} onChange={e => setCompose({ ...compose, body: e.target.value })} /></div>
              <button type="submit" className="btn" disabled={sending}>
                <Send size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                {sending ? 'Sending...' : 'Send'}
              </button>
              {sendResult && !sendResult.ok && <p className="login-error">{sendResult.error}</p>}
            </form>
          )}
          {sendResult?.ok && !composing && <p style={{ color: 'var(--success, #4caf50)' }}>Sent!</p>}

          {error && <p className="login-error">{error}</p>}

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px', minWidth: 280 }}>
              {messages.map(m => (
                <div
                  key={m.id}
                  className="card"
                  onClick={() => openMessage(m)}
                  style={{ cursor: 'pointer', fontWeight: m.isRead ? 'normal' : 600, borderLeft: selected?.id === m.id ? '3px solid var(--accent, #4a9eff)' : undefined }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{m.from}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6, whiteSpace: 'nowrap' }}>{formatWhen(m.receivedAt)}</span>
                  </div>
                  <div>{m.subject}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 'normal' }}>{m.preview}</div>
                </div>
              ))}
              {!loadingList && messages.length === 0 && <p className="empty-state">Inbox is empty.</p>}
            </div>

            {selected && (
              <div className="card" style={{ flex: '2 1 420px', minWidth: 320 }}>
                {selected.loading && <p>Loading...</p>}
                {selected.loadError && <p className="login-error">{selected.loadError}</p>}
                {!selected.loading && !selected.loadError && (
                  <>
                    <h3 style={{ marginTop: 0 }}>{selected.subject}</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                      From {selected.from} &middot; {formatWhen(selected.receivedAt)}
                    </p>
                    {selected.bodyHtml
                      ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.bodyHtml, { FORBID_TAGS: ['style'] }) }} />
                      : <p style={{ whiteSpace: 'pre-wrap' }}>{selected.bodyText}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
