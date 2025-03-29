const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VoiceApi = require('../models/VoiceApi');
const TokenManager = require('../services/tokenManager');
const { VOICE_API_CONFIG } = require('../config/constants');

router.post('/generate', auth, async (req, res) => {
    try {
        const { text, apiId, voice, language, speed, pitch } = req.body;
        const api = await VoiceApi.findById(apiId);

        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'Voice API not found or inactive' });
        }

        // Handle authentication if needed
        let headers = { ...api.headers };
        if (api.apiType === 'hearing') {
            const token = await TokenManager.getToken(api);
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Prepare request
        let requestBody = {};
        if (api.requestMethod === 'POST') {
            requestBody = await buildRequestBody(api, { text, voice, language, speed, pitch });
        }

        // Make request
        const response = await fetch(api.endpoint, {
            method: api.requestMethod,
            headers,
            ...(api.requestMethod === 'POST' && { body: JSON.stringify(requestBody) })
        });

        // Handle response based on type
        switch (api.responseType) {
            case 'binary':
                const buffer = await response.buffer();
                res.set('Content-Type', 'audio/mpeg');
                return res.send(buffer);

            case 'base64':
                const data = await response.json();
                const base64Data = extractFromPath(data, api.responsePath);
                res.set('Content-Type', 'audio/mpeg');
                return res.send(Buffer.from(base64Data, 'base64'));

            case 'decoded_base64':
                const decodedData = await response.json();
                const audioData = extractFromPath(decodedData, api.responsePath);
                return res.json({ audioData });

            case 'url':
                const urlData = await response.json();
                const audioUrl = extractFromPath(urlData, api.responsePath);
                return res.json({ audioUrl });

            default:
                throw new Error('Unsupported response type');
        }
    } catch (err) {
        console.error('Voice generation error:', err);
        res.status(500).json({ message: err.message });
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

        // Extract body based on content type
        let body = null;
        if (headers['Content-Type']?.includes('json')) {
            const bodyMatch = cleaned.match(/--data\s+['"]({[\s\S]*?})['"]|--data-raw\s+['"]({[\s\S]*?})['"]/);
            if (bodyMatch) {
                body = JSON.parse(bodyMatch[1] || bodyMatch[2]);
            }
        } else if (headers['Content-Type']?.includes('form')) {
            const formData = {};
            const formPattern = /--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]/g;
            let formMatch;
            while ((formMatch = formPattern.exec(cleaned)) !== null) {
                formData[formMatch[1]] = formMatch[2];
            }
            body = formData;
        }

        return { url, method, headers, body };
    } catch (err) {
        throw new Error(`Failed to parse cURL command: ${err.message}`);
    }
}

function extractFromPath(data, path) {
    return path.split('.').reduce((obj, key) => obj[key], data);
}

async function buildRequestBody(api, params) {
    try {
        const providerConfig = VOICE_API_CONFIG.voiceProviders[api.apiType];
        if (!providerConfig) {
            throw new Error(`Unsupported API type: ${api.apiType}`);
        }

        // Build base request body using provider configuration
        let requestBody = {
            ...providerConfig.defaults
        };

        // Map parameters to provider-specific keys
        if (params.text && providerConfig.textKey) {
            requestBody[providerConfig.textKey] = params.text;
        }
        if (params.voice && providerConfig.voiceKey) {
            requestBody[providerConfig.voiceKey] = params.voice;
        }
        if (params.speed && providerConfig.speedKey) {
            requestBody[providerConfig.speedKey] = parseFloat(params.speed);
        }
        if (params.language && providerConfig.languageKey) {
            requestBody[providerConfig.languageKey] = params.language;
        }

        // Handle provider-specific parameters
        if (api.customParams) {
            requestBody = {
                ...requestBody,
                ...api.customParams
            };
        }

        // If custom request path is provided, nest the body accordingly
        if (api.requestPath) {
            const paths = api.requestPath.split('.');
            return setValueAtPath({}, paths, requestBody);
        }

        console.log('Built request body:', requestBody);
        return requestBody;
    } catch (err) {
        console.error('Error building request body:', err);
        throw new Error('Failed to build request body');
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
