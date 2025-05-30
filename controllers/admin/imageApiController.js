const fetch = require('node-fetch');
const ImageApi = require('../../models/ImageApi');
const ImageSettings = require('../../models/ImageSettings');
const { parseCurlCommand } = require('../../utils/apiHelpers');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

exports.getAllImageApis = async (req, res, next) => {
  try {
    const apis = await ImageApi.find().lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching all Image APIs (admin)', { error: err.message, source: 'imageApiController.getAllImageApis', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching all Image APIs', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getPublicActiveImageApis = async (req, res, next) => {
  try {
    const apis = await ImageApi.find({ isActive: true })
      .select('_id name supportedSizes supportedStyles description')
      .lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching public active image APIs', { error: err.message, source: 'imageApiController.getPublicActiveImageApis', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching public active image APIs', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getActiveImageApis = async (req, res, next) => {
  try {
    const apis = await ImageApi.find({ isActive: true }).lean();
    return res.json(apis);
  } catch (err) {
    logger.error('Error fetching active image APIs (admin)', { error: err.message, source: 'imageApiController.getActiveImageApis', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching active image APIs', 500, 'DB_QUERY_ERROR'));
  }
};

exports.getImageApiById = async (req, res, next) => {
  try {
    const api = await ImageApi.findById(req.params.id).lean();
    if (!api) {
      logger.warn('Image API not found (admin)', { imageApiId: req.params.id, source: 'imageApiController.getImageApiById', path: req.path, userId: req.user?.id });
      return next(new AppError('Image API not found', 404, 'NOT_FOUND'));
    }
    return res.json(api);
  } catch (err) {
    logger.error('Error fetching single Image API (admin)', { error: err.message, imageApiId: req.params.id, source: 'imageApiController.getImageApiById', path: req.path, userId: req.user?.id });
    return next(new AppError('Error fetching Image API', 500, 'DB_QUERY_ERROR'));
  }
};

exports.createImageApi = async (req, res, next) => {
  try {
    const existingApi = await ImageApi.findOne({ name: req.body.name }).lean();
    if (existingApi) {
      logger.warn('Attempt to create Image API with duplicate name (admin)', { name: req.body.name, source: 'imageApiController.createImageApi', path: req.path, userId: req.user?.id });
      return next(new AppError(`An API named "${req.body.name}" already exists. Please choose a unique name.`, 400, 'DUPLICATE_NAME'));
    }
    const imageApi = new ImageApi(req.body);
    const savedApi = await imageApi.save();
    logger.info('Image API created successfully (admin)', { apiId: savedApi._id, name: savedApi.name, source: 'imageApiController.createImageApi', path: req.path, userId: req.user?.id });
    return res.status(201).json(savedApi);
  } catch (err) {
    logger.error('Error creating Image API (admin)', { error: err.message, body: req.body, source: 'imageApiController.createImageApi', path: req.path, userId: req.user?.id });
    if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
      return next(new AppError(`An API named "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
    }
    return next(new AppError(err.message || 'Failed to create Image API.', 400, 'CREATE_FAILED'));
  }
};

exports.updateImageApi = async (req, res, next) => {
  try {
    if (req.body.name) {
      const existingApi = await ImageApi.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id },
      }).lean();
      if (existingApi) {
        logger.warn('Attempt to update Image API name to an existing one (admin)', { imageApiId: req.params.id, newName: req.body.name, source: 'imageApiController.updateImageApi', path: req.path, userId: req.user?.id });
        return next(new AppError(`Another Image API with the name "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
      }
    }
    const api = await ImageApi.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!api) {
      logger.warn('Image API not found for update (admin)', { imageApiId: req.params.id, source: 'imageApiController.updateImageApi', path: req.path, userId: req.user?.id });
      return next(new AppError('Image API not found', 404, 'NOT_FOUND'));
    }
    logger.info('Image API updated successfully (admin)', { apiId: api._id, name: api.name, source: 'imageApiController.updateImageApi', path: req.path, userId: req.user?.id });
    return res.json(api);
  } catch (err) {
    logger.error('Error updating Image API (admin)', { error: err.message, imageApiId: req.params.id, body: req.body, source: 'imageApiController.updateImageApi', path: req.path, userId: req.user?.id });
    if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
      return next(new AppError(`An API named "${req.body.name}" already exists.`, 400, 'DUPLICATE_NAME'));
    }
    return next(new AppError(err.message || 'Failed to update Image API.', 400, 'UPDATE_FAILED'));
  }
};

exports.deleteImageApi = async (req, res, next) => {
  try {
    const api = await ImageApi.findByIdAndDelete(req.params.id);
    if (!api) {
      logger.warn('Image API not found for deletion (admin)', { imageApiId: req.params.id, source: 'imageApiController.deleteImageApi', path: req.path, userId: req.user?.id });
      return next(new AppError('Image API not found', 404, 'NOT_FOUND'));
    }
    logger.info('Image API deleted successfully (admin)', { apiId: req.params.id, name: api.name, source: 'imageApiController.deleteImageApi', path: req.path, userId: req.user?.id });
    return res.json({ message: 'Image API deleted successfully' });
  } catch (err) {
    logger.error('Error deleting Image API (admin)', { error: err.message, imageApiId: req.params.id, source: 'imageApiController.deleteImageApi', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to delete Image API.', 500, 'DELETE_FAILED'));
  }
};

exports.toggleImageApiStatus = async (req, res, next) => {
  try {
    const api = await ImageApi.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    );
    if (!api) {
      logger.warn('Image API not found for toggle status (admin)', { imageApiId: req.params.id, source: 'imageApiController.toggleImageApiStatus', path: req.path, userId: req.user?.id });
      return next(new AppError('Image API not found', 404, 'NOT_FOUND'));
    }
    logger.info(`Image API status updated to ${api.isActive} (admin)`, { id: api._id, name: api.name, isActive: api.isActive, source: 'imageApiController.toggleImageApiStatus', path: req.path, userId: req.user?.id });
    return res.json({
      success: true,
      message: `Image API ${api.isActive ? 'activated' : 'deactivated'} successfully.`,
      api,
    });
  } catch (err) {
    logger.error('Error toggling Image API status (admin)', { error: err.message, imageApiId: req.params.id, source: 'imageApiController.toggleImageApiStatus', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to update Image API status.', 500, 'TOGGLE_STATUS_FAILED'));
  }
};

exports.testImageApiEndpoint = async (req, res, next) => {
  logger.debug('Image API test request received (admin)', { body: req.body, source: 'imageApiController.testImageApiEndpoint', path: req.path, userId: req.user?.id });
  try {
    const { curlCommand } = req.body;
    const curlData = parseCurlCommand(curlCommand);
    logger.debug('Parsed cURL for Image API test (admin)', { url: curlData.url, method: curlData.method, hasBody: !!curlData.body, source: 'imageApiController.testImageApiEndpoint', path: req.path, userId: req.user?.id });

    const testResponse = await fetch(curlData.url, {
      method: curlData.method,
      headers: curlData.headers,
      body: curlData.body ? JSON.stringify(curlData.body) : undefined,
    });

    if (!testResponse.ok) {
      const errorBody = await testResponse.text().catch(() => 'Could not retrieve error body.');
      logger.warn(`Image API test request failed (admin): Status ${testResponse.status}`, { url: curlData.url, errorBody, source: 'imageApiController.testImageApiEndpoint', path: req.path, userId: req.user?.id });
      return next(new AppError(`API request failed with status ${testResponse.status}. Response: ${errorBody}`, 400, 'API_TEST_FAILED'));
    }

    const contentType = testResponse.headers.get('content-type');
    let responseDataPreview = 'Response received successfully. Type: Non-JSON/Image.';
    const responseBodyText = await testResponse.text();

    if (contentType?.includes('application/json')) {
      responseDataPreview = 'JSON response received: ' + responseBodyText.substring(0, 200) + (responseBodyText.length > 200 ? '...' : '');
    } else if (contentType?.includes('image/')) {
      responseDataPreview = `Image data received successfully (Content-Type: ${contentType}).`;
    } else {
      responseDataPreview = 'Text response received: ' + responseBodyText.substring(0, 200) + (responseBodyText.length > 200 ? '...' : '');
    }
    logger.info('Image API test completed successfully (admin)', { statusCode: testResponse.status, contentType, source: 'imageApiController.testImageApiEndpoint', path: req.path, userId: req.user?.id });

    return res.json({
      success: true,
      message: 'Image API test completed successfully.',
      details: {
        statusCode: testResponse.status,
        statusText: testResponse.statusText,
        contentType: contentType || 'unknown',
        responsePreview: responseDataPreview,
      },
    });
  } catch (err) {
    logger.error('Error testing Image API (admin)', { error: err.message, body: req.body, source: 'imageApiController.testImageApiEndpoint', path: req.path, userId: req.user?.id });
    return next(new AppError(err.message || 'Failed to test image API.', 400, 'API_TEST_EXCEPTION'));
  }
};

// Settings related functions, assuming they are managed by ImageApiController for now
exports.getImageSizeSettings = async (req, res, next) => {
  try {
    logger.debug('Fetching image size settings...', { source: 'imageApiController.getImageSizeSettings', path: req.path, userId: req.user?.id });
    const settings = await ImageSettings.findOne({ type: 'sizes' }).lean();
    if (!settings || !settings.values) {
      logger.debug('No image size settings found, returning empty array.', { source: 'imageApiController.getImageSizeSettings', path: req.path, userId: req.user?.id });
      return res.json({ values: [] });
    }
    logger.debug(`Found ${settings.values.length} image sizes.`, { source: 'imageApiController.getImageSizeSettings', path: req.path, userId: req.user?.id });
    return res.json({ values: settings.values });
  } catch (err) {
    logger.error('Error loading image sizes settings', { error: err.message, source: 'imageApiController.getImageSizeSettings', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to load size settings.', 500, 'SETTINGS_LOAD_ERROR'));
  }
};

exports.getImageStyleSettings = async (req, res, next) => {
  try {
    logger.debug('Fetching image style settings...', { source: 'imageApiController.getImageStyleSettings', path: req.path, userId: req.user?.id });
    const settings = await ImageSettings.findOne({ type: 'styles' }).lean();
    if (!settings || !settings.values) {
      logger.debug('No image style settings found, returning empty array.', { source: 'imageApiController.getImageStyleSettings', path: req.path, userId: req.user?.id });
      return res.json({ values: [] });
    }
    logger.debug(`Found ${settings.values.length} image styles.`, { source: 'imageApiController.getImageStyleSettings', path: req.path, userId: req.user?.id });
    return res.json({ values: settings.values });
  } catch (err) {
    logger.error('Error loading image styles settings', { error: err.message, source: 'imageApiController.getImageStyleSettings', path: req.path, userId: req.user?.id });
    return next(new AppError('Failed to load style settings.', 500, 'SETTINGS_LOAD_ERROR'));
  }
};

// Note: The /debug/settings route from original image-apis.js is not included here
// as it seems more like a temporary debug utility rather than a core controller function.
// If needed, it can be added or kept in the routes file if it doesn't fit the controller's responsibility.
