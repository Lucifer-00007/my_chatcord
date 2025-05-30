const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const { updateImageSettingsSchema } = require('../../validators/admin/imageSettingsSchemas');
const imageSettingsController = require('../../controllers/admin/imageSettingsController');
// Models, AppError, logger are used in the controller.

const router = express.Router();

// Note: The GET routes for /sizes and /styles in the original image-apis.js were only authMiddleware protected,
// not adminAuth. Assuming these specific GET routes in image-settings.js are also intended for general authenticated users.
// If they are admin-only, [authMiddleware, adminAuth] should be used.

// Get size settings
router.get(
  '/sizes',
  authMiddleware, // Assuming this is for any authenticated user as per original structure in image-apis.js
  imageSettingsController.getImageSizesAdmin // Renamed in controller to be more specific if it were admin-only
);

// Get style settings
router.get(
  '/styles',
  authMiddleware, // Assuming this is for any authenticated user
  imageSettingsController.getImageStylesAdmin // Renamed in controller
);

// Update size settings (admin only)
router.put(
  '/sizes',
  [authMiddleware, adminAuth, validate(updateImageSettingsSchema)],
  imageSettingsController.updateImageSizesAdmin
);

// Update style settings (admin only)
router.put(
  '/styles',
  [authMiddleware, adminAuth, validate(updateImageSettingsSchema)],
  imageSettingsController.updateImageStylesAdmin
);

module.exports = router;
