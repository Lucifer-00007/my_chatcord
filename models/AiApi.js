const mongoose = require('mongoose');

const aiApiSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true  // Re-enable unique constraint
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
        default: 'messages[0].content',  // Default path for user input
        required: true
    },
    responsePath: {
        type: String,
        default: 'choices[0].message.content',  // Default path for API response
        required: true
    }
});

// Update pre-save hook with better error handling
aiApiSchema.pre('save', async function(next) {
    try {
        if (this.isModified('name')) {
            const exists = await this.constructor.findOne({ 
                _id: { $ne: this._id },
                name: this.name
            });
            if (exists) {
                const error = new Error('API with this name already exists');
                error.code = 'DUPLICATE_NAME';
                throw error;
            }
        }
        next();
    } catch (err) {
        next(err);
    }
});

// Add validation middleware
aiApiSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('DUPLICATE_NAME'));
    } else {
        next(error);
    }
});

module.exports = mongoose.model('AiApi', aiApiSchema);
