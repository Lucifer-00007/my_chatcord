const mongoose = require('mongoose');

const sizeValueSchema = new mongoose.Schema({
    width: Number,
    height: Number
}, { _id: false });

const valueSchema = new mongoose.Schema({
    id: String,
    name: String,
    label: String,  // Add label for sizes
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const ImageSettingsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['sizes', 'styles']
    },
    values: [valueSchema],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for faster queries
ImageSettingsSchema.index({ type: 1 });

// Add validation for size values
ImageSettingsSchema.path('values').validate(function(values) {
    if (this.type === 'sizes') {
        return values.every(item => {
            const value = item.value;
            return value && 
                   typeof value.width === 'number' && 
                   typeof value.height === 'number' &&
                   value.width > 0 && 
                   value.height > 0;
        });
    }
    return true;
}, 'Invalid size values');

module.exports = mongoose.model('ImageSettings', ImageSettingsSchema);
