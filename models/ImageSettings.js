const mongoose = require('mongoose');

const imageSettingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['sizes', 'styles'],
      unique: true,
    },
    values: [
      {
        id: String,
        label: String,
        name: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ImageSettings', imageSettingsSchema);
