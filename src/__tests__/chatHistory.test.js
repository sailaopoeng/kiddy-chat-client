import { describe, expect, it } from 'vitest'
import { formatTranscript, transcriptFileName, upsertConversation } from '../services/chatHistory'

describe('upsertConversation', () => {
  it('puts the newest chat first and replaces an older copy', () => {
    const list = [{ sessionId: 'a' }, { sessionId: 'b' }]
    const result = upsertConversation(list, { sessionId: 'b', updated: true })
    expect(result).toEqual([{ sessionId: 'b', updated: true }, { sessionId: 'a' }])
  })

  it('keeps only the most recent chats', () => {
    const list = [{ sessionId: 'a' }, { sessionId: 'b' }]
    expect(upsertConversation(list, { sessionId: 'c' }, 2).map((c) => c.sessionId)).toEqual(['c', 'a'])
  })
})

describe('formatTranscript', () => {
  it('labels who said what', () => {
    const text = formatTranscript({
      kidName: 'Mia',
      messages: [
        { type: 'user', text: 'Hi!' },
        { type: 'ai', text: 'Hello Mia!' },
      ],
    })
    expect(text).toContain('Chat History for Mia')
    expect(text).toContain('] Mia: Hi!')
    expect(text).toContain('] AI Buddy: Hello Mia!')
  })
})

describe('transcriptFileName', () => {
  it('makes a safe file name', () => {
    expect(transcriptFileName('Mia / Rose', new Date('2026-10-17T12:00:00Z'))).toBe(
      'chat-history-Mia_Rose-2026-10-17.txt'
    )
  })
})
