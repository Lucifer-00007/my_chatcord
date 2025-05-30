const Joi = require('joi');

// Re-usable MongoDB ObjectId schema
const mongoIdSchema = Joi.string().hex().length(24).required();

const imageIdParamSchema = Joi.object({
  id: mongoIdSchema,
});

const createImageApiSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  curlCommand: Joi.string().required(),
  requestPath: Joi.string().required(),
  responsePath: Joi.string().optional().allow(''), // Can be empty if binary response
  isActive: Joi.boolean().default(false),
  supportedSizes: Joi.array().items(Joi.string().min(3).max(20)).optional().default([]),
  supportedStyles: Joi.array().items(Joi.string().min(3).max(50)).optional().default([]),
  metadata: Joi.object().optional(),
});

const updateImageApiSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  curlCommand: Joi.string().optional(),
  requestPath: Joi.string().optional(),
  responsePath: Joi.string().optional().allow(''),
  isActive: Joi.boolean().optional(),
  supportedSizes: Joi.array().items(Joi.string().min(3).max(20)).optional(),
  supportedStyles: Joi.array().items(Joi.string().min(3).max(50)).optional(),
  metadata: Joi.object().optional(),
}).min(1); // Requires at least one field to be present for an update

const toggleImageApiSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const testImageApiSchema = Joi.object({
  curlCommand: Joi.string().required(),
  requestPath: Joi.string().required(),
  responsePath: Joi.string().optional().allow(''),
});

module.exports = {
  imageIdParamSchema,
  createImageApiSchema,
  updateImageApiSchema,
  toggleImageApiSchema,
  testImageApiSchema,
  mongoIdSchema, // Export for re-use
};
