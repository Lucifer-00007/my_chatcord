const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const AiApi = require('../models/AiApi');
const fetch = require('node-fetch');  // Add this import at the top

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

// Add new AI API
router.post('/ai-apis', auth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const { name, curlCommand } = req.body;
        // Parse curl command to extract endpoint and headers
        const { endpoint, headers } = parseCurlCommand(curlCommand);

        const api = new AiApi({
            name,
            endpoint,
            curlCommand,
            headers
        });

        await api.save();
        res.status(201).json(api);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
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
        const { curlCommand } = req.body;
        const responsePath = req.body.responsePath || 'choices[0].message.content';
        const requestPath = req.body.requestPath || 'messages[0].content';  // Get request path
        
        if (!curlCommand) {
            return res.status(400).json({ message: 'cURL command is required' });
        }

        // Parse the curl command
        const { endpoint, headers, method, body } = parseCurlCommand(curlCommand);

        if (!endpoint) {
            return res.status(400).json({ message: 'Invalid cURL command: No endpoint found' });
        }

        if (!body) {
            return res.status(400).json({ message: 'Invalid cURL command: No request body found' });
        }

        // Extract request data using the request path
        let requestValue = body;
        const requestParts = requestPath.split('.');
        
        for (const part of requestParts) {
            const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                const [_, prop, index] = arrayMatch;
                requestValue = requestValue[prop]?.[index];
            } else {
                requestValue = requestValue[part];
            }
            
            if (requestValue === undefined) break;
        }

        // Log both request path and data
        console.log('Request path data:', {
            path: requestPath,
            extractedValue: requestValue
        });

        // Log request details for debugging with response path
        console.log('Test request:', {
            endpoint,
            method,
            headers,
            body,
            requestPath,  // Add request path to log
            responsePath
        });

        // Send test request to the API using the exact parsed body
        const testResponse = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(body)
        });

        const testData = await testResponse.json();

        // Extract response data using the response path
        let responseValue = testData;
        const pathParts = responsePath.split('.');
        
        for (const part of pathParts) {
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

// Helper function to parse curl command
function parseCurlCommand(curlCommand) {
    try {
        // Remove newlines and extra spaces
        const normalizedCommand = curlCommand.replace(/\\\s*\n/g, ' ').trim();
        
        // Extract URL - handle both --location and standard curl format
        const urlMatch = normalizedCommand.match(/curl\s+(?:--location\s+)?['"]([^'"]+)['"]/);
        const endpoint = urlMatch ? urlMatch[1] : null;

        // Extract headers
        const headers = {};
        const headerMatches = normalizedCommand.matchAll(/--header\s+['"]([^:]+):\s*([^'"]+)['"]/g);
        for (const match of headerMatches) {
            headers[match[1].trim()] = match[2].trim();
        }

        // Extract method (default to POST if not specified)
        const methodMatch = normalizedCommand.match(/--request\s+(['"]?)(\w+)\1/);
        const method = methodMatch ? methodMatch[2] : 'POST';

        // Extract body data - more flexible pattern
        const dataPattern = /--data\s+['"]({[\s\S]*?})['"]\s*$/;
        const dataMatch = normalizedCommand.match(dataPattern);
        let body = null;
        
        if (dataMatch) {
            try {
                const bodyContent = dataMatch[1]
                    .replace(/\\"/g, '"')  // Replace escaped quotes
                    .replace(/\\\n\s*/g, '') // Remove escaped newlines and spaces
                    .trim();
                body = JSON.parse(bodyContent);

                // Ensure required fields are present
                if (!body.model || !body.messages) {
                    throw new Error('Request body must contain model and messages fields');
                }
            } catch (e) {
                console.error('Error parsing body JSON:', e);
                throw new Error('Invalid JSON in request body: ' + e.message);
            }
        } else {
            throw new Error('No request body found in cURL command');
        }

        // Log the parsed data for debugging
        console.log('Parsed cURL command:', {
            endpoint,
            method,
            headers,
            body
        });

        return { endpoint, headers, method, body };
    } catch (err) {
        console.error('Error parsing cURL command:', err);
        throw new Error('Invalid cURL command format: ' + err.message);
    }
}

module.exports = router;
