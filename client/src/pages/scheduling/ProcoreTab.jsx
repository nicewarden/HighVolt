import { useEffect, useState } from 'react';
import { HardHat, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ProcoreTab() {
  const [status, setStatus] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [dailyLog, setDailyLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.get('/procore/schedule'), api.get('/procore/daily-log')])
      .then(([s, d]) => { setSchedule(s); setDailyLog(d); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/procore/status').then((s) => {
      setStatus(s);
      if (s.connected && s.projectConfigured) load();
    }).catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <div>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <HardHat size={18} /> Procore
      </h2>

      {!status.configured && (
        <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
          Not set up yet. Add <code>PROCORE_CLIENT_ID</code> / <code>PROCORE_CLIENT_SECRET</code> in{' '}
          <code>.env</code> (see README) to connect Procore.
        </p>
      )}

      {status.configured && !status.connected && (
        <a className="btn" href="/api/procore/auth" style={{ display: 'inline-block' }}>Connect Procore</a>
      )}

      {status.configured && status.connected && !status.projectConfigured && (
        <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
          Connected, but <code>PROCORE_COMPANY_ID</code> / <code>PROCORE_PROJECT_ID</code> aren't set in{' '}
          <code>.env</code> yet - add them and restart the server to see schedule/daily log data.
        </p>
      )}

      {status.connected && status.projectConfigured && (
        <>
          <button className="btn secondary" onClick={load} disabled={loading} style={{ marginBottom: 12 }}>
            {loading ? <Loader2 size={14} className="spin" /> : 'Refresh'}
          </button>

          {error && <p className="login-error">{error}</p>}

          <h3>Schedule</h3>
          {schedule.length === 0 && !loading && <p className="empty-state">No schedule tasks found.</p>}
          {schedule.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{t.name}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap' }}>
                {formatDate(t.startDate)} - {formatDate(t.endDate)}
                {t.percentComplete != null ? ` · ${t.percentComplete}%` : ''}
              </span>
            </div>
          ))}

          <h3>Today's Daily Log</h3>
          {dailyLog && (
            <div className="card">
              {dailyLog.manpowerCount != null && <p>Manpower on site: {dailyLog.manpowerCount}</p>}
              {dailyLog.notes.length === 0 && dailyLog.manpowerCount == null && (
                <p className="empty-state">No daily log entries for {dailyLog.date}.</p>
              )}
              {dailyLog.notes.map((n, i) => <p key={i}>{n}</p>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
