import { describe, expect, it } from 'vitest'
import {
  GATE_LOCKOUT_MS,
  MAX_GATE_ATTEMPTS,
  generateGateQuestion,
  isGateLocked,
  nextGateStateAfterFailure,
} from '../utils/parentGate'

describe('generateGateQuestion', () => {
  it('asks a two-digit multiplication with the right answer', () => {
    for (let i = 0; i < 200; i++) {
      const { question, answer } = generateGateQuestion()
      const [, a, b] = question.match(/^(\d+) × (\d+) = \?$/)
      expect(Number(a) * Number(b)).toBe(answer)
      expect(Number(a)).toBeGreaterThanOrEqual(12)
      expect(Number(b)).toBeGreaterThanOrEqual(11)
    }
  })

  it('uses the random source it is given', () => {
    expect(generateGateQuestion(() => 0)).toEqual({ question: '12 × 11 = ?', answer: 132 })
  })
})

describe('gate lockout', () => {
  it('locks after too many wrong answers', () => {
    const now = 1_000_000
    let state = { failures: 0, lockedUntil: 0 }
    for (let i = 1; i < MAX_GATE_ATTEMPTS; i++) {
      state = nextGateStateAfterFailure(state, now)
      expect(isGateLocked(state, now)).toBe(false)
    }
    state = nextGateStateAfterFailure(state, now)
    expect(isGateLocked(state, now)).toBe(true)
    expect(isGateLocked(state, now + GATE_LOCKOUT_MS)).toBe(false)
  })

  it('treats missing state as unlocked', () => {
    expect(isGateLocked(null, Date.now())).toBe(false)
    expect(nextGateStateAfterFailure(undefined, 0)).toEqual({ failures: 1, lockedUntil: 0 })
  })
})
