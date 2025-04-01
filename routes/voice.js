const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VoiceApi = require('../models/VoiceApi');
const TokenManager = require('../services/tokenManager');
const { VOICE_API_CONFIG } = require('../config/constants');

router.post('/generate', auth, async (req, res) => {
    try {
        const { text, apiId, voice, language, speed, pitch } = req.body;
        
        // Validate required fields
        if (!text || !apiId || !voice) {
            return res.status(400).json({ 
                message: 'Missing required fields: text, apiId, and voice are required' 
            });
        }

        // Find and validate API
        const api = await VoiceApi.findById(apiId);
        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'Voice API not found or inactive' });
        }

        // Handle authentication if needed
        let headers = { ...api.headers };
        if (api.apiType === 'hearing') {
            try {
                const token = await TokenManager.getToken(api);
                headers['Authorization'] = `Bearer ${token}`;
            } catch (authErr) {
                console.error('Authentication error:', authErr);
                return res.status(401).json({ message: 'Authentication failed' });
            }
        }

        // Extract endpoint URL from curlCommand
        const urlMatch = api.curlCommand.match(/['"](https?:\/\/[^'"\s]+)['"]/);
        if (!urlMatch) {
            return res.status(400).json({ message: 'Invalid API configuration: No valid URL found' });
        }
        const endpoint = urlMatch[1];

        // Prepare request body
        let requestBody;
        try {
            requestBody = await buildRequestBody(api, { text, voice, language, speed, pitch });
        } catch (err) {
            console.error('Error building request body:', err);
            return res.status(422).json({ message: 'Failed to build request body: ' + err.message });
        }

        // Log request details for debugging
        console.log('Making voice API request:', {
            endpoint,
            method: api.requestMethod || 'POST',
            headerKeys: Object.keys(headers),
            requestBody
        });

        // Make request to voice API
        const response = await fetch(endpoint, {
            method: api.requestMethod || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(requestBody) // Send requestBody directly, not nested
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('API Response Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorBody
            });
            throw new Error(`API request failed: ${response.statusText}`);
        }

        // Set response type based on API configuration
        const contentType = response.headers.get('Content-Type');
        res.set('Content-Type', contentType || 'audio/mpeg');

        // Handle different response types
        switch (api.responseType) {
            case 'binary':
                const arrayBuffer = await response.arrayBuffer();
                return res.send(Buffer.from(arrayBuffer));

            case 'base64':
                const data = await response.json();
                try {
                    const base64Data = extractFromPath(data, api.responsePath);
                    if (!base64Data) {
                        throw new Error('No audio data found in response');
                    }
                    return res.send(Buffer.from(base64Data, 'base64'));
                } catch (err) {
                    console.error('Base64 decode error:', err);
                    return res.status(422).json({ message: 'Failed to decode audio data' });
                }

            case 'decoded_base64':
            case 'url':
                return res.json(await response.json());

            default:
                throw new Error('Unsupported response type');
        }
    } catch (err) {
        console.error('Voice generation error:', err);
        const statusCode = err.status || 500;
        res.status(statusCode).json({ 
            message: err.message || 'Failed to generate voice audio',
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Add test endpoint
router.post('/test', auth, async (req, res) => {
    try {
        const { curlCommand, requestPath, responsePath, apiType, responseType, auth } = req.body;

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
        
        // Make test request
        const testResponse = await fetch(curlData.url, {
            method: curlData.method,
            headers: curlData.headers,
            ...(curlData.body && { body: JSON.stringify(curlData.body) })
        });

        // Get response data
        let responseData;
        const contentType = testResponse.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await testResponse.json();
        } else if (contentType && contentType.includes('text')) {
            responseData = await testResponse.text();
        } else {
            // For binary responses, just confirm we got a response
            responseData = 'Binary data received';
        }

        console.log('Test response:', {
            status: testResponse.status,
            contentType,
            hasData: !!responseData
        });

        res.json({
            success: true,
            message: 'API test completed successfully',
            details: {
                statusCode: testResponse.status,
                statusText: testResponse.statusText,
                contentType: contentType,
                hasData: !!responseData,
                apiType,
                responseType
            }
        });

    } catch (err) {
        console.error('Voice API test error:', err);
        res.status(400).json({ 
            success: false, 
            message: err.message || 'Failed to test Voice API connection' 
        });
    }
});

// Helper function to parse cURL command
function parseCurlCommand(curlCommand) {
    try {
        const cleaned = curlCommand.trim().replace(/\\\n/g, ' ');
        
        // Extract URL
        const urlMatch = cleaned.match(/['"]?(https?:\/\/[^'">\s]+)['"]?/);
        if (!urlMatch) {
            throw new Error('No valid URL found');
        }
        const url = urlMatch[1];

        // Extract method
        const methodMatch = cleaned.match(/-X\s+(['"]?\w+['"]?)/i);
        const method = (methodMatch ? methodMatch[1].replace(/['"]/g, '') : 'POST');

        // Extract headers
        const headers = {};
        const headerPattern = /--header\s+['"]([^:]+):\s*([^'"]+)['"]/g;
        let headerMatch;
        while ((headerMatch = headerPattern.exec(cleaned)) !== null) {
            headers[headerMatch[1].trim()] = headerMatch[2].trim();
        }

        // Extract and parse JSON body with improved error handling
        let body = null;
        const bodyMatch = cleaned.match(/--data\s+['"]({[\s\S]*?})['"]|--data-raw\s+['"]({[\s\S]*?})['"]/);
        if (bodyMatch) {
            try {
                const jsonStr = bodyMatch[1] || bodyMatch[2];
                // Remove escaped quotes and newlines before parsing
                const cleanJson = jsonStr
                    .replace(/\\"/g, '"')
                    .replace(/\\\//g, '/')
                    .replace(/\\n/g, '\n');
                body = JSON.parse(cleanJson);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Invalid JSON in curl command: ' + parseError.message);
            }
        }

        return { url, method, headers, body };
    } catch (err) {
        throw new Error(`Failed to parse cURL command: ${err.message}`);
    }
}

function extractFromPath(data, path) {
    try {
        return path.split('.').reduce((obj, key) => {
            if (obj === null || obj === undefined) {
                throw new Error(`Cannot read property '${key}' of ${obj}`);
            }
            return obj[key];
        }, data);
    } catch (err) {
        console.error('Path extraction error:', err);
        return null;
    }
}

async function buildRequestBody(api, params) {
    try {
        // Parse the curl command to get the original request structure
        const { body: templateBody } = parseCurlCommand(api.curlCommand);
        if (!templateBody) {
            throw new Error('No valid request body template found in curl command');
        }

        // Create a deep copy of the template body
        let requestBody = JSON.parse(JSON.stringify(templateBody));

        // Get the request path components
        const pathComponents = api.requestPath.split('.');

        // Function to set value in nested object
        const setNestedValue = (obj, path, value) => {
            let current = obj;
            for (let i = 0; i < path.length - 1; i++) {
                if (current[path[i]] === undefined) {
                    current[path[i]] = {};
                }
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
        };

        // Map the parameters to the request body structure
        Object.entries(params).forEach(([key, value]) => {
            if (value != null) {
                switch (key) {
                    case 'text':
                        setNestedValue(requestBody, [...pathComponents], value);
                        break;
                    case 'voice':
                        if (templateBody.voice !== undefined) {
                            requestBody.voice = value;
                        }
                        break;
                    case 'speed':
                        if (templateBody.speed !== undefined) {
                            requestBody.speed = value;
                        }
                        break;
                    case 'pitch':
                        if (templateBody.pitch !== undefined) {
                            requestBody.pitch = value;
                        }
                        break;
                    // Add more parameter mappings as needed
                }
            }
        });

        // Preserve any default values from the template that weren't overwritten
        const preserveDefaults = (template, target) => {
            Object.entries(template).forEach(([key, value]) => {
                if (target[key] === undefined) {
                    if (typeof value === 'object' && value !== null) {
                        target[key] = {};
                        preserveDefaults(value, target[key]);
                    } else {
                        target[key] = value;
                    }
                }
            });
        };

        preserveDefaults(templateBody, requestBody);

        console.log('Built request body:', requestBody);
        return requestBody;
    } catch (err) {
        console.error('Error building request body:', err);
        throw new Error('Failed to build request body: ' + err.message);
    }
}

function setValueAtPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    return obj;
}

module.exports = router;
