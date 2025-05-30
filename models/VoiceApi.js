const mongoose = require('mongoose');

const voiceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'neutral'],
      default: 'neutral',
    },
    language: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const VoiceApiSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    apiType: {
      type: String,
      required: true,
      enum: ['direct', 'hearing'],
    },
    responseType: {
      type: String,
      required: true,
      enum: ['binary', 'base64', 'url'],
    },
    // Stores the full cURL command, may contain sensitive API keys.
    curlCommand: {
      type: String,
      required: true,
    },
    // FUTURE: Consider storing sensitive parts of curlCommand (like API keys) in environment variables or a secrets management service.
    requestPath: {
      type: String,
      required: true,
      validate: {
        validator(v) {
          // Allow both JSON paths and URL parameter formats
          return (
            /^([a-zA-Z_]\w*(\[\d+\])?\.)*[a-zA-Z_]\w*(\[\d+\])?$/.test(v) ||
            /^[a-zA-Z_]\w*=/.test(v)
          );
        },
        message: 'Invalid request path format',
      },
    },
    responsePath: {
      type: String,
      validate: {
        validator(v) {
          if (!v) return true; // Optional field
          // Allow both JSON paths and URL parameter formats
          return (
            /^([a-zA-Z_]\w*(\[\d+\])?\.)*[a-zA-Z_]\w*(\[\d+\])?$/.test(v) ||
            /^[a-zA-Z_]\w*=/.test(v)
          );
        },
        message: 'Invalid response path format',
      },
    },
    supportedVoices: {
      type: [voiceSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    auth: {
      loginEndpoint: String,
      tokenPath: String,
      credentials: {
        username: String,
        password: String,
      },
    },
    method: {
      type: String,
      default: 'POST',
      enum: ['POST'],
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
VoiceApiSchema.index({ name: 1 }, { unique: true }); // Existing index
VoiceApiSchema.index({ isActive: 1 }); // Existing index
VoiceApiSchema.index({ apiType: 1 }); // New index

// Remove curlCommand when converting to JSON
VoiceApiSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.curlCommand;
    return ret;
  },
});

module.exports = mongoose.model('VoiceApi', VoiceApiSchema);
