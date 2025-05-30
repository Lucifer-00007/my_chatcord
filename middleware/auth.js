const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RoomBlock = require('../models/RoomBlock'); // Keep if room block check is needed here
const logger = require('../logger'); // Import logger
const AppError = require('../utils/AppError'); // Import AppError

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Fallback to cookie if Authorization header is not present or not Bearer
    token = req.cookies.token;
  }

  if (!token) {
    logger.warn('Authentication denied: No token provided.', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return next(
      new AppError(
        'No token provided, authorization denied.',
        401,
        'AUTH_NO_TOKEN'
      )
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // logger.debug('Token decoded successfully', { userId: decoded.userId, path: req.path });

    req.user = await User.findById(decoded.userId).select('-password');
    if (!req.user) {
      logger.warn('Authentication denied: User not found for token.', {
        userId: decoded.userId,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return next(new AppError('User not found.', 401, 'AUTH_USER_NOT_FOUND'));
    }

    // logger.debug(`User authenticated: ${req.user.username}`, { userId: req.user.id, path: req.path });

    // Check for room blocks if accessing room-specific routes
    // This room block check seems very specific for a generic auth middleware.
    // Consider moving this to a more specific middleware or route handler if it doesn't apply globally.
    // For now, keeping it as per original logic, but logging its execution.
    if (req.params.roomId || (req.originalUrl.includes('/channels/') && req.params.roomName)) { // Made condition more generic
      const roomIdToCheck = req.params.roomId || req.params.roomName;
      logger.debug('Checking for room block in auth middleware', { userId: req.user.id, roomId: roomIdToCheck, path: req.path });
      const activeBlock = await RoomBlock.findOne({
        user: req.user.id, // Use .id for consistency
        room: roomIdToCheck,
        isActive: true,
        endDate: { $gt: new Date() },
      });

      if (activeBlock) {
        logger.info('User blocked from room', {
          userId: req.user.id,
          roomId: roomIdToCheck,
          blockEndDate: activeBlock.endDate,
          path: req.path,
        });
        return next(
          new AppError(
            'You are blocked from this room.',
            403,
            'ROOM_BLOCKED',
            { blockEndDate: activeBlock.endDate }
          )
        );
      }
    }

    return next(); // Explicitly return next()
  } catch (err) {
    let appError;
    if (err.name === 'JsonWebTokenError') {
      logger.warn('Authentication denied: Invalid or malformed token.', {
        error: err.message,
        path: req.path,
        ip: req.ip,
      });
      appError = new AppError(
        'Invalid or malformed token.',
        401,
        'AUTH_INVALID_TOKEN'
      );
    } else if (err.name === 'TokenExpiredError') {
      logger.warn('Authentication denied: Token expired.', {
        error: err.message,
        path: req.path,
        ip: req.ip,
      });
      appError = new AppError('Token expired.', 401, 'AUTH_TOKEN_EXPIRED');
    } else {
      // For other unexpected errors during auth
      logger.error('Authentication error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        ip: req.ip,
      });
      appError = new AppError(
        'Server error during authentication.',
        500,
        'AUTH_SERVER_ERROR'
      );
    }
    return next(appError); // Pass the AppError to the centralized handler
  }
};
