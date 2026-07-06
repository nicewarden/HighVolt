import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'highvolt.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

// One-time migration away from the retired Plaud integration: fold
// plaud_recordings into a generic `recordings` table (populated by manual
// uploads instead of a remote sync) and repoint todos.recording_id at it.
// Runs with foreign_keys off so the table rebuild below can't trip over the
// old FK mid-migration.
const existingTables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
);

if (existingTables.has('plaud_recordings') && !existingTables.has('recordings')) {
  db.exec(`
    CREATE TABLE recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      filename TEXT,
      status TEXT NOT NULL DEFAULT 'transcribing',
      error TEXT,
      transcript TEXT,
      summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO recordings (id, title, filename, status, error, transcript, summary, created_at, updated_at)
      SELECT id, title, title, status, error, transcript, summary, created_at, updated_at FROM plaud_recordings;
  `);
}

if (existingTables.has('todos')) {
  const todosSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='todos'").get();
  if (todosSql && todosSql.sql.includes('plaud_recordings')) {
    db.exec(`
      ALTER TABLE todos RENAME TO todos_old;
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'manual', -- manual | recording
        recording_id INTEGER REFERENCES recordings(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO todos (id, content, done, source, recording_id, created_at)
        SELECT id, content, done, CASE WHEN source = 'plaud' THEN 'recording' ELSE source END, recording_id, created_at
        FROM todos_old;
      DROP TABLE todos_old;
    `);
  }
}

db.exec('DROP TABLE IF EXISTS plaud_recordings');
db.exec('DROP TABLE IF EXISTS plaud_auth');
db.pragma('foreign_keys = ON');

// Additive migration: jobs predates the recording_id column (used to trace
// auto-created events back to the recording they came from).
if (existingTables.has('jobs')) {
  const jobsCols = db.prepare("PRAGMA table_info(jobs)").all().map(c => c.name);
  if (!jobsCols.includes('recording_id')) {
    db.exec('ALTER TABLE jobs ADD COLUMN recording_id INTEGER REFERENCES recordings(id) ON DELETE SET NULL');
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS checklist_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  items_json TEXT NOT NULL, -- JSON array of {label}
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checklist_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  site TEXT NOT NULL,
  completed_by TEXT,
  completed_date TEXT NOT NULL,
  results_json TEXT NOT NULL, -- JSON array of {label, checked, note}
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_date TEXT NOT NULL,
  location TEXT NOT NULL,
  personnel TEXT,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'near-miss', -- near-miss | incident
  follow_up TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | closed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compliance_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  site TEXT,
  equipment_type TEXT,
  frequency_days INTEGER NOT NULL,
  last_done TEXT, -- date
  next_due TEXT NOT NULL, -- date
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crew (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT,
  certifications TEXT, -- comma separated
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recordings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  filename TEXT,
  status TEXT NOT NULL DEFAULT 'transcribing', -- transcribing | summarizing | done | error
  error TEXT,
  transcript TEXT,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  site TEXT,
  start_time TEXT NOT NULL, -- ISO datetime
  end_time TEXT,
  crew_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | complete | cancelled
  notes TEXT,
  completion_notes TEXT,
  recording_id INTEGER REFERENCES recordings(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reference_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT, -- note | spec-sheet | link
  content TEXT,
  url TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL DEFAULT 'email', -- email | message
  subject TEXT,
  recipient TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS command_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command TEXT NOT NULL,
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  ran_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual', -- manual | recording
  recording_id INTEGER REFERENCES recordings(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendar_auth (
  provider TEXT PRIMARY KEY, -- 'google' | 'outlook'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Substation code/standards reference library, imported from a spreadsheet
-- (Reference tab > Codes). Re-importing replaces the full contents, so this
-- always mirrors whatever spreadsheet was last uploaded.
CREATE TABLE IF NOT EXISTS standards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,   -- originating sheet name, e.g. "IEEE Standards"
  category TEXT,          -- sub-category within the sheet, if any
  code TEXT,              -- standard #, NESC section, or acronym
  title TEXT NOT NULL,
  detail TEXT,            -- "why it matters" / "covers" / notes, combined
  priority TEXT,          -- HIGH / MEDIUM / LOW (may include a qualifier)
  link TEXT,              -- external reference URL
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tracks which inbox messages have already been pulled in by the Plaud
-- email-import feature (Outlook Mail.Read), so the periodic poll never
-- processes the same message twice.
CREATE TABLE IF NOT EXISTS plaud_email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL UNIQUE,
  subject TEXT,
  received_at TEXT,
  recording_id INTEGER REFERENCES recordings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processed', -- processed | error | skipped
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// The standards library only ever gets populated by a manual spreadsheet
// upload (POST /api/reference/standards/import), so a fresh database - a
// first run, a reset, or a packaged build that (correctly) doesn't ship the
// user's live .db file - would otherwise start with an empty reference
// library. Bootstrap it from a checked-in snapshot of the last real import
// so the substation code/standards reference is always present; a later
// manual re-import still fully replaces it as before.
if (db.prepare('SELECT COUNT(*) c FROM standards').get().c === 0) {
  const seedPath = path.join(dataDir, 'seed', 'standards.json');
  if (fs.existsSync(seedPath)) {
    const seedRows = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const insertSeed = db.prepare(`
      INSERT INTO standards (source, category, code, title, detail, priority, link, sort_order)
      VALUES (@source, @category, @code, @title, @detail, @priority, @link, @sort_order)
    `);
    db.transaction((rows) => { for (const row of rows) insertSeed.run(row); })(seedRows);
  }
}

export default db;
