const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ImageApi = require('../models/ImageApi');
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../utils/apiHelpers');

router.post('/generate', auth, async (req, res) => {
    try {
        const { prompt, apiId, size, style } = req.body;

        if (!prompt || !apiId || !size || !style) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        // Get API configuration
        const api = await ImageApi.findById(apiId);
        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'Image API not found or inactive' });
        }

        const { endpoint, headers, method } = parseCurlCommand(api.curlCommand);

        // Create base request body
        let requestBody = {};
        const pathParts = api.requestPath.split('.');
        let current = requestBody;

        // Handle array notation in path
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
            
            if (arrayMatch) {
                const [_, prop, index] = arrayMatch;
                if (!current[prop]) current[prop] = [];
                if (!current[prop][parseInt(index)]) current[prop][parseInt(index)] = {};
                current = current[prop][parseInt(index)];
            } else {
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        }

        // Set the prompt at the final path
        const lastPart = pathParts[pathParts.length - 1];
        const lastMatch = lastPart.match(/(\w+)\[(\d+)\]/);
        if (lastMatch) {
            const [_, prop, index] = lastMatch;
            if (!current[prop]) current[prop] = [];
            current[prop][parseInt(index)] = prompt;
        } else {
            current[lastPart] = prompt;
        }

        // Add generation config for image settings
        requestBody.generationConfig = {
            responseModalities: ["Text", "Image"]
        };

        console.log('Sending request:', {
            endpoint,
            method,
            requestBody: JSON.stringify(requestBody)
        });

        // Make request to image API
        const response = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(requestBody)
        });

        // Handle response based on API type
        if (!api.responsePath) {
            // Binary response
            const buffer = await response.buffer();
            if (!buffer.length) {
                throw new Error('No image data received');
            }

            // Set appropriate headers for binary response
            res.set('Content-Type', response.headers.get('content-type') || 'image/png');
            return res.send(buffer);
        } else {
            // JSON response
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error?.message || `API responded with status ${response.status}`);
            }

            // Extract image data using response path
            let result = data;
            const pathParts = api.responsePath.split('.');
            for (const part of pathParts) {
                const match = part.match(/(\w+)\[(\d+)\]/);
                if (match) {
                    const [_, prop, index] = match;
                    result = result[prop]?.[index];
                } else {
                    result = result[part];
                }
                
                if (!result) {
                    throw new Error('Failed to extract image data from response');
                }
            }

            // Check if result is base64 encoded
            if (typeof result === 'string' && result.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)) {
                // Convert base64 to buffer
                const imageBuffer = Buffer.from(result, 'base64');
                res.set('Content-Type', 'image/png'); // Set appropriate content type
                return res.send(imageBuffer);
            } else if (result.startsWith('http')) {
                // It's a URL
                return res.json({ imageUrl: result });
            } else {
                throw new Error('Unsupported image data format');
            }
        }
    } catch (err) {
        console.error('Image generation error:', err);
        res.status(500).json({ message: err.message || 'Failed to generate image' });
    }
});

module.exports = router;
