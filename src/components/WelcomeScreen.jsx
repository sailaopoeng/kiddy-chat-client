import { useState } from 'react'
import { initiateSession } from '../services/api'
import './WelcomeScreen.css'

const WelcomeScreen = ({ onSessionStart }) => {
    const [name, setName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    console.log('WelcomeScreen is rendering!')

    const handleSubmit = async (e) => {
        e.preventDefault()
        console.log('Form submitted with name:', name)

        if (!name.trim()) {
            setError('Please tell me your name! 😊')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            console.log('Calling initiateSession with:', name.trim())
            const { sessionId } = await initiateSession(name.trim())
            console.log('Got sessionId:', sessionId)
            onSessionStart(name.trim(), sessionId)
        } catch (err) {
            console.error('Error in handleSubmit:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="welcome-screen" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="welcome-container" style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '500px' }}>
                <div className="robot-emoji" style={{ fontSize: '4rem', marginBottom: '20px' }}>🤖</div>
                <h1 className="welcome-title" style={{ color: '#4a5568', fontSize: '2.5rem', marginBottom: '15px' }}>Hi there, little friend!</h1>
                <p className="welcome-subtitle" style={{ color: '#718096', fontSize: '1.2rem', marginBottom: '30px' }}>
                    I'm your friendly AI buddy! I love to chat and answer questions.
                    What's your name?
                </p>

                <form onSubmit={handleSubmit} className="name-form">
                    <div className="input-group">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Type your name here..."
                            className="name-input"
                            maxLength={50}
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

                    {error && <div className="error-message">{error}</div>}
                </form>

                <div className="fun-facts">
                    <div className="fun-fact">🎨 I love to be creative!</div>
                    <div className="fun-fact">📚 I know lots of fun facts!</div>
                    <div className="fun-fact">🎮 I can help with homework too!</div>
                </div>
            </div>
        </div>
    )
}

export default WelcomeScreen
