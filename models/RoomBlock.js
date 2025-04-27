const mongoose = require('mongoose');

const RoomBlockSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    room: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    blockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    duration: {
        type: Number,
        required: true,
        min: 1,
        max: 30 // max 30 days
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create index for efficient queries
RoomBlockSchema.index({ user: 1, room: 1, isActive: 1 });

module.exports = mongoose.model('RoomBlock', RoomBlockSchema);