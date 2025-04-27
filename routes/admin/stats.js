const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Message = require('../../models/Message');
const Room = require('../../models/Room');
const AiApi = require('../../models/AiApi');
const VoiceApi = require('../../models/VoiceApi');
const ImageApi = require('../../models/ImageApi');

router.get('/', async (req, res) => {
    try {
        const [
            users,
            rooms,
            messages,
            aiApis,
            voiceApis,
            imageApis
        ] = await Promise.all([
            User.countDocuments().exec(),
            Room.countDocuments().exec(), // Remove isActive filter since Room model doesn't have this field
            Message.countDocuments().exec(),
            AiApi.countDocuments({ isActive: true }).exec(),
            VoiceApi.countDocuments({ isActive: true }).exec(),
            ImageApi.countDocuments({ isActive: true }).exec()
        ]);

        // Match the response format expected by the dashboard
        const stats = {
            users: Number(users) || 0,
            rooms: Number(rooms) || 0,
            messages: Number(messages) || 0,
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
