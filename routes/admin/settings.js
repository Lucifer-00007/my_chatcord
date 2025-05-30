const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const { updateSettingsSchema } = require('../../validators/admin/settingsSchemas');
const appSettingsController = require('../../controllers/admin/appSettingsController');
// Settings model, AppError, logger are used in the controller.

const router = express.Router();

// This router handles administrative tasks related to system-wide application settings.
// All routes are protected by authentication and admin authorization middleware.
// Business logic is delegated to the appSettingsController.

// Get current system settings
router.get(
  '/',
  [authMiddleware, adminAuth],
  appSettingsController.getAppSettings
);

// Update system settings
router.post(
  '/',
  [authMiddleware, adminAuth, validate(updateSettingsSchema)],
  appSettingsController.updateAppSettings
);

// Reset system settings to defaults
router.post(
  '/reset',
  [authMiddleware, adminAuth],
  appSettingsController.resetAppSettings
);

module.exports = router;
