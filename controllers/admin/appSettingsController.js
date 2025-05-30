const mongoose = require('mongoose'); // Import mongoose to access model schema
const Settings = require('../../models/Settings');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

/**
 * Retrieves the current application settings.
 * If no settings document exists, it creates one with default values defined in the schema.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.getAppSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne().lean(); // Use .lean() for read-only operation
    if (!settings) {
      // Log the creation of default settings if none exist.
      logger.info('No application settings found, creating a new document with defaults. (admin)', {
        source: 'appSettingsController.getAppSettings',
        path: req.path,
        userId: req.user?.id
      });
      // Create a new settings document; Mongoose will apply defaults from the schema.
      const newSettings = new Settings();
      await newSettings.save(); // This is a write operation.
      // Convert the Mongoose document to a plain object for the response.
      settings = newSettings.toObject({ virtuals: true });
    }
    return res.json(settings);
  } catch (error) {
    logger.error('Error fetching system settings (admin)', {
      error: error.message,
      stack: error.stack,
      source: 'appSettingsController.getAppSettings',
      path: req.path,
      userId: req.user?.id
    });
    return next(new AppError('Error fetching system settings', 500, 'SETTINGS_LOAD_ERROR'));
  }
};

/**
 * Updates the application settings.
 * Uses findOneAndUpdate with upsert to create the settings document if it doesn't exist,
 * or update it if it does.
 * @param {Object} req - Express request object, body contains settings to update.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.updateAppSettings = async (req, res, next) => {
  try {
    const updateData = req.body; // Validated by Joi middleware in the route.
    // Atomically find one document and update it, or insert (upsert) if it doesn't exist.
    // `new: true` returns the modified document.
    // `runValidators: true` ensures Mongoose schema validations are run.
    // `setDefaultsOnInsert: true` ensures Mongoose schema defaults are applied if a new document is created.
    const settings = await Settings.findOneAndUpdate({}, updateData, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
    logger.info('System settings updated (admin)', {
      userId: req.user?.id,
      updatedFields: Object.keys(updateData), // Log which fields were in the update request
      source: 'appSettingsController.updateAppSettings',
      path: req.path
    });
    // The 'settings' variable is a Mongoose document; res.json() will call its toJSON() method.
    return res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    logger.error('Error updating system settings (admin)', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user?.id,
      source: 'appSettingsController.updateAppSettings',
      path: req.path
    });
    return next(new AppError(error.message || 'Error updating system settings', 500, 'SETTINGS_UPDATE_ERROR'));
  }
};

/**
 * Resets the application settings to their default values.
 * This is achieved by deleting the existing settings document (if any)
 * and then creating a new one, which will automatically populate with schema defaults.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.resetAppSettings = async (req, res, next) => {
  try {
    // Remove any existing settings document(s).
    // Using deleteMany ensures that if, for some reason, multiple documents existed, they are all removed.
    // Normally, there should only be one due to the pre-save hook in the Settings model.
    await Settings.deleteMany({});

    // Create a new settings document. Mongoose will automatically apply the default values
    // defined in the Settings schema.
    const newSettings = new Settings();
    await newSettings.save(); // This is a write operation.

    logger.info('System settings reset to defaults (admin)', {
      userId: req.user?.id,
      defaultSettingsApplied: newSettings.toObject(), // Log the actual defaults applied.
      source: 'appSettingsController.resetAppSettings',
      path: req.path
    });
    // Send back the newly created settings document.
    return res.json({ message: 'Settings reset to defaults successfully', settings: newSettings });
  } catch (error) {
    logger.error('Error resetting system settings (admin)', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      source: 'appSettingsController.resetAppSettings',
      path: req.path
    });
    return next(new AppError('Error resetting system settings', 500, 'SETTINGS_RESET_ERROR'));
  }
};
