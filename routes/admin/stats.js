const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const statsController = require('../../controllers/admin/statsController');
// Models, AppError, logger are used in the controller.

const router = express.Router();

router.get(
  '/',
  [authMiddleware, adminAuth], // Added adminAuth for protection
  statsController.getApplicationStats
);

module.exports = router;
