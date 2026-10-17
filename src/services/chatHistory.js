// Past chats, saved only in this browser so a grown-up can look back at them.

import { local } from './storage'

const KEY = 'kiddy-chat-history'
export const MAX_SAVED_CHATS = 15
const MAX_MESSAGES_PER_CHAT = 200

/** Puts the conversation first, replacing any older copy of the same session. */
export function upsertConversation(list, conversation, max = MAX_SAVED_CHATS) {
  const others = list.filter((item) => item.sessionId !== conversation.sessionId)
  return [conversation, ...others].slice(0, max)
}

export function listConversations() {
  const list = local.getJSON(KEY, [])
  return Array.isArray(list) ? list : []
}

export const clearConversations = () => local.remove(KEY)

export function saveConversation({ sessionId, kidName, messages }) {
  const kept = messages.filter((message) => !message.isError)
  if (!kept.some((message) => message.type === 'user')) return

  const conversation = {
    sessionId,
    kidName,
    updatedAt: new Date().toISOString(),
    messages: kept
      .slice(-MAX_MESSAGES_PER_CHAT)
      .map(({ type, text, timestamp }) => ({ type, text, timestamp })),
  }

  const list = upsertConversation(listConversations(), conversation)
  // If storage is full, keep the newer half rather than losing this chat.
  if (!local.setJSON(KEY, list)) {
    local.setJSON(KEY, list.slice(0, Math.ceil(list.length / 2)))
  }
}

export function formatTranscript({ kidName, messages }, exportedAt = new Date()) {
  const lines = [
    `Chat History for ${kidName}`,
    `Exported on: ${exportedAt.toLocaleString()}`,
    '='.repeat(50),
    '',
  ]
  for (const message of messages) {
    const time = message.timestamp ? new Date(message.timestamp).toLocaleString() : ''
    const sender = message.type === 'user' ? kidName : 'AI Buddy'
    lines.push(`[${time}] ${sender}: ${message.text}`, '')
  }
  return lines.join('\n')
}

export function transcriptFileName(kidName, date = new Date()) {
  const safeName = kidName.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'kid'
  return `chat-history-${safeName}-${date.toISOString().slice(0, 10)}.txt`
}

export function downloadTextFile(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
