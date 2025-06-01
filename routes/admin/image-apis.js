const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const {
  imageIdParamSchema,
  createImageApiSchema,
  updateImageApiSchema,
  toggleImageApiSchema,
  testImageApiSchema,
} = require('../../validators/admin/imageApiSchemas');
const imageApiController = require('../../controllers/admin/imageApiController');
// Models (ImageApi, ImageSettings), fetch, parseCurlCommand, AppError, logger are used in the controller.

const router = express.Router();

// Get all Image APIs (admin only)
router.get(
  '/',
  [authMiddleware, adminAuth],
  imageApiController.getAllImageApis
);

// Public version: expose only id, name, supported sizes/styles of active APIs
// Note: This route uses only authMiddleware, not adminAuth.
router.get(
  '/public-active',
  authMiddleware,
  imageApiController.getPublicActiveImageApis
);

// Get active image APIs (admin only)
router.get(
  '/active',
  [authMiddleware, adminAuth],
  imageApiController.getActiveImageApis
);

// Get single image API by ID (admin only)
router.get(
  '/:id',
  [authMiddleware, adminAuth, validate(imageIdParamSchema, 'params')],
  imageApiController.getImageApiById
);

// Create new image API (admin only)
router.post(
  '/',
  [authMiddleware, adminAuth, validate(createImageApiSchema)],
  imageApiController.createImageApi
);

// Update image API (admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminAuth,
    validate(imageIdParamSchema, 'params'),
    validate(updateImageApiSchema),
  ],
  imageApiController.updateImageApi
);

// Delete image API (admin only)
router.delete(
  '/:id',
  [authMiddleware, adminAuth, validate(imageIdParamSchema, 'params')],
  imageApiController.deleteImageApi
);

// Toggle image API active status (admin only)
router.patch(
  '/:id/toggle',
  [
    authMiddleware,
    adminAuth,
    validate(imageIdParamSchema, 'params'),
    validate(toggleImageApiSchema),
  ],
  imageApiController.toggleImageApiStatus
);

// Test image API endpoint (admin only)
router.post(
  '/test',
  [authMiddleware, adminAuth, validate(testImageApiSchema)],
  imageApiController.testImageApiEndpoint
);

// Settings routes
// Note: These GET routes for settings were originally only authMiddleware protected.
router.get(
  '/settings/sizes',
  authMiddleware,
  imageApiController.getImageSizeSettings
);
router.get(
  '/settings/styles',
  authMiddleware,
  imageApiController.getImageStyleSettings
);

// Debug route (remains as is, no specific controller method for this utility route)
router.get(
  '/debug/settings',
  [authMiddleware, adminAuth],   // or behind NODE_ENV !== 'production'
  async (req, res, next) => {
  const ImageApi = require('../../models/ImageApi'); // Local require for this utility
  const logger = require('../../logger'); // Local require for this utility
  const AppError = require('../../utils/AppError'); // Local require for this utility
  try {
    const apis = await ImageApi.find().lean();
    return res.json({
      totalApis: apis.length,
      apiDetails: apis.map((api) => ({
        name: api.name,
        isActive: api.isActive,
        sizeCount: api.supportedSizes?.length || 0,
        styleCount: api.supportedStyles?.length || 0,
      })),
    });
  } catch (err) {
    logger.error('Image API debug settings query failed', { error: err.message, source: 'admin.imageApiRoutes', path: req.path });
    return next(new AppError('Debug query failed', 500, 'DEBUG_QUERY_ERROR', { originalError: err.message }));
  }
});


module.exports = router;
