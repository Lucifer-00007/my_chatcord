const express = require('express');
const router = express.Router();
const Settings = require('../../models/Settings');

// Get system settings
router.get('/', async (req, res) => {
    try {
        const settings = await Settings.findOne() || new Settings();
        res.json(settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ message: 'Failed to load settings' });
    }
});

// Update system settings
router.put('/', async (req, res) => {
    try {
        const settings = await Settings.findOne() || new Settings();
        Object.assign(settings, req.body);
        await settings.save();
        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ message: 'Failed to update settings' });
    }
});

module.exports = router;
