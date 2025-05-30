const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  id: String,
  label: String,
  width: Number,
  height: Number,
  isActive: {
    type: Boolean,
    default: true,
  },
});

const styleSchema = new mongoose.Schema({
  id: String,
  name: String,
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Add indexes for faster querying
sizeSchema.index({ id: 1 });
styleSchema.index({ id: 1 });

const ImageApiSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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
    },
    responsePath: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    supportedSizes: [sizeSchema],
    supportedStyles: [styleSchema],
  },
  {
    timestamps: true,
  }
);

// Remove curlCommand when converting to JSON
ImageApiSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.curlCommand;
    return ret;
  },
});

// Add custom index options
ImageApiSchema.index(
  {
    name: 1,
  },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
  }
);

// Add new index
ImageApiSchema.index({ isActive: 1 });

module.exports = mongoose.model('ImageApi', ImageApiSchema);
