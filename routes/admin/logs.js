const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const {
  getLogsQuerySchema,
  createLogSchema,
  clearLogsQuerySchema,
} = require('../../validators/admin/logSchemas');
const logController = require('../../controllers/admin/logController');
// SystemLog model, AppError, logger are used in the controller.

const router = express.Router();

// Secure all log routes with admin authentication
router.use(authMiddleware);
router.use(adminAuth);

// Get logs with optional filtering
router.get(
  '/',
  validate(getLogsQuerySchema, 'query'),
  logController.getSystemLogs
);

// Add new log entry (Primarily for system-internal use, but good to have schema)
router.post(
  '/',
  validate(createLogSchema),
  logController.createSystemLogManually
);

// Clear logs
router.delete(
  '/',
  validate(clearLogsQuerySchema, 'query'),
  logController.clearSystemLogs
);

module.exports = router;
