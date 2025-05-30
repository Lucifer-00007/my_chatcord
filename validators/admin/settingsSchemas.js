const Joi = require('joi');

const updateSettingsSchema = Joi.object({
  // Chat settings
  maxUsersPerRoom: Joi.number().integer().min(2).optional(), // Aligned with Mongoose: min 2
  maxRoomsPerUser: Joi.number().integer().min(1).optional(), // Aligned with Mongoose: min 1
  maxMessageLength: Joi.number().integer().min(1).optional(), // Aligned with Mongoose: min 1
  messageRateLimit: Joi.number().integer().min(1).optional(), // Aligned with Mongoose: min 1
  enableProfanityFilter: Joi.boolean().optional(),

  // User settings
  requireEmailVerification: Joi.boolean().optional(),
  allowGuestAccess: Joi.boolean().optional(),

  // AI settings (fields present in Joi but not in current Mongoose Settings model)
  // These will be validated if sent, but not stored unless model is updated.
  defaultAiApi: Joi.string().hex().length(24).optional().allow(''),
  defaultImageApi: Joi.string().hex().length(24).optional().allow(''),
  defaultVoiceApi: Joi.string().hex().length(24).optional().allow(''),

  // System settings (fields present in Joi but not in current Mongoose Settings model)
  siteName: Joi.string().min(1).max(100).optional(),
  siteDescription: Joi.string().max(500).optional().allow(''),
  maintenanceMode: Joi.boolean().optional(),

  // Security settings (fields present in Joi but not in current Mongoose Settings model)
  maxLoginAttempts: Joi.number().integer().min(3).optional(),
  lockoutDurationMinutes: Joi.number().integer().min(1).optional(),

  // Note: lastUpdated is handled by Mongoose pre-save hook, not part of user input.
}).min(1); // Requires at least one field to be present for an update

module.exports = {
  updateSettingsSchema,
};
