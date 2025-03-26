const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VoiceApi = require('../models/VoiceApi');
const TokenManager = require('../services/tokenManager');

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

function extractFromPath(data, path) {
    return path.split('.').reduce((obj, key) => obj[key], data);
}

function buildRequestBody(api, params) {
    // ... Build request body based on API path
}

module.exports = router;
