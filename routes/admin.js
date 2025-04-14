const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const AiApi = require('../models/AiApi');
const ImageApi = require('../models/ImageApi');
const VoiceSettings = require('../models/VoiceSettings');
const ImageSettings = require('../models/ImageSettings');
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../utils/apiHelpers');
const { admin } = require('../config/constants');
const { 
    setValueAtPath, 
    validateVoiceRange, 
    processImageSettings,
    createApiResponse 
} = require('../utils/adminHelpers');

// Import sub-routes
const voiceRoutes = require('./admin/voice');
const imageRoutes = require('./admin/image-apis');

// Use sub-routes
router.use('/voice', voiceRoutes);
router.use('/image-apis', imageRoutes);

// Stats endpoint
router.get('/stats', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const stats = await Promise.all([
            User.countDocuments(),
            Channel.countDocuments(),
            Message.countDocuments(),
            AiApi.countDocuments()
        ]);

        res.json({
            users: stats[0],
            channels: stats[1],
            messages: stats[2],
            apis: stats[3],
            lastUpdated: new Date()
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// AI APIs routes
router.get('/ai-apis', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const apis = await AiApi.find();
        res.json(apis);
    } catch (err) {
        console.error('Error fetching AI APIs:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/ai-apis/active', auth, async (req, res) => {
    try {
        const apis = await AiApi.find({ isActive: true });
        res.json(apis);
    } catch (err) {
        console.error('Error fetching active APIs:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update the add new API route with better error handling
router.post('/ai-apis', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const { name, curlCommand, requestPath, responsePath } = req.body;
        
        // Validate required fields
        if (!name || !curlCommand || !requestPath || !responsePath) {
            return res.status(400).json({ 
                message: 'All fields are required' 
            });
        }

        // First check for duplicates explicitly
        const existingApi = await AiApi.findOne({ name: name.trim() });
        if (existingApi) {
            return res.status(409).json({
                message: 'An API with this name already exists',
                code: 'DUPLICATE_NAME'
            });
        }

        // Create new API
        const api = new AiApi({
            name: name.trim(),
            endpoint: parseCurlCommand(curlCommand).endpoint,
            curlCommand,
            headers: parseCurlCommand(curlCommand).headers,
            method: parseCurlCommand(curlCommand).method,
            requestPath: requestPath.trim(),
            responsePath: responsePath.trim()
        });

        await api.save();
        res.status(201).json(api);
    } catch (err) {
        console.error('Error saving API:', err);
        
        // Handle different types of errors
        if (err.code === 'DUPLICATE_NAME' || err.message === 'DUPLICATE_NAME' || err.code === 11000) {
            return res.status(409).json({
                message: 'An API with this name already exists',
                code: 'DUPLICATE_NAME'
            });
        }

        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Invalid API data provided',
                details: Object.values(err.errors).map(e => e.message)
            });
        }

        res.status(500).json({ 
            message: 'Failed to save API configuration',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Toggle API active status
router.patch('/ai-apis/:id/toggle', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        if (typeof req.body.isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive must be a boolean' });
        }

        console.log('Toggling API:', {
            id: req.params.id,
            isActive: req.body.isActive
        });

        const api = await AiApi.findByIdAndUpdate(
            req.params.id,
            { isActive: req.body.isActive },
            { new: true }
        );
        
        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }

        console.log('API status updated:', {
            id: api._id,
            name: api.name,
            isActive: api.isActive
        });

        res.json({
            success: true,
            message: `API ${api.isActive ? 'activated' : 'deactivated'} successfully`,
            api
        });
    } catch (err) {
        console.error('Error toggling API:', err);
        res.status(500).json({ message: 'Failed to update API status' });
    }
});

// Delete API
router.delete('/ai-apis/:id', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const api = await AiApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }

        await api.deleteOne();
        res.json({ message: 'API deleted successfully' });
    } catch (err) {
        console.error('Error deleting API:', err);
        res.status(500).json({ message: 'Failed to delete API' });
    }
});

// Fix duplicate requestBody creation in test endpoint
router.post('/ai-apis/test', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json(createApiResponse(false, 'Admin access required'));
    }

    try {
        const { curlCommand, requestPath, responsePath } = req.body;
        
        if (!curlCommand || !requestPath || !responsePath) {
            return res.status(400).json(createApiResponse(
                false, 
                'cURL command, request path and response path are required'
            ));
        }

        // Parse the curl command
        const { endpoint, headers, method, body } = parseCurlCommand(curlCommand);

        if (!endpoint || !body) {
            return res.status(400).json(createApiResponse(
                false, 
                'Invalid cURL command: Missing endpoint or body'
            ));
        }

        // Create request body using helper
        let requestBody = JSON.parse(JSON.stringify(body));
        requestBody = setValueAtPath(requestBody, requestPath, admin.TEST_MESSAGE);

        console.log('Test request:', {
            endpoint,
            method,
            headers,
            requestBody,
            requestPath,
            responsePath
        });

        const testResponse = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(requestBody)
        });

        const testData = await testResponse.json();

        if (!testResponse.ok) {
            throw new Error(testData?.error?.message || `API responded with status ${testResponse.status}`);
        }

        res.json({
            success: true,
            message: 'API test successful',
            details: {
                statusCode: testResponse.status,
                responseData: testData
            }
        });
    } catch (err) {
        console.error('API test error:', err);
        res.status(400).json(createApiResponse(false, err.message));
    }
});

// Add this new route to get single API details
router.get('/ai-apis/:id', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const api = await AiApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }
        res.json(api);
    } catch (err) {
        console.error('Error fetching API:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update API route
router.put('/ai-apis/:id', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const { name, curlCommand, requestPath, responsePath } = req.body;
        const { endpoint, headers } = parseCurlCommand(curlCommand);

        const api = await AiApi.findByIdAndUpdate(
            req.params.id, 
            {
                name,
                endpoint,
                curlCommand,
                headers,
                requestPath,
                responsePath
            },
            { new: true }
        );

        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }

        res.json(api);
    } catch (err) {
        console.error('Error updating API:', err);
        res.status(500).json({ message: 'Failed to update API' });
    }
});

// Get all image APIs
router.get('/image-apis', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const apis = await ImageApi.find();
        res.json(apis);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update add new image API route
router.post('/image-apis', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('Image API creation request received:', {
        body: req.body,
        user: req.user._id
    });

    try {
        const { name, curlCommand, requestPath, responsePath } = req.body;

        // First check for duplicates explicitly
        const existingApi = await ImageApi.findOne({ name: name.trim() });
        if (existingApi) {
            console.log('Duplicate API name found:', name);
            return res.status(409).json({
                message: 'An Image API with this name already exists',
                code: 'DUPLICATE_NAME'
            });
        }

        // Validation
        if (!name || !curlCommand || !requestPath) {
            return res.status(400).json({ message: 'Name, cURL command, and request path are required' });
        }

        // Parse curl command
        console.log('Parsing cURL command');
        let parsedCurl;
        try {
            parsedCurl = parseCurlCommand(curlCommand);
            if (!parsedCurl.endpoint) {
                throw new Error('No endpoint found in cURL command');
            }
        } catch (parseErr) {
            console.error('cURL parsing error:', parseErr);
            return res.status(400).json({ message: 'Invalid cURL command: ' + parseErr.message });
        }

        const { endpoint, headers, method } = parsedCurl;

        const api = new ImageApi({
            name: name.trim(),
            endpoint,
            curlCommand,
            headers,
            method,
            requestPath,
            responsePath: responsePath || ''
        });

        await api.save();
        
        console.log('Image API saved successfully:', {
            id: api._id,
            name: api.name
        });
        
        res.status(201).json(api);
    } catch (err) {
        console.error('Error saving Image API:', {
            error: err.message,
            stack: err.stack,
            type: err.name
        });

        // Enhanced error handling
        if (err.message === 'DUPLICATE_NAME' || err.code === 11000) {
            return res.status(409).json({
                message: 'An Image API with this name already exists',
                code: 'DUPLICATE_NAME'
            });
        }

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Invalid Image API data',
                details: Object.values(err.errors).map(e => e.message)
            });
        }

        res.status(500).json({ 
            message: 'Failed to save Image API',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Remove duplicate setValueAtPath function as it's now in adminHelpers
router.post('/image-apis/test', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json(createApiResponse(false, 'Admin access required'));
    }

    try {
        const { curlCommand, requestPath, responsePath } = req.body;
        
        if (!curlCommand || !requestPath) {
            return res.status(400).json(createApiResponse(false, 'cURL command and request path are required'));
        }

        const { endpoint, headers, method, body: parsedBody } = parseCurlCommand(curlCommand);
        let requestBody = JSON.parse(JSON.stringify(parsedBody || {}));
        requestBody = setValueAtPath(requestBody, requestPath, admin.TEST_MESSAGE);

        console.log('Sending test request:', {
            endpoint,
            method,
            requestBody: JSON.stringify(requestBody, null, 2)
        });

        const testResponse = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Test response received:', {
            status: testResponse.status,
            contentType: testResponse.headers.get('content-type'),
            ok: testResponse.ok
        });

        // Handle response based on whether a response path is provided
        if (!responsePath) {
            // Binary response expected
            const buffer = await testResponse.buffer();
            console.log('Binary response received:', {
                length: buffer.length,
                contentType: testResponse.headers.get('content-type')
            });

            if (!buffer.length) {
                throw new Error('No binary data received');
            }

            res.json({
                success: true,
                message: 'Image API test successful (Binary response)',
                details: {
                    statusCode: testResponse.status,
                    contentType: testResponse.headers.get('content-type'),
                    dataLength: buffer.length
                }
            });
        } else {
            // JSON response expected
            const data = await testResponse.json();
            console.log('JSON response received:', {
                dataKeys: Object.keys(data),
                status: testResponse.status
            });

            if (!testResponse.ok) {
                throw new Error(data?.error?.message || `API responded with status ${testResponse.status}`);
            }

            res.json({
                success: true,
                message: 'Image API test successful (JSON response)',
                details: {
                    statusCode: testResponse.status,
                    responseData: data
                }
            });
        }
    } catch (err) {
        console.error('Test error:', {
            error: err.message,
            stack: err.stack,
            type: err.name
        });

        res.status(400).json(createApiResponse(false, err.message));
    }
});

// Get image styles and sizes
router.get('/image-apis/:id/config', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const api = await ImageApi.findById(req.params.id);
        if (!api) return res.status(404).json({ message: 'API not found' });

        res.json({
            supportedSizes: api.supportedSizes,
            supportedStyles: api.supportedStyles
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update image styles
router.put('/image-apis/:id/styles', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const { styles } = req.body;
        if (!Array.isArray(styles)) {
            return res.status(400).json({ message: 'Styles must be an array' });
        }

        const api = await ImageApi.findByIdAndUpdate(
            req.params.id,
            { $set: { supportedStyles: styles } },
            { new: true }
        );

        if (!api) return res.status(404).json({ message: 'API not found' });
        res.json(api.supportedStyles);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update styles' });
    }
});

// Update image sizes
router.put('/image-apis/:id/sizes', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const { sizes } = req.body;
        if (!Array.isArray(sizes)) {
            return res.status(400).json({ message: 'Sizes must be an array' });
        }

        const api = await ImageApi.findByIdAndUpdate(
            req.params.id,
            { $set: { supportedSizes: sizes } },
            { new: true }
        );

        if (!api) return res.status(404).json({ message: 'API not found' });
        res.json(api.supportedSizes);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update sizes' });
    }
});

// Get global image settings
router.get('/image-settings/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        let settings = await ImageSettings.findOne({ type: req.params.type });
        if (!settings) {
            settings = new ImageSettings({
                type: req.params.type,
                values: []
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update image settings with proper validation
router.put('/image-settings/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json(createApiResponse(false, 'Admin access required'));
    }

    try {
        const { type } = req.params;
        if (!admin.SUPPORTED_IMAGE_TYPES.includes(type)) {
            return res.status(400).json(createApiResponse(false, 'Invalid settings type'));
        }

        console.log('Processing settings update:', {
            type,
            valuesCount: req.body.values?.length
        });

        const processedValues = processImageSettings(type, req.body.values);
        
        console.log('Processed values:', processedValues);

        const settings = await ImageSettings.findOneAndUpdate(
            { type },
            { 
                $set: { 
                    values: processedValues,
                    updatedAt: new Date()
                }
            },
            { 
                new: true, 
                upsert: true,
                runValidators: true // Important: Enable schema validation
            }
        );

        res.json(createApiResponse(true, 'Settings updated successfully', settings));
    } catch (err) {
        console.error('Error saving settings:', err);
        res.status(500).json(createApiResponse(false, err.message || 'Failed to save settings'));
    }
});

// Get voice settings
router.get('/voice-settings/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    try {
        const { type } = req.params;
        if (!['speed', 'pitch'].includes(type)) {
            return res.status(400).json({ message: 'Invalid settings type' });
        }

        let settings = await VoiceSettings.findOne({ type });
        if (!settings) {
            // Create default settings if none exist
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

// Update voice settings with proper validation
router.put('/voice-settings/:type', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json(createApiResponse(false, 'Admin access required'));
    }

    try {
        const { type } = req.params;
        if (!admin.SUPPORTED_VOICE_TYPES.includes(type)) {
            return res.status(400).json(createApiResponse(false, 'Invalid settings type'));
        }

        const { range } = req.body;
        validateVoiceRange(range);

        const settings = await VoiceSettings.findOneAndUpdate(
            { type },
            { 
                $set: { 
                    range,
                    updatedAt: new Date()
                }
            },
            { new: true, upsert: true }
        );

        res.json(createApiResponse(true, 'Settings updated successfully', settings));
    } catch (err) {
        console.error('Error saving voice settings:', err);
        res.status(500).json(createApiResponse(false, err.message));
    }
});

module.exports = router;
