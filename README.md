# 🤖 Kiddy Chat Frontend - GPT for Kids

A fun and engaging React chatbot app designed for children. Kids get a colorful, friendly chat with an AI buddy, and grown-ups get controls to keep it safe.

## Live Demo
You can try the live demo at [Kiddy Chat Demo](https://kiddy-chat-client.sailaopoeng.com/).

## ✨ Features

### For kids
- **Welcome screen**: pick a picture and a nickname (no real name needed)
- **Chat**: large buttons, typing indicator, and conversation starter ideas
- **Replies appear as they're written**: streamed sentence by sentence (falls back to a normal request on older backends)
- **Easy-to-read replies**: simple formatting (headings, lists, bold) rendered safely; links and raw HTML from the AI are never shown as clickable content
- **🔊 Read to me**: any reply can be read aloud by the browser
- **🎤 Talk instead of type**: voice input where the browser supports it
- **🔄 Try again**: one tap to retry when something goes wrong
- **🆕 New chat**: start over at any time; an expired session offers a new chat too
- **Keeps the chat on refresh**: the conversation survives a page reload (cleared when the tab closes)

### For grown-ups (⚙️ Settings)
- **Grown-up check**: if the backend has a `PARENT_PIN`, Settings asks for that PIN and the server checks it. Otherwise it asks a two-digit multiplication question; 3 wrong answers locks Settings for 5 minutes. Settings locks again every time it closes
- **AI configuration**: see the server's system prompt and blocked words
- **Extra instructions**: add your own rules for the AI; they're saved in this browser and applied to every new chat. With a backend PIN, the server only accepts instructions a grown-up approved
- **Daily chat time limit**: 15 minutes to 2 hours a day, with a button to give 15 more minutes
- **Chat history**: download the current chat, and review or download the last 15 chats saved in this browser

### General
- Responsive design for desktop, tablet and phone
- Keyboard and screen reader support (labelled controls, announced replies, accessible Settings dialog)

> **Note on safety:** content filtering, the per-session message limit and (with `PARENT_PIN` set) who may change instructions are enforced by the [backend](https://github.com/sailaopoeng/kiddy-chat-api). The math question and the daily time limit run only in the browser, so they slow kids down but can't stop a determined, tech-savvy one.

## 🚀 Getting Started

### Prerequisites

- Node.js 22.12 or higher
- npm
- The backend API server running. You can clone it [here](https://github.com/sailaopoeng/kiddy-chat-api)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**: copy `.env.example` to `.env` and set `VITE_API_URL` to your backend (default `http://localhost:3001`).

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   In development, requests go to `/api` and Vite proxies them to `VITE_API_URL`, which avoids CORS problems.

4. **Open your browser** at `http://localhost:5173`

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` (requires `VITE_API_URL`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |

GitHub Actions runs lint, tests and a build on every push and pull request.

## ⚙️ Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes, for builds | Backend URL, e.g. `https://api.example.com`. The build fails if it is missing. |
| `VITE_API_TIMEOUT` | No | Request timeout in milliseconds (default `30000`) |

These values are built into the JavaScript bundle and visible to anyone, so never put secrets in them. See [docs/aws-amplify-env-setup.md](docs/aws-amplify-env-setup.md) for AWS Amplify.

## 🛠️ API Integration

The frontend uses these backend endpoints. Endpoints marked 🔑 expect the session ID as a bearer token: `Authorization: Bearer <session_id>`.

### POST `/initiate-session`
Request:
```json
{ "username": "string" }
```
Response:
```json
{ "session_id": "string", "username": "string", "message": "string" }
```

### POST `/query` 🔑
Request:
```json
{ "message": "string" }
```
Response:
```json
{ "response": "string", "session_id": "string", "username": "string" }
```
The `response` may use simple Markdown. A `401` tells the app the session has expired; `429` means too many messages.

### POST `/query/stream` 🔑
Same request as `/query`. Returns Server-Sent Events: `delta` events (`{"text": "..."}`, complete sentences only) and one final `done` event (`{"response", "session_id", "username"}`). The app shows `done.response` as the final reply, because the server may replace an unsafe reply. If this endpoint returns 404 or 405, the app uses `/query`.

### GET `/conversation-starters`
Response:
```json
{ "conversation_starters": ["string"] }
```
If this fails, the app uses built-in starters.

### GET `/filter-info`
Response:
```json
{
  "default_system_prompt": "string",
  "inappropriate_words": ["string"],
  "inappropriate_patterns": ["string"]
}
```

### GET `/parent/status`
Response:
```json
{ "pin_required": true }
```
If this fails (for example, an older backend), the app uses the math question.

### POST `/parent/verify`
Request:
```json
{ "pin": "string" }
```
Response (`401` wrong PIN, `429` too many tries):
```json
{ "parent_token": "string", "expires_in": 900 }
```

### POST `/session/add-prompt` 🔑
Request (send header `X-Parent-Token` after a PIN check, or the `signature` from an earlier save of the same text):
```json
{ "additional_prompt": "string", "signature": "string (optional)" }
```
Response (`signature` is `null` when no PIN is set; `403` means not approved):
```json
{ "message": "string", "signature": "string" }
```

## 📱 User Flow

1. **Welcome screen**: the child picks a picture and a nickname
2. **Session creation**: the app calls `/initiate-session`, then re-applies any saved grown-up instructions (with their signature) using `/session/add-prompt`
3. **Chat**: each message calls `/query/stream`
4. **New chat**: returns to the welcome screen with the nickname and picture filled in

## 🗂️ Project Structure

```
src/
  components/   WelcomeScreen, ChatScreen, SettingsModal
  hooks/        read aloud, voice input, daily time limit, dialog keyboard support
  services/     API client, browser storage, grown-up settings, chat history
  utils/        grown-up check, text helpers
  __tests__/    unit tests
```

## 📦 Build for Production

```bash
VITE_API_URL=https://api.example.com npm run build
```

The built files will be in the `dist/` directory.
