const mongoose = require('mongoose');

const aiApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
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
    headers: {
        type: Map,
        of: String
    },
    method: {
        type: String,
        default: 'POST'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    requestPath: {
        type: String,
        default: 'messages[0].content',  // Default path for user input
        required: true
    },
    responsePath: {
        type: String,
        default: 'choices[0].message.content',  // Default path for API response
        required: true
    }
});

module.exports = mongoose.model('AiApi', aiApiSchema);
