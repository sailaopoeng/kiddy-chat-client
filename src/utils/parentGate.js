// The grown-up check in front of Settings.
// This only slows children down. Anything that must stay protected
// (like the session's extra instructions) has to be checked by the backend too.

export const MAX_GATE_ATTEMPTS = 3
export const GATE_LOCKOUT_MS = 5 * 60 * 1000

const randomInt = (min, max, random) => Math.floor(random() * (max - min + 1)) + min

/**
 * A two-digit multiplication most adults can do in their head with a moment's
 * thought, but that is well beyond the times tables kids practise.
 */
export function generateGateQuestion(random = Math.random) {
  const a = randomInt(12, 39, random)
  const b = randomInt(11, 19, random)
  return { question: `${a} × ${b} = ?`, answer: a * b }
}

/** Gate state after a wrong answer. Too many in a row locks the gate for a while. */
export function nextGateStateAfterFailure(state, now) {
  const failures = (state?.failures ?? 0) + 1
  if (failures >= MAX_GATE_ATTEMPTS) {
    return { failures: 0, lockedUntil: now + GATE_LOCKOUT_MS }
  }
  return { failures, lockedUntil: 0 }
}

export const isGateLocked = (state, now) => (state?.lockedUntil ?? 0) > now
