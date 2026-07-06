import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function ExecuteTab() {
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = () => api.get('/exec/log').then(setHistory);
  useEffect(() => { loadHistory(); }, []);

  const run = async (e) => {
    e.preventDefault();
    if (!command.trim() || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await api.post('/exec/run', { command });
      setResult(res);
    } catch (err) {
      setResult({ stderr: err.message, exitCode: 1 });
    }
    setRunning(false);
    loadHistory();
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Run Command</h2>
      <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
        Runs directly on your laptop with no sandboxing or confirmation step. Anything you (or anyone with your
        PIN) type here executes immediately.
      </p>
      <form onSubmit={run} className="card">
        <div className="form-row">
          <label>Command</label>
          <input
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="e.g. dir, ipconfig, notepad"
            style={{ fontFamily: 'monospace' }}
          />
        </div>
        <button type="submit" className="btn" disabled={running || !command.trim()}>
          {running ? 'Running...' : 'Execute'}
        </button>
      </form>

      {result && (
        <div className="card">
          <strong>Exit code: {result.exitCode}</strong>
          {result.timedOut && <p className="login-error">Timed out after 30s.</p>}
          {result.stdout && (
            <>
              <p style={{ marginBottom: 4, fontSize: '0.8rem', opacity: 0.7 }}>stdout</p>
              <pre className="exec-output">{result.stdout}</pre>
            </>
          )}
          {result.stderr && (
            <>
              <p style={{ marginBottom: 4, fontSize: '0.8rem', opacity: 0.7 }}>stderr</p>
              <pre className="exec-output exec-output-error">{result.stderr}</pre>
            </>
          )}
          {!result.stdout && !result.stderr && <p style={{ opacity: 0.6 }}>(no output)</p>}
        </div>
      )}

      <h3>Recent Commands</h3>
      {history.map(h => (
        <div key={h.id} className="card">
          <code>{h.command}</code>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '6px 0 0' }}>
            {new Date(h.ran_at).toLocaleString()} · exit {h.exit_code}
          </p>
        </div>
      ))}
      {history.length === 0 && <p className="empty-state">No commands run yet.</p>}
    </div>
  );
}
