# 🤖 Kiddy Chat Frontend - GPT for Kids

A fun and engaging React.js chatbot application specifically designed for children! This frontend application provides a colorful, kid-friendly interface where children can chat with an AI assistant.

## Live Demo
You can try the live demo at [Kiddy Chat Demo](https://kiddy-chat-client.sailaopoeng.com/).

## ✨ Features

- **Kid-Friendly Design**: Colorful gradients, fun emojis, and Comic Sans font
- **Welcome Screen**: Fun introduction where kids enter their name
- **Chat Interface**: Easy-to-use chat with large buttons and clear messaging
- **Real-time Communication**: Instant responses with typing indicators
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Error Handling**: User-friendly error messages
- **Accessibility**: Focus styles and keyboard navigation support

## 🚀 Getting Started

### Prerequisites

- Node.js (version 22.12 or higher)
- npm or yarn
- Backend API server running (for full functionality). You can clone the backend [here](https://github.com/sailaopoeng/kiddy-chat-api)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Rename `.env.example` file to `.env` file and update the API URL if needed
   - Default backend URL is `http://localhost:3001`

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

## 🛠️ API Integration

The frontend expects the following backend API endpoints:

### POST `/initiate-session`
**Request:**
```json
{
  "kidName": "string"
}
```

**Response:**
```json
{
  "sessionId": "string"
}
```

### POST `/query`
**Request:**
```json
{
  "sessionId": "string",
  "query": "string"
}
```

**Response:**
```json
{
  "response": "string"
}
```

## 📱 User Flow

1. **Welcome Screen**: Kids enter their name in a fun, animated form
2. **Session Creation**: Frontend calls `/initiate-session` to get a session ID
3. **Chat Interface**: Kids can type messages and get AI responses
4. **Message Handling**: Each message calls `/query` to get AI responses

## 🎨 Customization

### Styling
- Colors can be modified in the CSS files
- Gradients use purple/blue theme by default
- All components use CSS modules for easy customization

### API Configuration
- Update `.env` file to change backend URL
- Modify `src/services/api.js` for different API endpoints

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.
