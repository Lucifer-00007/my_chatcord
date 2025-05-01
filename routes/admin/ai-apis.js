const express = require('express');
const router = express.Router();
const AiApi = require('../../models/AiApi');
const { ai } = require('../../config/constants');
const { parseCurlCommand } = require('../../utils/apiHelpers');
const auth = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');

// Get AI config
router.get('/config', [auth, adminAuth], (req, res) => {
    try {
        if (!ai) {
            throw new Error('AI configuration not found');
        }
        res.json({
            defaultModels: ai.defaultModels || [],
            providers: ai.providers || {}
        });
    } catch (err) {
        res.status(500).json({ 
            message: 'Failed to load AI configuration',
            error: err.message 
        });
    }
});

// Admin-only active AI APIs (with secrets)
router.get('/active', [auth, adminAuth], async (req, res) => {
    try {
        const apis = await AiApi.find({ isActive: true });
        res.json(apis);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching active AI APIs' });
    }
});

// Public-safe active AI APIs (no secrets)
router.get('/public-active', auth, async (req, res) => {
    try {
        const apis = await AiApi.find({ isActive: true }).select('_id name description model');
        res.json(apis);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching public active AI APIs' });
    }
});

// Get all AI APIs
router.get('/', [auth, adminAuth], async (req, res) => {
    try {
        const apis = await AiApi.find();
        res.json(apis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single AI API by ID
router.get('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const api = await AiApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'AI API not found' });
        }
        res.json(api);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching AI API details' });
    }
});

// Create new AI API
router.post('/', [auth, adminAuth], async (req, res) => {
    try {
        const existingApi = await AiApi.findOne({ name: req.body.name });
        if (existingApi) {
            return res.status(400).json({ 
                code: 'DUPLICATE_NAME',
                message: `An API named "${req.body.name}" already exists` 
            });
        }

        const aiApi = new AiApi(req.body);
        const savedApi = await aiApi.save();
        res.status(201).json(savedApi);
    } catch (err) {
        res.status(400).json({ 
            message: err.message,
            code: err.code === 11000 ? 'DUPLICATE_NAME' : 'ERROR'
        });
    }
});

// Update AI API
router.put('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const api = await AiApi.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!api) {
            return res.status(404).json({ message: 'AI API not found' });
        }
        res.json(api);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete AI API
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const api = await AiApi.findByIdAndDelete(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'AI API not found' });
        }
        res.json({ message: 'AI API deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle AI API active status
router.patch('/:id/toggle', [auth, adminAuth], async (req, res) => {
    try {
        const api = await AiApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'AI API not found' });
        }
        api.isActive = !api.isActive;
        await api.save();
        res.json({ message: 'Status updated', api });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Test AI API endpoint
router.post('/test', [auth, adminAuth], async (req, res) => {
    try {
        const { curlCommand, requestPath } = req.body;
        
        if (!curlCommand || !requestPath) {
            return res.status(400).json({ 
                success: false, 
                message: 'cURL command and request path are required' 
            });
        }

        const curlData = parseCurlCommand(curlCommand);
        const testResponse = await fetch(curlData.url, {
            method: curlData.method,
            headers: curlData.headers,
            body: curlData.body ? JSON.stringify(curlData.body) : undefined
        });

        if (!testResponse.ok) {
            throw new Error(`API request failed with status ${testResponse.status}`);
        }

        const contentType = testResponse.headers.get('content-type');
        let responseData = await testResponse.text();

        res.json({
            success: true,
            message: 'API test completed successfully',
            details: {
                statusCode: testResponse.status,
                statusText: testResponse.statusText,
                contentType: contentType || 'unknown',
                responsePreview: responseData
            }
        });

    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to test AI API'
        });
    }
});

module.exports = router;