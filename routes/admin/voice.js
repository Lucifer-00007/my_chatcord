const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const {
  voiceApiIdParamSchema,
  createVoiceApiSchema,
  updateVoiceApiSchema,
} = require('../../validators/admin/voiceApiSchemas');
const { testVoiceApiSchema } = require('../../validators/voiceSchemas'); // For the test route
const voiceApiController = require('../../controllers/admin/voiceApiController');
// Models, fetch, parseCurlCommand, AppError, logger, constants are used in the controller.

const router = express.Router();

// Apply adminAuth to all routes in this file
router.use(authMiddleware);
router.use(adminAuth);

// Get all voice APIs (admin only)
router.get('/', voiceApiController.getAllVoiceApis);

// Get active voice APIs (admin only)
router.get('/active', voiceApiController.getActiveVoiceApisForAdmin);

// Voice API Config (admin only)
router.get('/config', voiceApiController.getVoiceApiConfig);

// Create new voice API (admin only)
router.post(
  '/',
  validate(createVoiceApiSchema),
  voiceApiController.createVoiceApi
);

// Get single voice API by ID (admin only)
router.get(
  '/:id',
  validate(voiceApiIdParamSchema, 'params'),
  voiceApiController.getVoiceApiByIdForAdmin
);

// Update voice API (admin only)
router.put(
  '/:id',
  [validate(voiceApiIdParamSchema, 'params'), validate(updateVoiceApiSchema)],
  voiceApiController.updateVoiceApi
);

// Toggle voice API active status (admin only)
router.patch(
  '/:id/toggle',
  validate(voiceApiIdParamSchema, 'params'),
  voiceApiController.toggleVoiceApiStatus
);

// Delete voice API (admin only)
router.delete(
  '/:id',
  validate(voiceApiIdParamSchema, 'params'),
  voiceApiController.deleteVoiceApi
);

// Test voice API endpoint (admin only)
router.post(
  '/test',
  validate(testVoiceApiSchema),
  voiceApiController.testVoiceApiEndpointAdmin
);

module.exports = router;
