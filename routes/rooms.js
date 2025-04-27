const express = require('express');
const router = express.Router();
const { security, chat } = require('../config/constants');
const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');

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
router.get('/:roomName/messages', auth, async (req, res) => {
  try {
    const roomName = decodeURIComponent(req.params.roomName);

    // Check for active block
    const activeBlock = await RoomBlock.findOne({
      user: req.user._id,
      room: roomName,
      isActive: true,
      endDate: { $gt: new Date() }
    });

    if (activeBlock) {
      return res.status(403).json({ 
        message: 'You are blocked from this room',
        blockEndDate: activeBlock.endDate
      });
    }

    // Find or create room
    let room = await Room.findOne({ name: roomName });
    if (!room) {
      room = new Room({
        name: roomName,
        topic: roomName,
        createdBy: req.user._id
      });
      await room.save();
    }

    // Then fetch messages using room's ObjectId
    const messages = await Message.find({ room: room._id })
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(chat.MAX_MESSAGES);

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join room
router.post('/join', auth, async (req, res) => {
  try {
    const room = decodeURIComponent(req.body.room);
    const user = req.user;

    // Check if user is blocked from this room
    const activeBlock = await RoomBlock.findOne({
      user: user._id,
      room,
      isActive: true,
      endDate: { $gt: new Date() }
    });

    if (activeBlock) {
      return res.status(403).json({ 
        message: 'You are blocked from this room',
        blockEndDate: activeBlock.endDate
      });
    }

    // Generate a room token
    const roomToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        room
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
