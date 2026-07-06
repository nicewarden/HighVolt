import { getValidToken } from './outlookAuth.js';

let cachedMeId = null;

async function getMyUserId(token) {
  if (cachedMeId) return cachedMeId;
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=id', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph /me error: ${res.status}`);
  const data = await res.json();
  cachedMeId = data.id;
  return cachedMeId;
}

// Surfaces recent @mentions of you across your Teams chats. Checks your most
// recently active chats (not every chat you've ever had, and not channel
// messages - those need extra admin-consented permissions most personal/work
// accounts don't have) for messages that mention you by name.
export async function listRecentMentions({ maxChats = 15, perChatMessages = 15 } = {}) {
  const token = await getValidToken();
  const meId = await getMyUserId(token);

  const chatsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/chats?$top=${maxChats}&$orderby=lastUpdatedDateTime desc&$select=id,topic,chatType,lastUpdatedDateTime`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!chatsRes.ok) throw new Error(`Teams chats API error: ${chatsRes.status}`);
  const chatsData = await chatsRes.json();
  const chats = chatsData.value || [];

  const mentions = [];
  await Promise.all(chats.map(async (chat) => {
    try {
      const msgRes = await fetch(
        `https://graph.microsoft.com/v1.0/chats/${chat.id}/messages?$top=${perChatMessages}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!msgRes.ok) return;
      const msgData = await msgRes.json();
      for (const msg of msgData.value || []) {
        const mentionsMe = (msg.mentions || []).some(m => m.mentioned?.user?.id === meId);
        if (!mentionsMe) continue;
        mentions.push({
          chatId: chat.id,
          chatTopic: chat.topic || (chat.chatType === 'oneOnOne' ? 'Direct message' : 'Group chat'),
          from: msg.from?.user?.displayName || 'Unknown',
          preview: (msg.body?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
          createdAt: msg.createdDateTime,
          webUrl: msg.webUrl || null,
        });
      }
    } catch {
      // A single chat's messages failing to load shouldn't sink the whole list.
    }
  }));

  mentions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return mentions.slice(0, 30);
}
