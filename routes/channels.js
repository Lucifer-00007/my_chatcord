const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const { JWT_SECRET, ROOM_TOKEN_EXPIRE, MAX_MESSAGES } = require('../config/constants');

// Get all channels
router.get('/', auth, async (req, res) => {
  try {
    const channels = await Channel.find().populate('createdBy', 'username');
    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new channel
router.post('/', auth, async (req, res) => {
  try {
    const { name, topic, description } = req.body;

    let channel = await Channel.findOne({ name });
    if (channel) {
      return res.status(400).json({ message: 'Channel already exists' });
    }

    channel = new Channel({
      name,
      topic,
      description,
      createdBy: req.user._id
    });

    await channel.save();
    res.status(201).json(channel);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel messages
router.get('/:name/messages', auth, async (req, res) => {
  try {
    // First find the channel by name
    const channel = await Channel.findOne({ name: req.params.name });
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Then fetch messages using channel's ObjectId
    const messages = await Message.find({ channel: channel._id })
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(MAX_MESSAGES);

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join channel
router.post('/join', auth, async (req, res) => {
  try {
    const { room } = req.body;
    const user = req.user;

    // Generate a room token
    const roomToken = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        room 
      },
      JWT_SECRET,
      { expiresIn: ROOM_TOKEN_EXPIRE }
    );

    res.json({ roomToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
