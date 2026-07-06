import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import TeamsTab from './assistant/TeamsTab.jsx';

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CompanyMailCard() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.get('/email/company-mail')
      .then(setMessages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/email/status').then((s) => {
      setStatus(s);
      if (s.connected) load();
    }).catch(() => {});
  }, []);

  if (!status || !status.configured) return null;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Mail size={16} /> Company Mail
      </h3>

      {!status.connected && (
        <a className="btn secondary" href="/api/calendar/outlook/auth" style={{ display: 'inline-block' }}>Connect Outlook</a>
      )}

      {status.connected && (
        <>
          {loading && <Loader2 size={14} className="spin" />}
          {error && <p className="login-error">{error}</p>}
          {!loading && !error && messages.length === 0 && (
            <p className="empty-state">No recent mail from tracked senders.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 8 }}>
              <strong>{m.from}</strong><br />
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{fmtDate(m.receivedAt)} · {m.subject}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then(setSummary).catch((e) => setError(e.message));
  }, []);

  if (error) return <p style={{ color: '#c0392b' }}>{error}</p>;
  if (!summary) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-tile">
          <div className={`num ${summary.counts.overdueCompliance ? 'alert' : 'ok'}`}>
            {summary.counts.overdueCompliance}
          </div>
          <div className="label">Overdue Inspections</div>
        </div>
        <div className="stat-tile">
          <div className={`num ${summary.counts.openIncidents ? 'alert' : 'ok'}`}>
            {summary.counts.openIncidents}
          </div>
          <div className="label">Open Incidents</div>
        </div>
        <div className="stat-tile">
          <div className="num">{summary.counts.upcomingJobs}</div>
          <div className="label">Jobs in Next 7 Days</div>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Overdue Inspections</h3>
          {summary.overdueCompliance.length === 0 && <p className="empty-state">Nothing overdue.</p>}
          {summary.overdueCompliance.map((c) => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <strong>{c.name}</strong><br />
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{c.site || 'No site'} · due {fmtDate(c.next_due)}</span>
            </div>
          ))}
          <Link to="/safety" className="btn secondary" style={{ display: 'inline-block', marginTop: 8 }}>View Compliance</Link>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Open Incidents</h3>
          {summary.openIncidents.length === 0 && <p className="empty-state">No open incidents.</p>}
          {summary.openIncidents.map((i) => (
            <div key={i.id} style={{ marginBottom: 8 }}>
              <strong>{i.location}</strong> <span className="badge open">{i.severity}</span><br />
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{fmtDate(i.incident_date)} · {i.description.slice(0, 60)}{i.description.length > 60 ? '...' : ''}</span>
            </div>
          ))}
          <Link to="/safety" className="btn secondary" style={{ display: 'inline-block', marginTop: 8 }}>View Incidents</Link>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Upcoming Jobs (7 days)</h3>
          {summary.upcomingJobs.length === 0 && <p className="empty-state">Nothing scheduled.</p>}
          {summary.upcomingJobs.map((j) => (
            <div key={j.id} style={{ marginBottom: 8 }}>
              <strong>{j.title}</strong><br />
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{j.site || 'No site'} · {fmtDate(j.start_time)}</span>
            </div>
          ))}
          <Link to="/scheduling" className="btn secondary" style={{ display: 'inline-block', marginTop: 8 }}>View Schedule</Link>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 24 }}>
        <CompanyMailCard />
        <div className="card">
          <TeamsTab />
        </div>
      </div>
    </div>
  );
}
