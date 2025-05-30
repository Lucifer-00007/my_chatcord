const logger = require('../logger'); // Import logger
const AppError = require('../utils/AppError'); // Import AppError

const adminAuth = async (req, res, next) => {
  // Assuming authMiddleware has already run and populated req.user
  if (!req.user) {
    // This case should ideally be caught by authMiddleware first
    logger.warn('Admin access denied: No user object in request. Auth middleware might not have run or failed.', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return next(
      new AppError('Authentication required. Please log in.', 401, 'AUTH_REQUIRED')
    );
  }

  if (!req.user.isAdmin) {
    logger.warn('Admin access denied: User is not an admin.', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return next(
      new AppError(
        'Access denied. You do not have permission to perform this action.',
        403,
        'FORBIDDEN_ADMIN_ONLY'
      )
    );
  }

  // If user is admin, proceed
  logger.debug(`Admin access granted for user: ${req.user.username}`, {
    userId: req.user.id,
    path: req.path,
    method: req.method,
  });
  return next(); // Explicitly return next()
};

module.exports = { adminAuth };
