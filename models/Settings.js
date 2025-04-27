const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    maxUsersPerRoom: {
        type: Number,
        required: true,
        default: 50,
        min: 2
    },
    maxRoomsPerUser: {
        type: Number,
        required: true,
        default: 5,
        min: 1
    },
    maxMessageLength: {
        type: Number,
        required: true,
        default: 500,
        min: 1
    },
    messageRateLimit: {
        type: Number,
        required: true,
        default: 60,
        min: 1
    },
    requireEmailVerification: {
        type: Boolean,
        required: true,
        default: false
    },
    allowGuestAccess: {
        type: Boolean,
        required: true,
        default: true
    },
    enableProfanityFilter: {
        type: Boolean,
        required: true,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Update lastUpdated timestamp on each save
settingsSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Add middleware to ensure single settings document
settingsSchema.pre('save', async function(next) {
    const count = await this.constructor.countDocuments();
    if (count > 0 && !this._id) {
        next(new Error('Only one settings document can exist'));
    }
    next();
});

module.exports = mongoose.model('Settings', settingsSchema);
