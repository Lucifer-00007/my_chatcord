const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Room = require('../../models/Room');
const AiApi = require('../../models/AiApi');
const VoiceApi = require('../../models/VoiceApi');
const ImageApi = require('../../models/ImageApi');
const RoomChat = require('../../models/RoomChat');
const UserActivity = require('../../models/UserActivity');

router.get('/', async (req, res) => {
    try {
        const [
            users,
            rooms,
            messageCount,
            aiApis,
            voiceApis,
            imageApis
        ] = await Promise.all([
            User.countDocuments().exec(),
            Room.countDocuments().exec(),
            // Aggregate to sum the lengths of all messages arrays in RoomChat
            RoomChat.aggregate([
                { $project: { messageCount: { $size: { $ifNull: ["$messages", []] } } } },
                { $group: { _id: null, total: { $sum: "$messageCount" } } }
            ]).then(res => (res[0]?.total || 0)),
            AiApi.countDocuments({ isActive: true }).exec(),
            VoiceApi.countDocuments({ isActive: true }).exec(),
            ImageApi.countDocuments({ isActive: true }).exec()
        ]);

        // Match the response format expected by the dashboard
        const stats = {
            users: Number(users) || 0,
            rooms: Number(rooms) || 0,
            messages: Number(messageCount) || 0,
            apis: Number(aiApis + voiceApis + imageApis) || 0,
            lastUpdated: new Date().toISOString()
        };

        console.log('Sending stats:', stats);
        res.json(stats);
        
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ 
            message: 'Error fetching stats',
            error: err.message
        });
    }
});

// --- New endpoints for dashboard visualizations ---

// User Status Pie Chart
router.get('/user-status-pie', async (req, res) => {
    try {
        // Example: status and role (expand as needed)
        const total = await User.countDocuments();
        // If you have status/role fields, aggregate here. For now, just admins vs. users
        const adminCount = await User.countDocuments({ isAdmin: true });
        const memberCount = total - adminCount;
        res.json({
            labels: ['Admin', 'Member'],
            values: [adminCount, memberCount]
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to get user status pie', error: err.message });
    }
});

// Messages per Channel Bar Chart
router.get('/messages-per-channel-bar', async (req, res) => {
    try {
        // Aggregate message counts per room/channel
        const Room = require('../../models/Room');
        const RoomChat = require('../../models/RoomChat');
        const rooms = await Room.find({}, 'name _id');
        const chats = await RoomChat.find({});
        const roomMap = {};
        rooms.forEach(r => roomMap[r._id.toString()] = r.name);
        const counts = {};
        chats.forEach(chat => {
            const roomId = chat.room.toString();
            counts[roomId] = (chat.messages || []).length;
        });
        const labels = rooms.map(r => r.name);
        const values = rooms.map(r => counts[r._id.toString()] || 0);
        res.json({ labels, values });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch messages per channel', error: err.message });
    }
});

// Activity Heatmap (logins by hour/day)
router.get('/activity-heatmap', async (req, res) => {
    try {
        // Aggregate login/message activity by day of week and hour in IST
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // last 14 days
        const pipeline = [
            { $match: { timestamp: { $gte: since }, action: { $in: ['login', 'message'] } } },
            { $addFields: {
                // Convert timestamp to IST (UTC+5:30)
                istDate: {
                    $toDate: {
                        $add: [
                            { $toLong: "$timestamp" },
                            19800000 // 5.5 hours in ms
                        ]
                    }
                }
            }},
            { $project: {
                day: { $dayOfWeek: "$istDate" }, // 1 (Sunday) - 7 (Saturday)
                hour: { $hour: "$istDate" }
            }},
            { $group: {
                _id: { day: "$day", hour: "$hour" },
                count: { $sum: 1 }
            }}
        ];
        const results = await UserActivity.aggregate(pipeline);
        // Build 2D array: days x hours
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')+':00');
        const data = Array(7).fill(0).map(() => Array(24).fill(0));
        results.forEach(r => {
            const dayIdx = (r._id.day - 1) % 7;
            const hourIdx = r._id.hour;
            data[dayIdx][hourIdx] = r.count;
        });
        res.json({ days, hours, data });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch activity heatmap', error: err.message });
    }
});

// Message Length Histogram
router.get('/message-length-histogram', async (req, res) => {
    try {
        // Last 14 days, all messages
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        // Aggregate all message lengths from RoomChat.messages[]
        const RoomChat = require('../../models/RoomChat');
        const chats = await RoomChat.find({ "messages.createdAt": { $gte: since } }, { messages: 1 });
        const lengths = [];
        chats.forEach(chat => {
            (chat.messages || []).forEach(msg => {
                if (msg.createdAt >= since && typeof msg.content === 'string') {
                    lengths.push(msg.content.length);
                }
            });
        });
        // Bin lengths: 0-10, 11-50, 51-100, 101-200, 201+
        const bins = ['0-10', '11-50', '51-100', '101-200', '201+'];
        const counts = [0, 0, 0, 0, 0];
        lengths.forEach(len => {
            if (len <= 10) counts[0]++;
            else if (len <= 50) counts[1]++;
            else if (len <= 100) counts[2]++;
            else if (len <= 200) counts[3]++;
            else counts[4]++;
        });
        res.json({ bins, counts });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch message length histogram', error: err.message });
    }
});

// Active APIs Pie Chart
router.get('/active-apis-pie', async (req, res) => {
    try {
        const [ai, image, voice] = await Promise.all([
            require('../../models/AiApi').countDocuments({ isActive: true }),
            require('../../models/ImageApi').countDocuments({ isActive: true }),
            require('../../models/VoiceApi').countDocuments({ isActive: true })
        ]);
        res.json({
            labels: ['AI APIs', 'Image APIs', 'Voice APIs'],
            values: [ai, image, voice]
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to get active APIs pie', error: err.message });
    }
});

module.exports = router;
