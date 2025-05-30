const Joi = require('joi');

const imageSettingValueSchema = Joi.object({
  id: Joi.string().min(1).max(50).required(),
  label: Joi.string().min(1).max(100).when('name', { is: Joi.exist(), then: Joi.optional(), else: Joi.required() }),
  name: Joi.string().min(1).max(100).when('label', { is: Joi.exist(), then: Joi.optional(), else: Joi.required() }),
  isActive: Joi.boolean().required(),
});

const updateImageSettingsSchema = Joi.object({
  values: Joi.array().items(imageSettingValueSchema).min(1).required(),
});

module.exports = {
  updateImageSettingsSchema,
  imageSettingValueSchema, // Export if needed by other modules, though typically used internally
};
