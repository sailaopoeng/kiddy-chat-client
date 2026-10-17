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

async function request(path, { method = 'GET', body, sessionId } = {}) {
  const headers = {}
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
    const timedOut = error?.name === 'AbortError'
    console.error(`API ${method} ${path} failed:`, error)
    throw new ApiError(friendlyErrorMessage({ timedOut, network: !timedOut }), { cause: error })
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
 * Add a grown-up's extra instructions to the current session.
 * @param {string} sessionId - Session ID, sent as the Bearer token
 * @param {string} prompt - The extra instructions
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function addPrompt(sessionId, prompt) {
  const data = await request('/session/add-prompt', {
    method: 'POST',
    body: { additional_prompt: prompt.trim() },
    sessionId,
  })
  return {
    success: true,
    message: data.message || 'Additional prompt saved successfully!',
    data,
  }
}
