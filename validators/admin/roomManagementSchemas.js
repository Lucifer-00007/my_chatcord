const Joi = require('joi');

// Re-usable MongoDB ObjectId schema
const mongoIdSchema = Joi.string().hex().length(24).required();

const roomIdParamSchema = Joi.object({
  id: mongoIdSchema, // For routes like /rooms/:id
});

const roomSpecificIdParamSchema = Joi.object({
  roomId: mongoIdSchema, // For routes like /rooms/:roomId/chats
});

const createRoomSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  topic: Joi.string().max(100).optional().allow(''),
  description: Joi.string().max(500).optional().allow(''),
  isDefault: Joi.boolean().default(false),
});

const updateRoomSchema = Joi.object({
  name: Joi.string().min(3).max(50).optional(),
  topic: Joi.string().max(100).optional().allow(''),
  description: Joi.string().max(500).optional().allow(''),
  isDefault: Joi.boolean().optional(),
}).min(1); // Requires at least one field for update

const createRoomBlockSchema = Joi.object({
  userId: mongoIdSchema,
  roomId: mongoIdSchema,
  reason: Joi.string().min(5).max(200).required(),
  duration: Joi.number().integer().min(1).max(365).required(), // Duration in days
});

const blockIdParamSchema = Joi.object({
  id: mongoIdSchema, // For /blocks/:id
});

const chatMessageIndexParamSchema = Joi.object({
  idx: Joi.number().integer().min(0).required(),
});

module.exports = {
  roomIdParamSchema,
  roomSpecificIdParamSchema,
  createRoomSchema,
  updateRoomSchema,
  createRoomBlockSchema,
  blockIdParamSchema,
  chatMessageIndexParamSchema,
  mongoIdSchema, // Export for re-use
};
