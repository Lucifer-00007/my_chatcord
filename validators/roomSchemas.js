const Joi = require('joi');

const createRoomSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  topic: Joi.string().max(100).optional(),
  description: Joi.string().max(500).optional(),
});

const roomIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const roomParamIdSchema = Joi.object({
  roomId: Joi.string().hex().length(24).required(),
});

const joinRoomSchema = Joi.object({
  room: Joi.string().hex().length(24).required(),
});

module.exports = {
  createRoomSchema,
  roomIdSchema,
  roomParamIdSchema,
  joinRoomSchema,
};
