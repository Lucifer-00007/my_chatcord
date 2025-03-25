const mongoose = require('mongoose');

const imageSettingsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['sizes', 'styles'],
        required: true,
        unique: true
    },
    values: [{
        id: String,
        name: String,
        value: mongoose.Schema.Types.Mixed,  // For sizes: {width, height}, for styles: string
        description: String,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

imageSettingsSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('ImageSettings', imageSettingsSchema);
