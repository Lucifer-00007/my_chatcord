const mongoose = require('mongoose');

const voiceSettingsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['pitch', 'speed'],
        unique: true
    },
    values: [{
        id: String,
        label: String,
        value: Number,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VoiceSettings', voiceSettingsSchema);
