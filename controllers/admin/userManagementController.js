const User = require('../../models/User');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

exports.getAllUsersAdmin = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('username email isAdmin createdAt lastLogin')
      .sort('username')
      .lean();
    logger.info('Fetched all users (admin)', { count: users.length, userId: req.user?.id, source: 'userManagementController.getAllUsersAdmin', path: req.path });
    return res.json(users);
  } catch (err) {
    logger.error('Error fetching all users (admin)', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'userManagementController.getAllUsersAdmin', path: req.path });
    return next(new AppError('Server error while fetching users.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.searchUsersAdmin = async (req, res, next) => {
  try {
    const searchQuery = req.query.q || '';
    const searchRegex = new RegExp(searchQuery, 'i');
    const users = await User.find({
      $or: [{ username: searchRegex }, { email: searchRegex }],
    })
      .select('username email isAdmin createdAt lastLogin')
      .sort('username')
      .limit(10)
      .lean();
    return res.json(users);
  } catch (err) {
    logger.error('Error searching users (admin)', { error: err.message, stack: err.stack, query: req.query.q, userId: req.user?.id, source: 'userManagementController.searchUsersAdmin', path: req.path });
    return next(new AppError('Error searching users.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getUserByIdAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username email isAdmin createdAt lastLogin activeRooms')
      .lean();
    if (!user) {
      logger.warn('User not found by ID (admin)', { targetUserId: req.params.id, userId: req.user?.id, source: 'userManagementController.getUserByIdAdmin', path: req.path });
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }
    return res.json(user);
  } catch (err) {
    logger.error('Error fetching single user by ID (admin)', { error: err.message, stack: err.stack, targetUserId: req.params.id, userId: req.user?.id, source: 'userManagementController.getUserByIdAdmin', path: req.path });
    return next(new AppError('Server error while fetching user.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.createUserAdmin = async (req, res, next) => {
  try {
    const { username, email, password, isAdmin } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      logger.warn(`Attempt to create user with existing ${field} (admin)`, { providedEmail: email, providedUsername: username, field, userId: req.user?.id, source: 'userManagementController.createUserAdmin', path: req.path });
      return next(new AppError(`User with this ${field} already exists.`, 400, `DUPLICATE_${field.toUpperCase()}`));
    }

    const user = new User({ username, email, password, isAdmin });
    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;

    logger.info('User created successfully (admin)', { newUserId: userResponse.id, username: userResponse.username, adminUserId: req.user?.id, source: 'userManagementController.createUserAdmin', path: req.path });
    return res.status(201).json({ message: 'User created successfully.', user: userResponse });
  } catch (err) {
    logger.error('Error creating user (admin)', { error: err.message, stack: err.stack, body: req.body, userId: req.user?.id, source: 'userManagementController.createUserAdmin', path: req.path });
    if (err.code === 11000) {
      const field = err.message.includes('email_1') ? 'email' : 'username';
      return next(new AppError(`User with this ${field} already exists (duplicate key).`, 400, `DUPLICATE_${field.toUpperCase()}`));
    }
    return next(new AppError('Server error while creating user.', 500, 'USER_CREATE_FAILED'));
  }
};

exports.updateUserAdmin = async (req, res, next) => {
  try {
    const { username, email, password, isAdmin } = req.body;
    const { id: targetUserId } = req.params;

    if (username || email) {
      const orConditions = [];
      if (username) orConditions.push({ username });
      if (email) orConditions.push({ email });
      const existingUserWithNewCredentials = await User.findOne({
        $or: orConditions,
        _id: { $ne: targetUserId },
      }).lean();
      if (existingUserWithNewCredentials) {
        const field = existingUserWithNewCredentials.username === username ? 'username' : 'email';
        logger.warn(`Attempt to update user to existing ${field} (admin)`, { targetUserId, conflictingField: field, value: username || email, adminUserId: req.user?.id, source: 'userManagementController.updateUserAdmin', path: req.path });
        return next(new AppError(`Another user with this ${field} already exists.`, 400, `DUPLICATE_${field.toUpperCase()}`));
      }
    }

    const userToUpdate = await User.findById(targetUserId);
    if (!userToUpdate) {
      logger.warn('User not found for update (admin)', { targetUserId, adminUserId: req.user?.id, source: 'userManagementController.updateUserAdmin', path: req.path });
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }

    if (username) userToUpdate.username = username;
    if (email) userToUpdate.email = email;
    if (typeof isAdmin === 'boolean') userToUpdate.isAdmin = isAdmin;
    if (password) userToUpdate.password = password; // Pre-save hook will hash

    await userToUpdate.save();
    const userResponse = userToUpdate.toObject();
    delete userResponse.password;

    logger.info('User updated successfully (admin)', { targetUserId, source: 'userManagementController.updateUserAdmin', path: req.path, adminUserId: req.user?.id });
    return res.json({ message: 'User updated successfully.', user: userResponse });
  } catch (err) {
    logger.error('Error updating user (admin)', { error: err.message, stack: err.stack, targetUserId: req.params.id, body: req.body, userId: req.user?.id, source: 'userManagementController.updateUserAdmin', path: req.path });
    if (err.code === 11000) {
      const field = err.message.includes('email_1') ? 'email' : 'username';
      return next(new AppError(`User with this ${field} already exists (duplicate key).`, 400, `DUPLICATE_${field.toUpperCase()}`));
    }
    return next(new AppError('Server error while updating user.', 500, 'USER_UPDATE_FAILED'));
  }
};

exports.deleteUserAdmin = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      logger.warn('User not found for deletion (admin)', { targetUserId: req.params.id, userId: req.user?.id, source: 'userManagementController.deleteUserAdmin', path: req.path });
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }
    logger.info('User deleted successfully (admin)', { targetUserId: req.params.id, username: user.username, adminUserId: req.user?.id, source: 'userManagementController.deleteUserAdmin', path: req.path });
    return res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    logger.error('Error deleting user (admin)', { error: err.message, stack: err.stack, targetUserId: req.params.id, userId: req.user?.id, source: 'userManagementController.deleteUserAdmin', path: req.path });
    return next(new AppError('Server error while deleting user.', 500, 'USER_DELETE_FAILED'));
  }
};
