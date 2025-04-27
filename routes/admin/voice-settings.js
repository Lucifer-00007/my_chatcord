const express = require('express');
const router = express.Router();
const VoiceSettings = require('../../models/VoiceSettings');
const auth = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');

// Get pitch settings
router.get('/pitch', [auth, adminAuth], async (req, res) => {
    try {
        let settings = await VoiceSettings.findOne({ type: 'pitch' });
        if (!settings) {
            settings = new VoiceSettings({
                type: 'pitch',
                values: [
                    { id: 'low', label: 'Low', value: -2, isActive: true },
                    { id: 'normal', label: 'Normal', value: 0, isActive: true },
                    { id: 'high', label: 'High', value: 2, isActive: true }
                ]
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error loading pitch settings:', err);
        res.status(500).json({ message: 'Error loading pitch settings' });
    }
});

// Get speed settings
router.get('/speed', [auth, adminAuth], async (req, res) => {
    try {
        let settings = await VoiceSettings.findOne({ type: 'speed' });
        if (!settings) {
            settings = new VoiceSettings({
                type: 'speed',
                values: [
                    { id: 'slow', label: 'Slow', value: 0.75, isActive: true },
                    { id: 'normal', label: 'Normal', value: 1.0, isActive: true },
                    { id: 'fast', label: 'Fast', value: 1.25, isActive: true }
                ]
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error loading speed settings:', err);
        res.status(500).json({ message: 'Error loading speed settings' });
    }
});

// Update pitch settings
router.put('/pitch', [auth, adminAuth], async (req, res) => {
    try {
        const { values } = req.body;
        let settings = await VoiceSettings.findOne({ type: 'pitch' });
        if (!settings) {
            settings = new VoiceSettings({ type: 'pitch' });
        }
        settings.values = values;
        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error('Error updating pitch settings:', err);
        res.status(500).json({ message: 'Error updating pitch settings' });
    }
});

// Update speed settings
router.put('/speed', [auth, adminAuth], async (req, res) => {
    try {
        const { values } = req.body;
        let settings = await VoiceSettings.findOne({ type: 'speed' });
        if (!settings) {
            settings = new VoiceSettings({ type: 'speed' });
        }
        settings.values = values;
        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error('Error updating speed settings:', err);
        res.status(500).json({ message: 'Error updating speed settings' });
    }
});

module.exports = router;
