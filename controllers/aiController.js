const fetch = require('node-fetch');
const AiApi = require('../models/AiApi');
const AiChat = require('../models/AiChat');
const { parseCurlCommand } = require('../utils/apiHelpers');
const { ai } = require('../config/constants');
const AppError = require('../utils/AppError');
const logger = require('../logger');

// Helper function (not exported, used internally)
async function getAiResponseInternal(api, messageContent, req) {
  logger.debug('Starting getAiResponseInternal', { apiName: api.name, messageLength: messageContent.length, source: 'aiController.getAiResponseInternal', path: req?.path, userId: req?.user?.id });
  try {
    const {
      endpoint,
      headers,
      method,
      body: curlBody,
    } = parseCurlCommand(api.curlCommand);

    let requestBody;
    if (api.requestPath && api.requestPath.includes('messages[0].content')) {
      requestBody = {
        model: curlBody?.model || api.modelId || api.name,
        messages: [{ role: 'user', content: messageContent }],
        ...(curlBody || {}),
      };
      if (requestBody.messages && curlBody?.messages) {
         delete requestBody.messages;
         requestBody = { ...requestBody, messages: [{ role: 'user', content: messageContent }], ...curlBody};
      }
    } else {
      requestBody = {};
      if (api.requestPath) {
        const pathParts = api.requestPath.split('.');
        let current = requestBody;
        pathParts.forEach((part, index) => {
          if (index === pathParts.length - 1) {
            current[part] = messageContent;
          } else {
            current[part] = current[part] || {};
            current = current[part];
          }
        });
      } else {
        requestBody.prompt = messageContent;
      }
      requestBody = { ...curlBody, ...requestBody };
      if (curlBody?.model) requestBody.model = curlBody.model;
    }

    logger.debug('Making AI request via getAiResponseInternal', { url: endpoint, method, source: 'aiController.getAiResponseInternal', path: req?.path, userId: req?.user?.id });
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok) {
      logger.warn('AI API responded with error in getAiResponseInternal', { status: response.status, responseData: data, apiName: api.name, source: 'aiController.getAiResponseInternal', path: req?.path, userId: req?.user?.id });
      throw new AppError(data.error?.message || `API responded with status ${response.status}`, response.status, 'AI_API_ERROR');
    }

    let result = data;
    if (api.responsePath) {
      const responseParts = api.responsePath.split('.');
      for (const part of responseParts) {
        const match = part.match(/(\w+)\[(\d+)\]/);
        if (match) {
          const [, prop, index] = match;
          result = result?.[prop]?.[parseInt(index, 10)];
        } else {
          result = result?.[part];
        }
        if (result === undefined) break;
      }
    } else {
        result = data.choices?.[0]?.message?.content || data.text || JSON.stringify(data);
    }

    if (result === undefined || result === null) {
      logger.warn('No response content found at specified path in getAiResponseInternal', { responsePath: api.responsePath, apiName: api.name, source: 'aiController.getAiResponseInternal', path: req?.path, userId: req?.user?.id });
      throw new AppError('No response content found at specified path', 500, 'AI_RESPONSE_PARSE_ERROR');
    }
    logger.debug('Successfully extracted AI response in getAiResponseInternal', { apiName: api.name, source: 'aiController.getAiResponseInternal', path: req?.path, userId: req?.user?.id });
    return {
      content: typeof result === 'object' ? JSON.stringify(result) : result,
      model: requestBody.model || api.name,
    };
  } catch (err) {
    logger.error('Error in getAiResponseInternal', { error: err.message, stack: err.stack, apiName: api?.name, source: 'aiController.getAiResponseInternal', path: req?.path, userId: req?.user?.id });
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to get AI response from external API.', 502, 'EXTERNAL_API_FETCH_FAILED', { originalError: err.message });
  }
}

exports.getUserSessions = async (req, res, next) => {
  try {
    const sessions = await AiChat.find({ user: req.user.id })
      .sort({ lastUpdated: -1 })
      .lean();
    logger.info('Fetched AI chat sessions for user', { userId: req.user.id, count: sessions.length, source: 'aiController.getUserSessions', path: req.path });
    return res.json(sessions);
  } catch (err) {
    logger.error('Error fetching AI chat sessions', { error: err.message, stack: err.stack, userId: req.user.id, source: 'aiController.getUserSessions', path: req.path });
    return next(new AppError('Failed to fetch chat sessions', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getChatSession = async (req, res, next) => {
  try {
    const session = await AiChat.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).lean();

    if (!session) {
      logger.warn('AI chat session not found', { sessionId: req.params.id, userId: req.user.id, source: 'aiController.getChatSession', path: req.path });
      return next(new AppError('Chat session not found', 404, 'NOT_FOUND'));
    }
    logger.debug('Fetched single AI chat session', { sessionId: req.params.id, userId: req.user.id, source: 'aiController.getChatSession', path: req.path });
    return res.json(session);
  } catch (err) {
    logger.error('Error fetching single AI chat session', { error: err.message, stack: err.stack, sessionId: req.params.id, userId: req.user.id, source: 'aiController.getChatSession', path: req.path });
    return next(new AppError('Failed to fetch chat session', 500, 'DB_QUERY_ERROR'));
  }
};

exports.createChatSession = async (req, res, next) => {
  try {
    const { apiId } = req.body;
    const api = await AiApi.findById(apiId).lean();

    if (!api) {
      logger.warn('AI API not found for new chat session', { apiId, userId: req.user.id, source: 'aiController.createChatSession', path: req.path });
      return next(new AppError('AI API not found', 404, 'AI_API_NOT_FOUND'));
    }

    const session = new AiChat({
      title: ai.defaultTitle,
      user: req.user.id,
      apiModel: {
        name: api.name,
        apiId: api._id,
      },
      messages: [{ role: 'system', content: ai.initialMessage }],
    });
    await session.save();
    logger.info('AI chat session created', { sessionId: session._id, userId: req.user.id, apiId, source: 'aiController.createChatSession', path: req.path });
    return res.status(201).json(session);
  } catch (err) {
    logger.error('Error creating AI chat session', { error: err.message, stack: err.stack, userId: req.user.id, apiId: req.body.apiId, source: 'aiController.createChatSession', path: req.path });
    return next(new AppError('Failed to create chat session', 500, 'SESSION_CREATE_FAILED'));
  }
};

exports.updateChatTitle = async (req, res, next) => {
  try {
    const { title } = req.body;
    const session = await AiChat.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title },
      { new: true, runValidators: true }
    );

    if (!session) {
      logger.warn('AI chat session not found for title update', { sessionId: req.params.id, userId: req.user.id, source: 'aiController.updateChatTitle', path: req.path });
      return next(new AppError('Chat session not found', 404, 'NOT_FOUND'));
    }
    logger.info('AI chat session title updated', { sessionId: session._id, userId: req.user.id, newTitle: title, source: 'aiController.updateChatTitle', path: req.path });
    return res.json(session);
  } catch (err) {
    logger.error('Error updating AI chat session title', { error: err.message, stack: err.stack, sessionId: req.params.id, userId: req.user.id, source: 'aiController.updateChatTitle', path: req.path });
    return next(new AppError('Failed to update chat title', 500, 'SESSION_UPDATE_FAILED'));
  }
};

exports.handleChat = async (req, res, next) => {
  logger.info('AI chat request received', { userId: req.user.id, body: req.body, source: 'aiController.handleChat', path: req.path });
  try {
    const { message, apiId, sessionId } = req.body;

    const api = await AiApi.findById(apiId).lean();
    if (!api || !api.isActive) {
      logger.warn('AI API not found or inactive for chat', { apiId, userId: req.user.id, source: 'aiController.handleChat', path: req.path });
      return next(new AppError('API not found or inactive', 404, 'AI_API_NOT_FOUND_OR_INACTIVE'));
    }

    let session;
    if (sessionId) {
      session = await AiChat.findOne({ _id: sessionId, user: req.user.id });
      if (!session) {
        logger.warn('AI chat session not found for user', { sessionId, userId: req.user.id, source: 'aiController.handleChat', path: req.path });
        return next(new AppError('Chat session not found', 404, 'NOT_FOUND'));
      }
    }

    const userMessage = { role: 'user', content: message };

    if (!session) {
      session = new AiChat({
        title: ai.defaultTitle,
        user: req.user.id,
        apiModel: { name: api.name, apiId: api._id },
        messages: [userMessage],
      });
    } else {
      session.messages.push(userMessage);
    }
    if (session.messages.length > ai.MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-ai.MAX_MESSAGES_PER_SESSION);
    }

    const aiResponse = await getAiResponseInternal(api, message, req);

    if (!sessionId || session.title === ai.defaultTitle) {
      try {
        const titlePrompt = `Generate a very short (2-4 words), concise title for this conversation. User: "${message}" AI: "${aiResponse.content}"`;
        const titleApiToUse = api; // For simplicity, using the same API. Could be a different one.
        const titleResponse = await getAiResponseInternal(titleApiToUse, titlePrompt, req);
        if (titleResponse?.content) {
          const cleanTitle = titleResponse.content
            .replace(/["“”,.]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          session.title = cleanTitle.split(' ').slice(0, 5).join(' ') || ai.defaultTitle;
          logger.debug('Generated title for AI chat session', { title: session.title, sessionId: session.id, userId: req.user.id, source: 'aiController.handleChat', path: req.path });
        }
      } catch (titleErr) {
        logger.warn('Error generating title for AI chat session', { error: titleErr.message, stack: titleErr.stack, sessionId: session.id, userId: req.user.id, source: 'aiController.handleChat', path: req.path });
      }
    }

    session.messages.push({
      role: 'assistant',
      content: aiResponse.content,
      model: aiResponse.model,
    });
    session.lastUpdated = Date.now();

    await session.save();
    logger.info('AI chat message processed and session saved', { sessionId: session._id, userId: req.user.id, apiId, source: 'aiController.handleChat', path: req.path });

    return res.json({
      response: aiResponse.content,
      model: aiResponse.model,
      session,
    });
  } catch (err) {
    logger.error('Error in AI chat endpoint', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'aiController.handleChat', path: req.path });
    if (err instanceof AppError) return next(err);
    return next(new AppError(err.message || 'Failed to get AI response', 500, 'AI_CHAT_FAILED'));
  }
};
