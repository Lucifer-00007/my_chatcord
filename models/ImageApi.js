const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
    id: String,
    label: String,
    width: Number,
    height: Number,
    isActive: {
        type: Boolean,
        default: true
    }
});

const styleSchema = new mongoose.Schema({
    id: String,
    name: String,
    isActive: {
        type: Boolean,
        default: true
    }
});

// Add indexes for faster querying
sizeSchema.index({ id: 1 });
styleSchema.index({ id: 1 });

const ImageApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    curlCommand: {
        type: String,
        required: true
    },
    requestPath: {
        type: String,
        required: true
    },
    responsePath: String,
    isActive: {
        type: Boolean,
        default: true
    },
    supportedSizes: [sizeSchema],
    supportedStyles: [styleSchema]
}, {
    timestamps: true
});

// Add custom index options
ImageApiSchema.index({ 
    name: 1 
}, { 
    unique: true,
    collation: { locale: 'en', strength: 2 }
});

module.exports = mongoose.model('ImageApi', ImageApiSchema);
