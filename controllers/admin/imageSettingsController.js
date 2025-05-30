const ImageSettings = require('../../models/ImageSettings');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

// Default image settings values (can be moved to a config file if preferred)
const defaultSizeSettings = [
  { id: '256x256', label: '256x256', isActive: true },
  { id: '512x512', label: '512x512', isActive: true },
  { id: '1024x1024', label: '1024x1024', isActive: true },
];

const defaultStyleSettings = [
  { id: 'realistic', name: 'Realistic', label: 'Realistic', isActive: true },
  { id: 'artistic', name: 'Artistic', label: 'Artistic', isActive: true },
  { id: 'cartoon', name: 'Cartoon', label: 'Cartoon', isActive: true },
];

// Helper function to get or create settings
const getOrCreateSettings = async (type, defaultValues, req) => { // Added req for logging
  let settings = await ImageSettings.findOne({ type }).lean();
  if (!settings) {
    logger.info(`No image settings found for type '${type}', creating defaults. (admin)`, { source: 'imageSettingsController.getOrCreateSettings', settingType: type, path: req.path, userId: req.user?.id });
    const newSettingsDoc = new ImageSettings({ type, values: defaultValues });
    await newSettingsDoc.save();
    settings = newSettingsDoc.toObject({ virtuals: true });
  }
  return settings;
};

// Functions for admin routes (typically adminAuth would be applied in the route)
exports.getImageSizesAdmin = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings('sizes', defaultSizeSettings, req);
    logger.debug('Fetched image size settings (admin)', { userId: req.user?.id, source: 'imageSettingsController.getImageSizesAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error loading size settings (admin)', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'imageSettingsController.getImageSizesAdmin', path: req.path });
    return next(new AppError('Error loading size settings.', 500, 'SETTINGS_LOAD_ERROR'));
  }
};

exports.getImageStylesAdmin = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings('styles', defaultStyleSettings, req);
    logger.debug('Fetched image style settings (admin)', { userId: req.user?.id, source: 'imageSettingsController.getImageStylesAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error loading style settings (admin)', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'imageSettingsController.getImageStylesAdmin', path: req.path });
    return next(new AppError('Error loading style settings.', 500, 'SETTINGS_LOAD_ERROR'));
  }
};

exports.updateImageSizesAdmin = async (req, res, next) => {
  try {
    const { values } = req.body;
    const settings = await ImageSettings.findOneAndUpdate(
      { type: 'sizes' },
      { $set: { values } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    logger.info('Image size settings updated (admin)', { userId: req.user?.id, source: 'imageSettingsController.updateImageSizesAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error updating size settings (admin)', { error: err.message, stack: err.stack, body: req.body, userId: req.user?.id, source: 'imageSettingsController.updateImageSizesAdmin', path: req.path });
    return next(new AppError('Error updating size settings.', 500, 'SETTINGS_UPDATE_ERROR'));
  }
};

exports.updateImageStylesAdmin = async (req, res, next) => {
  try {
    const { values } = req.body;
    const settings = await ImageSettings.findOneAndUpdate(
      { type: 'styles' },
      { $set: { values } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    logger.info('Image style settings updated (admin)', { userId: req.user?.id, source: 'imageSettingsController.updateImageStylesAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error updating style settings (admin)', { error: err.message, stack: err.stack, body: req.body, userId: req.user?.id, source: 'imageSettingsController.updateImageStylesAdmin', path: req.path });
    return next(new AppError('Error updating style settings.', 500, 'SETTINGS_UPDATE_ERROR'));
  }
};
