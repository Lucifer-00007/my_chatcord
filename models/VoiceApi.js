const mongoose = require('mongoose');

const voiceSchema = new mongoose.Schema({
    id: String,
    name: String,
    gender: {
        type: String,
        enum: ['male', 'female', 'neutral']
    },
    language: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const VoiceApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    apiType: {
        type: String,
        required: true,
        enum: ['direct', 'hearing']
    },
    responseType: {
        type: String,
        required: true,
        enum: ['binary', 'base64', 'url']
    },
    curlCommand: {
        type: String,
        required: true
    },
    requestPath: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                // Allow both JSON paths and URL parameter formats
                return /^([a-zA-Z_]\w*(\[\d+\])?\.)*[a-zA-Z_]\w*(\[\d+\])?$/.test(v) || 
                       /^[a-zA-Z_]\w*=/.test(v);
            },
            message: 'Invalid request path format'
        }
    },
    responsePath: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true; // Optional field
                // Allow both JSON paths and URL parameter formats
                return /^([a-zA-Z_]\w*(\[\d+\])?\.)*[a-zA-Z_]\w*(\[\d+\])?$/.test(v) || 
                       /^[a-zA-Z_]\w*=/.test(v);
            },
            message: 'Invalid response path format'
        }
    },
    supportedVoices: [voiceSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    auth: {
        loginEndpoint: String,
        tokenPath: String,
        credentials: {
            username: String,
            password: String
        }
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
VoiceApiSchema.index({ name: 1 }, { unique: true });
VoiceApiSchema.index({ isActive: 1 });

module.exports = mongoose.model('VoiceApi', VoiceApiSchema);
