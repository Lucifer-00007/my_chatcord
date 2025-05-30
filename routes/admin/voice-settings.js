const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const { updateVoiceSettingsSchema } = require('../../validators/admin/voiceSettingsSchemas');
const voiceSettingsController = require('../../controllers/admin/voiceSettingsController');
// VoiceSettings model, AppError, logger, and default settings are used in the controller.

const router = express.Router();

// Get pitch settings (admin only)
router.get(
  '/pitch',
  [authMiddleware, adminAuth],
  voiceSettingsController.getVoicePitchSettingsAdmin
);

// Get speed settings (admin only)
router.get(
  '/speed',
  [authMiddleware, adminAuth],
  voiceSettingsController.getVoiceSpeedSettingsAdmin
);

// Update pitch settings (admin only)
router.put(
  '/pitch',
  [authMiddleware, adminAuth, validate(updateVoiceSettingsSchema)],
  voiceSettingsController.updateVoicePitchSettingsAdmin
);

// Update speed settings (admin only)
router.put(
  '/speed',
  [authMiddleware, adminAuth, validate(updateVoiceSettingsSchema)],
  voiceSettingsController.updateVoiceSpeedSettingsAdmin
);

module.exports = router;
