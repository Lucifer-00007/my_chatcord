# ChatCord - Real-time Chat Application

A secure, real-time chat application built with Node.js, Express, Socket.IO, and Redis, featuring user authentication and room-based messaging.

## Features

- JWT-based authentication with secure cookies
- Real-time messaging with Socket.IO
- Redis-backed message handling
- MongoDB data persistence
- Room-based chat system
- User presence tracking
- Mobile-responsive design
- Password visibility toggle
- Content Security Policy (CSP)
- Rate limiting protection
- Environment-based security settings

## Project Structure

```
chatcord/
├── config/                # Configuration files
│   └── db.js             # Database configuration
├── middleware/           # Middleware functions
│   └── auth.js          # Authentication middleware
├── models/              # Database models
│   ├── Channel.js      # Channel model
│   ├── Message.js      # Message model
│   └── User.js         # User model
├── public/             # Static files
│   ├── assets/         # Static assets (images, icons)
│   │   └── favicon.ico # Site favicon
│   ├── css/           # Stylesheets
│   │   └── style.css  # Main stylesheet
│   ├── js/            # Client-side JavaScript
│   │   ├── auth.js    # Authentication logic
│   │   ├── auth-guard.js # Auth protection
│   │   ├── main.js    # Chat main logic
│   │   └── selectRoom.js # Room selection logic
│   ├── chat.html      # Chat interface
│   ├── login.html     # Login page
│   ├── register.html  # Registration page
│   └── selectRoom.html # Room selection page
├── routes/             # API routes
│   ├── auth.js        # Authentication routes
│   └── channels.js    # Channel management routes
├── utils/             # Utility functions
│   ├── jwt.js        # JWT handling
│   ├── messages.js   # Message formatting
│   └── users.js      # User management
├── .env              # Environment variables
├── .env.template     # Environment template
├── .gitignore       # Git ignore rules
├── package.json     # Project dependencies
└── server.js        # Main application file
```

## Prerequisites

- Node.js (v14 or higher)
- Redis server
- npm or yarn

## Environment Setup

1. Create a `.env` file in the project root:

```env
# Redis connection URL (required)
REDIS_URL=redis://[username]:[password]@[host]:[port]

# Server configuration
PORT=3000
HOST=0.0.0.0

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/chatcord

# Security configuration
JWT_SECRET=your-secure-jwt-secret-key
NODE_ENV=development

# Domain configuration (for production)
PROD_DOMAIN=your-production-domain.com
```

2. Environment Variables:
- `REDIS_URL`: Your Redis connection string
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (0.0.0.0 for local network access)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (min 64 chars)
- `NODE_ENV`: 'development' or 'production'
- `PROD_DOMAIN`: Production domain for cookies

3. Development Setup:
- Start MongoDB locally or use remote instance
- Start Redis server or use Redis Cloud
- Set NODE_ENV to 'development'
- Use default PORT 3000

4. Production Setup:
- Set secure PROD_DOMAIN
- Use production MongoDB URI
- Set NODE_ENV to 'production'
- Configure secure Redis instance

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

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000` (or your configured PORT)

## Feature Details

### Authentication
- User registration with email and password
- Secure login system
- Session management

### Channels
- Create new topic-based channels
- Join existing channels
- Real-time channel list updates
- Channel-specific user lists

### Chat Features
- Real-time message delivery
- Message history
- User typing indicators
- Online/offline status

### Real-time Updates
- Active user lists
- Channel statistics
- User status changes

## License

This project is licensed under the MIT License - see the LICENSE file for details.
