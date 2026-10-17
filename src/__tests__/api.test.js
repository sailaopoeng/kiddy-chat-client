import { describe, expect, it } from 'vitest'
import { ApiError, friendlyErrorMessage, parseSseBlock } from '../services/api'

describe('friendlyErrorMessage', () => {
  it('explains network and timeout problems', () => {
    expect(friendlyErrorMessage({ network: true })).toMatch(/can't connect/)
    expect(friendlyErrorMessage({ timedOut: true })).toMatch(/too slowly/)
  })

  it('maps HTTP status codes', () => {
    expect(friendlyErrorMessage({ status: 401 })).toMatch(/new chat/)
    expect(friendlyErrorMessage({ status: 429 })).toMatch(/break/)
    expect(friendlyErrorMessage({ status: 503 })).toMatch(/hiccup/)
    expect(friendlyErrorMessage({ status: 400 })).toMatch(/Something went wrong/)
  })
})

describe('ApiError', () => {
  it('knows when the session has expired', () => {
    expect(new ApiError('x', { status: 401 }).isSessionExpired).toBe(true)
    expect(new ApiError('x', { status: 403 }).isSessionExpired).toBe(true)
    expect(new ApiError('x', { status: 500 }).isSessionExpired).toBe(false)
    expect(new ApiError('x').isSessionExpired).toBe(false)
  })
})

describe('parseSseBlock', () => {
  it('reads the event name and JSON data', () => {
    expect(parseSseBlock('event: delta\ndata: {"text":"Hi!"}')).toEqual({ event: 'delta', data: { text: 'Hi!' } })
  })

  it('defaults the event name and ignores bad blocks', () => {
    expect(parseSseBlock('data: {"a":1}')).toEqual({ event: 'message', data: { a: 1 } })
    expect(parseSseBlock(': keep-alive comment')).toBeNull()
    expect(parseSseBlock('event: delta\ndata: not json')).toBeNull()
  })
})
