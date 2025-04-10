const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    maxMessages: {
        type: Number,
        default: 50,
        min: 10,
        max: 1000
    },
    messageTimeout: {
        type: Number,
        default: 300,
        min: 0,
        max: 3600
    },
    sessionTimeout: {
        type: Number,
        default: 60,
        min: 5,
        max: 1440
    },
    maxLoginAttempts: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Settings', SettingsSchema);
