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

    // AI Chat Configuration
    AI_CONFIG: {
        apiTypes: {
            OPENROUTER: 'openrouter',
            OPENAI: 'openai',
            CUSTOM: 'custom'
        },
        defaultModel: 'google/gemini-2.0-pro-exp-02-05:free',
        initialMessage: 'This is the start of your conversation.',
        defaultTitle: 'New Chat',
        aiResponseError: 'Failed to get AI response',
        titlePromptTemplate: 'Suggest an extremely short 2-3 word title for this message: "{message}"'
    },

    // Voice API Configuration
    VOICE_API_CONFIG: {
        types: {
            DIRECT: 'direct',      // Single API call
            AUTHENTICATED: 'auth',  // Requires authentication token
            FORM: 'form',          // Form-urlencoded data
            QUERY: 'query'         // Query parameters in URL
        },
        responseTypes: {
            BINARY: 'binary',           // Direct audio buffer
            BASE64: 'base64',          // Base64 encoded audio
            DECODED_BASE64: 'decoded_base64', // Base64 that needs decoding
            URL: 'url'                 // URL to audio file
        },
        contentTypes: {
            JSON: 'application/json',
            FORM: 'application/x-www-form-urlencoded',
            MULTIPART: 'multipart/form-data'
        },
        defaultVoices: {
            kokoro: {
                model: "kokoro",
                response_format: "mp3",
                speed: 1.0
            },
            deepgram: {
                model: "aura-arcas-en"
            },
            ttsmp3: {
                source: "ttsmp3",
                speed: "1.00"
            },
            tiktok: {
                voice: "en_us_rocket"
            }
        },
        authConfig: {
            tokenHeader: 'Authorization',
            tokenPrefix: 'Bearer ',
            tokenPath: 'token', // Default path to extract token from response
            tokenExpiry: 3600   // Default token expiry in seconds
        },
        voiceProviders: {
            kokoro: {
                name: "Kokoro TTS",
                voiceKey: 'voice',
                textKey: 'input',
                speedKey: 'speed',
                modelKey: 'model',
                formatKey: 'response_format',
                defaults: {
                    model: "kokoro",
                    response_format: "mp3",
                    speed: 1.0
                }
            },
            deepgram: {
                name: "Deepgram",
                voiceKey: 'model',
                textKey: 'text',
                defaults: {
                    model: "aura-arcas-en"
                }
            },
            ttsmp3: {
                name: "TTS MP3",
                voiceKey: 'lang',
                textKey: 'msg',
                speedKey: 'speed',
                sourceKey: 'source',
                defaults: {
                    source: "ttsmp3",
                    speed: "1.00"
                }
            },
            tiktok: {
                name: "TikTok TTS",
                voiceKey: 'voice',
                textKey: 'text',
                defaults: {
                    voice: "en_us_rocket"
                }
            },
            hearing: {
                name: "Hearing API",
                requiresAuth: true,
                voiceKey: 'voice',
                textKey: 'text',
                languageKey: 'language'
            }
        },

        // Common language codes supported across providers
        supportedLanguages: [
            { code: "en-US", name: "English (US)" },
            { code: "en-GB", name: "English (UK)" },
            { code: "es-ES", name: "Spanish" },
            { code: "fr-FR", name: "French" },
            { code: "de-DE", name: "German" },
            { code: "it-IT", name: "Italian" },
            { code: "ja-JP", name: "Japanese" },
            { code: "ko-KR", name: "Korean" },
            { code: "zh-CN", name: "Chinese (Simplified)" }
        ],

        // Default voice configurations
        defaultVoiceTypes: [
            { id: "female", name: "Female" },
            { id: "male", name: "Male" },
            { id: "neutral", name: "Neutral" }
        ]
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
