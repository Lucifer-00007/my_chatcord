const express = require('express');
const authMiddleware = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const validate = require('../../middleware/validationMiddleware');
const {
  roomIdParamSchema,
  roomSpecificIdParamSchema,
  createRoomSchema,
  updateRoomSchema,
  createRoomBlockSchema,
  blockIdParamSchema,
  chatMessageIndexParamSchema,
} = require('../../validators/admin/roomManagementSchemas');
const roomMgmtController = require('../../controllers/admin/roomManagementController');
// Models, constants, AppError, logger are used in the controller.

const router = express.Router();

// Get room management constants
router.get(
  '/constants',
  [authMiddleware, adminAuth],
  roomMgmtController.getRoomManagementConstants
);

// Get all rooms
router.get(
  '/rooms',
  [authMiddleware, adminAuth],
  roomMgmtController.getAllRoomsWithDetails
);

// Create new room
router.post(
  '/rooms',
  [authMiddleware, adminAuth, validate(createRoomSchema)],
  roomMgmtController.createRoomAdmin
);

// Update room
router.put(
  '/rooms/:id',
  [
    authMiddleware,
    adminAuth,
    validate(roomIdParamSchema, 'params'),
    validate(updateRoomSchema),
  ],
  roomMgmtController.updateRoomAdmin
);

// Delete room
router.delete(
  '/rooms/:id',
  [authMiddleware, adminAuth, validate(roomIdParamSchema, 'params')],
  roomMgmtController.deleteRoomAdmin
);

// Get room blocks
router.get(
  '/rooms/:roomId/blocks',
  [authMiddleware, adminAuth, validate(roomSpecificIdParamSchema, 'params')],
  roomMgmtController.getRoomBlocks
);

// Create room block
router.post(
  '/blocks',
  [authMiddleware, adminAuth, validate(createRoomBlockSchema)],
  roomMgmtController.createRoomBlockAdmin
);

// Remove block
router.delete(
  '/blocks/:id',
  [authMiddleware, adminAuth, validate(blockIdParamSchema, 'params')],
  roomMgmtController.removeBlockAdmin
);

// --- Chat History Management Endpoints ---
router.get(
  '/rooms/:roomId/chats',
  [authMiddleware, adminAuth, validate(roomSpecificIdParamSchema, 'params')],
  roomMgmtController.getRoomChatHistory
);

// Delete all chat history for a room
router.delete(
  '/rooms/:roomId/chats',
  [authMiddleware, adminAuth, validate(roomSpecificIdParamSchema, 'params')],
  roomMgmtController.deleteRoomChatHistory
);

// Delete a single chat message by index
router.delete(
  '/rooms/:roomId/chats/:idx',
  [
    authMiddleware,
    adminAuth,
    validate(roomSpecificIdParamSchema, 'params'),
    validate(chatMessageIndexParamSchema, 'params'),
  ],
  roomMgmtController.deleteSingleChatMessage
);

module.exports = router;
