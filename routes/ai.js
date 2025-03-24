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
    const startTime = Date.now();
    console.log('Chat request received:', {
        body: req.body,
        user: req.user._id,
        timestamp: new Date().toISOString()
    });

    try {
        const { message, apiId, sessionId } = req.body;

        // Validate inputs
        if (!message || !apiId) {
            console.log('Invalid request:', { message, apiId });
            return res.status(400).json({ message: 'Message and API ID are required' });
        }

        // Get API configuration
        const api = await AiApi.findById(apiId);
        console.log('Found API:', {
            name: api?.name,
            exists: !!api,
            isActive: api?.isActive
        });

        if (!api || !api.isActive) {
            return res.status(404).json({ message: 'API not found or inactive' });
        }

        // Get or create chat session
        let session = sessionId ? 
            await AiChat.findOne({ _id: sessionId, user: req.user._id }) :
            null;

        console.log('Session status:', {
            exists: !!session,
            isNew: !session,
            sessionId
        });

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
        console.log('Getting AI response for:', {
            apiName: api.name,
            messageLength: message.length
        });

        const aiResponse = await getAiResponse(api, message);
        
        console.log('AI response received:', {
            hasContent: !!aiResponse?.content,
            model: aiResponse?.model,
            elapsed: `${Date.now() - startTime}ms`
        });

        // Add AI response to messages
        session.messages.push({
            role: 'assistant',
            content: aiResponse.content,
            model: aiResponse.model  // Save model info in message
        });

        // Generate title for new sessions
        if (session.messages.length === 2) { // First interaction
            const titlePrompt = AI_CONFIG.titlePromptTemplate.replace('{message}', message);
            let titleResponse = await getAiResponse(api, titlePrompt);
            
            // Ensure titleResponse.content is a string and handle cleaning
            if (titleResponse && typeof titleResponse.content === 'string') {
                let cleanTitle = titleResponse.content
                    .replace(/["']/g, '') // Remove quotes
                    .replace(/[^a-zA-Z0-9\s]/g, ' ') // Replace special chars with space
                    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                    .trim() // Remove leading/trailing spaces
                    .split(' ') // Split into words
                    .slice(0, 3) // Take first 3 words
                    .join(' '); // Join back with spaces

                // Ensure title is not empty and has proper casing
                if (cleanTitle) {
                    cleanTitle = cleanTitle.toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    session.title = cleanTitle;
                } else {
                    session.title = 'New Chat'; // Fallback title
                }
            } else {
                session.title = 'New Chat'; // Fallback title
            }
        }

        await session.save();

        res.json({
            response: aiResponse.content,
            model: aiResponse.model,  // Send model info to client
            session: session
        });
    } catch (err) {
        console.error('Chat error:', {
            error: err.message,
            stack: err.stack,
            timings: {
                totalElapsed: `${Date.now() - startTime}ms`
            }
        });
        res.status(500).json({ message: err.message || 'Failed to get AI response' });
    }
}); // Add missing closing parenthesis

async function getAiResponse(api, message) {
    const startTime = Date.now();
    console.log('Starting AI request:', {
        apiName: api.name,
        apiType: api.apiType,
        requestPath: api.requestPath,
        responsePath: api.responsePath,
        messageLength: message.length
    });

    try {
        const { endpoint, headers, method, body: curlBody } = parseCurlCommand(api.curlCommand);
        
        // Create request body based on API type
        let requestBody;
        if (api.requestPath === 'messages[0].content') {
            requestBody = {
                model: curlBody?.model || api.modelId || api.name,
                messages: [{
                    role: 'user',
                    content: message
                }]
            };
        } else {
            // Handle non-OpenAI format requests
            requestBody = {};
            const pathParts = api.requestPath.split('.');
            let current = requestBody;

            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
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

            const lastPart = pathParts[pathParts.length - 1];
            const match = lastPart.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const [_, prop, index] = match;
                if (!current[prop]) current[prop] = [];
                current[prop][index] = message;
            } else {
                current[lastPart] = message;
            }
        }

        // Add model if specified in curl body
        if (curlBody?.model) {
            requestBody.model = curlBody.model;
        }

        console.log('Making request:', {
            url: endpoint,
            method,
            requestBody: JSON.stringify(requestBody)
        });

        const response = await fetch(endpoint, {
            method,
            headers,
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('Raw API response:', {
            status: response.status,
            data: JSON.stringify(data).slice(0, 200)
        });

        if (!response.ok) {
            throw new Error(data.error?.message || `API responded with status ${response.status}`);
        }

        // Extract response using path
        let result = data;
        const responseParts = api.responsePath.split('.');
        
        for (const part of responseParts) {
            const match = part.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const [_, prop, index] = match;
                result = result[prop]?.[index];
            } else {
                result = result[part];
            }
        }

        console.log('Extracted response:', {
            hasResult: !!result,
            resultPreview: result ? result.slice(0, 100) : null
        });

        if (!result) {
            throw new Error('No response content found at specified path');
        }

        // Return both content and model info
        return {
            content: result,
            model: curlBody?.model || api.name
        };

    } catch (err) {
        console.error('AI response error:', {
            error: err.message,
            stack: err.stack
        });
        throw err;
    }
}

// Enhance extractResponse function
function extractResponse(data, path) {
    try {
        console.log('Extracting response using path:', path);
        let result = data;
        const parts = path.split('.');
        
        for (const part of parts) {
            const match = part.match(/(\w+)\[(\d+)\]/);
            if (match) {
                const [_, prop, index] = match;
                if (!result[prop]?.[index]) {
                    console.error('Missing data at path:', { prop, index, available: result[prop] });
                    throw new Error(`Data not found at ${prop}[${index}]`);
                }
                result = result[prop][index];
            } else {
                if (!result[part]) {
                    console.error('Missing data at path:', { part, available: Object.keys(result) });
                    throw new Error(`Data not found at ${part}`);
                }
                result = result[part];
            }
        }
        
        return result;
    } catch (err) {
        console.error('Error extracting response:', {
            error: err.message,
            path,
            data: JSON.stringify(data).slice(0, 200) // Log first 200 chars
        });
        throw err;
    }
}

module.exports = router;
