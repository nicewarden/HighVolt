import { useEffect, useRef, useState } from 'react';
import { Mic, Upload, Trash2, ChevronDown, ChevronUp, CalendarPlus, ListTodo, Mail, RefreshCw, ClipboardPaste } from 'lucide-react';
import { api } from '../../api/client.js';

const STATUS_LABEL = {
  transcribing: 'Transcribing...',
  summarizing: 'Summarizing...',
  done: 'Done',
  error: 'Error',
};

export default function RecordingsTab() {
  const [recordings, setRecordings] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pasting, setPasting] = useState(false);

  const recordInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const load = () => api.get('/recordings').then(setRecordings);
  const loadEmailStatus = () => api.get('/recordings/plaud-email/status').then(setEmailStatus).catch(() => {});

  useEffect(() => {
    load();
    loadEmailStatus();
    return () => clearInterval(pollRef.current);
  }, []);

  const checkEmailNow = async () => {
    setCheckingEmail(true);
    setError(null);
    try {
      await api.post('/recordings/plaud-email/check', {});
      load();
      loadEmailStatus();
    } catch (err) {
      setError(err.message);
    }
    setCheckingEmail(false);
  };

  const processingCount = recordings.filter(r => !['done', 'error'].includes(r.status)).length;

  useEffect(() => {
    clearInterval(pollRef.current);
    if (processingCount > 0) {
      pollRef.current = setInterval(load, 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [processingCount]);

  const uploadFile = async (file) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      await api.upload('/recordings/upload', formData);
      load();
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  };

  const openRecorder = () => recordInputRef.current?.click();
  const pickFile = () => fileInputRef.current?.click();

  const submitPastedTranscript = async (e) => {
    e.preventDefault();
    if (!pasteText.trim() || pasting) return;
    setPasting(true);
    setError(null);
    try {
      await api.post('/recordings/paste-transcript', { title: pasteTitle, transcript: pasteText });
      setPasteTitle('');
      setPasteText('');
      load();
    } catch (err) {
      setError(err.message);
    }
    setPasting(false);
  };

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    await uploadFile(file);
  };

  const toggle = async (r) => {
    if (expanded === r.id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(r.id);
    const full = await api.get(`/recordings/${r.id}`);
    setDetail(full);
  };

  const remove = async (id) => {
    await api.del(`/recordings/${id}`);
    if (expanded === id) { setExpanded(null); setDetail(null); }
    load();
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Recordings</h2>
      <p style={{ opacity: 0.75, fontSize: '0.9rem', marginTop: 0 }}>
        Record or upload a voice recording — it's transcribed by Gemini (audio leaves the laptop for this step),
        then summarized locally on this laptop for free. To-dos and any scheduled events mentioned are created
        automatically.
      </p>

      <div className="card" style={{ textAlign: 'center' }}>
        <button className="btn" onClick={openRecorder} disabled={uploading}>
          <Mic size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {uploading ? 'Uploading...' : 'Record New Voice Memo'}
        </button>
        <p style={{ margin: '10px 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
          Opens your device's own recording app — record there, then save/done brings it straight back here.
        </p>
        <input
          type="file"
          ref={recordInputRef}
          style={{ display: 'none' }}
          onChange={onFileChange}
          accept="audio/*"
          capture
        />

        <p style={{ margin: '14px 0 0', fontSize: '0.85rem' }}>
          <button
            type="button"
            onClick={pickFile}
            disabled={uploading}
            style={{ background: 'none', border: 'none', color: 'var(--electric, #7fd6ff)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit', padding: 0 }}
          >
            <Upload size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            or choose an existing recording from this device
          </button>
        </p>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={onFileChange}
          accept=".mp3,.m4a,.wav,.ogg,.webm,.aac,.flac,.mp4" />
      </div>

      <div className="card">
        <p style={{ margin: '0 0 10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardPaste size={15} /> Paste a Transcript
        </p>
        <p style={{ margin: '0 0 10px', fontSize: '0.8rem', opacity: 0.7 }}>
          Got a meeting transcript from Teams, Zoom, or anywhere else? Paste it here — it's analyzed the same way
          as a recording, with to-dos and calendar events created automatically.
        </p>
        <form onSubmit={submitPastedTranscript}>
          <div className="form-row">
            <label>Title (optional)</label>
            <input value={pasteTitle} onChange={e => setPasteTitle(e.target.value)} placeholder="e.g. Weekly crew meeting" />
          </div>
          <div className="form-row">
            <label>Transcript</label>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste the transcript text here..."
              rows={6}
            />
          </div>
          <button type="submit" className="btn" disabled={pasting || !pasteText.trim()}>
            {pasting ? 'Analyzing...' : 'Analyze Transcript'}
          </button>
        </form>
      </div>

      {emailStatus && (
        <div className="card" style={{ fontSize: '0.85rem' }}>
          <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={15} /> Plaud recordings by email
          </p>
          {!emailStatus.configured && (
            <p style={{ margin: '6px 0 0', opacity: 0.7 }}>
              Not set up. Add <code>MS_CLIENT_ID</code>/<code>MS_CLIENT_SECRET</code> in <code>.env</code> and
              connect Outlook (see README) to auto-import recordings emailed from the Plaud app.
            </p>
          )}
          {emailStatus.configured && !emailStatus.connected && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: '0 0 8px', opacity: 0.7 }}>
                Connect Outlook to auto-import recordings emailed with subject "plaud".
              </p>
              <a className="btn secondary" href="/api/calendar/outlook/auth">Connect Outlook</a>
            </div>
          )}
          {emailStatus.connected && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, opacity: 0.7 }}>
                Checking your inbox for emails with subject "plaud" every 5 minutes
                {emailStatus.lastChecked ? ` · last checked ${new Date(emailStatus.lastChecked).toLocaleString()}` : ''}.
              </p>
              <button className="btn secondary" onClick={checkEmailNow} disabled={checkingEmail} style={{ fontSize: '0.8rem' }}>
                <RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} className={checkingEmail ? 'spin' : ''} />
                {checkingEmail ? 'Checking...' : 'Check now'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="login-error">{error}</p>}
      {processingCount > 0 && (
        <p style={{ fontSize: '0.85rem', opacity: 0.75 }}>
          <Mic size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {processingCount} recording{processingCount > 1 ? 's' : ''} still processing (transcribe / summarize)...
        </p>
      )}

      {recordings.map(r => (
        <div key={r.id} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => toggle(r)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
            >
              {expanded === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{r.title || 'Untitled recording'}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.65 }}>
                  {new Date(r.created_at).toLocaleString()} · {STATUS_LABEL[r.status] || r.status}
                </p>
              </div>
            </button>
            <button className="btn danger" style={{ padding: '4px 8px' }} onClick={() => remove(r.id)} aria-label="Delete">
              <Trash2 size={14} />
            </button>
          </div>

          {r.status === 'error' && <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--danger, #c0392b)' }}>{r.error}</p>}
          {r.summary && expanded !== r.id && <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>{r.summary}</p>}

          {expanded === r.id && detail && detail.id === r.id && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--panel-border, #333)' }}>
              {detail.summary && (
                <>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.85rem' }}>Summary</p>
                  <p style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>{detail.summary}</p>
                </>
              )}

              {detail.todos?.length > 0 && (
                <>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    <ListTodo size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    To-dos created
                  </p>
                  <ul style={{ margin: '0 0 10px', paddingLeft: 20, fontSize: '0.85rem' }}>
                    {detail.todos.map(t => <li key={t.id}>{t.content}</li>)}
                  </ul>
                </>
              )}

              {detail.events?.length > 0 && (
                <>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.85rem' }}>
                    <CalendarPlus size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Events scheduled
                  </p>
                  <ul style={{ margin: '0 0 10px', paddingLeft: 20, fontSize: '0.85rem' }}>
                    {detail.events.map(e => (
                      <li key={e.id}>{e.title} — {new Date(e.start_time).toLocaleString()}{e.site ? ` · ${e.site}` : ''}</li>
                    ))}
                  </ul>
                </>
              )}

              {detail.transcript && (
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Full transcript</summary>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', marginTop: 6 }}>{detail.transcript}</p>
                </details>
              )}
            </div>
          )}
        </div>
      ))}
      {recordings.length === 0 && <p className="empty-state">No recordings yet.</p>}
    </div>
  );
}
