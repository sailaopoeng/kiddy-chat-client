import { useState, useEffect } from 'react'
import { getFilterInfo, addPrompt } from '../services/api'
import './SettingsModal.css'

// Toast Notification Component
const Toast = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000) // Auto close after 4 seconds
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
        </span>
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose}>×</button>
      </div>
    </div>
  )
}

const SettingsModal = ({ isOpen, onClose, sessionId, username, messages }) => {
  const [step, setStep] = useState('verification') // 'verification' or 'settings'
  const [mathQuestion, setMathQuestion] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')
  const [usedQuestions, setUsedQuestions] = useState(new Set())
  
  // Settings state
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [apiFilterInfo, setApiFilterInfo] = useState(null)
  const [defaultPrompt, setDefaultPrompt] = useState('')
  const [filterWords, setFilterWords] = useState([])
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [additionalSettings, setAdditionalSettings] = useState({})
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: '', isVisible: false })

  // Generate random math question
  const generateMathQuestion = () => {
    const operations = [
      { type: 'add', symbol: '+' },
      { type: 'subtract', symbol: '-' },
      { type: 'multiply', symbol: '×' },
      { type: 'divide', symbol: '÷' }
    ]
    
    let question, answer, questionKey
    let maxAttempts = 50
    
    do {
      const operation = operations[Math.floor(Math.random() * operations.length)]
      let num1, num2
      
      switch (operation.type) {
        case 'add':
          num1 = Math.floor(Math.random() * 50) + 1
          num2 = Math.floor(Math.random() * 50) + 1
          answer = num1 + num2
          question = `${num1} ${operation.symbol} ${num2} = ?`
          break
        case 'subtract':
          num1 = Math.floor(Math.random() * 50) + 20
          num2 = Math.floor(Math.random() * (num1 - 1)) + 1
          answer = num1 - num2
          question = `${num1} ${operation.symbol} ${num2} = ?`
          break
        case 'multiply':
          num1 = Math.floor(Math.random() * 12) + 2
          num2 = Math.floor(Math.random() * 12) + 2
          answer = num1 * num2
          question = `${num1} ${operation.symbol} ${num2} = ?`
          break
        case 'divide':
          answer = Math.floor(Math.random() * 15) + 2
          num2 = Math.floor(Math.random() * 10) + 2
          num1 = answer * num2
          question = `${num1} ${operation.symbol} ${num2} = ?`
          break
      }
      
      questionKey = `${question}-${answer}`
      maxAttempts--
    } while (usedQuestions.has(questionKey) && maxAttempts > 0)
    
    setUsedQuestions(prev => new Set([...prev, questionKey]))
    setMathQuestion(question)
    setCorrectAnswer(answer)
    setUserAnswer('')
    setError('')
  }

  // Initialize math question when modal opens
  useEffect(() => {
    if (isOpen && step === 'verification') {
      generateMathQuestion()
      loadSettings()
    }
  }, [isOpen, step])

  // Load settings from localStorage and API
  const loadSettings = async () => {
    try {
      setIsLoading(true)
      
      // Load from API
      const filterInfo = await getFilterInfo()
      console.log('API Filter Info Response:', filterInfo) // Debug log
      
      setApiFilterInfo(filterInfo)
      
      // Set default prompt from API response
      if (filterInfo.default_system_prompt) {
        setDefaultPrompt(filterInfo.default_system_prompt)
      }
      
      // Set filter words from API response (combine inappropriate_words and inappropriate_patterns)
      const combinedFilters = [
        ...(filterInfo.inappropriate_words || []),
        ...(filterInfo.inappropriate_patterns || [])
      ]
      setFilterWords(combinedFilters)
      
      // Set any additional settings
      setAdditionalSettings(filterInfo.additionalSettings || {})
      
      // Load user's additional prompt from localStorage
      const savedPrompt = localStorage.getItem('chatbot-additional-prompt') || ''
      setAdditionalPrompt(savedPrompt)
      
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Fallback to default values
      setDefaultPrompt("You are a friendly AI assistant designed specifically for children. Always be encouraging, educational, and safe. Use simple language that kids can understand.")
      setFilterWords([])
      setAdditionalSettings({})
      setApiFilterInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle verification
  const handleVerification = () => {
    const numAnswer = parseInt(userAnswer)
    
    if (isNaN(numAnswer)) {
      setError('Please enter a valid number')
      return
    }
    
    if (numAnswer === correctAnswer) {
      setStep('settings')
      setError('')
    } else {
      setAttempts(prev => prev + 1)
      if (attempts >= 2) {
        setError('Too many incorrect attempts. Please try again later.')
        setTimeout(() => onClose(), 2000)
      } else {
        setError('Incorrect! Try again.')
        generateMathQuestion() // Generate new question
      }
    }
  }

  // Toast helper functions
  const showToast = (message, type = 'info') => {
    setToast({ message, type, isVisible: true })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  // Save settings
  const saveSettings = async () => {
    if (!additionalPrompt.trim()) {
      showToast('Please enter some additional instructions to save.', 'error')
      return
    }

    try {
      setIsSaving(true)
      
      // Save to server first
      await addPrompt(sessionId, additionalPrompt)
      
      // Save to localStorage as backup
      localStorage.setItem('chatbot-additional-prompt', additionalPrompt)
      
      showToast('Additional instructions saved successfully! 🎉', 'success')
    } catch (error) {
      console.error('Failed to save additional prompt:', error)
      
      // Still save locally even if server fails
      localStorage.setItem('chatbot-additional-prompt', additionalPrompt)
      
      showToast(
        error.message || 'Failed to save to server, but saved locally. Please try again later.',
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Export chat history
  const exportChatHistory = () => {
    const timestamp = new Date().toLocaleString()
    let content = `Chat History for ${username}\nExported on: ${timestamp}\n${'='.repeat(50)}\n\n`
    
    messages.forEach((message, index) => {
      const time = new Date(message.timestamp || Date.now()).toLocaleString()
      const sender = message.type === 'user' ? username : 'AI Assistant'
      content += `[${time}] ${sender}: ${message.text}\n\n`
    })
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-history-${username}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        {step === 'verification' ? (
          <div className="verification-step">
            <div className="modal-header">
              <h2>🔐 Adult Verification</h2>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="verification-content">
              <p>Please solve this math problem to access settings:</p>
              <div className="math-question">
                <span className="question-text">{mathQuestion}</span>
              </div>
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter your answer"
                className="answer-input"
                onKeyPress={(e) => e.key === 'Enter' && handleVerification()}
              />
              {error && <p className="error-message">{error}</p>}
              <div className="verification-buttons">
                <button onClick={handleVerification} className="verify-btn">
                  Verify
                </button>
                <button onClick={generateMathQuestion} className="new-question-btn">
                  New Question
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="settings-step">
            <div className="modal-header">
              <h2>⚙️ Settings</h2>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="settings-content">
              {isLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner">🔄</div>
                  <p>Loading settings...</p>
                </div>
              ) : (
                <>
                  {/* AI Configuration Overview */}
                  {apiFilterInfo && (
                    <div className="settings-section">
                      <h3>🤖 AI Configuration</h3>
                      <div className="config-overview">
                        {/* Default System Prompt */}
                        {apiFilterInfo.default_system_prompt && (
                          <div className="config-item">
                            <strong>📋 Default System Prompt:</strong>
                            <p className="config-description">{apiFilterInfo.default_system_prompt}</p>
                          </div>
                        )}
                        
                        {/* Inappropriate Words */}
                        {apiFilterInfo.inappropriate_words && apiFilterInfo.inappropriate_words.length > 0 && (
                          <div className="config-item">
                            <strong>🚫 Inappropriate Words Filter:</strong>
                            <div className="filter-words-display">
                              {apiFilterInfo.inappropriate_words.map((word, index) => (
                                <span key={index} className="filter-word-readonly inappropriate-word">
                                  {word}
                                </span>
                              ))}
                            </div>
                            <p className="config-note">These specific words are blocked from responses</p>
                          </div>
                        )}
                        
                        {/* Inappropriate Patterns */}
                        {apiFilterInfo.inappropriate_patterns && apiFilterInfo.inappropriate_patterns.length > 0 && (
                          <div className="config-item">
                            <strong>🔍 Inappropriate Patterns Filter:</strong>
                            <div className="filter-words-display">
                              {apiFilterInfo.inappropriate_patterns.map((pattern, index) => (
                                <span key={index} className="filter-word-readonly inappropriate-pattern">
                                  {pattern}
                                </span>
                              ))}
                            </div>
                            <p className="config-note">These patterns are automatically detected and filtered</p>
                          </div>
                        )}
                        
                        {/* Debug: Show raw API response if expected fields are missing */}
                        {!apiFilterInfo.default_system_prompt && !apiFilterInfo.inappropriate_words && !apiFilterInfo.inappropriate_patterns && (
                          <div className="config-item">
                            <strong>🔧 Debug - Raw API Response:</strong>
                            <div className="debug-response">
                              <pre className="debug-json">{JSON.stringify(apiFilterInfo, null, 2)}</pre>
                            </div>
                            <p className="config-note">Showing raw API response for debugging</p>
                          </div>
                        )}
                      </div>
                      <p className="section-description">Current AI configuration loaded from server</p>
                    </div>
                  )}

                  {/* Your Additional Instructions - MOVED BEFORE EXPORT */}
                  <div className="settings-section">
                    <h3>✏️ Your Additional Instructions</h3>
                    <textarea
                      value={additionalPrompt}
                      onChange={(e) => setAdditionalPrompt(e.target.value)}
                      placeholder="Add any additional instructions for the AI behavior here..."
                      className="editable-textarea"
                      rows={4}
                    />
                    <p className="section-description">Add custom instructions that will be combined with the default behavior</p>
                  </div>

                  {/* Export Section */}
                  <div className="settings-section">
                    <h3>📥 Chat History</h3>
                    <button onClick={exportChatHistory} className="export-btn">
                      📥 Export Chat History
                    </button>
                    <p className="section-description">Download your conversation as a text file</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="settings-buttons">
                    <button 
                      onClick={saveSettings} 
                      className="save-btn" 
                      disabled={isSaving || !additionalPrompt.trim()}
                    >
                      {isSaving ? (
                        <>
                          <span className="saving-spinner">⏳</span>
                          Saving...
                        </>
                      ) : (
                        'Save Additional Instructions'
                      )}
                    </button>
                    <button onClick={onClose} className="cancel-btn">Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </div>
    </div>
  )
}

export default SettingsModal
