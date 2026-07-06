import ical from 'node-ical';

// Expands a VEVENT into any occurrences that fall within [rangeStart, rangeEnd] —
// a single occurrence for one-off events, or each recurrence for events with
// an RRULE (respecting per-occurrence overrides in event.recurrences).
function occurrencesInRange(event, rangeStart, rangeEnd) {
  const out = [];

  if (event.rrule) {
    const duration = event.start && event.end ? event.end.getTime() - event.start.getTime() : 0;
    const dates = event.rrule.between(rangeStart, rangeEnd, true);
    for (const start of dates) {
      const dayKey = start.toISOString().slice(0, 10);
      if (event.recurrences && event.recurrences[dayKey]) continue; // overridden below
      out.push({ start, end: duration ? new Date(start.getTime() + duration) : null });
    }
    if (event.recurrences) {
      for (const rec of Object.values(event.recurrences)) {
        if (rec.start >= rangeStart && rec.start <= rangeEnd) {
          out.push({ start: rec.start, end: rec.end || null, summary: rec.summary });
        }
      }
    }
  } else if (event.start && event.start >= rangeStart && event.start <= rangeEnd) {
    out.push({ start: event.start, end: event.end || null });
  }

  return out;
}

// Fetches and parses a private/secret .ics feed URL (the kind Google Calendar
// and Outlook both let you copy from their own calendar settings — no OAuth,
// no app registration, just a URL). Returns upcoming occurrences in the next
// 30 days, normalized to the same shape as the Google/Outlook API clients.
export async function listUpcomingFromIcs(url, sourceLabel, maxResults = 10) {
  const data = await ical.async.fromURL(url);
  const now = new Date();
  const rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const out = [];
  for (const event of Object.values(data)) {
    if (event.type !== 'VEVENT') continue;
    for (const occ of occurrencesInRange(event, now, rangeEnd)) {
      out.push({
        id: `${sourceLabel}-${event.uid}-${occ.start.toISOString()}`,
        title: occ.summary || event.summary || '(no title)',
        start: occ.start.toISOString(),
        allDay: event.datetype === 'date',
        source: sourceLabel,
        link: event.url || null,
      });
    }
  }

  out.sort((a, b) => new Date(a.start) - new Date(b.start));
  return out.slice(0, maxResults);
}
