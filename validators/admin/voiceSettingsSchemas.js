const Joi = require('joi');

const voiceSettingValueSchema = Joi.object({
  id: Joi.string().min(1).max(50).required(),
  label: Joi.string().min(1).max(100).required(),
  value: Joi.number().required(), // Assuming value is a number (e.g., for pitch/speed levels)
  isActive: Joi.boolean().required(),
});

const updateVoiceSettingsSchema = Joi.object({
  values: Joi.array().items(voiceSettingValueSchema).min(1).required(),
});

module.exports = {
  updateVoiceSettingsSchema,
  voiceSettingValueSchema, // Export for potential use if needed elsewhere
};
