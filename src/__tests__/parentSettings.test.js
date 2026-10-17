import { describe, expect, it } from 'vitest'
import { dateKey, isOverLimit, usageForToday } from '../services/parentSettings'

const day1 = new Date(2026, 9, 17, 10, 0)
const day2 = new Date(2026, 9, 18, 9, 0)

describe('usageForToday', () => {
  it('starts fresh with no saved usage', () => {
    expect(usageForToday(null, day1)).toEqual({ date: '2026-10-17', seconds: 0, bonusMinutes: 0 })
  })

  it('keeps usage from the same day', () => {
    const stored = { date: dateKey(day1), seconds: 120, bonusMinutes: 15 }
    expect(usageForToday(stored, day1)).toEqual(stored)
  })

  it('resets on a new day', () => {
    const stored = { date: dateKey(day1), seconds: 9999, bonusMinutes: 15 }
    expect(usageForToday(stored, day2)).toEqual({ date: '2026-10-18', seconds: 0, bonusMinutes: 0 })
  })
})

describe('isOverLimit', () => {
  it('never limits when the limit is off', () => {
    expect(isOverLimit({ seconds: 1e6, bonusMinutes: 0 }, 0)).toBe(false)
  })

  it('counts extra minutes given by a grown-up', () => {
    expect(isOverLimit({ seconds: 30 * 60, bonusMinutes: 0 }, 30)).toBe(true)
    expect(isOverLimit({ seconds: 30 * 60, bonusMinutes: 15 }, 30)).toBe(false)
    expect(isOverLimit({ seconds: 45 * 60, bonusMinutes: 15 }, 30)).toBe(true)
  })
})
