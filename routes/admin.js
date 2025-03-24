const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const AiApi = require('../models/AiApi');
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../utils/apiHelpers');  // Add this line

// Add stats endpoint at the top of the file
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

// Get all AI APIs
router.get('/ai-apis', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const apis = await AiApi.find();
        res.json(apis);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add new route to get active APIs only
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
        const { isActive } = req.body;
        await AiApi.findByIdAndUpdate(req.params.id, { isActive });
        res.json({ message: 'API updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
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

// Update test API endpoint
router.post('/ai-apis/test', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const { curlCommand, requestPath, responsePath } = req.body;
        
        if (!curlCommand || !requestPath || !responsePath) {
            return res.status(400).json({ message: 'cURL command, request path and response path are required' });
        }

        // Parse the curl command
        const { endpoint, headers, method, body } = parseCurlCommand(curlCommand);

        if (!endpoint) {
            return res.status(400).json({ message: 'Invalid cURL command: No endpoint found' });
        }

        if (!body) {
            return res.status(400).json({ message: 'Invalid cURL command: No request body found' });
        }

        // Add a test message to extract using request path
        const testMessage = "This is a test message";
        
        // Create deep copy of body to avoid modifying original
        let requestBody = JSON.parse(JSON.stringify(body));
        
        // Set the test message using the requestPath
        let current = requestBody;
        const pathParts = requestPath.split('.');
        
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            const match = part.match(/(\w+)\[(\d+)\]/);
            
            if (match) {
                const [_, prop, index] = match;
                if (!current[prop]) current[prop] = [];
                if (!current[prop][index]) current[prop][index] = {};
                current = current[prop][index];
            } else {
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        }

        // Set the value at the final path
        const lastPart = pathParts[pathParts.length - 1];
        const lastMatch = lastPart.match(/(\w+)\[(\d+)\]/);
        if (lastMatch) {
            const [_, prop, index] = lastMatch;
            if (!current[prop]) current[prop] = [];
            current[prop][index] = testMessage;
        } else {
            current[lastPart] = testMessage;
        }

        // Log request details
        console.log('Test request:', {
            endpoint,
            method,
            headers,
            requestBody,
            requestPath,
            responsePath
        });

        // Send test request
        const testResponse = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(requestBody)
        });

        const testData = await testResponse.json();

        // Extract response data using the response path
        let responseValue = testData;
        const pathPartsResponse = responsePath.split('.');
        
        for (const part of pathPartsResponse) {
            const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                // Handle array access like messages[0]
                const [_, prop, index] = arrayMatch;
                responseValue = responseValue[prop]?.[index];
            } else {
                // Handle regular property access
                responseValue = responseValue[part];
            }
            
            if (responseValue === undefined) break;
        }

        // Log the extracted response data
        console.log('Response path data:', {
            path: responsePath,
            extractedValue: responseValue
        });

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
        res.status(400).json({ 
            success: false, 
            message: err.message || 'Failed to test API connection' 
        });
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

module.exports = router;
