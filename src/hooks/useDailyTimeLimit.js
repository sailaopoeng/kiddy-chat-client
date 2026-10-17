import { useCallback, useEffect, useState } from 'react'
import { addUsageSeconds, isTimeUpToday } from '../services/parentSettings'

const TICK_SECONDS = 15

/** Counts chat time while the page is visible and reports when today's limit is reached. */
export function useDailyTimeLimit() {
  const [timeUp, setTimeUp] = useState(() => isTimeUpToday())

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') addUsageSeconds(TICK_SECONDS)
      setTimeUp(isTimeUpToday())
    }, TICK_SECONDS * 1000)
    return () => clearInterval(timer)
  }, [])

  const refresh = useCallback(() => setTimeUp(isTimeUpToday()), [])

  return { timeUp, refresh }
}
