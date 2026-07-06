import { getValidToken, apiBase } from './procoreAuth.js';

const COMPANY_ID = process.env.PROCORE_COMPANY_ID;
const PROJECT_ID = process.env.PROCORE_PROJECT_ID;

export function isProjectConfigured() {
  return !!(COMPANY_ID && PROJECT_ID);
}

async function procoreGet(path) {
  const token = await getValidToken();
  const res = await fetch(`${apiBase()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Procore-Company-Id': COMPANY_ID,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Procore API error (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

// Read-only schedule tasks for the configured project. NOTE: Procore's API
// surface varies by plan/version - this targets the documented v1.0
// schedule_tasks endpoint. Verify field names/paths once connected against a
// real project; adjust here if your Procore instance shapes this differently.
export async function listScheduleTasks() {
  if (!isProjectConfigured()) throw new Error('PROCORE_COMPANY_ID / PROCORE_PROJECT_ID not set in .env');
  const data = await procoreGet(`/rest/v1.0/schedule_tasks?project_id=${PROJECT_ID}`);
  const tasks = Array.isArray(data) ? data : data.schedule_tasks || [];
  return tasks.map(t => ({
    id: t.id,
    name: t.name || t.title,
    startDate: t.start_date,
    endDate: t.end_date || t.finish_date,
    percentComplete: t.percent_complete ?? null,
  }));
}

// Read-only daily log summary for a given date (defaults to today). NOTE:
// same caveat as above - Procore's Daily Log tool has many sub-resources
// (manpower, notes, weather, deliveries...); this surfaces the common ones.
export async function getDailyLog(date) {
  if (!isProjectConfigured()) throw new Error('PROCORE_COMPANY_ID / PROCORE_PROJECT_ID not set in .env');
  const logDate = date || new Date().toISOString().slice(0, 10);
  const data = await procoreGet(`/rest/v1.0/projects/${PROJECT_ID}/daily_logs?log_date=${logDate}`);
  return {
    date: logDate,
    notes: (data.notes_logs || []).map(n => n.notes || n.comment).filter(Boolean),
    manpowerCount: Array.isArray(data.manpower_logs)
      ? data.manpower_logs.reduce((sum, m) => sum + (m.worker_count || 0), 0)
      : null,
    raw: data,
  };
}
