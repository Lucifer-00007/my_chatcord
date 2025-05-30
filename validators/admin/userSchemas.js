const Joi = require('joi');

// Re-usable MongoDB ObjectId schema
const mongoIdSchema = Joi.string().hex().length(24).required();

const userIdParamSchema = Joi.object({
  id: mongoIdSchema,
});

const searchUserQuerySchema = Joi.object({
  q: Joi.string().max(50).optional().allow(''), // Allow empty query string
});

const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  isAdmin: Joi.boolean().default(false),
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional().allow(''), // Allow empty string to not update password
  isAdmin: Joi.boolean().optional(),
}).min(1); // Requires at least one field for update

module.exports = {
  userIdParamSchema,
  searchUserQuerySchema,
  createUserSchema,
  updateUserSchema,
  mongoIdSchema, // Export for re-use
};
