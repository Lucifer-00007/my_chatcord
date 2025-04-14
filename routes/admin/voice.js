const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const VoiceApi = require('../../models/VoiceApi');
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../../utils/apiHelpers');
const { voice } = require('../../config/constants');

// Get all voice APIs
router.get('/', auth, async (req, res) => {
    try {
        const apis = await VoiceApi.find();
        res.json(apis);
    } catch (err) {
        console.error('Error fetching voice APIs:', err);
        res.status(500).json({ message: voice.messages.NOT_FOUND });
    }
});

// Create new voice API
router.post('/', auth, async (req, res) => {
    try {
        const { name, apiType, responseType, curlCommand, requestPath, responsePath, supportedVoices } = req.body;

        const existingApi = await VoiceApi.findOne({ name });
        if (existingApi) {
            return res.status(400).json({
                success: false,
                message: voice.messages.DUPLICATE_NAME(name)
            });
        }

        const voiceApi = new VoiceApi({
            name,
            apiType,
            responseType,
            curlCommand,
            requestPath,
            responsePath,
            method: voice.methods.POST,
            supportedVoices: supportedVoices || []
        });

        const savedApi = await voiceApi.save();
        res.json({
            success: true,
            message: voice.messages.SAVE_SUCCESS,
            api: savedApi
        });

    } catch (err) {
        console.error('Error saving voice API:', err);
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
});

// Add GET single voice API endpoint
router.get('/:id', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    try {
        const api = await VoiceApi.findById(req.params.id);

        if (!api) {
            return res.status(404).json({
                success: false,
                message: voice.messages.NOT_FOUND
            });
        }

        res.json(api);
    } catch (err) {
        console.error('Error fetching voice API:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voice API details'
        });
    }
});

// Update voice API
router.put('/:id', auth, async (req, res) => {
if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const api = await VoiceApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({
                success: false,
                message: 'Voice API not found'
            });
        }

        // Remove name from update data to prevent modification
        const { name, ...updateData } = req.body;

        // Update API without changing name
        const updatedApi = await VoiceApi.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Voice API updated successfully',
            api: updatedApi
        });

    } catch (err) {
        console.error('Error updating voice API:', err);
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to update voice API'
        });
    }
});

// Delete voice API
router.delete('/:id', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    try {
        const api = await VoiceApi.findByIdAndDelete(req.params.id);

        if (!api) {
            return res.status(404).json({
                success: false,
                message: voice.messages.NOT_FOUND
            });
        }

        res.json({
            success: true,
            message: voice.messages.DELETE_SUCCESS
        });
    } catch (err) {
        console.error('Error deleting voice API:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete voice API'
        });
    }
});

// Add test endpoint
router.post('/test', auth, async (req, res) => {
    try {
        const { curlCommand, requestPath, responsePath, apiType, responseType, auth: authData } = req.body;

        if (!curlCommand || !requestPath) {
            return res.status(400).json({
                success: false,
                message: 'cURL command and request path are required'
            });
        }

        // Parse cURL command with URL validation
        let parsedCurl;
        try {
            parsedCurl = parseCurlCommand(curlCommand);
            if (!parsedCurl.endpoint.startsWith('http')) {
                throw new Error('URL must be absolute (start with http:// or https://)');
            }
        } catch (parseErr) {
            return res.status(400).json({
                success: false,
                message: parseErr.message
            });
        }

        const { endpoint, method, headers, body: requestBody } = parsedCurl;

        console.log('Making test request:', {
            url: endpoint,
            method,
            headers,
            bodyPreview: requestBody ? JSON.stringify(requestBody).slice(0, 100) : null
        });

        // Make test request
        const testResponse = await fetch(endpoint, {
            method,
            headers,
            body: requestBody ? JSON.stringify(requestBody) : undefined
        });

        // Handle response based on response type
        if (responseType === 'binary') {
            const buffer = await testResponse.buffer();
            return res.json({
                success: true,
                message: 'Test successful - Binary response received',
                details: {
                    contentType: testResponse.headers.get('content-type'),
                    dataSize: buffer.length,
                    status: testResponse.status
                }
            });
        }

        const data = await testResponse.json();
        if (!testResponse.ok) {
            throw new Error(data?.error?.message || `API responded with status ${testResponse.status}`);
        }

        res.json({
            success: true,
            message: 'Test successful - JSON response received',
            details: {
                status: testResponse.status,
                response: data
            }
        });

    } catch (err) {
        console.error('Test endpoint error:', err);
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to test voice API'
        });
    }
});

module.exports = router;
