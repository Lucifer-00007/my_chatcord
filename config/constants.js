require('dotenv').config();

// Remove CSP_CONFIG from constants since it's now handled directly in server.js
const { CSP_CONFIG, ...otherConstants } = module.exports;

module.exports = {
    ...otherConstants,
    // Server config
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST,
    NODE_ENV: process.env.NODE_ENV,

    // Database config
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URL: process.env.REDIS_URL,

    // Security config
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE || '1d',
    ROOM_TOKEN_EXPIRE: process.env.ROOM_TOKEN_EXPIRE || '1h',

    // Rate limiting
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),

    // Chat config
    BOT_NAME: process.env.BOT_NAME || 'Bot Name',
    MAX_MESSAGES: parseInt(process.env.MAX_MESSAGES || '50'),
    DEFAULT_CHANNELS: [
        { name: 'JavaScript', topic: 'JavaScript Discussion' },
        { name: 'Python', topic: 'Python Discussion' },
        { name: 'PHP', topic: 'PHP Discussion' },
        { name: 'C#', topic: 'C# Discussion' },
        { name: 'Ruby', topic: 'Ruby Discussion' },
        { name: 'Java', topic: 'Java Discussion' }
    ],

    // Cookie config
    COOKIE_CONFIG: {
        production: {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/',
            sameSite: 'strict',
            domain: process.env.PROD_DOMAIN
        },
        development: {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
            sameSite: 'lax',
            domain: 'localhost'
        }
    },

    // CORS Configuration
    CORS_CONFIG: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },

    // Chat Messages
    MESSAGES: {
        welcome: "Welcome to ChatCord!",
        userJoined: username => `${username} has joined the chat`,
        userLeft: username => `${username} has left the chat`,
        sendError: "Failed to send message"
    },

    // Demo Data Configuration
    DEMO_CONFIG: {
        users: [
            { username: 'admin', email: 'admin@demo.com', password: 'admin@123', isAdmin: true },
            { username: 'user1', email: 'user1@demo.com', password: 'user123' },
            { username: 'user2', email: 'user2@demo.com', password: 'user123' },
            { username: 'user3', email: 'user3@demo.com', password: 'user123' },
            { username: 'user4', email: 'user4@demo.com', password: 'user123' },
            { username: 'user5', email: 'user5@demo.com', password: 'user123' }
        ],
        messages: [
            "Hello everyone! 👋",
            "How's everyone doing today?",
            "Anyone working on an interesting project?",
            "JavaScript is awesome!",
            "I love coding in this community",
            "Has anyone tried the new features?",
            "This chat app is pretty cool",
            "Hope everyone's having a great day!",
            "Who else is coding late night? 😄",
            "Don't forget to take breaks while coding!"
        ],
        messageInterval: 5 * 60 * 1000 // 5 minutes between messages
    }
};
