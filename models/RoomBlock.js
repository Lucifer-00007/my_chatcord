const mongoose = require('mongoose');

const RoomBlockSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId, // Use ObjectId for room
      ref: 'Room',
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1 / 48, // min 30 minutes
      max: Number.MAX_SAFE_INTEGER, // effectively unlimited
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for efficient queries
RoomBlockSchema.index({ user: 1, room: 1, isActive: 1 }); // Existing index
RoomBlockSchema.index({ isActive: 1, endDate: 1 }); // New index for querying active/inactive blocks by end date

module.exports = mongoose.model('RoomBlock', RoomBlockSchema);
