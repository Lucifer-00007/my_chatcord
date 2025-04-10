const mongoose = require('mongoose');

const SystemLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    level: {
        type: String,
        enum: ['info', 'warn', 'error'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    source: {
        type: String,
        default: 'system'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
});

// Index for better query performance
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ level: 1, timestamp: -1 });

module.exports = mongoose.model('SystemLog', SystemLogSchema);
