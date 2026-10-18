import { useState } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import ChatScreen from './components/ChatScreen'
import { session as sessionStore } from './services/storage'
import './App.css'

// Kept in sessionStorage so a page refresh doesn't lose the chat,
// but closing the tab starts fresh.
const SESSION_KEY = 'kiddy-session'

const loadSession = () => {
  const saved = sessionStore.getJSON(SESSION_KEY, null)
  return saved?.sessionId ? saved : null
}

function App() {
  const [session, setSession] = useState(loadSession)
  const [lastProfile, setLastProfile] = useState(null)

  const handleSessionStart = (newSession) => {
    sessionStore.setJSON(SESSION_KEY, newSession)
    setSession(newSession)
  }

  const handleNewChat = () => {
    sessionStore.remove(SESSION_KEY)
    setLastProfile({ kidName: session.kidName, avatar: session.avatar })
    setSession(null)
  }

  return (
    <div className="app">
      {session ? (
        <ChatScreen
          key={session.sessionId}
          sessionId={session.sessionId}
          kidName={session.kidName}
          avatar={session.avatar}
          onNewChat={handleNewChat}
        />
      ) : (
        <WelcomeScreen
          onSessionStart={handleSessionStart}
          initialName={lastProfile?.kidName}
          initialAvatar={lastProfile?.avatar}
        />
      )}
    </div>
  )
}

export default App
