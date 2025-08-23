import { useState } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import ChatScreen from './components/ChatScreen'
import './App.css'

function App() {
  const [sessionId, setSessionId] = useState(null)
  const [kidName, setKidName] = useState('')

  // console.log('App rendering - sessionId:', sessionId, 'kidName:', kidName)

  const handleSessionStart = (name, id) => {
    // console.log('handleSessionStart called with name:', name, 'id:', id)
    setKidName(name)
    setSessionId(id)
  }

  return (
    <div className="app">
      {!sessionId ? (
        <WelcomeScreen onSessionStart={handleSessionStart} />
      ) : (
        <ChatScreen sessionId={sessionId} kidName={kidName} />
      )}
    </div>
  )
}

export default App
