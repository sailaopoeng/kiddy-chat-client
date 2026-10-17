// Talks to the Kiddy Chat backend.
// In development requests go through the Vite proxy at /api (see vite.config.js).
// In production they go straight to VITE_API_URL, which the build requires.

const DEFAULT_TIMEOUT_MS = 30000

const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
  : '/api'

const TIMEOUT_MS = Number.parseInt(import.meta.env.VITE_API_TIMEOUT, 10) || DEFAULT_TIMEOUT_MS

export const DEFAULT_STARTERS = [
  'Tell me a fun fact! 🌟',
  'Help me with my homework 📚',
  "Let's play a word game! 🎮",
  "What's your favorite joke? 😄",
]

export class ApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
  }

  get isSessionExpired() {
    return this.status === 401 || this.status === 403
  }
}

/** Turns a failed request into a message a child can understand. */
export function friendlyErrorMessage({ status, timedOut = false, network = false } = {}) {
  if (timedOut) return "I'm thinking a bit too slowly right now! Please try again. 🐢"
  if (network) return "I can't connect to my brain right now! Please check your internet connection or try again later. 🔌"
  if (status === 401 || status === 403) return "Oops! My memory got confused. Let's start a new chat! 🔄"
  if (status === 404) return "I couldn't find what you're looking for! 🔍"
  if (status === 422) return "I didn't understand that format. Can you try asking differently? 🤔"
  if (status === 429) return "Whoa, that's a lot of questions! Let's take a little break and try again in a minute. ⏳"
  if (status >= 500) return 'My brain is having a hiccup! Please try again in a moment. 🤯'
  return "Oops! Something went wrong. Let's try again! 🤖"
}

const networkError = (error) => {
  const timedOut = error?.name === 'AbortError'
  return new ApiError(friendlyErrorMessage({ timedOut, network: !timedOut }), { cause: error })
}

async function request(path, { method = 'GET', body, sessionId, headers: extraHeaders } = {}) {
  const headers = { ...extraHeaders }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (sessionId) headers.Authorization = `Bearer ${sessionId}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    console.error(`API ${method} ${path} failed:`, error)
    throw networkError(error)
  } finally {
    clearTimeout(timer)
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    console.error(`API ${method} ${path} returned ${response.status}:`, data)
    throw new ApiError(friendlyErrorMessage({ status: response.status }), { status: response.status })
  }

  return data ?? {}
}

/**
 * Start a new chat session.
 * @param {string} nickname - What the child wants to be called
 * @returns {Promise<{sessionId: string, message: string, username: string}>}
 */
export async function initiateSession(nickname) {
  const data = await request('/initiate-session', {
    method: 'POST',
    body: { username: nickname.trim() },
  })
  if (!data.session_id) {
    throw new ApiError(friendlyErrorMessage())
  }
  return {
    sessionId: data.session_id,
    message: data.message,
    username: data.username,
  }
}

/**
 * Send the child's message and get the AI's reply.
 * @param {string} sessionId - Session ID, sent as the Bearer token
 * @param {string} message - The child's message
 * @returns {Promise<{response: string, sessionId: string, username: string}>}
 */
export async function sendQuery(sessionId, message) {
  const data = await request('/query', {
    method: 'POST',
    body: { message: message.trim() },
    sessionId,
  })
  return {
    response: data.response,
    sessionId: data.session_id,
    username: data.username,
  }
}

/** Parses one Server-Sent Events block ("event: ...\ndata: {...}"). */
export function parseSseBlock(block) {
  let event = 'message'
  const dataLines = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }
  if (dataLines.length === 0) return null
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return null
  }
}

/**
 * Like sendQuery, but shows the reply as it is written.
 * onDelta is called with each new piece of text. Resolves with the final reply,
 * which can differ from the pieces if the server's safety check replaced it.
 * Falls back to sendQuery when the server has no streaming endpoint.
 * @returns {Promise<string>}
 */
export async function streamQuery(sessionId, message, onDelta) {
  const controller = new AbortController()
  let timer
  // The timeout restarts whenever data arrives, so long replies aren't cut off.
  const restartTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  }
  restartTimer()

  let response
  try {
    response = await fetch(`${BASE_URL}/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify({ message: message.trim() }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    console.error('API POST /query/stream failed:', error)
    throw networkError(error)
  }

  if (response.status === 404 || response.status === 405) {
    clearTimeout(timer)
    const { response: reply } = await sendQuery(sessionId, message)
    return reply
  }

  if (!response.ok || !response.body) {
    clearTimeout(timer)
    console.error(`API POST /query/stream returned ${response.status}`)
    throw new ApiError(friendlyErrorMessage({ status: response.status }), { status: response.status })
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let finalReply = null
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      restartTimer()
      buffer += value.replace(/\r\n/g, '\n')

      let end
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const parsed = parseSseBlock(buffer.slice(0, end))
        buffer = buffer.slice(end + 2)
        if (parsed?.event === 'delta' && parsed.data.text) onDelta(parsed.data.text)
        if (parsed?.event === 'done') finalReply = parsed.data.response ?? ''
      }
    }
  } catch (error) {
    console.error('Reading the reply stream failed:', error)
    throw networkError(error)
  } finally {
    clearTimeout(timer)
  }

  // The stream ended without its final event: the connection dropped.
  if (finalReply === null) throw new ApiError(friendlyErrorMessage({ network: true }))
  return finalReply
}

/**
 * Conversation starter ideas. Falls back to built-in ideas if the server
 * can't be reached, so this never throws.
 * @returns {Promise<string[]>}
 */
export async function getConversationStarters() {
  try {
    const data = await request('/conversation-starters')
    const starters = data.conversation_starters
    return Array.isArray(starters) && starters.length > 0 ? starters : DEFAULT_STARTERS
  } catch (error) {
    console.warn('Using built-in conversation starters:', error.message)
    return DEFAULT_STARTERS
  }
}

/**
 * The server's safety configuration (system prompt and blocked words).
 * @returns {Promise<object|null>} null when it can't be loaded
 */
export async function getFilterInfo() {
  try {
    return await request('/filter-info')
  } catch (error) {
    console.warn('Could not load filter info:', error.message)
    return null
  }
}

/**
 * Whether the server wants a grown-up PIN before instructions can change.
 * Older servers (or an unreachable one) count as "no PIN".
 * @returns {Promise<{pinRequired: boolean}>}
 */
export async function getParentStatus() {
  try {
    const data = await request('/parent/status')
    return { pinRequired: Boolean(data.pin_required) }
  } catch {
    return { pinRequired: false }
  }
}

/**
 * Check the grown-up PIN. Resolves with a short-lived parent token.
 * Rejects with ApiError status 401 (wrong PIN) or 429 (too many tries).
 * @returns {Promise<string>}
 */
export async function verifyParentPin(pin) {
  const data = await request('/parent/verify', { method: 'POST', body: { pin } })
  return data.parent_token
}

/**
 * Add a grown-up's extra instructions to the current session.
 * When the server has a grown-up PIN, pass either the parentToken from
 * verifyParentPin, or the signature returned when the same text was saved.
 * @param {string} sessionId - Session ID, sent as the Bearer token
 * @param {string} prompt - The extra instructions
 * @returns {Promise<{success: boolean, message: string, signature: string|null, data: object}>}
 */
export async function addPrompt(sessionId, prompt, { parentToken, signature } = {}) {
  const body = { additional_prompt: prompt.trim() }
  if (signature) body.signature = signature
  const data = await request('/session/add-prompt', {
    method: 'POST',
    body,
    sessionId,
    headers: parentToken ? { 'X-Parent-Token': parentToken } : undefined,
  })
  return {
    success: true,
    message: data.message || 'Additional prompt saved successfully!',
    signature: data.signature ?? null,
    data,
  }
}
