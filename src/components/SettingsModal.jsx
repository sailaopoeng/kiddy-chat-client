import { useCallback, useEffect, useRef, useState } from 'react'
import { getFilterInfo, addPrompt, getParentStatus, verifyParentPin } from '../services/api'
import {
  BONUS_MINUTES,
  DAILY_LIMIT_OPTIONS,
  addBonusMinutes,
  clearParentInstructions,
  getDailyLimitMinutes,
  getParentInstructions,
  isSettingsLocked,
  readUsage,
  recordGateFailure,
  recordGateSuccess,
  saveParentInstructions,
  setDailyLimitMinutes,
} from '../services/parentSettings'
import {
  clearConversations,
  downloadTextFile,
  formatTranscript,
  listConversations,
  transcriptFileName,
} from '../services/chatHistory'
import { MAX_GATE_ATTEMPTS, generateGateQuestion } from '../utils/parentGate'
import { useDialog } from '../hooks/useDialog'
import './SettingsModal.css'

const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️' }

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [message, onClose])

  return (
    <div className={`toast toast-${type}`} role="status">
      <div className="toast-content">
        <span className="toast-icon" aria-hidden="true">{TOAST_ICONS[type] ?? TOAST_ICONS.info}</span>
        <span className="toast-message">{message}</span>
        <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">×</button>
      </div>
    </div>
  )
}

const ModalHeader = ({ title, onClose }) => (
  <div className="modal-header">
    <h2 id="settings-title">{title}</h2>
    <button type="button" className="close-btn" onClick={onClose} aria-label="Close settings">×</button>
  </div>
)

// ---- Step 1: the grown-up check ----

const GrownUpCheck = ({ onPassed, onLocked }) => {
  const [gate, setGate] = useState(generateGateQuestion)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const value = Number.parseInt(answer, 10)
    if (Number.isNaN(value)) {
      setError('Please enter a number.')
      return
    }

    if (value === gate.answer) {
      recordGateSuccess()
      onPassed()
      return
    }

    const state = recordGateFailure()
    if (state.lockedUntil > Date.now()) {
      onLocked()
      return
    }
    const triesLeft = MAX_GATE_ATTEMPTS - state.failures
    setError(`That's not right. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left.`)
    setGate(generateGateQuestion())
    setAnswer('')
  }

  return (
    <form className="verification-content" onSubmit={handleSubmit}>
      <p>Settings are for grown-ups. Please solve this to continue:</p>
      <div className="math-question">
        <span className="question-text">{gate.question}</span>
      </div>
      <label htmlFor="gate-answer" className="visually-hidden">Your answer</label>
      <input
        id="gate-answer"
        type="number"
        inputMode="numeric"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Enter your answer"
        className="answer-input"
        autoComplete="off"
        data-autofocus
        autoFocus
      />
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="verification-buttons">
        <button type="submit" className="verify-btn">Verify</button>
      </div>
    </form>
  )
}

// ---- Step 1 (when the server has a grown-up PIN): the PIN check ----

const PinCheck = ({ onPassed }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const value = pin.trim()
    if (!value || checking) return
    setChecking(true)
    setError('')
    try {
      onPassed(await verifyParentPin(value))
    } catch (err) {
      if (err.status === 401) setError("That PIN isn't right.")
      else if (err.status === 429) setError('Too many wrong PINs. Please try again later.')
      else setError(err.message)
      setPin('')
      setChecking(false)
    }
  }

  return (
    <form className="verification-content" onSubmit={handleSubmit}>
      <p>Settings are for grown-ups. Please enter the grown-up PIN:</p>
      <label htmlFor="parent-pin" className="visually-hidden">Grown-up PIN</label>
      <input
        id="parent-pin"
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="Enter PIN"
        className="answer-input"
        autoComplete="off"
        maxLength={64}
        data-autofocus
        autoFocus
      />
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="verification-buttons">
        <button type="submit" className="verify-btn" disabled={checking || !pin.trim()}>
          {checking ? 'Checking...' : 'Unlock'}
        </button>
      </div>
    </form>
  )
}

// ---- Step 2: the settings themselves ----

const AiConfiguration = () => {
  // undefined = loading, null = couldn't load
  const [filterInfo, setFilterInfo] = useState(undefined)

  useEffect(() => {
    let cancelled = false
    getFilterInfo().then((info) => {
      if (!cancelled) setFilterInfo(info)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (filterInfo === undefined) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" aria-hidden="true">🔄</div>
        <p>Loading AI configuration...</p>
      </div>
    )
  }

  if (filterInfo === null) {
    return <p className="section-description">Couldn't load the AI configuration from the server right now.</p>
  }

  const words = filterInfo.inappropriate_words ?? []
  const patterns = filterInfo.inappropriate_patterns ?? []

  return (
    <div className="config-overview">
      {filterInfo.default_system_prompt && (
        <div className="config-item">
          <strong>📋 Default System Prompt:</strong>
          <p className="config-description">{filterInfo.default_system_prompt}</p>
        </div>
      )}
      {words.length > 0 && (
        <div className="config-item">
          <strong>🚫 Inappropriate Words Filter:</strong>
          <div className="filter-words-display">
            {words.map((word) => (
              <span key={word} className="filter-word-readonly inappropriate-word">{word}</span>
            ))}
          </div>
          <p className="config-note">These specific words are blocked from responses</p>
        </div>
      )}
      {patterns.length > 0 && (
        <div className="config-item">
          <strong>🔍 Inappropriate Patterns Filter:</strong>
          <div className="filter-words-display">
            {patterns.map((pattern) => (
              <span key={pattern} className="filter-word-readonly inappropriate-pattern">{pattern}</span>
            ))}
          </div>
          <p className="config-note">These patterns are automatically detected and filtered</p>
        </div>
      )}
    </div>
  )
}

const ParentSettings = ({ sessionId, username, messages, pinRequired, parentToken, onClose, onSettingsChanged, showToast }) => {
  const [instructions, setInstructions] = useState(getParentInstructions)
  const [hasSavedInstructions, setHasSavedInstructions] = useState(() => Boolean(getParentInstructions()))
  const [isSaving, setIsSaving] = useState(false)
  const [limit, setLimit] = useState(getDailyLimitMinutes)
  const [usage, setUsage] = useState(() => readUsage())
  const [history, setHistory] = useState(listConversations)

  const saveInstructions = async () => {
    const text = instructions.trim()
    if (!text) return
    setIsSaving(true)
    try {
      const { signature } = await addPrompt(sessionId, text, { parentToken })
      saveParentInstructions(text, signature)
      setHasSavedInstructions(true)
      showToast('Saved! These instructions apply now and to every new chat. 🎉', 'success')
    } catch (error) {
      if (pinRequired) {
        // Without the server's approval the text can't be used in new chats either.
        showToast(
          error.status === 403
            ? 'Your grown-up check has expired. Please close Settings and enter the PIN again.'
            : `Couldn't save right now. ${error.message}`,
          'error'
        )
      } else {
        saveParentInstructions(text)
        setHasSavedInstructions(true)
        showToast(`Saved for new chats, but this chat couldn't be updated. ${error.message}`, 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const removeInstructions = () => {
    clearParentInstructions()
    setHasSavedInstructions(false)
    setInstructions('')
    showToast('Removed. New chats will use only the default behavior.', 'info')
  }

  const changeLimit = (e) => {
    const minutes = Number(e.target.value)
    setDailyLimitMinutes(minutes)
    setLimit(minutes)
    onSettingsChanged()
  }

  const giveExtraTime = () => {
    addBonusMinutes(BONUS_MINUTES)
    setUsage(readUsage())
    onSettingsChanged()
    showToast(`Added ${BONUS_MINUTES} more minutes for today ⏰`, 'success')
  }

  const exportCurrentChat = () => {
    const chat = { kidName: username, messages: messages.filter((message) => !message.isError) }
    downloadTextFile(transcriptFileName(username), formatTranscript(chat))
  }

  const downloadSavedChat = (chat) => {
    downloadTextFile(transcriptFileName(chat.kidName, new Date(chat.updatedAt)), formatTranscript(chat))
  }

  const deleteHistory = () => {
    if (!window.confirm('Delete all saved chats from this browser?')) return
    clearConversations()
    setHistory([])
    showToast('Saved chats deleted.', 'info')
  }

  const usedMinutes = Math.floor(usage.seconds / 60)

  return (
    <div className="settings-content">
      <section className="settings-section">
        <h3>🤖 AI Configuration</h3>
        <AiConfiguration />
        <p className="section-description">Current AI configuration loaded from server</p>
      </section>

      <section className="settings-section">
        <h3>✏️ Your Additional Instructions</h3>
        <label htmlFor="parent-instructions" className="visually-hidden">Additional instructions for the AI</label>
        <textarea
          id="parent-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="For example: Keep answers short. Don't help with homework answers, give hints instead."
          className="editable-textarea"
          rows={4}
          maxLength={2000}
        />
        <p className="section-description">
          Added on top of the default behavior. Saved in this browser and applied to every new chat.
          {pinRequired && ' The server only accepts changes made with the grown-up PIN.'}
        </p>
        <div className="section-buttons">
          <button
            type="button"
            onClick={saveInstructions}
            className="save-btn"
            disabled={isSaving || !instructions.trim()}
          >
            {isSaving ? (<><span className="saving-spinner" aria-hidden="true">⏳</span> Saving...</>) : 'Save Instructions'}
          </button>
          {hasSavedInstructions && (
            <button type="button" onClick={removeInstructions} className="cancel-btn">Remove</button>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3>⏰ Daily Chat Time</h3>
        <label htmlFor="daily-limit" className="settings-label">Time allowed each day</label>
        <select id="daily-limit" className="settings-select" value={limit} onChange={changeLimit}>
          {DAILY_LIMIT_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes === 0 ? 'No limit' : `${minutes} minutes`}
            </option>
          ))}
        </select>
        <p className="section-description">
          Used today: {usedMinutes} {usedMinutes === 1 ? 'minute' : 'minutes'}
          {usage.bonusMinutes > 0 && ` (plus ${usage.bonusMinutes} extra minutes given)`}
        </p>
        {limit > 0 && (
          <button type="button" onClick={giveExtraTime} className="export-btn">
            ➕ Give {BONUS_MINUTES} more minutes today
          </button>
        )}
      </section>

      <section className="settings-section">
        <h3>📥 Chat History</h3>
        <button type="button" onClick={exportCurrentChat} className="export-btn">
          📥 Download this chat
        </button>

        <h4 className="history-title">Past chats</h4>
        {history.length === 0 ? (
          <p className="section-description">No saved chats yet.</p>
        ) : (
          <ul className="history-list">
            {history.map((chat) => (
              <li key={chat.sessionId}>
                <details className="history-item">
                  <summary>
                    {chat.kidName} · {new Date(chat.updatedAt).toLocaleString()} · {chat.messages.length} messages
                  </summary>
                  <div className="history-transcript">
                    {chat.messages.map((message, index) => (
                      <p key={index}>
                        <strong>{message.type === 'user' ? chat.kidName : 'AI Buddy'}:</strong> {message.text}
                      </p>
                    ))}
                  </div>
                  <button type="button" className="history-download" onClick={() => downloadSavedChat(chat)}>
                    📥 Download
                  </button>
                </details>
              </li>
            ))}
          </ul>
        )}
        <p className="section-description">
          The last few chats are saved only in this browser, so you can look back at them.
        </p>
        {history.length > 0 && (
          <button type="button" onClick={deleteHistory} className="cancel-btn danger-btn">
            🗑️ Delete saved chats
          </button>
        )}
      </section>

      <div className="settings-buttons">
        <button type="button" onClick={onClose} className="cancel-btn">Close</button>
      </div>
    </div>
  )
}

// ---- The modal ----

const SettingsModal = ({ onClose, sessionId, username, messages, onSettingsChanged }) => {
  // checking -> pin (server PIN) or verification (math question) -> settings
  const [step, setStep] = useState('checking')
  const [pinRequired, setPinRequired] = useState(false)
  const [parentToken, setParentToken] = useState(null)
  const [toast, setToast] = useState(null)
  const dialogRef = useRef(null)

  useDialog(dialogRef, onClose)

  useEffect(() => {
    let cancelled = false
    getParentStatus().then((status) => {
      if (cancelled) return
      setPinRequired(status.pinRequired)
      if (status.pinRequired) setStep('pin')
      else setStep(isSettingsLocked() ? 'locked' : 'verification')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const showToast = useCallback((message, type = 'info') => setToast({ message, type }), [])
  const hideToast = useCallback(() => setToast(null), [])

  const title = step === 'settings' ? '⚙️ Settings' : '🔐 Grown-ups Only'

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title={title} onClose={onClose} />

        {step === 'checking' && (
          <div className="loading-container">
            <div className="loading-spinner" aria-hidden="true">🔄</div>
            <p>Checking...</p>
          </div>
        )}

        {step === 'pin' && (
          <PinCheck
            onPassed={(token) => {
              setParentToken(token)
              setStep('settings')
            }}
          />
        )}

        {step === 'verification' && (
          <GrownUpCheck onPassed={() => setStep('settings')} onLocked={() => setStep('locked')} />
        )}

        {step === 'locked' && (
          <div className="verification-content">
            <p>Too many wrong answers. Settings are locked for a few minutes. Please try again later.</p>
            <div className="verification-buttons">
              <button type="button" className="verify-btn" onClick={onClose} data-autofocus>OK</button>
            </div>
          </div>
        )}

        {step === 'settings' && (
          <ParentSettings
            sessionId={sessionId}
            username={username}
            messages={messages}
            pinRequired={pinRequired}
            parentToken={parentToken}
            onClose={onClose}
            onSettingsChanged={onSettingsChanged}
            showToast={showToast}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      </div>
    </div>
  )
}

export default SettingsModal
