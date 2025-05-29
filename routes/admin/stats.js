const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Room = require('../../models/Room');
const AiApi = require('../../models/AiApi');
const VoiceApi = require('../../models/VoiceApi');
const ImageApi = require('../../models/ImageApi');
const RoomChat = require('../../models/RoomChat');

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

module.exports = router;
