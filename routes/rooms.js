const express = require('express');
const router = express.Router();
const { security, chat } = require('../config/constants');
const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const RoomChat = require('../models/RoomChat');
const { logUserMessageActivity } = require('../utils/users');

// Get all rooms
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find().populate('createdBy', 'username');
    res.json(rooms);
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new room
router.post('/', auth, async (req, res) => {
  try {
    const { name, topic, description } = req.body;

    let room = await Room.findOne({ name });
    if (room) {
      return res.status(400).json({ message: 'Room already exists' });
    }

    room = new Room({
      name,
      topic,
      description,
      createdBy: req.user._id
    });

    await room.save();
    res.status(201).json(room);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json(room);
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a room
router.get('/:roomId/messages', auth, async (req, res) => {
  try {
    const roomId = req.params.roomId;

    // Check for active block
    const activeBlock = await RoomBlock.findOne({
      user: req.user._id,
      room: roomId,
      isActive: true,
      endDate: { $gt: new Date() }
    });

    if (activeBlock) {
      return res.status(403).json({ 
        message: 'You are blocked from this room',
        blockEndDate: activeBlock.endDate
      });
    }

    // Find room by _id
    let room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Fetch messages from RoomChat
    const roomChat = await RoomChat.findOne({ room: room._id });
    let messages = [];
    if (roomChat && Array.isArray(roomChat.messages)) {
      messages = roomChat.messages
        .slice(-chat.MAX_MESSAGES)
        .map(msg => ({
          content: msg.content,
          user: msg.user,
          username: msg.username,
          createdAt: msg.createdAt
        }));
      // Log activity for each message fetch (optional, for heatmap)
      await logUserMessageActivity(req.user._id, req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.headers['user-agent'], { room: room._id });
    }
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join room
router.post('/join', auth, async (req, res) => {
  try {
    const roomId = req.body.room;
    const user = req.user;

    // Check if user is blocked from this room
    const activeBlock = await RoomBlock.findOne({
      user: user._id,
      room: roomId,
      isActive: true,
      endDate: { $gt: new Date() }
    }).populate('blockedBy', 'username');

    if (activeBlock) {
      return res.status(403).json({
        message: `You are blocked from this room until ${new Date(activeBlock.endDate).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'numeric', year: 'numeric'})}`,
        blockEndDate: activeBlock.endDate,
        blockReason: activeBlock.reason,
        blockedBy: activeBlock.blockedBy && activeBlock.blockedBy.username ? activeBlock.blockedBy.username : undefined
      });
    }

    // Find room by _id
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Generate a room token
    const roomToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        room: room._id.toString()
      },
      security.JWT_SECRET,
      { expiresIn: security.ROOM_TOKEN_EXPIRE }
    );

    res.json({ roomToken });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
