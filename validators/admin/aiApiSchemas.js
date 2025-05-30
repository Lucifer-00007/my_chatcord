const Joi = require('joi');

// Re-usable MongoDB ObjectId schema
const mongoIdSchema = Joi.string().hex().length(24);

const aiApiIdParamSchema = Joi.object({
  id: mongoIdSchema.required(),
});

const createAiApiSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  curlCommand: Joi.string().required(), // Basic validation, consider custom for more specific cURL checks
  modelId: Joi.string().optional().allow(''),
  requestPath: Joi.string().required(),
  responsePath: Joi.string().required(),
  apiType: Joi.string().valid('chat', 'completion', 'embedding').required(),
  isActive: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().alphanum().min(1).max(30)).optional(), // Basic tag validation
  metadata: Joi.object().optional(), // Allows any object structure
});

const updateAiApiSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  curlCommand: Joi.string().optional(),
  modelId: Joi.string().optional().allow(''),
  requestPath: Joi.string().optional(),
  responsePath: Joi.string().optional(),
  apiType: Joi.string().valid('chat', 'completion', 'embedding').optional(),
  isActive: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().alphanum().min(1).max(30)).optional(),
  metadata: Joi.object().optional(),
}).min(1); // Requires at least one field to be present for an update

const testAiApiSchema = Joi.object({
  curlCommand: Joi.string().required(),
  requestPath: Joi.string().required(),
  // Consider adding responsePath if the test endpoint needs to validate it for extraction
});

module.exports = {
  aiApiIdParamSchema,
  createAiApiSchema,
  updateAiApiSchema,
  testAiApiSchema,
  mongoIdSchema, // Export for re-use if needed
};
