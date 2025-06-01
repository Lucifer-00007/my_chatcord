const express = require('express');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validationMiddleware');
const { registerSchema, loginSchema } = require('../validators/authSchemas');
const authController = require('../controllers/authController');
const AppError = require('../utils/AppError'); // Keep AppError for direct use if any, though controller should handle most.
const logger = require('../logger'); // Keep logger for any route-level logging if needed.

const router = express.Router();

// Register user
router.post(
  '/register',
  validate(registerSchema),
  authController.registerUser
);

// Login User
router.post(
  '/login',
  validate(loginSchema),
  authController.loginUser
);

// Get Current User
router.get(
  '/me',
  authMiddleware,
  authController.getCurrentUser
);

// Logout User
router.post(
  '/logout',
  authMiddleware,
  authController.logoutUser
);

// CSRF Token Endpoint
router.get(
  '/csrf-token',
  authController.getCsrfToken
);

// Validate JWT token endpoint for client-side token checks
router.post('/validate-token', async (req, res) => {
  try {
    const token = req.body.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) {
      return res.status(400).json({ valid: false, error: 'No token provided' });
    }
    const jwt = require('../utils/jwt');
    try {
      const decoded = jwt.verifyToken(token);
      // Optionally check expiration, but jwt.verify will throw if expired
      return res.json({ valid: true, exp: decoded.exp });
    } catch (err) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
  } catch (err) {
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// TODO: Implement user-initiated password change functionality.
// TODO: Implement secure password reset (forgot password) functionality.
// FUTURE: Consider advanced password policies: account lockout, password expiry, complexity rules beyond min length.

module.exports = router;
