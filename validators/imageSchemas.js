const Joi = require('joi');
const { mongoIdSchema } = require('./aiSchemas'); // Re-use mongoIdSchema

const generateImageSchema = Joi.object({
  prompt: Joi.string().min(1).max(4000).required(), // Increased max length for prompts
  apiId: mongoIdSchema.required(),
  // Allowing string for size and style for more flexibility, as specific enums can be restrictive.
  // Frontend or specific API handlers can enforce stricter sets if needed.
  size: Joi.string().min(3).max(50).required(),
  style: Joi.string().min(3).max(50).optional(), // Making style optional as not all APIs might use it
  n: Joi.number().integer().min(1).max(10).optional(), // Number of images
  quality: Joi.string().valid('standard', 'hd').optional(), // Example quality options
});

module.exports = {
  generateImageSchema,
};
