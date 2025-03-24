const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AiApi = require('../models/AiApi');
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../utils/apiHelpers');  // Add this line

router.post('/chat', auth, async (req, res) => {
    try {
        const { message, apiId } = req.body;

        if (!message || !apiId) {
            return res.status(400).json({ message: 'Message and API ID are required' });
        }

        // Get API configuration
        const api = await AiApi.findById(apiId);
        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'API not found or inactive' });
        }

        console.log('Using API:', {
            name: api.name,
            endpoint: api.endpoint
        });

        // Parse the stored curl command to get headers and body structure
        const { headers, body } = parseCurlCommand(api.curlCommand);

        // Create request body using the template from curl command
        const requestBody = { ...body };
        
        // Set the user's message using the requestPath
        let current = requestBody;
        const pathParts = api.requestPath.split('.');
        
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const match = part.match(/(\w+)\[(\d+)\]/);
            
            if (match) {
                const [_, prop, index] = match;
                if (i === pathParts.length - 1) {
                    current[prop][index] = message;
                } else {
                    current = current[prop][index];
                }
            } else {
                if (i === pathParts.length - 1) {
                    current[part] = message;
                } else {
                    current = current[part];
                }
            }
        }

        console.log('Sending request:', {
            endpoint: api.endpoint,
            body: requestBody
        });

        // Send request to AI API
        const aiResponse = await fetch(api.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        const data = await aiResponse.json();
        console.log('Received response:', data);

        if (!aiResponse.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }

        // Extract response using responsePath
        let response = data;
        const responseParts = api.responsePath.split('.');
        
        for (const part of responseParts) {
            const match = part.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const [_, prop, index] = match;
                response = response[prop]?.[index];
            } else {
                response = response[part];
            }
            
            if (response === undefined) {
                throw new Error('Could not extract response from API result');
            }
        }

        res.json({ response });
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ message: err.message || 'Failed to get AI response' });
    }
});

module.exports = router;
