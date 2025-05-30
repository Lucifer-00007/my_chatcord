const express = require('express');
const authMiddleware = require('../middleware/auth');
// adminAuth is not used in these user-facing routes
// VoiceApi model, parseCurlCommand, AppError, logger are used in the controller
const validate = require('../middleware/validationMiddleware');
const {
  generateVoiceSchema,
  testVoiceApiSchema,
} = require('../validators/voiceSchemas');
const voiceController = require('../controllers/voiceController');

const router = express.Router();

// This file handles user-facing voice generation and listing public APIs.
// Admin management of VoiceAPIs is in routes/admin/voice.js

router.post(
  '/generate',
  authMiddleware,
  validate(generateVoiceSchema),
  voiceController.generateSpeech
);

router.post(
  '/test',
  authMiddleware,
  validate(testVoiceApiSchema),
  voiceController.testVoiceApi
);

router.get(
  '/public-active',
  authMiddleware,
  voiceController.getPublicActiveVoiceApis
);

module.exports = router;
