const fetch = require('node-fetch');
const VoiceApi = require('../../models/VoiceApi');
const { parseCurlCommand } = require('../../utils/apiHelpers');
const { voice } = require('../../config/constants'); // Assuming constants are needed
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

exports.getAllVoiceApis = async (req, res, next) => {
  try {
    const apis = await VoiceApi.find().lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching all voice APIs (admin)', { error: err.message, source: 'voiceApiController.getAllVoiceApis', path: req.path, userId: req.user?.id });
    return next(new AppError(voice.messages.NOT_FOUND || 'Error fetching voice APIs.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getActiveVoiceApisForAdmin = async (req, res, next) => {
  try {
    const apis = await VoiceApi.find({ isActive: true }).lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching active voice APIs (admin)', { error: err.message, source: 'voiceApiController.getActiveVoiceApisForAdmin', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching active voice APIs.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getVoiceApiConfig = (req, res, next) => {
  try {
    if (!voice) {
      return next(new AppError('Voice configuration not found in server constants.', 500, 'CONFIG_NOT_FOUND'));
    }
    return res.json({
      defaultVoiceTypes: voice.defaultVoiceTypes || [],
      voiceProviders: voice.voiceProviders || {},
    });
  } catch (err) {
    logger.error('Error loading voice config (admin)', { error: err.message, source: 'voiceApiController.getVoiceApiConfig', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to load voice configuration.', 500, 'CONFIG_LOAD_ERROR', { originalError: err.message }));
  }
};

exports.createVoiceApi = async (req, res, next) => {
  try {
    const { name } = req.body;
    const existingApi = await VoiceApi.findOne({ name }).lean();
    if (existingApi) {
      logger.warn(`Attempt to create Voice API with duplicate name (admin): ${name}`, { name, source: 'voiceApiController.createVoiceApi', path: req.path, userId: req.user?.id });
      return next(new AppError(voice.messages.DUPLICATE_NAME(name) || `An API named "${name}" already exists.`, 400, 'DUPLICATE_NAME'));
    }
    const voiceApi = new VoiceApi({ ...req.body, method: voice.methods.POST }); // Assuming POST is default
    const savedApi = await voiceApi.save();
    logger.info('Voice API created successfully (admin)', { apiId: savedApi._id, name: savedApi.name, source: 'voiceApiController.createVoiceApi', path: req.path, adminUserId: req.user?.id });
    return res.status(201).json({
      success: true,
      message: voice.messages.SAVE_SUCCESS || 'Voice API saved successfully.',
      api: savedApi,
    });
  } catch (err) {
    logger.error('Error saving voice API (admin)', { error: err.message, body: req.body, source: 'voiceApiController.createVoiceApi', path: req.path, userId: req.user?.id });
    if (err.code === 11000) {
      return next(new AppError(voice.messages.DUPLICATE_NAME(req.body.name) || `An API named "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
    }
    return next(new AppError(err.message || 'Failed to save voice API.', 400, 'CREATE_FAILED'));
  }
};

exports.getVoiceApiByIdForAdmin = async (req, res, next) => {
  try {
    const api = await VoiceApi.findById(req.params.id).lean();
    if (!api) {
      logger.warn('Voice API not found (admin)', { voiceApiId: req.params.id, source: 'voiceApiController.getVoiceApiByIdForAdmin', path: req.path, userId: req.user?.id });
      return next(new AppError(voice.messages.NOT_FOUND || 'Voice API not found.', 404, 'NOT_FOUND'));
    }
    return res.json(api);
  } catch (err) {
    logger.error('Error fetching single voice API (admin)', { error: err.message, voiceApiId: req.params.id, source: 'voiceApiController.getVoiceApiByIdForAdmin', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to fetch voice API details.', 500, 'DB_QUERY_ERROR'));
  }
};

exports.updateVoiceApi = async (req, res, next) => {
  try {
    if (req.body.name) {
      const existingApi = await VoiceApi.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id },
      }).lean();
      if (existingApi) {
        logger.warn(`Attempt to update Voice API name to an existing one (admin): ${req.body.name}`, { voiceApiId: req.params.id, newName: req.body.name, source: 'voiceApiController.updateVoiceApi', path: req.path, userId: req.user?.id });
        return next(new AppError(`Another Voice API with the name "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
      }
    }
    const updatedApi = await VoiceApi.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedApi) {
      logger.warn('Voice API not found for update (admin)', { voiceApiId: req.params.id, source: 'voiceApiController.updateVoiceApi', path: req.path, userId: req.user?.id });
      return next(new AppError('Voice API not found.', 404, 'NOT_FOUND'));
    }
    logger.info('Voice API updated successfully (admin)', { apiId: updatedApi._id, name: updatedApi.name, source: 'voiceApiController.updateVoiceApi', path: req.path, adminUserId: req.user?.id });
    return res.json({
      success: true,
      message: 'Voice API updated successfully.',
      api: updatedApi,
    });
  } catch (err) {
    logger.error('Error updating voice API (admin)', { error: err.message, voiceApiId: req.params.id, body: req.body, source: 'voiceApiController.updateVoiceApi', path: req.path, userId: req.user?.id });
    if (err.code === 11000) {
      return next(new AppError(`Another Voice API with the name "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
    }
    return next(new AppError(err.message || 'Failed to update voice API.', 400, 'UPDATE_FAILED'));
  }
};

exports.toggleVoiceApiStatus = async (req, res, next) => {
  try {
    const api = await VoiceApi.findById(req.params.id);
    if (!api) {
      logger.warn('Voice API not found for toggle (admin)', { voiceApiId: req.params.id, source: 'voiceApiController.toggleVoiceApiStatus', path: req.path, userId: req.user?.id });
      return next(new AppError('Voice API not found.', 404, 'NOT_FOUND'));
    }
    api.isActive = !api.isActive;
    await api.save();
    logger.info(`Voice API status toggled to ${api.isActive} (admin)`, { apiId: api._id, name: api.name, source: 'voiceApiController.toggleVoiceApiStatus', path: req.path, adminUserId: req.user?.id });
    return res.json({
      success: true,
      message: `Voice API ${api.isActive ? 'activated' : 'deactivated'} successfully.`,
      api,
    });
  } catch (err) {
    logger.error('Error toggling voice API status (admin)', { error: err.message, voiceApiId: req.params.id, source: 'voiceApiController.toggleVoiceApiStatus', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to update voice API status.', 500, 'TOGGLE_STATUS_FAILED'));
  }
};

exports.deleteVoiceApi = async (req, res, next) => {
  try {
    const api = await VoiceApi.findByIdAndDelete(req.params.id);
    if (!api) {
      logger.warn('Voice API not found for deletion (admin)', { voiceApiId: req.params.id, source: 'voiceApiController.deleteVoiceApi', path: req.path, userId: req.user?.id });
      return next(new AppError(voice.messages.NOT_FOUND || 'Voice API not found.', 404, 'NOT_FOUND'));
    }
    logger.info('Voice API deleted successfully (admin)', { apiId: req.params.id, name: api.name, source: 'voiceApiController.deleteVoiceApi', path: req.path, adminUserId: req.user?.id });
    return res.json({
      success: true,
      message: voice.messages.DELETE_SUCCESS || 'Voice API deleted successfully.',
    });
  } catch (err) {
    logger.error('Error deleting voice API (admin)', { error: err.message, voiceApiId: req.params.id, source: 'voiceApiController.deleteVoiceApi', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to delete voice API.', 500, 'DELETE_FAILED'));
  }
};

exports.testVoiceApiEndpointAdmin = async (req, res, next) => {
  logger.debug('Voice API test request received (admin)', { body: req.body, source: 'voiceApiController.testVoiceApiEndpointAdmin', path: req.path, userId: req.user?.id });
  try {
    const { curlCommand } = req.body;
    let parsedCurl;
    try {
      parsedCurl = parseCurlCommand(curlCommand);
      if (!parsedCurl.endpoint || !parsedCurl.endpoint.startsWith('http')) {
        throw new Error('Invalid URL in cURL command. Must be absolute (start with http:// or https://).');
      }
    } catch (parseErr) {
      logger.warn('cURL parsing error during Voice API test (admin)', { error: parseErr.message, curlCommand, source: 'voiceApiController.testVoiceApiEndpointAdmin', path: req.path, userId: req.user?.id });
      return next(new AppError(`cURL parsing error: ${parseErr.message}`, 400, 'CURL_PARSE_ERROR'));
    }

    const { endpoint, method, headers, body: requestBody } = parsedCurl;
    logger.debug('Making voice API test request (admin)', { url: endpoint, method, source: 'voiceApiController.testVoiceApiEndpointAdmin', path: req.path, userId: req.user?.id });

    const options = { method, headers };
    if (
      requestBody !== undefined &&
      !['GET', 'HEAD'].includes(method.toUpperCase())
    ) {
      options.body =
        typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }
    const testResponse = await fetch(endpoint, options);

    const responseBodyText = await testResponse.text();
    const responseDetails = {
      statusCode: testResponse.status,
      statusText: testResponse.statusText,
      contentType: testResponse.headers.get('content-type') || 'unknown',
      responsePreview: responseBodyText.substring(0, 500) + (responseBodyText.length > 500 ? '...' : ''),
    };

    if (!testResponse.ok) {
      logger.warn(`Voice API test request failed (admin): Status ${testResponse.status}`, { status: testResponse.status, responseBody: responseBodyText, source: 'voiceApiController.testVoiceApiEndpointAdmin', path: req.path, userId: req.user?.id });
      return next(new AppError(`API test request failed with status ${testResponse.status}.`, 400, 'API_TEST_FAILED', responseDetails));
    }
    logger.info('Voice API test successful (admin)', { status: testResponse.status, source: 'voiceApiController.testVoiceApiEndpointAdmin', path: req.path, userId: req.user?.id });
    return res.json({
      success: true,
      message: 'Voice API test completed successfully.',
      details: responseDetails,
    });
  } catch (err) {
    logger.error('Voice API test endpoint error (admin)', { error: err.message, body: req.body, source: 'voiceApiController.testVoiceApiEndpointAdmin', path: req.path, userId: req.user?.id });
    return next(new AppError(err.message || 'Failed to test voice API.', 400, 'API_TEST_EXCEPTION'));
  }
};
