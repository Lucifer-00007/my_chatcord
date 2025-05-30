const User = require('../../models/User');
const Room = require('../../models/Room');
const AiApi = require('../../models/AiApi');
const VoiceApi = require('../../models/VoiceApi');
const ImageApi = require('../../models/ImageApi');
const RoomChat = require('../../models/RoomChat'); // Assuming this is for total messages
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

exports.getApplicationStats = async (req, res, next) => {
  try {
    const [
      userCount,
      roomCount,
      messageCount, // Assuming this counts all messages in RoomChat
      activeAiApiCount,
      activeVoiceApiCount,
      activeImageApiCount,
    ] = await Promise.all([
      User.countDocuments().exec(),
      Room.countDocuments().exec(),
      RoomChat.aggregate([{ $project: { messageCount: { $size: '$messages' } } }, { $group: { _id: null, total: { $sum: '$messageCount' } } }]).exec(),
      AiApi.countDocuments({ isActive: true }).exec(),
      VoiceApi.countDocuments({ isActive: true }).exec(),
      ImageApi.countDocuments({ isActive: true }).exec(),
    ]);

    const totalMessages = messageCount.length > 0 ? messageCount[0].total : 0;

    const stats = {
      users: Number(userCount) || 0,
      rooms: Number(roomCount) || 0,
      messages: Number(totalMessages) || 0,
      apis: Number(activeAiApiCount + activeVoiceApiCount + activeImageApiCount) || 0,
      lastUpdated: new Date().toISOString(),
    };

    logger.info('Application stats fetched successfully (admin)', { stats, userId: req.user?.id, source: 'statsController.getApplicationStats', path: req.path });
    return res.json(stats);
  } catch (err) {
    logger.error('Error fetching application stats (admin)', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'statsController.getApplicationStats', path: req.path });
    return next(new AppError('Error fetching application stats', 500, 'STATS_QUERY_ERROR', { originalError: err.message }));
  }
};
