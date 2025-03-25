const mongoose = require('mongoose');

const imageApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true  // Add unique constraint
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
        required: true
    },
    responsePath: {
        type: String,
        required: false
    },
    displayName: {
        type: String,
        required: false
    }
});

// Just update displayName if not set
imageApiSchema.pre('save', function(next) {
    if (!this.displayName) {
        this.displayName = this.name;
    }
    next();
});

// Add error handling middleware for duplicate key errors
imageApiSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('DUPLICATE_NAME'));
    } else {
        next(error);
    }
});

module.exports = mongoose.model('ImageApi', imageApiSchema);
