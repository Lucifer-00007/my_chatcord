const Joi = require('joi');

// Re-usable MongoDB ObjectId schema
const mongoIdSchema = Joi.string().hex().length(24).required();

const voiceApiIdParamSchema = Joi.object({
  id: mongoIdSchema,
});

const voiceDetailSchema = Joi.object({
  id: Joi.string().required(), // Voice ID from the API provider
  name: Joi.string().required(), // Display name for the voice
  lang: Joi.string().optional(), // Language code, e.g., 'en-US'
  gender: Joi.string().valid('male', 'female', 'neutral').optional(),
});

const createVoiceApiSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  apiType: Joi.string().valid('tts', 'vc').required(), // Text-to-Speech, Voice Cloning
  responseType: Joi.string().valid('binary', 'base64', 'url').required(),
  curlCommand: Joi.string().required(),
  requestPath: Joi.string().required(), // Path to set the text/voice input in the request body
  responsePath: Joi.string().optional().allow(''), // Path to extract data if response is JSON (e.g., for base64 or URL)
  supportedVoices: Joi.array().items(voiceDetailSchema).optional().default([]),
  isActive: Joi.boolean().default(false),
  modelId: Joi.string().optional().allow(''), // Optional model identifier for the API
  metadata: Joi.object().optional(),
});

const updateVoiceApiSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  apiType: Joi.string().valid('tts', 'vc').optional(),
  responseType: Joi.string().valid('binary', 'base64', 'url').optional(),
  curlCommand: Joi.string().optional(),
  requestPath: Joi.string().optional(),
  responsePath: Joi.string().optional().allow(''),
  supportedVoices: Joi.array().items(voiceDetailSchema).optional(),
  isActive: Joi.boolean().optional(),
  modelId: Joi.string().optional().allow(''),
  metadata: Joi.object().optional(),
}).min(1); // Requires at least one field to be present for an update

// testVoiceApiAdminSchema can re-use the existing testVoiceApiSchema from /validators/voiceSchemas.js
// if the structure for testing in admin is the same. If it needs specific admin fields, define it here.
// For now, assuming it's the same and will be imported in the route file.

module.exports = {
  voiceApiIdParamSchema,
  createVoiceApiSchema,
  updateVoiceApiSchema,
  mongoIdSchema, // Export for re-use
  voiceDetailSchema, // Export for potential use if settings reference this structure
};
