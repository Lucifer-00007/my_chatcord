const express = require('express');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validationMiddleware');
const { generateImageSchema } = require('../validators/imageSchemas');
const imageController = require('../controllers/imageController');
// AppError and logger are used in the controller.
// Models (ImageApi) and utils (parseCurlCommand, fetch) are used in the controller.

const router = express.Router();

router.post(
  '/generate',
  authMiddleware,
  validate(generateImageSchema),
  imageController.generateImage
);

module.exports = router;
