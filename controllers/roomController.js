const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const RoomChat = require('../models/RoomChat');
const User = require('../models/User'); // Needed for populating createdBy, and potentially other user interactions
const { security, chat } = require('../config/constants');
const AppError = require('../utils/AppError');
const logger = require('../logger');

exports.getAllRooms = async (req, res, next) => {
  try {
    // .populate() returns Mongoose documents. If we use .lean() before .populate(),
    // the populated fields might not behave as expected (e.g., if they have virtuals or toJSON transforms).
    // However, if 'createdBy' in Room schema doesn't rely on User model's virtuals/toJSON for 'username',
    // and we just need plain data, .lean() can be applied after populate or on the initial query if populate is simple.
    // For safety with populate, often .lean() is applied last or implicitly by res.json().
    // Here, assuming res.json() handles toJSON correctly for populated fields.
    const rooms = await Room.find().populate('createdBy', 'username').lean();
    logger.info('Fetched all rooms', { count: rooms.length, userId: req.user?.id, source: 'roomController.getAllRooms', path: req.path });
    return res.json(rooms);
  } catch (err) {
    logger.error('Error fetching rooms', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'roomController.getAllRooms', path: req.path });
    return next(new AppError('Server error while fetching rooms.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const { name, topic, description } = req.body;
    const existingRoom = await Room
      .findOne({ name })
      .collation({ locale: 'en', strength: 2 }) // case-insensitive
      .lean();
    if (existingRoom) {
      logger.warn(`Attempt to create room with duplicate name: ${name}`, { name, userId: req.user.id, source: 'roomController.createRoom', path: req.path });
      return next(new AppError('Room with this name already exists.', 400, 'DUPLICATE_ROOM_NAME'));
    }

    const room = new Room({
      name,
      topic,
      description,
      createdBy: req.user.id,
    });
    await room.save();
    logger.info(`Room created: ${name}`, { roomId: room._id, createdBy: req.user.id, source: 'roomController.createRoom', path: req.path });
    return res.status(201).json(room); // room is a Mongoose doc, toJSON will apply
  } catch (err) {
    logger.error('Error creating room', { error: err.message, stack: err.stack, body: req.body, userId: req.user.id, source: 'roomController.createRoom', path: req.path });
    if (err.code === 11000) {
      return next(new AppError('A room with this name already exists (duplicate key).', 400, 'DUPLICATE_ROOM_NAME'));
    }
    return next(new AppError('Server error while creating room.', 400, 'CREATE_ROOM_FAILED'));
  }
};

exports.getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate('createdBy', 'username').lean();
    if (!room) {
      logger.warn(`Room not found by ID: ${req.params.id}`, { roomId: req.params.id, userId: req.user?.id, source: 'roomController.getRoomById', path: req.path });
      return next(new AppError('Room not found.', 404, 'NOT_FOUND'));
    }
    return res.json(room);
  } catch (err) {
    logger.error('Error fetching room by ID', { error: err.message, stack: err.stack, roomId: req.params.id, userId: req.user?.id, source: 'roomController.getRoomById', path: req.path });
    return next(new AppError('Server error while fetching room.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const activeBlock = await RoomBlock.findOne({
      user: req.user.id,
      room: roomId,
      isActive: true,
      $or: [
        { endDate: { $gt: new Date() } },   // timed block
        { endDate: null }                   // permanent block
      ],
    }).lean();

    if (activeBlock) {
      logger.info(`User blocked from accessing messages in room ${roomId}`, { userId: req.user.id, roomId, blockEndDate: activeBlock.endDate, source: 'roomController.getRoomMessages', path: req.path });
      return next(new AppError('You are blocked from this room.', 403, 'ROOM_BLOCKED', { blockEndDate: activeBlock.endDate }));
    }

    const room = await Room.findById(roomId).lean();
    if (!room) {
      logger.warn(`Room not found when fetching messages: ${roomId}`, { roomId, userId: req.user.id, source: 'roomController.getRoomMessages', path: req.path });
      return next(new AppError('Room not found.', 404, 'NOT_FOUND'));
    }

    const roomChat = await RoomChat.findOne({ room: room._id }).lean();
    let messages = [];
    if (roomChat && Array.isArray(roomChat.messages)) {
      messages = roomChat.messages.slice(-chat.MAX_MESSAGES).map((msg) => ({
        content: msg.content,
        user: msg.user,
        username: msg.username,
        createdAt: msg.createdAt,
      }));
    }
    return res.json(messages);
  } catch (err) {
    logger.error('Error fetching messages for room', { error: err.message, stack: err.stack, roomId: req.params.roomId, userId: req.user.id, source: 'roomController.getRoomMessages', path: req.path });
    return next(new AppError('Server error while fetching messages.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.joinRoom = async (req, res, next) => {
  try {
    const { room: roomId } = req.body; // Renamed for clarity
    const { user } = req; // req.user is a Mongoose document

    const activeBlock = await RoomBlock.findOne({
      user: user.id,
      room: roomId,
      isActive: true,
      endDate: { $gt: new Date() },
    }).populate('blockedBy', 'username').lean();

    if (activeBlock) {
      logger.info(`User blocked from joining room ${roomId}`, { userId: user.id, roomId, blockEndDate: activeBlock.endDate, source: 'roomController.joinRoom', path: req.path });
      return next(new AppError(
        `You are blocked from this room until ${new Date(activeBlock.endDate).toLocaleString('en-IN')}`,
        403,
        'ROOM_BLOCKED',
        {
          blockEndDate: activeBlock.endDate,
          blockReason: activeBlock.reason,
          blockedBy: activeBlock.blockedBy?.username,
        }
      ));
    }

    const roomToJoin = await Room.findById(roomId).lean();
    if (!roomToJoin) {
      logger.warn(`Room not found for join: ${roomId}`, { roomId, userId: user.id, source: 'roomController.joinRoom', path: req.path });
      return next(new AppError('Room not found.', 404, 'NOT_FOUND'));
    }

    const roomToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        room: roomToJoin._id.toString(),
      },
      security.JWT_SECRET,
      { expiresIn: security.ROOM_TOKEN_EXPIRE }
    );

    logger.info(`User ${user.username} joined room ${roomToJoin.name}`, { userId: user.id, roomId, source: 'roomController.joinRoom', path: req.path });
    return res.json({ roomToken });
  } catch (err) {
    logger.error('Error joining room', { error: err.message, stack: err.stack, roomId: req.body.room, userId: req.user?.id, source: 'roomController.joinRoom', path: req.path });
    return next(new AppError('Server error while joining room.', 500, 'JOIN_ROOM_FAILED'));
  }
};
