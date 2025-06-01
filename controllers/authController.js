const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { cookie: cookieOptions } = require('../config/constants');
const AppError = require('../utils/AppError');
const logger = require('../logger');
const zxcvbn = require('zxcvbn');

exports.registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Password strength validation using zxcvbn
    const passwordStrength = zxcvbn(password || '');
    if (passwordStrength.score < 3) { // 0-4, 3 is 'good', 4 is 'strong'
      logger.warn('Weak password rejected during registration', { email, username, score: passwordStrength.score, feedback: passwordStrength.feedback, source: 'authController.registerUser' });
      return next(new AppError(
        'Password is too weak. Please choose a stronger password (at least 8 characters, not easily guessable).',
        400,
        'WEAK_PASSWORD',
        passwordStrength.feedback
      ));
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      const message = `User with this ${field} already exists.`;
      const errorCode = field === 'email' ? 'DUPLICATE_EMAIL' : 'DUPLICATE_USERNAME';
      logger.warn(message, { source: 'authController.registerUser', email, username });
      return next(new AppError(message, 400, errorCode));
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = generateToken(user.id);
    res.cookie('token', token, cookieOptions);

    logger.info('User registered successfully', { userId: user.id, source: 'authController.registerUser' });
    // user.toObject() is not strictly necessary here as res.json() will call toJSON
    // but if we needed to manipulate it before sending, it would be.
    // Password is removed by toJSON in the model.
    return res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    logger.error('Error during user registration', { error: err.message, stack: err.stack, source: 'authController.registerUser' });
    if (err.name === 'ValidationError' || (err.code === 11000 && !err.errorCode)) {
      return next(new AppError(err.message, 400, 'DATABASE_VALIDATION_ERROR', err.errors));
    }
    return next(new AppError('Server error during registration.', 500, 'REGISTRATION_FAILED'));
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }); // Need full Mongoose doc for password comparison
    if (!user) {
      logger.warn('Login attempt with invalid email', { email, source: 'authController.loginUser' });
      return next(new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS')); // Changed to 401
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Login attempt with incorrect password', { email, source: 'authController.loginUser' });
      return next(new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS')); // Changed to 401
    }

    const token = generateToken(user.id);
    res.cookie('token', token, cookieOptions);
    // Removed clientToken cookie for security: do not expose JWT to XSS via non-httpOnly cookies

    logger.info('User logged in successfully', { userId: user.id, source: 'authController.loginUser' });
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      token // If client-side access is needed, send token in response body for sessionStorage
    });
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack, source: 'authController.loginUser' });
    return next(new AppError('Server error during login.', 500, 'LOGIN_FAILED'));
  }
};

exports.getCurrentUser = async (req, res, next) => {
  // req.user is populated by authMiddleware
  if (!req.user || !req.user.id) {
    // This should ideally be caught by authMiddleware itself
    logger.warn('Attempt to get current user without authentication', { source: 'authController.getCurrentUser' });
    return next(new AppError('Not authorized.', 401, 'NOT_AUTHORIZED'));
  }
  // req.user is a Mongoose document, res.json() will handle toJSON
  logger.debug('Fetched current user', { userId: req.user.id, source: 'authController.getCurrentUser' });
  return res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      isAdmin: req.user.isAdmin, // Include isAdmin status
    },
  });
};

exports.logoutUser = (req, res, next) => {
  try {
    // Clear the main authentication token cookie
    res.clearCookie('token', cookieOptions);
    // Also clear the client-accessible token cookie if it was set
    res.clearCookie('clientToken', { ...cookieOptions, httpOnly: false });
    // Clear CSRF token cookie (csurf usually handles this if configured, but explicit can be good)
    // The default csurf cookie name is '_csrf'. The options passed to csurf matter.
    // If `cookie: true` or `cookie: { key: '_csrf' }` (default) was used
    if (req.cookies._csrf) { // Check if the cookie exists before trying to clear
        res.clearCookie('_csrf', cookieOptions); // Use same options as other cookies for consistency if applicable
    }


    logger.info('User logged out successfully', { userId: req.user?.id, source: 'authController.logoutUser' }); // req.user might be undefined if token was already invalid
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error', { error: err.message, stack: err.stack, source: 'authController.logoutUser' });
    return next(new AppError('Server error during logout.', 500, 'LOGOUT_FAILED'));
  }
};

exports.getCsrfToken = (req, res, next) => {
  try {
    const csrfToken = req.csrfToken();
    logger.debug('CSRF token requested and provided.', { source: 'authController.getCsrfToken' });
    return res.json({ csrfToken });
  } catch (err) {
    logger.error('Error generating CSRF token', { error: err.message, stack: err.stack, source: 'authController.getCsrfToken' });
    return next(new AppError('Could not generate CSRF token.', 500, 'CSRF_TOKEN_ERROR'));
  }
};
