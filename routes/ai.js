const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AiApi = require('../models/AiApi');
const AiChat = require('../models/AiChat'); // Add this line
const fetch = require('node-fetch');
const { parseCurlCommand } = require('../utils/apiHelpers');
const { AI_CONFIG } = require('../config/constants');  // Add this line

// Get user's chat sessions
router.get('/sessions', auth, async (req, res) => {
    try {
        const sessions = await AiChat.find({ 
            user: req.user._id 
        }).sort({ lastUpdated: -1 });
        
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching sessions:', err);
        res.status(500).json({ message: 'Failed to fetch chat sessions' });
    }
});

// Get single chat session
router.get('/sessions/:id', auth, async (req, res) => {
    try {
        const session = await AiChat.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!session) {
            return res.status(404).json({ message: 'Chat session not found' });
        }

        res.json(session);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch chat session' });
    }
});

// Create new chat session
router.post('/sessions', auth, async (req, res) => {
    try {
        const { apiId } = req.body;
        const api = await AiApi.findById(apiId);
        
        if (!api) {
            return res.status(404).json({ message: 'AI API not found' });
        }

        // Create initial system message
        const session = new AiChat({
            title: AI_CONFIG.defaultTitle,
            user: req.user._id,
            apiModel: {
                name: api.name,
                apiId: api._id
            },
            messages: [{
                role: 'system',
                content: AI_CONFIG.initialMessage
            }]
        });

        await session.save();
        res.status(201).json(session);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create chat session' });
    }
});

// Update chat title
router.patch('/sessions/:id/title', auth, async (req, res) => {
    try {
        const { title } = req.body;
        const session = await AiChat.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { title },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ message: 'Chat session not found' });
        }

        res.json(session);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update chat title' });
    }
});

// Modified chat endpoint to save messages to session
router.post('/chat', auth, async (req, res) => {
    try {
        const { message, apiId, sessionId } = req.body;

        // Validate inputs
        if (!message || !apiId) {
            return res.status(400).json({ message: 'Message and API ID are required' });
        }

        // Get or create chat session
        let session = sessionId ? 
            await AiChat.findOne({ _id: sessionId, user: req.user._id }) :
            null;

        // Get API configuration
        const api = await AiApi.findById(apiId);
        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'API not found or inactive' });
        }

        // Add user message to messages array
        const userMessage = { role: 'user', content: message };
        
        if (!session) {
            // Create new session if none exists
            session = new AiChat({
                title: AI_CONFIG.defaultTitle,
                user: req.user._id,
                apiModel: {
                    name: api.name,
                    apiId: api._id
                },
                messages: [userMessage]
            });
        } else {
            session.messages.push(userMessage);
        }

        // Get AI response using existing code
        const aiResponse = await getAiResponse(api, message);

        // Add AI response to messages
        session.messages.push({
            role: 'assistant',
            content: aiResponse
        });

        // Generate title for new sessions
        if (session.messages.length === 2) { // First interaction
            const titlePrompt = AI_CONFIG.titlePromptTemplate.replace('{message}', message);
            let titleResponse = await getAiResponse(api, titlePrompt);
            
            // Clean and format the title
            titleResponse = titleResponse
                .split(/[^a-zA-Z0-9\s]/) // Split on any non-alphanumeric characters
                .join(' ')               // Join parts with spaces
                .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
                .trim()                  // Remove leading/trailing spaces
                .split(' ')              // Split into words
                .slice(0, 3)             // Take only first 3 words
                .join(' ')               // Join back with spaces
                .toLowerCase()           // Convert to lowercase
                .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
            
            session.title = titleResponse;
        }

        await session.save();

        res.json({
            response: aiResponse,
            session: session
        });
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ message: err.message || 'Failed to get AI response' });
    }
});

async function getAiResponse(api, message) {
    try {
        const { endpoint, headers, method } = parseCurlCommand(api.curlCommand);
        
        // Create request body with message and extract model from headers
        let requestBody = createRequestBody(api.requestPath, message);
        
        // Extract model from headers or use default
        const modelHeader = headers['HTTP_OR_MODEL'] || headers['or-model'] || headers['model'];
        if (modelHeader) {
            requestBody.model = modelHeader;
        }

        // Add model to body if not present (OpenRouter requirement)
        if (!requestBody.model) {
            requestBody.model = AI_CONFIG.defaultModel; // Default model
        }

        console.log('Making AI request:', {
            endpoint,
            method,
            requestPath: api.requestPath,
            responsePath: api.responsePath,
            requestBody,
            headers
        });

        const response = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API responded with status ${response.status}`);
        }

        const data = await response.json();
        console.log('AI response data:', data);

        const result = extractResponse(data, api.responsePath);
        if (!result) {
            throw new Error(`No response found at path: ${api.responsePath}`);
        }

        return result;
    } catch (err) {
        console.error('AI response error:', {
            error: err.message,
            stack: err.stack,
            requestDetails: { api, message }
        });
        throw new Error(`${AI_CONFIG.aiResponseError}: ${err.message}`);
    }
}

function createRequestBody(path, message) {
    try {
        const parts = path.split('.');
        let current = {};
        let result = current;

        // Handle special case for OpenRouter's messages array
        if (path === 'messages[0].content') {
            return {
                messages: [{
                    role: 'user',
                    content: message
                }]
            };
        }

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const match = part.match(/(\w+)\[(\d+)\]/);
            
            if (match) {
                const [_, prop, index] = match;
                if (!current[prop]) current[prop] = [];
                if (!current[prop][index]) current[prop][index] = {};
                current = current[prop][index];
            } else {
                current[part] = {};
                current = current[part];
            }
        }

        // Handle the last part of the path
        const lastPart = parts[parts.length - 1];
        const match = lastPart.match(/(\w+)\[(\d+)\]/);
        
        if (match) {
            const [_, prop, index] = match;
            if (!current[prop]) current[prop] = [];
            current[prop][index] = message;
        } else {
            current[lastPart] = message;
        }

        return result;
    } catch (err) {
        console.error('Error creating request body:', err);
        throw new Error('Failed to create request body');
    }
}

function extractResponse(data, path) {
    try {
        const parts = path.split('.');
        let result = data;

        for (const part of parts) {
            const match = part.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const [_, prop, index] = match;
                result = result[prop]?.[index];
            } else {
                result = result[part];
            }

            if (result === undefined) {
                throw new Error(`Response path '${path}' not found in data`);
            }
        }

        return result;
    } catch (err) {
        console.error('Error extracting response:', err);
        throw new Error(`Failed to extract response: ${err.message}`);
    }
}

module.exports = router;
