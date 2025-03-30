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

const VoiceApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    apiType: {
        type: String,
        required: true
    },
    responseType: {
        type: String,
        required: true
    },
    requestPath: {
        type: String,
        required: true
    },
    responsePath: String,
    curlCommand: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    auth: {
        type: {
            type: String,
            enum: ['none', 'hearing']
        },
        loginEndpoint: String,
        tokenPath: String,
        credentials: {
            username: String,
            password: String
        }
    },
    supportedVoices: [{
        id: String,
        name: String,
        gender: String,
        language: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('VoiceApi', VoiceApiSchema);
