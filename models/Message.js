const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for better query performance
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
