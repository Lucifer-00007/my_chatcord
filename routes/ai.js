const express = require('express');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validationMiddleware');
const {
  chatSessionIdParamSchema,
  createChatSessionSchema,
  updateChatTitleSchema,
  aiChatSchema,
} = require('../validators/aiSchemas');
const aiController = require('../controllers/aiController');
// AppError and logger are used in the controller.

const router = express.Router();

// Get user's chat sessions
router.get(
  '/sessions',
  authMiddleware,
  aiController.getUserSessions
);

// Get single chat session
router.get(
  '/sessions/:id',
  authMiddleware,
  validate(chatSessionIdParamSchema, 'params'),
  aiController.getChatSession
);

// Create new chat session
router.post(
  '/sessions',
  authMiddleware,
  validate(createChatSessionSchema),
  aiController.createChatSession
);

// Update chat title
router.patch(
  '/sessions/:id/title',
  authMiddleware,
  validate(chatSessionIdParamSchema, 'params'),
  validate(updateChatTitleSchema),
  aiController.updateChatTitle
);

// Main chat endpoint
router.post(
  '/chat',
  authMiddleware,
  validate(aiChatSchema),
  aiController.handleChat
);

module.exports = router;
