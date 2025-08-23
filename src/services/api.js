import axios from 'axios'

// Create an axios instance with default configuration
// In development, use proxy (/api) to avoid CORS issues
// In production, use the full API URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('Making API request:', config.method?.toUpperCase(), config.url)
    console.log('Full URL:', config.baseURL + config.url)
    console.log('Headers:', config.headers)
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API response received:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('API error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    })
    
    // Create user-friendly error messages
    let userMessage = 'Oops! Something went wrong. Let\'s try again! 🤖'
    
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      userMessage = 'I can\'t connect to my brain right now! Please check your internet connection or try again later. 🔌'
    } else if (error.code === 'ECONNREFUSED') {
      userMessage = 'The AI server is not responding. Please try again later! 🔄'
    } else if (error.response?.status === 404) {
      userMessage = 'I couldn\'t find what you\'re looking for! 🔍'
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      userMessage = 'Oops! My memory got confused. Let\'s start a new chat! 🔄'
    } else if (error.response?.status >= 500) {
      userMessage = 'My brain is having a hiccup! Please try again in a moment. 🤯'
    } else if (error.response?.status === 422) {
      userMessage = 'I didn\'t understand that format. Can you try asking differently? 🤔'
    }
    
    const enhancedError = new Error(userMessage)
    enhancedError.originalError = error
    return Promise.reject(enhancedError)
  }
)

/**
 * Initiate a new chat session
 * @param {string} kidName - The name of the kid (username)
 * @returns {Promise<{sessionId: string, message: string}>}
 */
export const initiateSession = async (kidName) => {
  try {
    const response = await api.post('/initiate-session', {
      username: kidName.trim(),
    })
    
    return {
      sessionId: response.data.session_id,
      message: response.data.message,
      username: response.data.username,
    }
  } catch (error) {
    throw error
  }
}

/**
 * Send a query to the AI and get a response
 * @param {string} sessionId - The session ID (used as Bearer token)
 * @param {string} message - The user's question/message
 * @returns {Promise<{response: string, sessionId: string, username: string}>}
 */
export const sendQuery = async (sessionId, message) => {
  try {
    const response = await api.post('/query', {
      message: message.trim(),
    }, {
      headers: {
        'Authorization': `Bearer ${sessionId}`,
      }
    })
    
    return {
      response: response.data.response,
      sessionId: response.data.session_id,
      username: response.data.username,
    }
  } catch (error) {
    throw error
  }
}

/**
 * Get conversation starters from the API
 * @returns {Promise<string[]>}
 */
export const getConversationStarters = async () => {
  try {
    const response = await api.get('/conversation-starters')
    return response.data
  } catch (error) {
    console.warn('Failed to load conversation starters:', error)
    // Return default starters if API fails
    return [
      "Tell me a fun fact! 🌟",
      "Help me with my homework 📚",
      "Let's play a word game! 🎮",
      "What's your favorite joke? 😄"
    ]
  }
}

/**
 * Get filter information including system prompt and filter words
 * @returns {Promise<{systemPrompt: string, filterWords: string[], additionalSettings: object}>}
 */
export const getFilterInfo = async () => {
  try {
    const response = await api.get('/filter-info')
    return response.data
  } catch (error) {
    console.warn('Failed to load filter info:', error)
    // Return default values if API fails
    return {
      systemPrompt: "You are a friendly AI assistant designed specifically for children. Always be encouraging, educational, and safe. Use simple language that kids can understand.",
      filterWords: [],
      additionalSettings: {}
    }
  }
}

/**
 * Add additional prompt to the server
 * @param {string} sessionId - The session ID (used as Bearer token)
 * @param {string} prompt - The additional prompt to add
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const addPrompt = async (sessionId, prompt) => {
  try {
    const response = await api.post('/session/add-prompt', {
      additional_prompt: prompt.trim(),
    }, {
      headers: {
        'Authorization': `Bearer ${sessionId}`,
      }
    })
    
    return {
      success: true,
      message: response.data.message || 'Additional prompt saved successfully!',
      data: response.data
    }
  } catch (error) {
    throw error
  }
}

export default api
