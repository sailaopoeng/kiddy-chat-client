// Grown-up settings saved in this browser: extra instructions, the daily
// time limit, and the Settings lock.

import { addPrompt } from './api'
import { local } from './storage'
import { isGateLocked, nextGateStateAfterFailure } from '../utils/parentGate'

const KEYS = {
  instructions: 'chatbot-additional-prompt', // kept from earlier versions so saved text still loads
  dailyLimit: 'kiddy-daily-limit-minutes',
  usage: 'kiddy-usage-today',
  gate: 'kiddy-parent-gate',
}

export const DAILY_LIMIT_OPTIONS = [0, 15, 30, 45, 60, 90, 120]
export const BONUS_MINUTES = 15

// ---- Extra instructions ----

export const getParentInstructions = () => local.getString(KEYS.instructions, '')

export const saveParentInstructions = (text) => local.setString(KEYS.instructions, text)

export const clearParentInstructions = () => local.remove(KEYS.instructions)

/** Sends the saved instructions to a new session so they keep working after a refresh or new chat. */
export async function applyParentInstructions(sessionId) {
  const instructions = getParentInstructions().trim()
  if (!instructions) return false
  await addPrompt(sessionId, instructions)
  return true
}

// ---- Daily time limit ----

export const getDailyLimitMinutes = () => {
  const minutes = Number(local.getString(KEYS.dailyLimit, '0'))
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0
}

export const setDailyLimitMinutes = (minutes) => local.setString(KEYS.dailyLimit, String(minutes))

/** Local calendar date, e.g. "2026-10-17". */
export function dateKey(now) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Today's usage, starting fresh when the stored record is from another day. */
export function usageForToday(stored, now) {
  const date = dateKey(now)
  if (!stored || stored.date !== date) return { date, seconds: 0, bonusMinutes: 0 }
  return {
    date,
    seconds: Number(stored.seconds) || 0,
    bonusMinutes: Number(stored.bonusMinutes) || 0,
  }
}

export const isOverLimit = (usage, limitMinutes) =>
  limitMinutes > 0 && usage.seconds >= (limitMinutes + usage.bonusMinutes) * 60

export const readUsage = (now = new Date()) => usageForToday(local.getJSON(KEYS.usage, null), now)

export function addUsageSeconds(seconds, now = new Date()) {
  const usage = readUsage(now)
  local.setJSON(KEYS.usage, { ...usage, seconds: usage.seconds + seconds })
}

export function addBonusMinutes(minutes, now = new Date()) {
  const usage = readUsage(now)
  local.setJSON(KEYS.usage, { ...usage, bonusMinutes: usage.bonusMinutes + minutes })
}

export const isTimeUpToday = (now = new Date()) => isOverLimit(readUsage(now), getDailyLimitMinutes())

// ---- Settings lock ----

const readGateState = () => local.getJSON(KEYS.gate, { failures: 0, lockedUntil: 0 })

export const isSettingsLocked = (now = Date.now()) => isGateLocked(readGateState(), now)

/** Records a wrong answer and returns the new state ({ failures, lockedUntil }). */
export function recordGateFailure(now = Date.now()) {
  const state = nextGateStateAfterFailure(readGateState(), now)
  local.setJSON(KEYS.gate, state)
  return state
}

export const recordGateSuccess = () => local.remove(KEYS.gate)
