# My_ChatCord - Real-time Chat Application with AI Features

A secure, real-time chat application built with Node.js and Express, featuring user authentication, room-based messaging, and integrated AI capabilities (Chat, Text-to-Image, Text-to-Voice).


## Features

- JWT-based authentication
- Real-time messaging (using Socket.IO, needs verification)
- MongoDB data persistence for users, channels, messages, and AI settings
- Room-based chat system
- User presence tracking (potential, needs verification)
- **AI Chat Integration:** Interact with configurable AI models.
- **Text-to-Image Generation:** Generate images from text prompts using configurable APIs.
- **Text-to-Voice Synthesis:** Convert text to speech using configurable APIs.
- **Admin Settings Panel:** Configure AI API keys and potentially other settings.
- Mobile-responsive design
- Password visibility toggle
- Security features (CSP, Rate Limiting - needs verification based on implementation)
- Environment-based configuration


## Project Structure

```
my_chatcord/
├── config/                 # Configuration files
│   ├── constants.js        # Application constants
│   ├── db.js               # Database connection setup (MongoDB)
│   └── init.js             # Initialization logic
├── middleware/             # Express middleware
│   └── admin.js            
│   └── auth.js             # Authentication middleware (JWT verification)
├── models/                 # Mongoose models for MongoDB
│   ├── AiApi.js            # AI API configuration model
│   ├── AiChat.js           # AI Chat history model
│   ├── Channel.js          # Chat channel model
│   ├── ImageApi.js         # Image API configuration model
│   ├── ImageSettings.js    # User image generation settings
│   ├── Message.js          # Chat message model
│   ├── Settings.js          
│   ├── SystemLogs.js       
│   ├── User.js             # User model
│   ├── VoiceApi.js         # Voice API configuration model
│   └── VoiceSettings.js    # User voice generation settings
├── public/                 # Static frontend assets
│   ├── admin/             
│   │   ├── ai-chat.html
│   │   ├── dashboard.html
│   │   ├── system-logs.html
│   │   ├── system-settings.html
│   │   ├── text-to-image.html
│   │   ├── text-to-voice.html
│   │   └── user-management.html
│   ├── assets/             # Images, icons, etc.
│   │   └── favicon.ico
│   ├── css/                # CSS stylesheets
│   │   └── style.css
│   ├── js/                 # Client-side JavaScript
|   │   ├── /admin
|   │   │   ├── ai-chat.js             
|   │   │   ├── dashboard.js
|   │   │   ├── system-logs.js
|   │   │   ├── system-settings.js
|   │   │   ├── text-to-image.js
|   │   │   ├── text-to-voice.js
|   │   │   ├── user-management.js             
|   │   │   └── utils.js             
│   │   ├── admin.js        # Admin settings page logic
│   │   ├── ai-chat.js      # AI chat page logic
│   │   ├── auth-guard.js   # Protects frontend routes
│   │   ├── auth.js         # Login/Register logic
│   │   ├── main.js         # Main chat page logic
│   │   ├── nav.js          # Navigation handling
│   │   ├── selectRoom.js   # Room selection logic
│   │   └── text-to-image.js # Text-to-image page logic
│   │   └── text-to-voice.js # Text-to-voice page logic
│   ├── admin-settings.html # Admin settings page
│   ├── ai-chat.html        # AI chat interface page
│   ├── chat.html           # Main chat interface page
│   ├── login.html          # Login page
│   ├── register.html       # Registration page
│   ├── selectRoom.html     # Room selection page
│   ├── text-to-image.html  # Text-to-image interface page
│   └── text-to-voice.html  # Text-to-voice interface page
├── routes/                 # API endpoint definitions
│   ├── /admin
│   │   ├── ai-apis.js             
│   │   ├── image-apis.js
│   │   ├── image-settings.js
│   │   ├── logs.js
│   │   ├── settings.js
│   │   ├── stats.js
│   │   ├── user.js             
│   │   ├── voice-settings.js 
│   │   └── voice.js 
│   ├── admin.js            # Admin settings routes
│   ├── ai.js               # AI chat related routes
│   ├── auth.js             # Authentication routes (login, register)
│   ├── channels.js         # Chat channel and message routes
│   ├── images.js           # Text-to-image routes
│   └── voice.js            # Text-to-voice routes
├── scripts/                # Utility/maintenance scripts
│   ├── exportData.js
│   ├── flushDb.js
│   ├── importData.js
│   └── seedData.js
├── services/               # Business logic services
│   └── tokenManager.js     # JWT creation/management
├── utils/                  # Utility functions
│   ├── adminHelpers.js       
│   ├── apiHelpers.js       # Helpers for external API calls
│   ├── jwt.js              # JWT verification helpers
│   ├── messages.js         # Message formatting/handling utilities
│   └── users.js            # User related utilities
├── .env                    # Environment variables
├── .env.template           # Template for .env file
├── .gitignore              # Git ignore rules
├── package-lock.json       # Exact dependency versions
├── package.json            # Project metadata and dependencies
├── README.md               # This file
└── server.js               # Main application entry point
```


## Prerequisites

- Node.js (v14 or higher recommended)
- MongoDB server (local or cloud instance)
- npm (comes with Node.js)
- Potentially API keys for desired AI services (e.g., OpenAI, Stability AI, etc.)


## Environment Setup

1.  Create a `.env` file in the project root by copying `.env.template`.
2.  Fill in the required environment variables:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/mychatcord
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=24h
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
LOG_LEVEL=debug
```

3.  **Key Environment Variables:**
    *   `PORT`: Port the server listens on (default: 3000).
    *   `HOST`: Host address the server binds to.
    *   `MONGODB_URI`: Your MongoDB connection string. **Required**.
    *   `JWT_SECRET`: Secret key for signing JWT tokens. **Required and must be kept secret**.
    *   `NODE_ENV`: Set to `development` or `production`. Affects error handling, logging, and potentially other settings.
    *   `PROD_DOMAIN`: The domain where the app is hosted in production. Used for setting secure cookie domains. **Required for production**.
    *   **AI API Keys**: Add environment variables for the API keys of the AI services you intend to use (e.g., `OPENAI_API_KEY`). These keys are typically configured via the Admin Settings panel in the application itself, but the backend needs them in the environment to function. Check `models/AiApi.js`, `models/ImageApi.js`, `models/VoiceApi.js` and the admin settings implementation for specifics.


## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatcord.git
cd chatcord
```

2. Install dependencies:
```bash
npm install
```


## Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000` (or your configured PORT)


## Config Setup
The `config` folder contains crucial application settings. Update the following files based on your requirements:

#### 1. `config/constants.js`
#### 2. `config/db.js`
#### 3. `config/init.js`


## Feature Details:

#### 1. Authentication (`routes/auth.js`, `public/js/auth.js`)
- User registration and login using email/password.
- JWT tokens are used for session management, likely stored in HTTP-only cookies for security.
- Frontend routes are protected using `public/js/auth-guard.js`.

#### 2. Chat Channels (`routes/channels.js`, `public/js/main.js`, `public/js/selectRoom.js`)
- Users can select or potentially create chat rooms/channels.
- Real-time messaging within channels (implementation likely uses WebSockets, e.g., Socket.IO, but needs verification).
- Message history is stored in MongoDB (`models/Message.js`).

#### 3. AI Chat (`routes/ai.js`, `public/js/ai-chat.js`)
- Interface (`ai-chat.html`) to interact with configured AI chat models.
- Backend (`routes/ai.js`) likely proxies requests to the selected AI API (e.g., OpenAI).
- Configuration stored in `models/AiApi.js`.

#### 4. Text-to-Image (`routes/images.js`, `public/js/text-to-image.js`)
- Interface (`text-to-image.html`) to generate images from text prompts.
- Backend (`routes/images.js`) interacts with configured image generation APIs (e.g., Stability AI, DALL-E).
- Configuration stored in `models/ImageApi.js`.

#### 5. Text-to-Voice (`routes/voice.js`, `public/js/text-to-voice.js` - assumed)
- Interface (`text-to-voice.html`) to synthesize speech from text.
- Backend (`routes/voice.js`) interacts with configured text-to-speech APIs.
- Configuration stored in `models/VoiceApi.js`.

#### 6. Admin Settings (`routes/admin.js`, `public/js/admin.js`)
- Interface (`admin-settings.html`) for administrators.
- Allows configuration of AI API providers and keys (`AiApi`, `ImageApi`, `VoiceApi` models).
- May include other administrative functions.


## Todo List
- Create a postman collection of all the apis in categorized way.
- Refactor backend: remove hardcode, repeated code, deprecated code and improve the code structure.    
- Batch generation.
- Message queue implementation.
- Performance monitoring.


## License

This project is licensed under the MIT License - see the LICENSE file for details.
