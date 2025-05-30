const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const {
  aiApiIdParamSchema,
  createAiApiSchema,
  updateAiApiSchema,
  testAiApiSchema,
} = require('../../validators/admin/aiApiSchemas');
const aiApiController = require('../../controllers/admin/aiApiController');
// Models, fetch, parseCurlCommand, AppError, logger are used in the controller.

const router = express.Router();

// Get AI config
router.get(
  '/config',
  [authMiddleware, adminAuth],
  aiApiController.getAiApiConfig
);

// Admin-only active AI APIs (with secrets)
router.get(
  '/active',
  [authMiddleware, adminAuth],
  aiApiController.getActiveAiApis
);

// Public-safe active AI APIs (no secrets)
// Note: This route uses only authMiddleware, not adminAuth, as it's public-facing.
router.get(
  '/public-active',
  authMiddleware,
  aiApiController.getPublicActiveAiApis
);

// Get all AI APIs
router.get(
  '/',
  [authMiddleware, adminAuth],
  aiApiController.getAllAiApis
);

// Get single AI API by ID
router.get(
  '/:id',
  [authMiddleware, adminAuth, validate(aiApiIdParamSchema, 'params')],
  aiApiController.getAiApiById
);

// Create new AI API
router.post(
  '/',
  [authMiddleware, adminAuth, validate(createAiApiSchema)],
  aiApiController.createAiApi
);

// Update AI API
router.put(
  '/:id',
  [
    authMiddleware,
    adminAuth,
    validate(aiApiIdParamSchema, 'params'),
    validate(updateAiApiSchema),
  ],
  aiApiController.updateAiApi
);

// Delete AI API
router.delete(
  '/:id',
  [authMiddleware, adminAuth, validate(aiApiIdParamSchema, 'params')],
  aiApiController.deleteAiApi
);

// Toggle AI API active status
router.patch(
  '/:id/toggle',
  [authMiddleware, adminAuth, validate(aiApiIdParamSchema, 'params')],
  aiApiController.toggleAiApiStatus
);

// Test AI API endpoint
router.post(
  '/test',
  [authMiddleware, adminAuth, validate(testAiApiSchema)],
  aiApiController.testAiApiEndpoint
);

module.exports = router;
