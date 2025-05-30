const VoiceSettings = require('../../models/VoiceSettings');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

// Default voice settings (can be moved to a config file)
const defaultPitchSettings = [
  { id: 'low', label: 'Low', value: -2, isActive: true },
  { id: 'normal', label: 'Normal', value: 0, isActive: true },
  { id: 'high', label: 'High', value: 2, isActive: true },
];

const defaultSpeedSettings = [
  { id: 'slow', label: 'Slow', value: 0.75, isActive: true },
  { id: 'normal', label: 'Normal', value: 1.0, isActive: true },
  { id: 'fast', label: 'Fast', value: 1.25, isActive: true },
];

// Helper function to get or create voice settings
const getOrCreateVoiceSettings = async (type, defaultValues, req) => {
  let settings = await VoiceSettings.findOne({ type }).lean();
  if (!settings) {
    logger.info(`No voice settings found for type '${type}', creating defaults. (admin)`, { source: 'voiceSettingsController.getOrCreateVoiceSettings', settingType: type, path: req.path, userId: req.user?.id });
    const newSettingsDoc = new VoiceSettings({ type, values: defaultValues });
    await newSettingsDoc.save();
    settings = newSettingsDoc.toObject({ virtuals: true });
  }
  return settings;
};

exports.getVoicePitchSettingsAdmin = async (req, res, next) => {
  try {
    const settings = await getOrCreateVoiceSettings('pitch', defaultPitchSettings, req);
    logger.debug('Fetched voice pitch settings (admin)', { userId: req.user?.id, source: 'voiceSettingsController.getVoicePitchSettingsAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error loading pitch settings (admin)', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'voiceSettingsController.getVoicePitchSettingsAdmin', path: req.path });
    return next(new AppError('Error loading pitch settings.', 500, 'SETTINGS_LOAD_ERROR'));
  }
};

exports.getVoiceSpeedSettingsAdmin = async (req, res, next) => {
  try {
    const settings = await getOrCreateVoiceSettings('speed', defaultSpeedSettings, req);
    logger.debug('Fetched voice speed settings (admin)', { userId: req.user?.id, source: 'voiceSettingsController.getVoiceSpeedSettingsAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error loading speed settings (admin)', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'voiceSettingsController.getVoiceSpeedSettingsAdmin', path: req.path });
    return next(new AppError('Error loading speed settings.', 500, 'SETTINGS_LOAD_ERROR'));
  }
};

exports.updateVoicePitchSettingsAdmin = async (req, res, next) => {
  try {
    const { values } = req.body;
    const settings = await VoiceSettings.findOneAndUpdate(
      { type: 'pitch' },
      { $set: { values } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    logger.info('Voice pitch settings updated (admin)', { userId: req.user?.id, source: 'voiceSettingsController.updateVoicePitchSettingsAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error updating pitch settings (admin)', { error: err.message, stack: err.stack, body: req.body, userId: req.user?.id, source: 'voiceSettingsController.updateVoicePitchSettingsAdmin', path: req.path });
    return next(new AppError('Error updating pitch settings.', 500, 'SETTINGS_UPDATE_ERROR'));
  }
};

exports.updateVoiceSpeedSettingsAdmin = async (req, res, next) => {
  try {
    const { values } = req.body;
    const settings = await VoiceSettings.findOneAndUpdate(
      { type: 'speed' },
      { $set: { values } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    logger.info('Voice speed settings updated (admin)', { userId: req.user?.id, source: 'voiceSettingsController.updateVoiceSpeedSettingsAdmin', path: req.path });
    return res.json(settings);
  } catch (err) {
    logger.error('Error updating speed settings (admin)', { error: err.message, stack: err.stack, body: req.body, userId: req.user?.id, source: 'voiceSettingsController.updateVoiceSpeedSettingsAdmin', path: req.path });
    return next(new AppError('Error updating speed settings.', 500, 'SETTINGS_UPDATE_ERROR'));
  }
};
