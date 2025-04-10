const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth'); // Add this line
const ImageApi = require('../../models/ImageApi');
const ImageSettings = require('../../models/ImageSettings'); // Add this line if missing
const { parseCurlCommand } = require('../../utils/apiHelpers');

// Get all image APIs
router.get('/', async (req, res) => {
    try {
        const apis = await ImageApi.find();
        res.json(apis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single image API
router.get('/:id', async (req, res) => {
    try {
        const api = await ImageApi.findById(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'Image API not found' });
        }
        res.json(api);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new image API
router.post('/', async (req, res) => {
    try {
        const existingApi = await ImageApi.findOne({ name: req.body.name });
        if (existingApi) {
            return res.status(400).json({ 
                code: 'DUPLICATE_NAME',
                message: `An API named "${req.body.name}" already exists` 
            });
        }

        const imageApi = new ImageApi(req.body);
        const savedApi = await imageApi.save();
        res.status(201).json(savedApi);
    } catch (err) {
        res.status(400).json({ 
            message: err.message,
            code: err.code === 11000 ? 'DUPLICATE_NAME' : 'ERROR'
        });
    }
});

// Update image API
router.put('/:id', async (req, res) => {
    try {
        const api = await ImageApi.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!api) {
            return res.status(404).json({ message: 'Image API not found' });
        }
        res.json(api);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete image API
router.delete('/:id', async (req, res) => {
    try {
        const api = await ImageApi.findByIdAndDelete(req.params.id);
        if (!api) {
            return res.status(404).json({ message: 'Image API not found' });
        }
        res.json({ message: 'Image API deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle image API active status
router.patch('/:id/toggle', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        if (typeof req.body.isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive must be a boolean' });
        }

        console.log('Toggling Image API:', {
            id: req.params.id,
            isActive: req.body.isActive
        });

        const api = await ImageApi.findByIdAndUpdate(
            req.params.id,
            { isActive: req.body.isActive },
            { new: true }
        );

        if (!api) {
            return res.status(404).json({ message: 'Image API not found' });
        }

        console.log('Image API status updated:', {
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
        console.error('Error toggling Image API:', err);
        res.status(500).json({ message: 'Failed to update API status' });
    }
});

// Test image API endpoint
router.post('/test', async (req, res) => {
    try {
        const { curlCommand, requestPath, responsePath } = req.body;
        
        if (!curlCommand || !requestPath) {
            return res.status(400).json({ 
                success: false, 
                message: 'cURL command and request path are required' 
            });
        }

        // Parse cURL command
        const curlData = parseCurlCommand(curlCommand);

        // Make test request
        const testResponse = await fetch(curlData.url, {
            method: curlData.method,
            headers: curlData.headers,
            body: curlData.body ? JSON.stringify(curlData.body) : undefined
        });

        if (!testResponse.ok) {
            throw new Error(`API request failed with status ${testResponse.status}`);
        }

        const contentType = testResponse.headers.get('content-type');
        let responseData = 'Response received successfully';

        if (contentType?.includes('application/json')) {
            const jsonData = await testResponse.json();
            responseData = 'JSON response received successfully';
        } else if (contentType?.includes('image/')) {
            responseData = 'Image data received successfully';
        }

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
            message: err.message || 'Failed to test image API'
        });
    }
});

// Update global settings routes
router.get('/settings/sizes', auth, async (req, res) => {
    try {
        console.log('Fetching size settings...');
        const settings = await ImageSettings.findOne({ type: 'sizes' });
        
        if (!settings || !settings.values) {
            console.log('No size settings found');
            return res.json({ values: [] });
        }

        console.log(`Found ${settings.values.length} sizes`);
        res.json({ values: settings.values });
    } catch (err) {
        console.error('Error loading sizes:', err);
        res.status(500).json({ message: 'Failed to load size settings' });
    }
});

router.get('/settings/styles', auth, async (req, res) => {
    try {
        console.log('Fetching style settings...');
        const settings = await ImageSettings.findOne({ type: 'styles' });
        
        if (!settings || !settings.values) {
            console.log('No style settings found');
            return res.json({ values: [] });
        }

        console.log(`Found ${settings.values.length} styles`);
        res.json({ values: settings.values });
    } catch (err) {
        console.error('Error loading styles:', err);
        res.status(500).json({ message: 'Failed to load style settings' });
    }
});

// Add debug route
router.get('/debug/settings', async (req, res) => {
    try {
        const apis = await ImageApi.find();
        res.json({
            totalApis: apis.length,
            apiDetails: apis.map(api => ({
                name: api.name,
                sizeCount: api.supportedSizes?.length || 0,
                styleCount: api.supportedStyles?.length || 0
            }))
        });
    } catch (err) {
        res.status(500).json({ message: 'Debug query failed', error: err.message });
    }
});

module.exports = router;
