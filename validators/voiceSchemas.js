const Joi = require('joi');
const { mongoIdSchema } = require('./aiSchemas'); // Re-use mongoIdSchema

const generateVoiceSchema = Joi.object({
  apiId: mongoIdSchema.required(),
  voice: Joi.string().min(1).max(100).required(), // Assuming voice is an identifier string
  text: Joi.string().min(1).max(2000).required(),
  speed: Joi.number().min(0.5).max(2.0).optional(),
  pitch: Joi.number().min(0.5).max(2.0).optional(),
  model: Joi.string().optional(), // Added model as it's often used
  language: Joi.string().optional(), // Added language
});

// This schema is very generic as cURL commands can be highly variable.
// For a production system, more specific validation based on expected cURL structures might be needed.
const testVoiceApiSchema = Joi.object({
  curlCommand: Joi.string().min(10).required(), // Basic check for some content
  requestPath: Joi.string().min(1).optional(), // Allow empty or no request path
  responsePath: Joi.string().allow('').optional(), // Allow empty string for response path
  apiType: Joi.string().optional(),
  responseType: Joi.string().optional(),
  auth: Joi.alternatives().try(Joi.object(), Joi.string()).optional(), // Can be an object or a string
});

module.exports = {
  generateVoiceSchema,
  testVoiceApiSchema,
};
