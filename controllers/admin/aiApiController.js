const fetch = require('node-fetch');
const AiApi = require('../../models/AiApi');
const { ai } = require('../../config/constants');
const { parseCurlCommand } = require('../../utils/apiHelpers');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

exports.getAiApiConfig = (req, res, next) => {
  try {
    if (!ai) {
      return next(new AppError('AI configuration not found in server constants', 500, 'CONFIG_NOT_FOUND'));
    }
    return res.json({
      defaultModels: ai.defaultModels || [],
      providers: ai.providers || {},
    });
  } catch (err) {
    logger.error('Failed to load AI configuration', { error: err.message, source: 'aiApiController.getAiApiConfig', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to load AI configuration', 500, 'CONFIG_LOAD_ERROR', { originalError: err.message }));
  }
};

exports.getActiveAiApis = async (req, res, next) => {
  try {
    const apis = await AiApi.find({ isActive: true }).lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching active AI APIs (admin)', { error: err.message, source: 'aiApiController.getActiveAiApis', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching active AI APIs', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getPublicActiveAiApis = async (req, res, next) => {
  try {
    const apis = await AiApi.find({ isActive: true })
      .select('_id name description modelId apiType tags metadata')
      .lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching public active AI APIs', { error: err.message, source: 'aiApiController.getPublicActiveAiApis', path: req.path, userId: req.user?.id }); // Assuming req.user might be available from authMiddleware
    return next(new AppError('Error fetching public active AI APIs', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getAllAiApis = async (req, res, next) => {
  try {
    const apis = await AiApi.find().lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching all AI APIs (admin)', { error: err.message, source: 'aiApiController.getAllAiApis', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching all AI APIs', 500, 'DB_QUERY_ERROR', { originalError: err.message }));
  }
};

exports.getAiApiById = async (req, res, next) => {
  try {
    const api = await AiApi.findById(req.params.id).lean();
    if (!api) {
      logger.warn('AI API not found (admin)', { apiId: req.params.id, source: 'aiApiController.getAiApiById', path: req.path, userId: req.user?.id });
      return next(new AppError('AI API not found', 404, 'NOT_FOUND'));
    }
    return res.json(api);
  } catch (err) {
    logger.error('Error fetching AI API details (admin)', { error: err.message, apiId: req.params.id, source: 'aiApiController.getAiApiById', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching AI API details', 500, 'DB_QUERY_ERROR'));
  }
};

exports.createAiApi = async (req, res, next) => {
  try {
    const existingApi = await AiApi.findOne({ name: req.body.name }).lean();
    if (existingApi) {
      logger.warn('Attempt to create AI API with duplicate name (admin)', { name: req.body.name, source: 'aiApiController.createAiApi', path: req.path, userId: req.user?.id });
      return next(new AppError(`An API named "${req.body.name}" already exists. Please choose a unique name.`, 400, 'DUPLICATE_NAME'));
    }

    const { name, description, modelId, apiType, tags, metadata } = req.body;
    const aiApi = new AiApi({ name, description, modelId, apiType, tags, metadata });
    const savedApi = await aiApi.save();
    logger.info('AI API created successfully (admin)', { apiId: savedApi._id, name: savedApi.name, source: 'aiApiController.createAiApi', path: req.path, userId: req.user?.id });
    return res.status(201).json(savedApi);
  } catch (err) {
    logger.error('Error creating AI API (admin)', { error: err.message, body: req.body, source: 'aiApiController.createAiApi', path: req.path, userId: req.user?.id });
    if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
      return next(new AppError(`An API named "${req.body.name}" already exists. Please choose a unique name.`, 400, 'DUPLICATE_NAME'));
    }
    return next(new AppError(err.message || 'Failed to create AI API.', 400, 'CREATE_FAILED'));
  }
};

exports.updateAiApi = async (req, res, next) => {
  try {
    if (req.body.name) {
      const existingApiWithNewName = await AiApi.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id },
      }).lean();
      if (existingApiWithNewName) {
        logger.warn('Attempt to update AI API name to an existing one (admin)', { apiId: req.params.id, newName: req.body.name, source: 'aiApiController.updateAiApi', path: req.path, userId: req.user?.id });
        return next(new AppError(`Another API with the name "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
      }
    }
    const safeFields = ['description', 'modelId', 'apiType', 'tags', 'metadata'];
    const update = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => safeFields.includes(k))
    );
    const api = await AiApi.findByIdAndUpdate(req.params.id, { $set: update }, {
      new: true,
      runValidators: true,
    });
    if (!api) {
      logger.warn('AI API not found for update (admin)', { apiId: req.params.id, source: 'aiApiController.updateAiApi', path: req.path, userId: req.user?.id });
      return next(new AppError('AI API not found', 404, 'NOT_FOUND'));
    }
    logger.info('AI API updated successfully (admin)', { apiId: api._id, name: api.name, source: 'aiApiController.updateAiApi', path: req.path, userId: req.user?.id });
    return res.json(api);
  } catch (err) {
    logger.error('Error updating AI API (admin)', { error: err.message, apiId: req.params.id, body: req.body, source: 'aiApiController.updateAiApi', path: req.path, userId: req.user?.id });
    if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
      return next(new AppError(`An API named "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
    }
    return next(new AppError(err.message || 'Failed to update AI API.', 400, 'UPDATE_FAILED'));
  }
};

exports.deleteAiApi = async (req, res, next) => {
  try {
    const api = await AiApi.findByIdAndDelete(req.params.id);
    if (!api) {
      logger.warn('AI API not found for deletion (admin)', { apiId: req.params.id, source: 'aiApiController.deleteAiApi', path: req.path, userId: req.user?.id });
      return next(new AppError('AI API not found', 404, 'NOT_FOUND'));
    }
    logger.info('AI API deleted successfully (admin)', { apiId: req.params.id, name: api.name, source: 'aiApiController.deleteAiApi', path: req.path, userId: req.user?.id });
    return res.json({ message: 'AI API deleted successfully' });
  } catch (err) {
    logger.error('Error deleting AI API (admin)', { error: err.message, apiId: req.params.id, source: 'aiApiController.deleteAiApi', path: req.path, userId: req.user?.id });
    return next(new AppError(err.message || 'Failed to delete AI API.', 500, 'DELETE_FAILED'));
  }
};

exports.toggleAiApiStatus = async (req, res, next) => {
  try {
    const api = await AiApi.findById(req.params.id);
    if (!api) {
      logger.warn('AI API not found for toggle status (admin)', { apiId: req.params.id, source: 'aiApiController.toggleAiApiStatus', path: req.path, userId: req.user?.id });
      return next(new AppError('AI API not found', 404, 'NOT_FOUND'));
    }
    api.isActive = !api.isActive;
    await api.save();
    logger.info(`AI API status updated to ${api.isActive} (admin)`, { apiId: api._id, name: api.name, source: 'aiApiController.toggleAiApiStatus', path: req.path, userId: req.user?.id });
    return res.json({ message: 'AI API status updated successfully', api });
  } catch (err) {
    logger.error('Error toggling AI API status (admin)', { error: err.message, apiId: req.params.id, source: 'aiApiController.toggleAiApiStatus', path: req.path, userId: req.user?.id });
    return next(new AppError(err.message || 'Failed to update AI API status.', 400, 'TOGGLE_STATUS_FAILED'));
  }
};

exports.testAiApiEndpoint = async (req, res, next) => {
  logger.debug('AI API test request received (admin)', { body: req.body, source: 'aiApiController.testAiApiEndpoint', path: req.path, userId: req.user?.id });
  try {
    const { curlCommand } = req.body;

    const curlData = parseCurlCommand(curlCommand);
    logger.debug('Parsed cURL for AI API test (admin)', { url: curlData.url, method: curlData.method, hasBody: !!curlData.body, source: 'aiApiController.testAiApiEndpoint', path: req.path, userId: req.user?.id });

    const testResponse = await fetch(curlData.url, {
      method: curlData.method,
      headers: curlData.headers,
      body: curlData.body ? JSON.stringify(curlData.body) : undefined,
    });

    if (!testResponse.ok) {
      const errorBody = await testResponse.text().catch(() => 'Could not retrieve error body.');
      logger.warn(`AI API test request failed (admin): Status ${testResponse.status}`, { url: curlData.url, errorBody, source: 'aiApiController.testAiApiEndpoint', path: req.path, userId: req.user?.id });
      return next(new AppError(`API request failed with status ${testResponse.status}. Response: ${errorBody}`, 400, 'API_TEST_FAILED'));
    }

    const contentType = testResponse.headers.get('content-type');
    const responseData = await testResponse.text();
    logger.info('AI API test completed successfully (admin)', { statusCode: testResponse.status, contentType, source: 'aiApiController.testAiApiEndpoint', path: req.path, userId: req.user?.id });

    return res.json({
      success: true,
      message: 'API test completed successfully.',
      details: {
        statusCode: testResponse.status,
        statusText: testResponse.statusText,
        contentType: contentType || 'unknown',
        responsePreview: responseData.substring(0, 500) + (responseData.length > 500 ? '...' : ''),
      },
    });
  } catch (err) {
    logger.error('Error testing AI API (admin)', { error: err.message, body: req.body, source: 'aiApiController.testAiApiEndpoint', path: req.path, userId: req.user?.id });
    return next(new AppError(err.message || 'Failed to test AI API.', 400, 'API_TEST_EXCEPTION'));
  }
};
