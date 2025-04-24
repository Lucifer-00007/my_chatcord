const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VoiceApi = require('../models/VoiceApi');
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../utils/apiHelpers');  // Add this line

router.post('/generate', auth, async (req, res) => {
    console.log('Voice generation request:', {
        body: req.body,
        user: req.user._id,
        timestamp: new Date().toISOString()
    });

    try {
        const { apiId, voice, text, speed, pitch } = req.body;

        // Validate inputs
        if (!apiId || !voice || !text) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        // Get API configuration
        const api = await VoiceApi.findById(apiId);
        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'Voice API not found or inactive' });
        }

        // Parse the curl command and get request info
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

        // Set the text at the final path
        const lastPart = pathParts[pathParts.length - 1];
        const lastMatch = lastPart.match(/(\w+)\[(\d+)\]/);
        if (lastMatch) {
            const [_, prop, index] = lastMatch;
            if (!current[prop]) current[prop] = [];
            current[prop][parseInt(index)] = text;
        } else {
            current[lastPart] = text;
        }

        // Add voice settings
        requestBody.voice = voice;
        requestBody.speed = speed;
        requestBody.pitch = pitch;

        console.log('Making voice request:', {
            url: endpoint,
            method,
            bodyLength: JSON.stringify(requestBody).length,
            voice,
            textLength: text.length
        });

        // Make the request with proper error handling
        try {
            const response = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error details available');
                throw new Error(`Voice API responded with status ${response.status}: ${errorText}`);
            }

            // Get response type and handle accordingly
            const contentType = response.headers.get('content-type');
            console.log('Response content type:', contentType);

            let audioData;
            let audioContentType = 'audio/mpeg';

            switch (api.responseType) {
                case 'binary':
                    audioData = await response.buffer();
                    audioContentType = contentType?.includes('audio/') ? contentType : 'audio/mpeg';
                    break;

                case 'base64':
                    const jsonData = await response.json();
                    let base64Content = jsonData;
                    
                    // Extract base64 data using response path if specified
                    if (api.responsePath) {
                        for (const part of api.responsePath.split('.')) {
                            base64Content = base64Content[part];
                        }
                    }

                    if (!base64Content) {
                        throw new Error('No base64 audio data found in response');
                    }

                    // Remove data URI prefix if present
                    const base64Data = base64Content.replace(/^data:audio\/[^;]+;base64,/, '');
                    audioData = Buffer.from(base64Data, 'base64');
                    break;

                case 'url':
                    const urlData = await response.json();
                    let audioUrl = urlData;
                    
                    // Extract URL using response path if specified
                    if (api.responsePath) {
                        for (const part of api.responsePath.split('.')) {
                            audioUrl = audioUrl[part];
                        }
                    }

                    if (!audioUrl) {
                        throw new Error('No audio URL found in response');
                    }

                    // Fetch audio from URL
                    const audioResponse = await fetch(audioUrl);
                    if (!audioResponse.ok) {
                        throw new Error(`Failed to fetch audio from URL: ${audioResponse.status}`);
                    }

                    audioData = await audioResponse.buffer();
                    audioContentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
                    break;

                default:
                    throw new Error(`Unsupported response type: ${api.responseType}`);
            }

            // Validate audio data
            if (!audioData || audioData.length === 0) {
                throw new Error('No audio data received');
            }

            // Set appropriate headers and send response
            res.set('Content-Type', audioContentType);
            res.set('Content-Length', audioData.length);
            res.set('Accept-Ranges', 'bytes');
            res.set('Cache-Control', 'no-cache');
            return res.send(audioData);

        } catch (fetchError) {
            console.error('Fetch error:', {
                error: fetchError.message,
                status: fetchError.status,
                type: fetchError.type
            });
            throw new Error(`Failed to get voice response: ${fetchError.message}`);
        }
    } catch (err) {
        console.error('Voice generation error:', {
            error: err.message,
            stack: err.stack
        });
        res.status(500).json({ 
            message: err.message || 'Failed to generate voice audio' 
        });
    }
});

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
