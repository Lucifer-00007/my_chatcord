const mongoose = require('mongoose');

const voiceSettingsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['speed', 'pitch'],
        required: true,
        unique: true
    },
    range: {
        min: Number,
        max: Number,
        step: Number,
        default: Number
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('VoiceSettings', voiceSettingsSchema);
