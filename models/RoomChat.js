const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const roomChatSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    unique: true,
  },
  messages: [messageSchema],
  isHidden: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

roomChatSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

// Add index for lastUpdated
roomChatSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('RoomChat', roomChatSchema);
