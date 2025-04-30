const express = require('express');
const router = express.Router();
const ImageSettings = require('../../models/ImageSettings');
const auth = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');

// Get size settings
router.get('/sizes', auth, async (req, res) => {
    try {
        let settings = await ImageSettings.findOne({ type: 'sizes' });
        if (!settings) {
            settings = new ImageSettings({
                type: 'sizes',
                values: [
                    { id: '256x256', label: '256x256', isActive: true },
                    { id: '512x512', label: '512x512', isActive: true },
                    { id: '1024x1024', label: '1024x1024', isActive: true }
                ]
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error loading size settings:', err);
        res.status(500).json({ message: 'Error loading size settings' });
    }
});

// Get style settings
router.get('/styles', auth, async (req, res) => {
    try {
        let settings = await ImageSettings.findOne({ type: 'styles' });
        if (!settings) {
            settings = new ImageSettings({
                type: 'styles',
                values: [
                    { id: 'realistic', name: 'Realistic', isActive: true },
                    { id: 'artistic', name: 'Artistic', isActive: true },
                    { id: 'cartoon', name: 'Cartoon', isActive: true }
                ]
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error loading style settings:', err);
        res.status(500).json({ message: 'Error loading style settings' });
    }
});

// Update size settings
router.put('/sizes', [auth, adminAuth], async (req, res) => {
    try {
        const { values } = req.body;
        let settings = await ImageSettings.findOne({ type: 'sizes' });
        if (!settings) {
            settings = new ImageSettings({ type: 'sizes' });
        }
        settings.values = values;
        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error('Error updating size settings:', err);
        res.status(500).json({ message: 'Error updating size settings' });
    }
});

// Update style settings
router.put('/styles', [auth, adminAuth], async (req, res) => {
    try {
        const { values } = req.body;
        let settings = await ImageSettings.findOne({ type: 'styles' });
        if (!settings) {
            settings = new ImageSettings({ type: 'styles' });
        }
        settings.values = values;
        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error('Error updating style settings:', err);
        res.status(500).json({ message: 'Error updating style settings' });
    }
});

module.exports = router;
