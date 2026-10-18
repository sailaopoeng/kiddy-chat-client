import { useCallback, useEffect, useRef, useState } from 'react'

const getRecognition = () =>
  typeof window === 'undefined' ? undefined : window.SpeechRecognition || window.webkitSpeechRecognition

/**
 * Lets kids talk instead of type, using the browser's speech recognition.
 * Calls onText with what was heard.
 */
export function useVoiceInput(onText) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const onTextRef = useRef(onText)

  useEffect(() => {
    onTextRef.current = onText
  })

  useEffect(() => () => recognitionRef.current?.abort(), [])

  const start = useCallback(() => {
    const Recognition = getRecognition()
    if (!Recognition || recognitionRef.current) return

    const recognition = new Recognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const heard = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim()
      if (heard) onTextRef.current(heard)
    }
    recognition.onerror = (event) => console.warn('Voice input error:', event.error)
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }, [])

  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  return { supported: Boolean(getRecognition()), listening, start, stop }
}
