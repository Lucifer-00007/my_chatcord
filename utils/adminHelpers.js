const { validation } = require('../config/constants');

/**
 * Validates and processes request path value setting
 */
function setValueAtPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const arrayMatch = part.match(/(\w+)\[(\d+)\]/);

    if (arrayMatch) {
      const [_, prop, index] = arrayMatch;
      const idx = Number.parseInt(index, 10);

      if (i === parts.length - 1) {
        if (!current[prop]) current[prop] = [];
        current[prop][idx] = value;
      } else {
        if (!current[prop]) current[prop] = [];
        if (!current[prop][idx]) current[prop][idx] = {};
        current = current[prop][idx];
      }
    } else if (i === parts.length - 1) {
      current[part] = value;
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }
  return obj;
}

/**
 * Validates voice settings range
 */
function validateVoiceRange(range) {
  if (!range || typeof range !== 'object') {
    throw new Error('Invalid range data');
  }

  const requiredFields = ['min', 'max', 'default', 'step'];
  for (const field of requiredFields) {
    if (typeof range[field] !== 'number') {
      throw new Error(`Invalid ${field} value. Must be a number.`);
    }
  }

  if (range.min >= range.max) {
    throw new Error('Minimum value must be less than maximum value');
  }

  if (range.default < range.min || range.default > range.max) {
    throw new Error('Default value must be between min and max values');
  }

  if (range.step <= 0 || range.step > validation.MAX_STEP) {
    throw new Error('Invalid step value');
  }

  return true;
}

/**
 * Processes image settings values based on type
 */
function processImageSettings(type, values) {
  if (!Array.isArray(values)) {
    throw new Error('Values must be an array');
  }

  // logger.debug('Processing settings', { type, valuesCount: values.length });

  return values.map((value) => {
    if (type === 'sizes') {
      let width;
      let height;

      if (value.value?.width && value.value?.height) {
        width = parseInt(value.value.width);
        height = parseInt(value.value.height);
      } else {
        // Try parsing from id/name if value is not provided
        const [w, h] = (value.id || value.name || '').split('x').map(Number);
        width = w;
        height = h;
      }

      if (
        isNaN(width) ||
        isNaN(height) ||
        width < validation.MIN_WIDTH ||
        width > validation.MAX_WIDTH ||
        height < validation.MIN_HEIGHT ||
        height > validation.MAX_HEIGHT
      ) {
        throw new Error(`Invalid dimensions: ${width}x${height}`);
      }

      return {
        id: value.id || `${width}x${height}`,
        name: value.name || `${width}x${height}`,
        label: value.label || `${width}x${height}`,
        value: { width, height },
        isActive: value.isActive !== false,
      };
    }
    if (!value.id && typeof value.name !== 'string') {
    throw new Error('Style must include either id or name');
  }
  const styleId =
    value.id || value.name.toLowerCase().replace(/\s+/g, '-');
    return {
      id: styleId,
      name: value.name,
      value: value.value || styleId,
      isActive: value.isActive !== false,
    };
  });
}

/**
 * Creates a standardized API response
 */
function createApiResponse(success, message, data = null) {
  const response = {
    success,
    message,
  };

  if (data) {
    response.data = data;
  }

  return response;
}

module.exports = {
  setValueAtPath,
  validateVoiceRange,
  processImageSettings,
  createApiResponse,
};
