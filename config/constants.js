require('dotenv').config();

module.exports = {
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

    // Content Security Policy
    CSP_CONFIG: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
        fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "*"],
        connectSrc: ["'self'", "ws:", "wss:"]
    },

    // Chat Messages
    MESSAGES: {
        welcome: "Welcome to ChatCord!",
        userJoined: username => `${username} has joined the chat`,
        userLeft: username => `${username} has left the chat`,
        sendError: "Failed to send message"
    }
};
