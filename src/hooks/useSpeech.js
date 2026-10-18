import { useCallback, useEffect, useState } from 'react'
import { toSpeechText } from '../utils/text'

const isSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Reads messages aloud with the browser's built-in voice. */
export function useSpeech() {
  const supported = isSupported()
  const [speakingId, setSpeakingId] = useState(null)

  // Stop talking when the chat screen goes away.
  useEffect(() => () => {
    if (isSupported()) window.speechSynthesis.cancel()
  }, [])

  const stop = useCallback(() => {
    if (!isSupported()) return
    window.speechSynthesis.cancel()
    setSpeakingId(null)
  }, [])

  const speak = useCallback((id, text) => {
    if (!isSupported()) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(toSpeechText(text))
    utterance.rate = 0.95
    utterance.pitch = 1.1
    const finish = () => setSpeakingId((current) => (current === id ? null : current))
    utterance.onend = finish
    utterance.onerror = finish

    setSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }, [])

  return { supported, speakingId, speak, stop }
}
