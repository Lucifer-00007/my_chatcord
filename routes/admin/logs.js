const express = require('express');
const router = express.Router();
const SystemLog = require('../../models/SystemLog');

// Get logs with optional filtering
router.get('/', async (req, res) => {
    try {
        const { level, limit = 100, from, to } = req.query;
        
        let query = {};
        
        // Add level filter if specified
        if (level && level !== 'all') {
            query.level = level;
        }

        // Add date range filter if specified
        if (from || to) {
            query.timestamp = {};
            if (from) query.timestamp.$gte = new Date(from);
            if (to) query.timestamp.$lte = new Date(to);
        }

        const logs = await SystemLog
            .find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
});

// Add new log entry
router.post('/', async (req, res) => {
    try {
        const { level, message, source, metadata } = req.body;
        
        const log = new SystemLog({
            level,
            message,
            source,
            metadata
        });

        await log.save();
        res.status(201).json(log);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create log entry' });
    }
});

// Clear logs
router.delete('/', async (req, res) => {
    try {
        const { before, level } = req.query;
        let query = {};

        if (before) {
            query.timestamp = { $lt: new Date(before) };
        }
        if (level) {
            query.level = level;
        }

        await SystemLog.deleteMany(query);
        res.json({ message: 'Logs cleared successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to clear logs' });
    }
});

module.exports = router;
