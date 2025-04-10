const express = require('express');
const router = express.Router();
const VoiceSettings = require('../../models/VoiceSettings');
const auth = require('../../middleware/auth');

// Get voice settings
router.get('/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const { type } = req.params;
        if (!['speed', 'pitch'].includes(type)) {
            return res.status(400).json({ message: 'Invalid settings type' });
        }

        let settings = await VoiceSettings.findOne({ type });
        if (!settings) {
            settings = new VoiceSettings({
                type,
                range: {
                    min: type === 'speed' ? 0.5 : 0.5,
                    max: type === 'speed' ? 2.0 : 2.0,
                    step: 0.1,
                    default: 1.0
                }
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error fetching voice settings:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update voice settings
router.put('/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const { type } = req.params;
        if (!['speed', 'pitch'].includes(type)) {
            return res.status(400).json({ message: 'Invalid settings type' });
        }

        const { range } = req.body;

        // Validate input
        if (!range || typeof range !== 'object') {
            return res.status(400).json({ message: 'Invalid range data' });
        }

        // Validate required fields
        const requiredFields = ['min', 'max', 'default', 'step'];
        for (const field of requiredFields) {
            if (typeof range[field] !== 'number') {
                return res.status(400).json({ 
                    message: `Invalid ${field} value. Must be a number.`
                });
            }
        }

        // Validate ranges
        if (range.min >= range.max) {
            return res.status(400).json({ 
                message: 'Minimum value must be less than maximum value'
            });
        }

        if (range.default < range.min || range.default > range.max) {
            return res.status(400).json({ 
                message: 'Default value must be between min and max values'
            });
        }

        if (range.step <= 0) {
            return res.status(400).json({ 
                message: 'Step must be greater than 0'
            });
        }

        // Update or create settings
        const settings = await VoiceSettings.findOneAndUpdate(
            { type },
            { 
                $set: { 
                    range,
                    updatedAt: new Date()
                }
            },
            { 
                new: true,
                upsert: true
            }
        );

        res.json(settings);
    } catch (err) {
        console.error('Error saving voice settings:', err);
        res.status(500).json({ message: err.message || 'Failed to save settings' });
    }
});

module.exports = router;
