const mongoose = require('mongoose');
const Room = require('../../models/Room');
const RoomBlock = require('../../models/RoomBlock');
const User = require('../../models/User');
const RoomChat = require('../../models/RoomChat');
const { chat } = require('../../config/constants');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

exports.getRoomManagementConstants = (req, res, next) => {
  try {
    return res.json(chat.ROOM_MANAGEMENT);
  } catch (err) {
    logger.error('Failed to fetch room management constants', { error: err.message, source: 'roomManagementController.getRoomManagementConstants', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to fetch room management constants', 500, 'CONFIG_LOAD_ERROR'));
  }
};

exports.getAllRoomsWithDetails = async (req, res, next) => {
  try {
    const rooms = await Room.find().lean();
    const roomIds = rooms.map((room) => room._id);
    const validRoomIds = roomIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const blocks = await RoomBlock.aggregate([
      { $match: { room: { $in: validRoomIds }, isActive: true } },
      { $group: { _id: '$room', count: { $sum: 1 } } },
    ]);

    const blockMap = {};
    blocks.forEach((b) => {
      blockMap[b._id.toString()] = b.count;
    });

    const roomsWithBlocked = rooms.map((room) => ({
      ...room,
      blockedCount: blockMap[room._id.toString()] || 0,
    }));
    logger.info('Fetched all rooms with details (admin)', { count: rooms.length, userId: req.user?.id, source: 'roomManagementController.getAllRoomsWithDetails', path: req.path });
    return res.json(roomsWithBlocked);
  } catch (err) {
    logger.error('Error fetching all rooms (admin)', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'roomManagementController.getAllRoomsWithDetails', path: req.path });
    return next(new AppError('Error fetching rooms', 500, 'DB_QUERY_ERROR'));
  }
};

exports.createRoomAdmin = async (req, res, next) => {
  try {
    const { name, topic, description, isDefault } = req.body;
    const existingRoom = await Room.findOne({ name }).lean();
    if (existingRoom) {
      logger.warn(`Attempt to create room with duplicate name (admin): ${name}`, { name, userId: req.user.id, source: 'roomManagementController.createRoomAdmin', path: req.path });
      return next(new AppError('A room with this name already exists. Please choose a unique name.', 400, 'DUPLICATE_ROOM_NAME'));
    }

    const room = new Room({
      name,
      topic,
      description,
      isDefault,
      createdBy: req.user.id,
    });
    await room.save();
    logger.info(`Room created (admin): ${name}`, { roomId: room._id, createdBy: req.user.id, source: 'roomManagementController.createRoomAdmin', path: req.path });
    return res.status(201).json(room);
  } catch (err) {
    logger.error('Error creating room (admin)', { error: err.message, stack: err.stack, body: req.body, userId: req.user.id, source: 'roomManagementController.createRoomAdmin', path: req.path });
    if (err.code === 11000) {
      return next(new AppError('A room with this name already exists (duplicate key).', 400, 'DUPLICATE_ROOM_NAME'));
    }
    return next(new AppError('Error creating room.', 400, 'CREATE_ROOM_FAILED'));
  }
};

exports.updateRoomAdmin = async (req, res, next) => {
  try {
    if (req.body.name) {
      const existingRoom = await Room.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id },
      }).lean();
      if (existingRoom) {
        logger.warn(`Attempt to update room name to an existing one (admin): ${req.body.name}`, { roomId: req.params.id, newName: req.body.name, source: 'roomManagementController.updateRoomAdmin', path: req.path, userId: req.user?.id });
        return next(new AppError('Another room with this name already exists.', 400, 'DUPLICATE_ROOM_NAME'));
      }
    }
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!room) {
      logger.warn(`Room not found for update (admin): ${req.params.id}`, { roomId: req.params.id, source: 'roomManagementController.updateRoomAdmin', path: req.path, userId: req.user?.id });
      return next(new AppError('Room not found', 404, 'NOT_FOUND'));
    }
    logger.info(`Room updated (admin): ${room.name}`, { roomId: room._id, source: 'roomManagementController.updateRoomAdmin', path: req.path, userId: req.user?.id });
    return res.json(room);
  } catch (err) {
    logger.error('Error updating room (admin)', { error: err.message, stack: err.stack, roomId: req.params.id, body: req.body, source: 'roomManagementController.updateRoomAdmin', path: req.path, userId: req.user?.id });
    if (err.code === 11000) {
      return next(new AppError('A room with this name already exists (duplicate key).', 400, 'DUPLICATE_ROOM_NAME'));
    }
    return next(new AppError('Error updating room.', 400, 'UPDATE_ROOM_FAILED'));
  }
};

exports.deleteRoomAdmin = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      logger.warn(`Room not found for deletion (admin): ${req.params.id}`, { roomId: req.params.id, source: 'roomManagementController.deleteRoomAdmin', path: req.path, userId: req.user?.id });
      return next(new AppError('Room not found', 404, 'NOT_FOUND'));
    }
    if (room.isDefault) {
      logger.warn(`Attempt to delete default room (admin): ${room.name}`, { roomId: req.params.id, source: 'roomManagementController.deleteRoomAdmin', path: req.path, userId: req.user?.id });
      return next(new AppError('Default rooms cannot be deleted.', 400, 'DELETE_DEFAULT_ROOM_FORBIDDEN'));
    }
    await Promise.all([
      RoomBlock.deleteMany({ room: room._id }),
      RoomChat.deleteMany({ room: room._id }),
    ]);
    await Room.deleteOne({ _id: room._id });
    logger.info(`Room deleted (admin): ${room.name}`, { roomId: req.params.id, source: 'roomManagementController.deleteRoomAdmin', path: req.path, userId: req.user?.id });
    return res.json({ message: 'Room and associated data deleted successfully' });
  } catch (err) {
    logger.error('Error deleting room (admin)', { error: err.message, stack: err.stack, roomId: req.params.id, source: 'roomManagementController.deleteRoomAdmin', path: req.path, userId: req.user?.id });
    return next(new AppError('Error deleting room.', 500, 'DELETE_ROOM_FAILED'));
  }
};

exports.getRoomBlocks = async (req, res, next) => {
  try {
    const blocks = await RoomBlock.find({ room: req.params.roomId })
      .populate('user', 'username email')
      .populate('blockedBy', 'username email')
      .sort('-createdAt')
      .lean();
    return res.json(blocks);
  } catch (err) {
    logger.error('Error fetching room blocks (admin)', { error: err.message, stack: err.stack, roomId: req.params.roomId, source: 'roomManagementController.getRoomBlocks', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching room blocks.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.createRoomBlockAdmin = async (req, res, next) => {
  try {
    const { userId, roomId, reason, duration } = req.body;
    const user = await User.findById(userId).lean();
    const room = await Room.findById(roomId).lean();

    if (!user) {
      logger.warn(`User not found for room block creation (admin): ${userId}`, { targetUserId: userId, source: 'roomManagementController.createRoomBlockAdmin', path: req.path, adminUserId: req.user?.id });
      return next(new AppError('User not found for blocking.', 404, 'USER_NOT_FOUND'));
    }
    if (!room) {
      logger.warn(`Room not found for room block creation (admin): ${roomId}`, { targetRoomId: roomId, source: 'roomManagementController.createRoomBlockAdmin', path: req.path, adminUserId: req.user?.id });
      return next(new AppError('Room not found for blocking.', 404, 'ROOM_NOT_FOUND'));
    }

    const now = new Date();
    const existingBlock = await RoomBlock.findOne({
      user: userId,
      room: roomId,
      isActive: true,
      endDate: { $gt: now },
    }).lean();

    if (existingBlock) {
      logger.warn(`User ${user.username} is already blocked in room ${room.name} (admin)`, { targetUserId: userId, targetRoomId: roomId, source: 'roomManagementController.createRoomBlockAdmin', path: req.path, adminUserId: req.user?.id });
      return next(new AppError(`${user.username} is already blocked in the ${room.name} room.`, 400, 'USER_ALREADY_BLOCKED'));
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    const block = new RoomBlock({
      user: userId,
      room: roomId,
      reason,
      duration,
      endDate,
      blockedBy: req.user.id,
    });
    await block.save();
    logger.info(`User ${user.username} blocked in room ${room.name} (admin)`, { targetUserId: userId, targetRoomId: roomId, reason, duration, adminUserId: req.user.id, source: 'roomManagementController.createRoomBlockAdmin', path: req.path });

    await User.findByIdAndUpdate(userId, { $pull: { activeRooms: room.name } });
    return res.status(201).json(block);
  } catch (err) {
    logger.error('Error creating room block (admin)', { error: err.message, stack: err.stack, body: req.body, source: 'roomManagementController.createRoomBlockAdmin', path: req.path, userId: req.user?.id });
    return next(new AppError('Error creating room block.', 400, 'CREATE_BLOCK_FAILED'));
  }
};

exports.removeBlockAdmin = async (req, res, next) => {
  try {
    const block = await RoomBlock.findByIdAndDelete(req.params.id);
    if (!block) {
      logger.warn(`Block not found for deletion (admin): ${req.params.id}`, { blockId: req.params.id, source: 'roomManagementController.removeBlockAdmin', path: req.path, userId: req.user?.id });
      return next(new AppError('Block not found', 404, 'NOT_FOUND'));
    }
    logger.info('Block removed successfully (admin)', { blockId: req.params.id, userId: block.user, roomId: block.room, adminUserId: req.user?.id, source: 'roomManagementController.removeBlockAdmin', path: req.path });
    return res.json({ message: 'Block removed successfully' });
  } catch (err) {
    logger.error('Error deleting room block (admin)', { error: err.message, stack: err.stack, blockId: req.params.id, source: 'roomManagementController.removeBlockAdmin', path: req.path, userId: req.user?.id });
    return next(new AppError('Error deleting block.', 500, 'DELETE_BLOCK_FAILED'));
  }
};

exports.getRoomChatHistory = async (req, res, next) => {
  try {
    const roomChat = await RoomChat.findOne({ room: req.params.roomId }).lean();
    if (!roomChat || !roomChat.messages || roomChat.messages.length === 0) {
      return res.json([]);
    }
    const messages = await Promise.all(
      roomChat.messages.map(async (msg) => {
        let { username } = msg;
        if (!username && msg.user) {
          const userDoc = await User.findById(msg.user).select('username').lean();
          username = userDoc ? userDoc.username : 'Unknown';
        }
        return {
          content: msg.content,
          createdAt: msg.createdAt,
          username: username || 'System/Unknown',
        };
      })
    );
    return res.json(messages);
  } catch (err) {
    logger.error('Error fetching room chats (admin)', { error: err.message, stack: err.stack, roomId: req.params.roomId, source: 'roomManagementController.getRoomChatHistory', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching room chat history.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.deleteRoomChatHistory = async (req, res, next) => {
  try {
    const roomChat = await RoomChat.findOne({ room: req.params.roomId });
    if (!roomChat) {
      logger.warn(`No chat history found for room ${req.params.roomId} to delete (admin).`, { roomId: req.params.roomId, source: 'roomManagementController.deleteRoomChatHistory', path: req.path, userId: req.user?.id });
      return next(new AppError('No chat history found for this room.', 404, 'NOT_FOUND'));
    }
    roomChat.messages = [];
    await roomChat.save();
    logger.info(`Chat history deleted for room ${req.params.roomId} (admin)`, { roomId: req.params.roomId, adminUserId: req.user?.id, source: 'roomManagementController.deleteRoomChatHistory', path: req.path });
    return res.json({ message: 'Chat history for the room deleted successfully.' });
  } catch (err) {
    logger.error('Error deleting all room chats (admin)', { error: err.message, stack: err.stack, roomId: req.params.roomId, source: 'roomManagementController.deleteRoomChatHistory', path: req.path, userId: req.user?.id });
    return next(new AppError('Error deleting chat history.', 500, 'DELETE_CHAT_FAILED'));
  }
};

exports.deleteSingleChatMessage = async (req, res, next) => {
  try {
    const { roomId, idx } = req.params;
    const roomChat = await RoomChat.findOne({ room: roomId });

    if (!roomChat || !roomChat.messages || roomChat.messages.length === 0) {
      logger.warn(`No chat history found for room ${roomId} to delete message at index ${idx} (admin).`, { roomId, index: idx, source: 'roomManagementController.deleteSingleChatMessage', path: req.path, userId: req.user?.id });
      return next(new AppError('No chat history found for this room.', 404, 'NOT_FOUND'));
    }
    const messageIndex = parseInt(idx, 10);

    if (messageIndex < 0 || messageIndex >= roomChat.messages.length) {
      logger.warn(`Invalid message index ${idx} for room ${roomId} (admin).`, { roomId, index: idx, messageCount: roomChat.messages.length, source: 'roomManagementController.deleteSingleChatMessage', path: req.path, userId: req.user?.id });
      return next(new AppError('Invalid message index.', 400, 'INVALID_PARAM'));
    }
    roomChat.messages.splice(messageIndex, 1);
    await roomChat.save();
    logger.info(`Chat message at index ${idx} deleted for room ${roomId} (admin)`, { roomId, index: idx, adminUserId: req.user?.id, source: 'roomManagementController.deleteSingleChatMessage', path: req.path });
    return res.json({ message: 'Chat message deleted successfully.' });
  } catch (err) {
    logger.error('Error deleting single chat message (admin)', { error: err.message, stack: err.stack, roomId: req.params.roomId, index: req.params.idx, source: 'roomManagementController.deleteSingleChatMessage', path: req.path, userId: req.user?.id });
    return next(new AppError('Error deleting chat message.', 500, 'DELETE_CHAT_MESSAGE_FAILED'));
  }
};
