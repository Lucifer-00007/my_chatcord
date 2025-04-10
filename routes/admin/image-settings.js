const express = require('express');
const router = express.Router();
const ImageSettings = require('../../models/ImageSettings');
const auth = require('../../middleware/auth');

// Get image settings
router.get('/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const { type } = req.params;
        if (!['sizes', 'styles'].includes(type)) {
            return res.status(400).json({ message: 'Invalid settings type' });
        }

        let settings = await ImageSettings.findOne({ type });
        if (!settings) {
            settings = new ImageSettings({
                type,
                values: []
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error fetching image settings:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update image settings
router.put('/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const { type } = req.params;
        if (!['sizes', 'styles'].includes(type)) {
            return res.status(400).json({ message: 'Invalid settings type' });
        }

        const { values } = req.body;
        if (!Array.isArray(values)) {
            return res.status(400).json({ message: 'Values must be an array' });
        }

        const settings = await ImageSettings.findOneAndUpdate(
            { type },
            { $set: { values } },
            { new: true, upsert: true }
        );

        res.json(settings);
    } catch (err) {
        console.error('Error saving image settings:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
