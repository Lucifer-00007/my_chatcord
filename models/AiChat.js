const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  model: {
    // Add model field
    type: String,
    required: false, // Optional because user messages don't have a model
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const aiChatSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  apiModel: {
    name: String,
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiApi',
    },
  },
  messages: [aiMessageSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

aiChatSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

// Add indexes
aiChatSchema.index({ user: 1, lastUpdated: -1 }); // For fetching user's chats, sorted by recent
aiChatSchema.index({ 'apiModel.apiId': 1 }); // For finding chats using a specific AI API
aiChatSchema.index({ isActive: 1, lastUpdated: -1 }); // For fetching active chats, sorted by recent

module.exports = mongoose.model('AiChat', aiChatSchema);
