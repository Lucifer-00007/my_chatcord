const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const {
  userIdParamSchema,
  searchUserQuerySchema,
  createUserSchema,
  updateUserSchema,
} = require('../../validators/admin/userSchemas');
const userMgmtController = require('../../controllers/admin/userManagementController');
// User model, AppError, logger are used in the controller.

const router = express.Router();

// Add authentication to all routes in this router
router.use(authMiddleware);
router.use(adminAuth);

// Get all users
router.get('/', userMgmtController.getAllUsersAdmin);

// Search users
router.get(
  '/search',
  validate(searchUserQuerySchema, 'query'),
  userMgmtController.searchUsersAdmin
);

// Get single user by ID
router.get(
  '/:id',
  validate(userIdParamSchema, 'params'),
  userMgmtController.getUserByIdAdmin
);

// Create new user
router.post(
  '/',
  validate(createUserSchema),
  userMgmtController.createUserAdmin
);

// Update user
router.put(
  '/:id',
  [validate(userIdParamSchema, 'params'), validate(updateUserSchema)],
  userMgmtController.updateUserAdmin
);

// Delete user
router.delete(
  '/:id',
  validate(userIdParamSchema, 'params'),
  userMgmtController.deleteUserAdmin
);

module.exports = router;
