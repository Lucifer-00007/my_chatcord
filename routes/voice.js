const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VoiceApi = require('../models/VoiceApi');
const fetch = require('node-fetch');

router.post('/generate', auth, async (req, res) => {
    try {
        const { apiId, voice, text, speed, pitch, preview } = req.body;

        // Validate inputs
        if (!apiId || !voice || !text) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        // Get API configuration
        const api = await VoiceApi.findById(apiId);
        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'Voice API not found or inactive' });
        }

        // Construct request body
        let requestBody = {
            text: text,
            voice: voice,
            speed: speed || 1.0,
            pitch: pitch || 1.0,
            preview: preview || false
        };

        // Make request to voice API
        const response = await fetch(api.endpoint, {
            method: 'POST',
            headers: api.headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        // Handle response based on API type
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Voice generation error:', err);
        res.status(500).json({ message: err.message || 'Failed to generate voice' });
    }
});

// Test voice API endpoint
router.post('/test', auth, async (req, res) => {
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
                headers: curlData.headers,
                body: curlData.body ? JSON.stringify(curlData.body) : undefined
            });

            // Handle different response status codes
            if (testResponse.status === 524) {
                throw new Error('API timeout - The server took too long to respond');
            }

            if (!testResponse.ok) {
                throw new Error(`API request failed with status ${testResponse.status}: ${testResponse.statusText}`);
            }

            // Get response data based on content type and responseType
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
                    for (const part of responsePath.split('.')) {
                        audioUrl = audioUrl[part];
                    }
                }
                responseData = `Audio URL received: ${audioUrl}`;
            } else {
                responseData = await testResponse.text();
            }

            console.log('Test completed successfully:', {
                status: testResponse.status,
                contentType,
                responseType,
                dataPreview: typeof responseData === 'string' ? 
                    responseData.substring(0, 100) : 'Binary data'
            });

            res.json({
                success: true,
                message: 'API test completed successfully',
                details: {
                    statusCode: testResponse.status,
                    statusText: testResponse.statusText,
                    contentType,
                    responseType,
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
