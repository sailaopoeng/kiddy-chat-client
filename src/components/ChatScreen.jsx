import { useState, useRef, useEffect } from 'react'
import { sendQuery } from '../services/api'
import SettingsModal from './SettingsModal'
import './ChatScreen.css'

// Component to format AI messages for better readability
const MessageText = ({ text, type }) => {
  if (type === 'user') {
    return <div className="message-text user-text">{text}</div>
  }

  // For AI messages, enhance formatting
  const formatTextForKids = (text) => {
    // Add line breaks after sentences
    let formatted = text.replace(/([.!?])\s+/g, '$1\n\n')
    
    // Add line breaks before numbered lists
    formatted = formatted.replace(/(\d+\.)\s*/g, '\n$1 ')
    
    // Add line breaks before bullet points
    formatted = formatted.replace(/([•\-\*])\s*/g, '\n$1 ')
    
    // Clean up multiple line breaks
    formatted = formatted.replace(/\n{3,}/g, '\n\n')
    
    return formatted.trim()
  }

  const formattedText = formatTextForKids(text)

  // Simple text formatting without markdown for now
  const renderFormattedText = (text) => {
    return text.split('\n').map((line, index) => {
      if (line.trim() === '') {
        return <br key={index} />
      }
      return (
        <p key={index} style={{ 
          margin: '0 0 12px 0', 
          lineHeight: '1.6',
          fontSize: '1.1rem'
        }}>
          {line}
        </p>
      )
    })
  }

  return (
    <div className="message-text ai-text">
      {renderFormattedText(formattedText)}
    </div>
  )
}

const ChatScreen = ({ sessionId, kidName }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: `Hi ${kidName}! 🌟 I'm so excited to chat with you! What would you like to talk about today?`,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: text.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const { response } = await sendQuery(sessionId, text.trim())

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: response || 'Sorry, I didn\'t quite understand that. Can you try asking in a different way?',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: error.message || 'Oops! Something went wrong. Let\'s try that again! 🔄',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputText)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="robot-avatar">🤖</div>
            <div className="header-info">
              <h2>Chatting with AI Buddy</h2>
              <p>Hi {kidName}! 👋</p>
            </div>
          </div>
          <button 
            className="settings-btn" 
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}-message`}>
            <div className="message-avatar">
              {message.type === 'ai' ? '🤖' : '👦'}
            </div>
            <div className="message-content">
              <MessageText text={message.text} type={message.type} />
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai-message loading-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
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
        <form onSubmit={handleSubmit} className="message-form">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... 💭"
              className="message-input"
              disabled={isLoading}
              maxLength={500}
              autoFocus
            />
            <button
              type="submit"
              className="send-button"
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? '⏳' : '🚀'}
            </button>
          </div>
        </form>
        
        <div className="input-hints">
          <div className="hint">
            <span className="hint-mobile">💡 Fun facts!</span>
            <span className="hint-desktop">💡 Try asking: "Tell me a fun fact!"</span>
          </div>
          <div className="hint">
            <span className="hint-mobile">📚 Homework help</span>
            <span className="hint-desktop">📚 Or: "Help me with my homework"</span>
          </div>
          <div className="hint">
            <span className="hint-mobile">🎮 Word games!</span>
            <span className="hint-desktop">🎮 Or: "Let's play a word game!"</span>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sessionId={sessionId}
        username={kidName}
        messages={messages}
      />
    </div>
  )
}

export default ChatScreen
