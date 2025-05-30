const express = require('express');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validationMiddleware');
const {
  createRoomSchema,
  roomIdSchema,
  roomParamIdSchema,
  joinRoomSchema,
} = require('../validators/roomSchemas');
const roomController = require('../controllers/roomController');
// AppError and logger are used in the controller, not directly here anymore.

const router = express.Router();

// Get all rooms
router.get(
  '/',
  authMiddleware,
  roomController.getAllRooms
);

// Create new room
router.post(
  '/',
  authMiddleware,
  validate(createRoomSchema),
  roomController.createRoom
);

// Get room by ID
router.get(
  '/:id',
  authMiddleware,
  validate(roomIdSchema, 'params'),
  roomController.getRoomById
);

// Get messages for a room
router.get(
  '/:roomId/messages',
  authMiddleware,
  validate(roomParamIdSchema, 'params'),
  roomController.getRoomMessages
);

// Join room
router.post(
  '/join',
  authMiddleware,
  validate(joinRoomSchema),
  roomController.joinRoom
);

module.exports = router;
