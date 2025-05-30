const fetch = require('node-fetch');
const VoiceApi = require('../models/VoiceApi');
const { parseCurlCommand } = require('../utils/apiHelpers');
const AppError = require('../utils/AppError');
const logger = require('../logger');

exports.generateSpeech = async (req, res, next) => {
  logger.info('Voice generation request received', { userId: req.user.id, body: req.body, source: 'voiceController.generateSpeech', path: req.path });
  try {
    const { apiId, voice, text, speed, pitch, model, language } = req.body;

    const api = await VoiceApi.findById(apiId).lean();
    if (!api || !api.isActive) {
      logger.warn('Voice API not found or inactive for generation', { apiId, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
      return next(new AppError('Voice API not found or inactive', 404, 'VOICE_API_NOT_FOUND_OR_INACTIVE'));
    }

    const {
      endpoint,
      headers,
      method,
      body: curlBody,
    } = parseCurlCommand(api.curlCommand);

    let requestBody = { ...(curlBody || {}) };
    if (api.requestPath) {
      const pathParts = api.requestPath.split('.');
      let current = requestBody;
      pathParts.forEach((part, index) => {
        if (index === pathParts.length - 1) {
          current[part] = text;
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    } else {
      requestBody.text = requestBody.text || text;
    }

    requestBody.voice = voice;
    if (speed) requestBody.speed = speed;
    if (pitch) requestBody.pitch = pitch;
    if (model) requestBody.model = model;
    if (language) requestBody.language = language;

    logger.debug('Making voice generation request to external API', { endpoint, method, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      logger.warn('Voice API responded with error during generation', { status: response.status, errorText, apiId, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
      return next(new AppError(`Voice API responded with status ${response.status}: ${errorText}`, response.status, 'VOICE_API_ERROR'));
    }

    const contentType = response.headers.get('content-type');
    logger.debug('Voice API Response content type', { contentType, source: 'voiceController.generateSpeech', path: req.path });

    let audioData;
    let audioContentType = 'audio/mpeg';

    switch (api.responseType) {
      case 'binary':
        audioData = await response.buffer();
        audioContentType = contentType?.includes('audio/') ? contentType : 'audio/mpeg';
        break;
      case 'base64': {
        const jsonData = await response.json();
        let base64Content = jsonData;
        if (api.responsePath) {
          const pathParts = api.responsePath.split('.');
          for (const part of pathParts) {
            base64Content = base64Content?.[part];
            if (base64Content === undefined) break;
          }
        }
        if (!base64Content || typeof base64Content !== 'string') {
          logger.warn('No valid base64 audio data in API response', { apiId, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
          return next(new AppError('No valid base64 audio data found in response', 502, 'VOICE_RESPONSE_PARSE_ERROR'));
        }
        const base64Data = base64Content.replace(/^data:audio\/[^;]+;base64,/, '');
        audioData = Buffer.from(base64Data, 'base64');
        break;
      }
      case 'url': {
        const urlData = await response.json();
        let audioUrl = urlData;
        if (api.responsePath) {
          const pathParts = api.responsePath.split('.');
          for (const part of pathParts) {
            audioUrl = audioUrl?.[part];
            if (audioUrl === undefined) break;
          }
        }
        if (!audioUrl || typeof audioUrl !== 'string' || !audioUrl.startsWith('http')) {
          logger.warn('No valid audio URL in API response', { apiId, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
          return next(new AppError('No valid audio URL found in response', 502, 'VOICE_RESPONSE_PARSE_ERROR'));
        }
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          logger.warn(`Failed to fetch audio from URL: ${audioUrl}`, { status: audioResponse.status, apiId, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
          return next(new AppError(`Failed to fetch audio from URL ${audioUrl}: ${audioResponse.status}`, 502, 'EXTERNAL_AUDIO_FETCH_FAILED'));
        }
        audioData = await audioResponse.buffer();
        audioContentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
        break;
      }
      default:
        logger.warn(`Unsupported response type for Voice API: ${api.responseType}`, { apiId, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
        return next(new AppError(`Unsupported response type: ${api.responseType}`, 500, 'UNSUPPORTED_RESPONSE_TYPE'));
    }

    if (!audioData || audioData.length === 0) {
      logger.warn('No audio data received or data is empty from Voice API', { apiId, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
      return next(new AppError('No audio data received or data is empty', 502, 'EXTERNAL_API_EMPTY_RESPONSE'));
    }

    res.set('Content-Type', audioContentType);
    res.set('Content-Length', audioData.length);
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'no-cache');
    logger.info('Voice audio generated and sent successfully', { apiId, userId: req.user.id, contentType: audioContentType, size: audioData.length, source: 'voiceController.generateSpeech', path: req.path });
    return res.send(audioData);
  } catch (err) {
    logger.error('Voice generation process error', { error: err.message, stack: err.stack, userId: req.user.id, source: 'voiceController.generateSpeech', path: req.path });
    if (err instanceof AppError) return next(err);
    return next(new AppError(err.message || 'Failed to generate voice audio', 500, 'VOICE_GENERATION_FAILED'));
  }
};

exports.testVoiceApi = async (req, res, next) => {
  logger.info('User Voice API test request received', { userId: req.user?.id, body: req.body, source: 'voiceController.testVoiceApi', path: req.path });
  try {
    const { curlCommand, responsePath, responseType } = req.body;

    let parsedCurl;
    try {
      parsedCurl = parseCurlCommand(curlCommand);
      if (!parsedCurl.endpoint || !parsedCurl.endpoint.startsWith('http')) {
        throw new Error('Invalid URL in cURL command. Must be absolute (start with http:// or https://).');
      }
    } catch (parseErr) {
      logger.warn('cURL parsing error during user Voice API test', { error: parseErr.message, curlCommand, userId: req.user?.id, source: 'voiceController.testVoiceApi', path: req.path });
      return next(new AppError(`cURL parsing error: ${parseErr.message}`, 400, 'CURL_PARSE_ERROR'));
    }

    const { endpoint, method, headers, body: requestBody } = parsedCurl;
    logger.debug('Making user Voice API test request', { url: endpoint, method, userId: req.user?.id, source: 'voiceController.testVoiceApi', path: req.path });

    const testResponse = await fetch(endpoint, {
      method,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    if (testResponse.status === 524) {
      logger.warn('User Voice API test request timeout', { url: endpoint, userId: req.user?.id, source: 'voiceController.testVoiceApi', path: req.path });
      return next(new AppError('API timeout - The server took too long to respond', 504, 'API_TIMEOUT'));
    }

    const contentType = testResponse.headers.get('content-type');
    let responseDataPreview;
    const responseBodyText = await testResponse.text();

    if (!testResponse.ok) {
      logger.warn(`User Voice API test request failed: Status ${testResponse.status}`, { url: endpoint, status: testResponse.status, responseBody: responseBodyText, userId: req.user?.id, source: 'voiceController.testVoiceApi', path: req.path });
      return next(new AppError(`API request failed with status ${testResponse.status}: ${responseBodyText}`, testResponse.status, 'API_TEST_REQUEST_FAILED'));
    }

    if (responseType === 'base64') {
      try {
        const data = JSON.parse(responseBodyText);
        let base64Sample = data;
        if (responsePath) {
          const pathParts = responsePath.split('.');
          for (const part of pathParts) {
            base64Sample = base64Sample?.[part];
            if (base64Sample === undefined) break;
          }
        }
        responseDataPreview = `Base64 audio data received (sample: ${String(base64Sample).substring(0, 50)}...)`;
      } catch (e) {
        responseDataPreview = `Could not parse JSON for base64 extraction: ${responseBodyText.substring(0,100)}...`;
      }
    } else if (responseType === 'binary' || contentType?.includes('audio/')) {
      responseDataPreview = `Binary audio data received (Size: ${responseBodyText.length} chars/bytes)`;
    } else if (responseType === 'url') {
      try {
        const data = JSON.parse(responseBodyText);
        let audioUrl = data;
        if (responsePath) {
          const pathParts = responsePath.split('.');
          for (const part of pathParts) {
            audioUrl = audioUrl?.[part];
            if (audioUrl === undefined) break;
          }
        }
        responseDataPreview = `Audio URL received: ${audioUrl}`;
      } catch (e) {
        responseDataPreview = `Could not parse JSON for URL extraction: ${responseBodyText.substring(0,100)}...`;
      }
    } else {
      responseDataPreview = responseBodyText.substring(0, 200) + (responseBodyText.length > 200 ? '...' : '');
    }

    logger.info('User Voice API test completed successfully', { status: testResponse.status, contentType, responseType, userId: req.user?.id, source: 'voiceController.testVoiceApi', path: req.path });
    return res.json({
      success: true,
      message: 'API test completed successfully',
      details: {
        statusCode: testResponse.status,
        statusText: testResponse.statusText,
        contentType,
        responseType,
        responsePreview: responseDataPreview,
      },
    });
  } catch (err) {
    logger.error('User Voice API test endpoint error', { error: err.message, stack: err.stack, userId: req.user?.id, source: 'voiceController.testVoiceApi', path: req.path });
    if (err instanceof AppError) return next(err);
    return next(new AppError(err.message || 'Failed to test voice API', 400, 'API_TEST_EXCEPTION'));
  }
};

exports.getPublicActiveVoiceApis = async (req, res, next) => {
  try {
    const apis = await VoiceApi.find({ isActive: true })
      .select('_id name supportedVoices model language') // Ensure only safe fields
      .lean();
    logger.info('Fetched public active voice APIs', { count: apis.length, source: 'voiceController.getPublicActiveVoiceApis', path: req.path });
    return res.json(apis);
  } catch (err) {
    logger.error('Failed to fetch public active voice APIs', { error: err.message, stack: err.stack, source: 'voiceController.getPublicActiveVoiceApis', path: req.path });
    return next(new AppError('Error fetching public active voice APIs', 500, 'DB_QUERY_ERROR'));
  }
};
