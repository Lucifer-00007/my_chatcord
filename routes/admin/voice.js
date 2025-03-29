const express = require('express');
const router = express.Router();
const VoiceApi = require('../../models/VoiceApi');

// Get all voice APIs
router.get('/', async (req, res) => {
    try {
        const apis = await VoiceApi.find();
        res.json(apis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new voice API
router.post('/', async (req, res) => {
    try {
        const voiceApi = new VoiceApi(req.body);
        const savedApi = await voiceApi.save();
        res.status(201).json(savedApi);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update voice API
router.put('/:id', async (req, res) => {
    try {
        const api = await VoiceApi.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!api) {
            return res.status(404).json({ message: 'Voice API not found' });
        }
        res.json(api);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete voice API
router.delete('/:id', async (req, res) => {
    try {
        const api = await VoiceApi.findByIdAndDelete(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'Voice API not found' });
        }
        res.json({ message: 'Voice API deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle voice API active status
router.patch('/:id/toggle', async (req, res) => {
    try {
        const api = await VoiceApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'Voice API not found' });
        }
        api.isActive = !api.isActive;
        await api.save();
        res.json({ message: 'Status updated', api });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
