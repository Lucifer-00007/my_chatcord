const express = require('express');
const router = express.Router();
const Room = require('../../models/Room');
const RoomBlock = require('../../models/RoomBlock');
const User = require('../../models/User');
const auth = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const { chat } = require('../../config/constants');

// Get room management constants
router.get('/constants', [auth, adminAuth], async (req, res) => {
    try {
        res.json(chat.ROOM_MANAGEMENT);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch room management constants' });
    }
});

// Get all rooms
router.get('/rooms', [auth, adminAuth], async (req, res) => {
    try {
        const rooms = await Room.find()
            .select('name topic description isDefault')
            .lean();

        // Add user count for each room
        for (let room of rooms) {
            room.userCount = await User.countDocuments({
                'activeRooms': room.name
            });
        }

        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new room
router.post('/rooms', [auth, adminAuth], async (req, res) => {
    try {
        const { name, topic, description, isDefault } = req.body;

        // Check for duplicate room name
        const existingRoom = await Room.findOne({ name });
        if (existingRoom) {
            return res.status(400).json({ 
                message: 'A room with this name already exists'
            });
        }

        const room = new Room({
            name,
            topic,
            description,
            isDefault,
            createdBy: req.user._id
        });

        await room.save();
        res.status(201).json(room);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update room
router.put('/rooms/:id', [auth, adminAuth], async (req, res) => {
    try {
        const room = await Room.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.json(room);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete room
router.delete('/rooms/:id', [auth, adminAuth], async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.isDefault) {
            return res.status(400).json({ 
                message: 'Default rooms cannot be deleted'
            });
        }

        await room.remove();
        res.json({ message: 'Room deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get room blocks
router.get('/rooms/:roomId/blocks', [auth, adminAuth], async (req, res) => {
    try {
        const blocks = await RoomBlock.find({ room: req.params.roomId })
            .populate('user', 'username')
            .sort('-createdAt');
        res.json(blocks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create room block
router.post('/blocks', [auth, adminAuth], async (req, res) => {
    try {
        const { userId, roomId, reason, duration } = req.body;

        // Check if user and room exist
        const [user, room] = await Promise.all([
            User.findById(userId),
            Room.findById(roomId)
        ]);

        if (!user || !room) {
            return res.status(404).json({ 
                message: 'User or room not found'
            });
        }

        // Calculate block end date
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + duration);

        const block = new RoomBlock({
            user: userId,
            room: roomId,
            reason,
            duration,
            endDate,
            blockedBy: req.user._id
        });

        await block.save();

        // Remove user from room's active users if they're in it
        await User.findByIdAndUpdate(userId, {
            $pull: { activeRooms: room.name }
        });

        res.status(201).json(block);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Remove block
router.delete('/blocks/:id', [auth, adminAuth], async (req, res) => {
    try {
        const block = await RoomBlock.findByIdAndDelete(req.params.id);
        
        if (!block) {
            return res.status(404).json({ message: 'Block not found' });
        }

        res.json({ message: 'Block removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;