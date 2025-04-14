require('dotenv').config();


// Default channel list for chat
const DEFAULT_CHANNELS = [
    { name: 'JavaScript', topic: 'JavaScript Discussion' },
    { name: 'Python', topic: 'Python Discussion' },
    { name: 'PHP', topic: 'PHP Discussion' },
    { name: 'C#', topic: 'C# Discussion' },
    { name: 'Ruby', topic: 'Ruby Discussion' },
    { name: 'Java', topic: 'Java Discussion' }
];

// Standard chat messages
const MESSAGES = {
    welcome: "Welcome to ChatCord!",
    userJoined: username => `${username} has joined the chat`,
    userLeft: username => `${username} has left the chat`,
    sendError: "Failed to send message"
};

// Admin API related constants
const ADMIN_CONSTANTS = {
    SUPPORTED_VOICE_TYPES: ['speed', 'pitch'],
    SUPPORTED_IMAGE_TYPES: ['sizes', 'styles'],
    DEFAULT_VOICE_RANGES: {
        speed: { min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
        pitch: { min: 0.5, max: 2.0, step: 0.1, default: 1.0 }
    },
    TEST_MESSAGE: "This is a test message",
    PAGINATION: {
        DEFAULT_LIMIT: 100
    }
};

// Input validation constants
const VALIDATION = {
    MIN_WIDTH: 1,
    MAX_WIDTH: 4096,
    MIN_HEIGHT: 1,
    MAX_HEIGHT: 4096,
    MIN_STEP: 0.1,
    MAX_STEP: 1.0
};

// AI Chat configuration
const AI_CONFIG = {
    apiTypes: {
        OPENROUTER: 'openrouter',
        OPENAI: 'openai',
        CUSTOM: 'custom'
    },
    defaultModel: 'qwen/qwen2.5-vl-72b-instruct:free',
    initialMessage: 'This is the start of your conversation.',
    defaultTitle: 'New Chat',
    aiResponseError: 'Failed to get AI response',
    titlePromptTemplate: 'Suggest an extremely short 2-3 word title for this message: "{message}"'
};

// Voice API configuration
const VOICE_API_CONFIG = {
    types: {
        DIRECT: 'direct',
        AUTHENTICATED: 'auth',
        FORM: 'form',
        QUERY: 'query'
    },
    responseTypes: {
        BINARY: 'binary',
        BASE64: 'base64',
        DECODED_BASE64: 'decoded_base64',
        URL: 'url'
    },
    contentTypes: {
        JSON: 'application/json',
        FORM: 'application/x-www-form-urlencoded',
        MULTIPART: 'multipart/form-data'
    },
    defaultVoices: {
        kokoro: { model: "kokoro", response_format: "mp3", speed: 1.0 },
        deepgram: { model: "aura-arcas-en" },
        ttsmp3: { source: "ttsmp3", speed: "1.00" },
        tiktok: { voice: "en_us_rocket" }
    },
    authConfig: {
        tokenHeader: 'Authorization',
        tokenPrefix: 'Bearer ',
        tokenPath: 'token',
        tokenExpiry: 3600
    },
    voiceProviders: {
        DIRECT: {
            id: 'direct',
            name: 'Direct (Single Request)',
            description: 'Simple API that accepts text and returns audio directly',
            requiresAuth: false,
            defaults: { response_format: "mp3" },
            requestStructure: {
                wrapper: 'input',
                keys: { text: 'text', voice: 'voice', speed: 'speed', pitch: 'pitch', language: 'language' }
            }
        },
        HEARING: {
            id: 'hearing',
            name: 'Hearings API (Token Required)',
            description: 'API that requires authentication before use',
            requiresAuth: true
        }
    },
    defaultVoiceTypes: [
        { id: "female", name: "Female" },
        { id: "male", name: "Male" },
        { id: "neutral", name: "Neutral" }
    ],
    messages: {
        DUPLICATE_NAME: name => `An API named "${name}" already exists`,
        SAVE_SUCCESS: 'Voice API saved successfully',
        UPDATE_SUCCESS: 'Voice API updated successfully',
        DELETE_SUCCESS: 'Voice API deleted successfully',
        NOT_FOUND: 'Voice API not found',
        TEST_SUCCESS: 'API test completed successfully',
        TEST_FAILED: 'Failed to test voice API'
    },
    methods: {
        DEFAULT: 'POST'
    }
};

// Demo data configuration (can be useful for seeding/testing)
const DEMO_CONFIG = {
    users: [
        { username: 'admin', email: 'admin@demo.com', password: 'admin@123', isAdmin: true },
        { username: 'user1', email: 'user1@demo.com', password: 'user123' },
        { username: 'user2', email: 'user2@demo.com', password: 'user123' },
        { username: 'user3', email: 'user3@demo.com', password: 'user123' },
        { username: 'user4', email: 'user4@demo.com', password: 'user123' },
        { username: 'user5', email: 'user5@demo.com', password: 'user123' }
    ],
    messages: [
        "Hello everyone! 👋", "How's everyone doing today?", "Anyone working on an interesting project?",
        "JavaScript is awesome!", "I love coding in this community", "Has anyone tried the new features?",
        "This chat app is pretty cool", "Hope everyone's having a great day!", "Who else is coding late night? 😄",
        "Don't forget to take breaks while coding!"
    ],
    messageInterval: 5 * 60 * 1000 // 5 minutes
};


// --- Environment-Derived Constants and Dynamic Configurations ---
const NODE_ENV = process.env.NODE_ENV || 'development';
const PROD_DOMAIN = process.env.PROD_DOMAIN; // Used in Cookie config

// Cookie Configuration - Varies by environment
const COOKIE_CONFIG = {
    production: {
        httpOnly: true,
        secure: true, // Needs HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        path: '/',
        sameSite: 'strict', // Strictest protection against CSRF
        domain: PROD_DOMAIN // Important for subdomains if needed
    },
    development: {
        httpOnly: true,
        secure: false, // Typically no HTTPS in local dev
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
        sameSite: 'lax', // More flexible for local dev
        domain: 'localhost' // Or leave undefined
    }
};

// CORS Configuration
const CORS_CONFIG = {
    origin: process.env.CORS_ORIGIN || (NODE_ENV === 'production' ? undefined : "http://localhost:3000"), // Stricter default in prod
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Add common methods
    credentials: true
};


// --- Main Exported Configuration Object ---
module.exports = {
    // Core Environment Settings
    env: {
        NODE_ENV: NODE_ENV,
        PORT: process.env.PORT || 3000,
        HOST: process.env.HOST || '0.0.0.0', // Listen on all available interfaces by default
    },

    // Database URIs
    db: {
        MONGODB_URI: process.env.MONGODB_URI,
        REDIS_URL: process.env.REDIS_URL,
    },

    // Security Settings
    security: {
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRE: process.env.JWT_EXPIRE || '1d',
        ROOM_TOKEN_EXPIRE: process.env.ROOM_TOKEN_EXPIRE || '1h',
        // Rate Limiting (values in milliseconds and counts)
        RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    },

    // CORS Configuration (using the object defined above)
    cors: CORS_CONFIG,

    // Cookie Configuration (select based on environment)
    cookie: COOKIE_CONFIG[NODE_ENV],

    // Chat Application Settings
    chat: {
        BOT_NAME: process.env.BOT_NAME || 'ChatCord Bot', // Slightly more descriptive default
        MAX_MESSAGES: parseInt(process.env.MAX_MESSAGES || '50'),
        DEFAULT_CHANNELS: DEFAULT_CHANNELS, // Use the constant defined above
        MESSAGES: MESSAGES                 // Use the constant defined above
    },

    // Feature-Specific Configurations
    ai: AI_CONFIG,
    voice: VOICE_API_CONFIG,

    // Admin & Validation
    admin: ADMIN_CONSTANTS,
    validation: VALIDATION,

    // Demo Data (potentially used for seeding)
    demo: DEMO_CONFIG
};