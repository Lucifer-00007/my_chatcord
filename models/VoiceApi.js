const mongoose = require('mongoose');

const voiceSchema = new mongoose.Schema({
    id: String,
    name: String,
    gender: String,
    language: String,
    isActive: {
        type: Boolean,
        default: true
    }
});

const languageSchema = new mongoose.Schema({
    id: String,
    name: String,
    code: String,
    isActive: {
        type: Boolean,
        default: true
    }
});

const voiceApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    endpoint: {
        type: String,
        required: true
    },
    curlCommand: {
        type: String,
        required: true
    },
    apiType: {
        type: String,
        enum: ['direct', 'hearing'],
        default: 'direct'
    },
    requestMethod: {
        type: String,
        enum: ['GET', 'POST'],
        default: 'POST'
    },
    responseType: {
        type: String,
        enum: ['binary', 'base64', 'decoded_base64', 'url'],
        required: true
    },
    headers: {
        type: Map,
        of: String
    },
    requestPath: {
        type: String,
        required: true
    },
    responsePath: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    supportedVoices: [voiceSchema],
    supportedLanguages: [languageSchema],
    auth: {
        type: {
            type: String,
            enum: ['none', 'hearing'],
            default: 'none'
        },
        loginEndpoint: String,
        tokenPath: String,
        credentials: {
            username: String,
            password: String
        },
        currentToken: String,
        tokenExpiry: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('VoiceApi', voiceApiSchema);
