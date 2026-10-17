import { useState } from 'react'
import { initiateSession } from '../services/api'
import { applyParentInstructions } from '../services/parentSettings'
import { DEFAULT_KID_AVATAR, KID_AVATARS } from '../constants'
import './WelcomeScreen.css'

const WelcomeScreen = ({ onSessionStart, initialName = '', initialAvatar = DEFAULT_KID_AVATAR }) => {
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nickname = name.trim()

    if (!nickname) {
      setError('Please tell me what to call you! 😊')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { sessionId } = await initiateSession(nickname)

      // Re-apply a grown-up's saved instructions to this new chat.
      try {
        await applyParentInstructions(sessionId)
      } catch (instructionsError) {
        console.warn('Could not apply saved grown-up instructions:', instructionsError)
      }

      onSessionStart({ sessionId, kidName: nickname, avatar })
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <div className="robot-emoji" aria-hidden="true">🤖</div>
        <h1 className="welcome-title">Hi there, little friend!</h1>
        <p className="welcome-subtitle">
          I'm your friendly AI buddy! I love to chat and answer questions.
          What should I call you?
        </p>

        <form onSubmit={handleSubmit} className="name-form">
          <fieldset className="avatar-picker">
            <legend>Pick your picture:</legend>
            <div className="avatar-options">
              {KID_AVATARS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`avatar-option ${option === avatar ? 'selected' : ''}`}
                  onClick={() => setAvatar(option)}
                  aria-pressed={option === avatar}
                  aria-label={`Use ${option} as my picture`}
                  disabled={isLoading}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="input-group">
            <label htmlFor="nickname" className="visually-hidden">Your nickname</label>
            <input
              id="nickname"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type a nickname here..."
              className="name-input"
              maxLength={50}
              autoComplete="off"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? '🔄' : '🚀'} Let's Chat!
            </button>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}
        </form>

        <div className="fun-facts">
          <div className="fun-fact">🎨 I love to be creative!</div>
          <div className="fun-fact">📚 I know lots of fun facts!</div>
          <div className="fun-fact">🎮 I can help with homework too!</div>
        </div>

        <p className="parent-note">
          👋 Grown-ups: a nickname is all this app needs. Please remind your child not to
          share their full name, address, school or phone number in the chat.
        </p>
      </div>
    </div>
  )
}

export default WelcomeScreen
