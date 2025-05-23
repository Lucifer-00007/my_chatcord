const express = require('express');
const router = express.Router();
const Room = require('../../models/Room');
const RoomBlock = require('../../models/RoomBlock');
const User = require('../../models/User');
const auth = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');
const { chat } = require('../../config/constants');
const RoomChat = require('../../models/RoomChat');

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
        const rooms = await Room.find().lean();
        // Get all room IDs
        const roomIds = rooms.map(room => room._id);

        // Get block counts for each room
        const blocks = await RoomBlock.aggregate([
            { $match: { room: { $in: roomIds.map(id => id) }, isActive: true } },
            { $group: { _id: '$room', count: { $sum: 1 } } }
        ]);

        // Map roomId to count
        const blockMap = {};
        blocks.forEach(b => { blockMap[b._id] = b.count; });

        // Attach blockedCount to each room
        const roomsWithBlocked = rooms.map(room => ({
            ...room,
            blockedCount: blockMap[room._id.toString()] || 0
        }));

        res.json(roomsWithBlocked);
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
            return res.status(400).json({ message: 'Default rooms cannot be deleted' });
        }
        // Remove all related data before deleting the room
        await Promise.all([
            RoomBlock.deleteMany({ room: room._id }),
            RoomChat.deleteMany({ room: room._id })
        ]);
        await Room.deleteOne({ _id: room._id });
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
            .populate('blockedBy', 'username')
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
            return res.status(404).json({ message: 'User or room not found' });
        }

        // Check for existing active block for this user in this room
        const now = new Date();
        const existingBlock = await RoomBlock.findOne({
            user: userId,
            room: roomId,
            isActive: true,
            endDate: { $gt: now }
        });

        if (existingBlock) {
            return res.status(400).json({
                message: `${user.username} is already blocked in the ${room.name} room!`
            });
        }

        // Calculate block end date
        const endDate = new Date();
        endDate.setTime(endDate.getTime() + duration * 24 * 60 * 60 * 1000); // duration in days

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

// --- Chat History Management Endpoints ---
router.get('/rooms/:roomId/chats', [auth, adminAuth], async (req, res) => {
    try {
        const roomChat = await RoomChat.findOne({ room: req.params.roomId });
        if (!roomChat || !roomChat.messages || !roomChat.messages.length) {
            return res.json([]);
        }
        // Populate usernames if possible
        const messages = await Promise.all(roomChat.messages.map(async msg => {
            let username = msg.username;
            if (!username && msg.user) {
                const user = await User.findById(msg.user).select('username');
                username = user ? user.username : 'Unknown';
            }
            return {
                content: msg.content,
                createdAt: msg.createdAt,
                username
            };
        }));
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete all chat history for a room
router.delete('/rooms/:roomId/chats', [auth, adminAuth], async (req, res) => {
    try {
        const roomChat = await RoomChat.findOne({ room: req.params.roomId });
        if (!roomChat) {
            return res.status(404).json({ message: 'No chat history found for this room.' });
        }
        roomChat.messages = [];
        await roomChat.save();
        res.json({ message: 'Chat history deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a single chat message by index
router.delete('/rooms/:roomId/chats/:idx', [auth, adminAuth], async (req, res) => {
    try {
        const { roomId, idx } = req.params;
        const roomChat = await RoomChat.findOne({ room: roomId });
        if (!roomChat || !roomChat.messages || !roomChat.messages.length) {
            return res.status(404).json({ message: 'No chat history found for this room.' });
        }
        const index = parseInt(idx, 10);
        if (isNaN(index) || index < 0 || index >= roomChat.messages.length) {
            return res.status(400).json({ message: 'Invalid message index.' });
        }
        roomChat.messages.splice(index, 1);
        await roomChat.save();
        res.json({ message: 'Message deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;