const Joi = require('joi');

const getLogsQuerySchema = Joi.object({
  level: Joi.string().valid('info', 'warn', 'error', 'debug', 'all').optional(),
  limit: Joi.number().integer().min(1).max(1000).optional().default(100),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional().default(1), // For pagination
  sort: Joi.string().valid('timestamp', '-timestamp').optional().default('-timestamp'), // Sort order
});

const createLogSchema = Joi.object({
  level: Joi.string().valid('info', 'warn', 'error', 'debug').required(),
  message: Joi.string().min(1).required(),
  source: Joi.string().optional().allow(''),
  metadata: Joi.object().optional(),
});

const clearLogsQuerySchema = Joi.object({
  before: Joi.date().iso().optional(),
  level: Joi.string().valid('info', 'warn', 'error', 'debug').optional(),
});

module.exports = {
  getLogsQuerySchema,
  createLogSchema,
  clearLogsQuerySchema,
};
