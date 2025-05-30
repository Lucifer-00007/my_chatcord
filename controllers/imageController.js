const fetch = require('node-fetch');
const ImageApi = require('../models/ImageApi');
const { parseCurlCommand } = require('../utils/apiHelpers');
const AppError = require('../utils/AppError');
const logger = require('../logger');

exports.generateImage = async (req, res, next) => {
  logger.info('Image generation request received', { userId: req.user.id, body: req.body, source: 'imageController.generateImage', path: req.path });
  try {
    const { prompt, apiId, size, style, n, quality } = req.body;

    const api = await ImageApi.findById(apiId).lean();
    if (!api || !api.isActive) {
      logger.warn('Image API not found or inactive', { apiId, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
      return next(new AppError('Image API not found or inactive', 404, 'IMAGE_API_NOT_FOUND_OR_INACTIVE'));
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
          current[part] = prompt;
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    } else {
      requestBody.prompt = requestBody.prompt || prompt;
    }

    requestBody.size = size;
    if (style) requestBody.style = style;
    if (n) requestBody.n = n;
    if (quality) requestBody.quality = quality;

    // This empty block was in the original routes/images.js, kept for consistency.
    // It implies a potential override that wasn't fully implemented.
    if (curlBody?.prompt && requestBody.prompt !== curlBody.prompt) {
      // If the schema's prompt is different, ensure it overrides any curlBody prompt
    }

    logger.debug('Sending image generation request to external API', { endpoint, method, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!api.responsePath || api.responseType === 'binary') {
      const buffer = await response.buffer();
      if (!buffer || buffer.length === 0) {
        logger.warn('No image data received (binary response)', { apiId, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
        return next(new AppError('No image data received', 502, 'EXTERNAL_API_EMPTY_RESPONSE'));
      }
      res.set('Content-Type', response.headers.get('content-type') || 'image/png');
      logger.info('Image generated and sent (binary)', { apiId, userId: req.user.id, size: buffer.length, source: 'imageController.generateImage', path: req.path });
      return res.send(buffer);
    }

    const data = await response.json();
    if (!response.ok) {
      logger.warn('Image API responded with error', { status: response.status, responseData: data, apiId, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
      return next(new AppError(data?.error?.message || `API responded with status ${response.status}`, response.status, 'IMAGE_API_ERROR'));
    }

    let result = data;
    const responsePathParts = api.responsePath.split('.');
    for (const part of responsePathParts) {
      const match = part.match(/(\w+)\[(\d+)\]/);
      if (match) {
        const [, prop, index] = match;
        result = result?.[prop]?.[parseInt(index, 10)];
      } else {
        result = result?.[part];
      }
      if (result === undefined) break;
    }

    if (result === undefined || result === null) {
      logger.warn('Failed to extract image data from API JSON response', { responsePath: api.responsePath, apiId, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
      return next(new AppError('Failed to extract image data from response', 502, 'IMAGE_RESPONSE_PARSE_ERROR'));
    }

    if (typeof result === 'string') {
      if (result.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/) && result.length > 100) {
        const imageBuffer = Buffer.from(result, 'base64');
        res.set('Content-Type', 'image/png');
        logger.info('Image generated and sent (base64)', { apiId, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
        return res.send(imageBuffer);
      }
      if (result.startsWith('http')) {
        logger.info('Image generated (URL) and sent', { apiId, userId: req.user.id, imageUrl: result, source: 'imageController.generateImage', path: req.path });
        return res.json({ imageUrl: result });
      }
    }
    if (typeof result === 'object' && result.url && typeof result.url === 'string' && result.url.startsWith('http')) {
      logger.info('Image generated (object with URL) and sent', { apiId, userId: req.user.id, imageUrl: result.url, source: 'imageController.generateImage', path: req.path });
      return res.json({ imageUrl: result.url });
    }

    logger.warn('Unsupported or invalid image data format in API response', { resultPreview: String(result).substring(0,100), apiId, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
    return next(new AppError('Unsupported or invalid image data format in response', 502, 'IMAGE_UNSUPPORTED_FORMAT'));
  } catch (err) {
    logger.error('Image generation process error', { error: err.message, stack: err.stack, userId: req.user.id, source: 'imageController.generateImage', path: req.path });
    if (err instanceof AppError) return next(err); // Re-throw AppErrors
    return next(new AppError(err.message || 'Failed to generate image', 500, 'IMAGE_GENERATION_FAILED'));
  }
};
