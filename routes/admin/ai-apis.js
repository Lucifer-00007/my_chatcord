const express = require('express');
const router = express.Router();
const VoiceApi = require('../../models/VoiceApi');
const { voice } = require('../../config/constants');
const { parseCurlCommand } = require('../../utils/apiHelpers');

// Update route to get voice config
router.get('/config', (req, res) => {
    try {
        if (!voice) {
            throw new Error('Voice configuration not found');
        }
        
        // Send the entire voiceProviders object to preserve all properties
        res.json({
            defaultVoiceTypes: voice.defaultVoiceTypes || [],
            voiceProviders: voice.voiceProviders || {}
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
        res.status(500).json({ message: err.message });
    }
});

// Create new voice API
router.post('/', async (req, res) => {
    try {
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

// Add test endpoint
router.post('/test', async (req, res) => {
    console.log('Test endpoint called');
    try {
        const { curlCommand, requestPath, responsePath, apiType, responseType, auth } = req.body;
        
        console.log('Received test request:', {
            hasCurlCommand: !!curlCommand,
            requestPath,
            responsePath,
            apiType,
            responseType,
            hasAuth: !!auth
        });

        if (!curlCommand || !requestPath) {
            return res.status(400).json({ 
                success: false, 
                message: 'cURL command and request path are required' 
            });
        }

        // Parse cURL command
        const curlData = parseCurlCommand(curlCommand);
        console.log('Making test request with:', {
            url: curlData.url,
            method: curlData.method,
            headers: curlData.headers,
            hasBody: !!curlData.body
        });

        // Make test request with proper error handling
        try {
            const testResponse = await fetch(curlData.url, {
                method: curlData.method,
                headers: curlData.headers, // Use headers directly from parsed curl command
                body: curlData.body ? JSON.stringify(curlData.body) : undefined
            });

            // Handle different response status codes
            if (testResponse.status === 524) {
                throw new Error('API timeout - The server took too long to respond');
            }

            if (!testResponse.ok) {
                throw new Error(`API request failed with status ${testResponse.status}: ${testResponse.statusText}`);
            }

            // Get response data based on content type
            const contentType = testResponse.headers.get('content-type');
            let responseData;

            if (contentType?.includes('audio') || responseType === 'binary') {
                const buffer = await testResponse.arrayBuffer();
                responseData = 'Binary audio data received successfully';
            } else if (contentType?.includes('application/json')) {
                const jsonData = await testResponse.json();
                responseData = 'JSON response received successfully';
            } else {
                responseData = await testResponse.text();
            }

            res.json({
                success: true,
                message: 'API test completed successfully',
                details: {
                    statusCode: testResponse.status,
                    statusText: testResponse.statusText,
                    contentType: contentType || 'unknown',
                    responseType: responseType,
                    responsePreview: responseData
                }
            });

        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            throw new Error(fetchError.message || 'Failed to connect to the API');
        }

    } catch (err) {
        console.error('Test endpoint error:', {
            message: err.message,
            stack: err.stack
        });
        
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to test voice API',
            error: {
                type: err.name,
                details: err.message,
                statusCode: err.status || 400
            }
        });
    }
});

module.exports = router;