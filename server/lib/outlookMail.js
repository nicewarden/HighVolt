import { getValidToken } from './outlookAuth.js';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.oga', '.webm', '.aac', '.flac', '.mp4'];

function looksLikeAudio(attachment) {
  if (attachment.contentType && attachment.contentType.startsWith('audio/')) return true;
  const name = (attachment.name || '').toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => name.endsWith(ext));
}

// Scans the most recent inbox messages for ones whose subject contains the
// given text and that have an attachment - no server-side OData filter, just
// a plain recent-messages fetch filtered locally, since a personal inbox at
// this scale doesn't need pagination or fuzzy search.
export async function findMatchingEmails(subjectContains) {
  const token = await getValidToken();
  const params = new URLSearchParams({
    $top: '25',
    $orderby: 'receivedDateTime desc',
    $select: 'id,subject,receivedDateTime,hasAttachments',
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Outlook Mail API error: ${res.status}`);
  const data = await res.json();
  const needle = subjectContains.toLowerCase();
  return (data.value || []).filter(m => m.hasAttachments && (m.subject || '').toLowerCase().includes(needle));
}

export async function getAudioAttachments(messageId) {
  const token = await getValidToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Outlook Mail API error: ${res.status}`);
  const data = await res.json();
  return (data.value || []).filter(a => a['@odata.type'] === '#microsoft.graph.fileAttachment' && looksLikeAudio(a));
}

// Recent inbox messages whose sender name or address contains any of the
// given company names - same "fetch recent, filter locally" approach as
// findMatchingEmails, used by the Dashboard's Company Mail widget so key
// senders don't get lost in a busy inbox.
export async function findEmailsFromSenders(matchTerms) {
  const token = await getValidToken();
  const params = new URLSearchParams({
    $top: '50',
    $orderby: 'receivedDateTime desc',
    $select: 'id,subject,from,receivedDateTime,bodyPreview,webLink',
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Outlook Mail API error: ${res.status}`);
  const data = await res.json();
  const needles = matchTerms.map(t => t.toLowerCase());
  return (data.value || [])
    .filter(m => {
      const name = (m.from?.emailAddress?.name || '').toLowerCase();
      const address = (m.from?.emailAddress?.address || '').toLowerCase();
      return needles.some(n => name.includes(n) || address.includes(n));
    })
    .map(m => ({
      id: m.id,
      subject: m.subject || '(no subject)',
      from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Unknown sender',
      fromAddress: m.from?.emailAddress?.address || '',
      receivedAt: m.receivedDateTime,
      preview: m.bodyPreview || '',
      webLink: m.webLink || null,
    }));
}

// Inbox list for the Email tab - most recent messages, newest first.
export async function listInbox({ top = 25, skip = 0 } = {}) {
  const token = await getValidToken();
  const params = new URLSearchParams({
    $top: String(top),
    $skip: String(skip),
    $orderby: 'receivedDateTime desc',
    $select: 'id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments',
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Outlook Mail API error: ${res.status}`);
  const data = await res.json();
  return (data.value || []).map(m => ({
    id: m.id,
    subject: m.subject || '(no subject)',
    from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Unknown sender',
    fromAddress: m.from?.emailAddress?.address || '',
    receivedAt: m.receivedDateTime,
    preview: m.bodyPreview || '',
    isRead: !!m.isRead,
    hasAttachments: !!m.hasAttachments,
  }));
}

// Full message body for the Email tab's reading pane.
export async function getMessage(messageId) {
  const token = await getValidToken();
  const params = new URLSearchParams({
    $select: 'id,subject,from,toRecipients,receivedDateTime,body,hasAttachments',
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Outlook Mail API error: ${res.status}`);
  const m = await res.json();
  return {
    id: m.id,
    subject: m.subject || '(no subject)',
    from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Unknown sender',
    fromAddress: m.from?.emailAddress?.address || '',
    to: (m.toRecipients || []).map(r => r.emailAddress?.address).filter(Boolean),
    receivedAt: m.receivedDateTime,
    bodyHtml: m.body?.contentType === 'html' ? m.body.content : null,
    bodyText: m.body?.contentType === 'text' ? m.body.content : null,
  };
}

// Composes and sends a new email from the Email tab. Not a reply-to-thread -
// just a plain new message, kept simple for a personal-use inbox.
export async function sendMail({ to, subject, body }) {
  const token = await getValidToken();
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'text', content: body },
        toRecipients: to.map(address => ({ emailAddress: { address } })),
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to send email (${res.status}): ${text || res.statusText}`);
  }
}
