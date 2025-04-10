const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');  // Add this line at the top
const VoiceApi = require('../../models/VoiceApi');
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../../utils/apiHelpers');
const { VOICE_API_CONFIG } = require('../../config/constants');

// Update route to get voice config
router.get('/config', (req, res) => {
    try {
        if (!VOICE_API_CONFIG) {
            throw new Error('Voice configuration not found');
        }
        
        // Send the entire voiceProviders object to preserve all properties
        res.json({
            defaultVoiceTypes: VOICE_API_CONFIG.defaultVoiceTypes || [],
            voiceProviders: VOICE_API_CONFIG.voiceProviders || {}
        });
    } catch (err) {
        res.status(500).json({ 
            message: 'Failed to load voice configuration',
            error: err.message 
        });
    }
});

// Get single voice API by ID
router.get('/:id', async (req, res) => {
    try {
        const api = await VoiceApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'Voice API not found' });
        }
        res.json(api);
    } catch (err) {
        console.error('Error fetching voice API:', err);
        res.status(500).json({ message: 'Error fetching voice API details', error: err.message });
    }
});

// Get all voice APIs
router.get('/', async (req, res) => {
    try {
        const apis = await VoiceApi.find();
        res.json(apis);
    } catch (err) {
        console.error('Error fetching voice APIs:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create new voice API
router.post('/', auth, async (req, res) => {
    try {
        const { curlCommand, requestPath, responsePath } = req.body;
        
        // Parse the curl command
        const { method } = parseCurlCommand(curlCommand);

        // For GET requests, validate parameter format
        if (method.toLowerCase() === 'get') {
            // Validate that paths are in param=value format
            const textParamValid = requestPath.includes('=');
            const voiceParamValid = responsePath.includes('=');

            if (!textParamValid || !voiceParamValid) {
                return res.status(400).json({
                    message: 'For GET requests, requestPath and responsePath must be in format "param=value"'
                });
            }
        }

        // Check for duplicate name
        const existingApi = await VoiceApi.findOne({ name: req.body.name });
        if (existingApi) {
            return res.status(400).json({ 
                code: 'DUPLICATE_NAME',
                message: `An API named "${req.body.name}" already exists` 
            });
        }

        const voiceApi = new VoiceApi(req.body);
        const savedApi = await voiceApi.save();
        res.status(201).json(savedApi);
    } catch (err) {
        console.error('Error creating voice API:', err);
        res.status(400).json({ 
            message: err.message,
            code: err.code === 11000 ? 'DUPLICATE_NAME' : 'ERROR'
        });
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
        console.error('Error updating voice API:', err);
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
        console.error('Error deleting voice API:', err);
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
        console.error('Error toggling voice API:', err);
        res.status(400).json({ message: err.message });
    }
});

// Test voice API endpoint
router.post('/test', auth, async (req, res) => {
    console.log('Test endpoint called');
    try {
        // First check auth
        if (!req.user.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const { curlCommand, requestPath, responsePath, apiType, responseType, auth: authData } = req.body;
        
        console.log('Received test request:', {
            hasCurlCommand: !!curlCommand,
            requestPath,
            responsePath,
            apiType,
            responseType,
            hasAuth: !!authData
        });

        if (!curlCommand || !requestPath) {
            return res.status(400).json({ 
                success: false, 
                message: 'cURL command and request path are required' 
            });
        }

        // Parse cURL command
        const { url, method, headers, body } = parseCurlCommand(curlCommand);
        console.log('Making test request with:', {
            url,
            method,
            headers,
            hasBody: !!body
        });

        // Handle GET requests with query parameters
        if (method.toLowerCase() === 'get') {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);

            // Get the text parameter key from requestPath
            const textParamKey = requestPath.split('=')[0];
            params.set(textParamKey, 'Test message');

            // Get voice parameter key and value from first supported voice
            if (req.body.supportedVoices?.[0]) {
                const voiceParamKey = responsePath.split('=')[0];
                params.set(voiceParamKey, req.body.supportedVoices[0].id);
            }

            // Update URL with parameters
            urlObj.search = params.toString();
            url = urlObj.toString();
            body = null; // No body for GET requests
        } else {
            // For POST/PUT requests, set up the request body
            if (body) {
                let requestBody = JSON.parse(JSON.stringify(body));
                requestBody = setValueAtPath(requestBody, requestPath, 'Test message');

                // If we have voice parameter and supported voices
                if (responsePath && req.body.supportedVoices?.[0]) {
                    requestBody = setValueAtPath(requestBody, responsePath, req.body.supportedVoices[0].id);
                }

                body = requestBody;
            }
        }

        // Make test request
        const testResponse = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        // Handle different response types
        const contentType = testResponse.headers.get('content-type');
        let responseData;

        if (responseType === 'base64') {
            const data = await testResponse.json();
            if (responsePath) {
                let base64Data = data;
                for (const part of responsePath.split('.')) {
                    base64Data = base64Data[part];
                }
                responseData = `Base64 audio data received (${base64Data.length} chars)`;
            } else {
                responseData = 'Base64 audio data received';
            }
        } else if (responseType === 'binary' || contentType?.includes('audio/')) {
            const buffer = await testResponse.arrayBuffer();
            responseData = `Binary audio data received (${buffer.byteLength} bytes)`;
        } else if (responseType === 'url') {
            const data = await testResponse.json();
            let audioUrl = data;
            if (responsePath) {
                audioUrl = responsePath.split('.').reduce((obj, key) => obj?.[key], data);
            }
            responseData = `Audio URL received: ${audioUrl}`;
        }

        res.json({
            success: true,
            message: 'API test successful',
            details: {
                statusCode: testResponse.status,
                statusText: testResponse.statusText,
                contentType,
                responseType,
                responsePreview: responseData
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
