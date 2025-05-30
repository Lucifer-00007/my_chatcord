const Joi = require('joi');

// Common MongoDB ObjectId validator
const mongoIdSchema = Joi.string().hex().length(24);

const chatSessionIdParamSchema = Joi.object({
  id: mongoIdSchema.required(),
});

const createChatSessionSchema = Joi.object({
  apiId: mongoIdSchema.required(),
});

const updateChatTitleSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
});

const aiChatSchema = Joi.object({
  message: Joi.string().min(1).max(4000).required(),
  apiId: mongoIdSchema.required(),
  sessionId: mongoIdSchema.optional(), // Optional for starting a new chat without a session
});

module.exports = {
  chatSessionIdParamSchema,
  createChatSessionSchema,
  updateChatTitleSchema,
  aiChatSchema,
  mongoIdSchema, // Export for potential use in other schemas if needed directly
};
