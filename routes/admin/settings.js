const express = require('express');
const router = express.Router();
const Settings = require('../../models/Settings');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

// Get current system settings
router.get('/', [auth, admin.adminAuth], async (req, res) => {
    try {
        const settings = await Settings.findOne() || new Settings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching system settings' });
    }
});

// Update system settings
router.post('/', [auth, admin.adminAuth], async (req, res) => {
    try {
        const {
            maxUsersPerRoom,
            maxRoomsPerUser,
            maxMessageLength,
            messageRateLimit,
            requireEmailVerification,
            allowGuestAccess,
            enableProfanityFilter
        } = req.body;

        let settings = await Settings.findOne();
        
        if (!settings) {
            settings = new Settings();
        }

        // Update settings
        settings.maxUsersPerRoom = maxUsersPerRoom;
        settings.maxRoomsPerUser = maxRoomsPerUser;
        settings.maxMessageLength = maxMessageLength;
        settings.messageRateLimit = messageRateLimit;
        settings.requireEmailVerification = requireEmailVerification;
        settings.allowGuestAccess = allowGuestAccess;
        settings.enableProfanityFilter = enableProfanityFilter;

        await settings.save();
        
        res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Error updating system settings' });
    }
});

module.exports = router;
