import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

router.get('/summary', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  const overdueCompliance = db.prepare(`
    SELECT * FROM compliance_items WHERE next_due < ? ORDER BY next_due ASC
  `).all(today);

  const upcomingCompliance = db.prepare(`
    SELECT * FROM compliance_items WHERE next_due >= ? AND next_due <= ? ORDER BY next_due ASC
  `).all(today, in7Str);

  const openIncidents = db.prepare(`
    SELECT * FROM incidents WHERE status = 'open' ORDER BY incident_date DESC
  `).all();

  const upcomingJobs = db.prepare(`
    SELECT * FROM jobs WHERE status = 'scheduled' AND date(start_time) >= date(?) AND date(start_time) <= date(?)
    ORDER BY start_time ASC
  `).all(today, in7Str);

  res.json({
    overdueCompliance,
    upcomingCompliance,
    openIncidents,
    upcomingJobs: upcomingJobs.map(r => ({ ...r, crew_ids: JSON.parse(r.crew_ids_json) })),
    counts: {
      overdueCompliance: overdueCompliance.length,
      openIncidents: openIncidents.length,
      upcomingJobs: upcomingJobs.length,
    }
  });
});

export default router;
