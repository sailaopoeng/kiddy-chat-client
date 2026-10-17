import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { sendQuery, getConversationStarters } from '../services/api'
import { session as sessionStore } from '../services/storage'
import { saveConversation } from '../services/chatHistory'
import { useSpeech } from '../hooks/useSpeech'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { useDailyTimeLimit } from '../hooks/useDailyTimeLimit'
import { stripEmoji } from '../utils/text'
import { BOT_AVATAR, DEFAULT_KID_AVATAR, MAX_MESSAGE_LENGTH } from '../constants'
import SettingsModal from './SettingsModal'
import './ChatScreen.css'

// Only simple formatting is rendered. Raw HTML, links and images from the AI are
// dropped (their text is kept), so a reply can't send a child somewhere else.
const ALLOWED_MARKDOWN = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const Heading = ({ children }) => <p className="ai-heading"><strong>{children}</strong></p>
const MARKDOWN_COMPONENTS = { h1: Heading, h2: Heading, h3: Heading, h4: Heading, h5: Heading, h6: Heading }

const COUNTER_THRESHOLD = MAX_MESSAGE_LENGTH - 100
const FALLBACK_REPLY = "Sorry, I didn't quite understand that. Can you try asking in a different way?"

let idCounter = 0
const newId = () => `${Date.now()}-${idCounter++}`
const messagesKey = (sessionId) => `kiddy-messages-${sessionId}`

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const MessageText = ({ text, type }) => {
  if (type === 'user') {
    return <div className="message-text user-text">{text}</div>
  }
  return (
    <div className="message-text ai-text">
      <Markdown
        allowedElements={ALLOWED_MARKDOWN}
        unwrapDisallowed
        skipHtml
        components={MARKDOWN_COMPONENTS}
      >
        {text}
      </Markdown>
    </div>
  )
}

const loadMessages = (sessionId, kidName) => {
  const saved = sessionStore.getJSON(messagesKey(sessionId), null)
  if (Array.isArray(saved) && saved.length > 0) return saved
  return [{
    id: 'welcome',
    type: 'ai',
    text: `Hi ${kidName}! 🌟 I'm so excited to chat with you! What would you like to talk about today?`,
    timestamp: new Date().toISOString(),
  }]
}

const ChatScreen = ({ sessionId, kidName, avatar = DEFAULT_KID_AVATAR, onNewChat }) => {
  const [messages, setMessages] = useState(() => loadMessages(sessionId, kidName))
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [conversationStarters, setConversationStarters] = useState([])
  const [isLoadingStarters, setIsLoadingStarters] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const speech = useSpeech()
  const { timeUp, refresh: refreshTimeLimit } = useDailyTimeLimit()
  const voice = useVoiceInput((heard) =>
    setInputText((prev) => (prev ? `${prev} ${heard}` : heard).slice(0, MAX_MESSAGE_LENGTH))
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Keep the chat across page refreshes, and save it for grown-ups to review.
  useEffect(() => {
    sessionStore.setJSON(messagesKey(sessionId), messages)
    saveConversation({ sessionId, kidName, messages })
  }, [messages, sessionId, kidName])

  // Put the cursor back in the box once a reply has arrived.
  useEffect(() => {
    if (!isLoading && !timeUp) inputRef.current?.focus()
  }, [isLoading, timeUp])

  useEffect(() => {
    let cancelled = false
    getConversationStarters().then((starters) => {
      if (cancelled) return
      setConversationStarters(starters)
      setIsLoadingStarters(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const addMessage = (message) => {
    setMessages((prev) => [...prev, { id: newId(), timestamp: new Date().toISOString(), ...message }])
  }

  const requestReply = async (text) => {
    setIsLoading(true)
    try {
      const { response } = await sendQuery(sessionId, text)
      addMessage({ type: 'ai', text: response || FALLBACK_REPLY })
    } catch (error) {
      console.error('Error sending message:', error)
      const sessionExpired = Boolean(error.isSessionExpired)
      addMessage({
        type: 'ai',
        isError: true,
        text: error.message || "Oops! Something went wrong. Let's try that again! 🔄",
        retryText: sessionExpired ? undefined : text,
        sessionExpired,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = (text) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading || timeUp) return
    addMessage({ type: 'user', text: trimmed })
    setInputText('')
    requestReply(trimmed)
  }

  const handleRetry = (failedMessage) => {
    if (isLoading || timeUp) return
    setMessages((prev) => prev.filter((message) => message.id !== failedMessage.id))
    requestReply(failedMessage.retryText)
  }

  const startNewChat = ({ confirm = true } = {}) => {
    const hasChatted = messages.some((message) => message.type === 'user')
    if (confirm && hasChatted && !window.confirm('Start a new chat? This chat will be cleared from the screen.')) {
      return
    }
    speech.stop()
    sessionStore.remove(messagesKey(sessionId))
    onNewChat()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputText)
  }

  const handleStarterClick = (starter) => {
    setInputText(stripEmoji(starter))
    inputRef.current?.focus()
  }

  const closeSettings = () => {
    setIsSettingsOpen(false)
    refreshTimeLimit()
  }

  const lastMessageId = messages[messages.length - 1]?.id

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="robot-avatar" aria-hidden="true">{BOT_AVATAR}</div>
            <div className="header-info">
              <h2>Chatting with AI Buddy</h2>
              <p>Hi {kidName}! 👋</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="header-btn new-chat-btn"
              onClick={() => startNewChat()}
              aria-label="Start a new chat"
              title="New chat"
            >
              🆕
            </button>
            <button
              type="button"
              className="header-btn settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Grown-up settings"
              title="Grown-up settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <div className="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}-message`}>
            <div className="message-avatar" aria-hidden="true">
              {message.type === 'ai' ? BOT_AVATAR : avatar}
            </div>
            <div className="message-content">
              <MessageText text={message.text} type={message.type} />
              <div className="message-meta">
                <span className="message-time">{formatTime(message.timestamp)}</span>
                {message.type === 'ai' && speech.supported && !message.isError && (
                  <button
                    type="button"
                    className="message-action-btn"
                    onClick={() => (speech.speakingId === message.id ? speech.stop() : speech.speak(message.id, message.text))}
                    aria-label={speech.speakingId === message.id ? 'Stop reading' : 'Read this message out loud'}
                  >
                    {speech.speakingId === message.id ? '⏹️ Stop' : '🔊 Read to me'}
                  </button>
                )}
                {message.retryText && message.id === lastMessageId && (
                  <button
                    type="button"
                    className="message-action-btn"
                    onClick={() => handleRetry(message)}
                    disabled={isLoading || timeUp}
                  >
                    🔄 Try again
                  </button>
                )}
                {message.sessionExpired && (
                  <button
                    type="button"
                    className="message-action-btn primary"
                    onClick={() => startNewChat({ confirm: false })}
                  >
                    🆕 Start a new chat
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message ai-message loading-message">
            <div className="message-avatar" aria-hidden="true">{BOT_AVATAR}</div>
            <div className="message-content" aria-label="AI Buddy is typing">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        {timeUp ? (
          <div className="time-up-banner" role="status">
            ⏰ That's all the chat time for today, {kidName}! Come back tomorrow for more fun. 🌙
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="message-form">
              <div className="input-wrapper">
                <label htmlFor="chat-input" className="visually-hidden">Type your message</label>
                <input
                  id="chat-input"
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={voice.listening ? "I'm listening... 👂" : 'Type your message here... 💭'}
                  className="message-input"
                  disabled={isLoading}
                  maxLength={MAX_MESSAGE_LENGTH}
                  autoComplete="off"
                  autoFocus
                />
                {voice.supported && (
                  <button
                    type="button"
                    className={`mic-button ${voice.listening ? 'listening' : ''}`}
                    onClick={voice.listening ? voice.stop : voice.start}
                    disabled={isLoading}
                    aria-label={voice.listening ? 'Stop listening' : 'Talk instead of typing'}
                    aria-pressed={voice.listening}
                  >
                    {voice.listening ? '👂' : '🎤'}
                  </button>
                )}
                <button
                  type="submit"
                  className="send-button"
                  disabled={isLoading || !inputText.trim()}
                  aria-label="Send message"
                >
                  {isLoading ? '⏳' : '🚀'}
                </button>
              </div>
              {inputText.length >= COUNTER_THRESHOLD && (
                <div
                  className={`char-counter ${inputText.length >= MAX_MESSAGE_LENGTH ? 'at-limit' : ''}`}
                  aria-live="polite"
                >
                  {inputText.length}/{MAX_MESSAGE_LENGTH} letters
                </div>
              )}
            </form>

            <div className="conversation-starters">
              {isLoadingStarters ? (
                <div className="starters-loading">
                  <span>Loading conversation ideas... ✨</span>
                </div>
              ) : (
                conversationStarters.slice(0, 3).map((starter, index) => (
                  <button
                    key={index}
                    type="button"
                    className="starter-button"
                    onClick={() => handleStarterClick(starter)}
                    disabled={isLoading}
                    title={starter}
                  >
                    {starter}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {isSettingsOpen && (
        <SettingsModal
          onClose={closeSettings}
          sessionId={sessionId}
          username={kidName}
          messages={messages}
          onSettingsChanged={refreshTimeLimit}
        />
      )}
    </div>
  )
}

export default ChatScreen
