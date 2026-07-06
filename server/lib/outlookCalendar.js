import { getValidToken } from './outlookAuth.js';

export async function listUpcomingEvents(maxResults = 10) {
  const token = await getValidToken();
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // next 30 days
  const params = new URLSearchParams({
    startDateTime: now.toISOString(),
    endDateTime: end.toISOString(),
    $orderby: 'start/dateTime',
    $top: String(maxResults),
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
  });
  if (!res.ok) throw new Error(`Outlook Calendar API error: ${res.status}`);
  const data = await res.json();
  return (data.value || []).map(e => ({
    id: `outlook-${e.id}`,
    title: e.subject || '(no title)',
    start: e.start?.dateTime ? `${e.start.dateTime}Z` : e.start?.dateTime,
    allDay: !!e.isAllDay,
    source: 'outlook',
    link: e.webLink || null,
  }));
}
