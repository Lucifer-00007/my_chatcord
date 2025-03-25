const mongoose = require('mongoose');

const imageApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
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
        default: 'prompt',
        required: true
    },
    responsePath: {
        type: String,
        default: 'data[0].url',
        required: true
    },
    modelId: {
        type: String,
        required: false
    },
    displayName: {
        type: String,
        required: false
    },
    supportedSizes: [{
        width: Number,
        height: Number,
        label: String
    }],
    supportedStyles: [{
        id: String,
        name: String,
        description: String
    }]
});

imageApiSchema.pre('save', async function(next) {
    try {
        if (this.isModified('name')) {
            const exists = await this.constructor.findOne({
                _id: { $ne: this._id },
                name: this.name
            });
            if (exists) {
                const error = new Error('Image API with this name already exists');
                error.code = 'DUPLICATE_NAME';
                throw error;
            }
        }
        if (!this.displayName) {
            this.displayName = this.name;
        }
        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model('ImageApi', imageApiSchema);
