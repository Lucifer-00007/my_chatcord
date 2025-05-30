const AppError = require('../utils/AppError');

const validate = (schema, property = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => ({
      message: detail.message,
      field: detail.path.join('.'), // Changed 'path' to 'field' and joined the array
    }));
    // Pass the AppError to the centralized error handler
    return next(
      new AppError('Invalid input data.', 400, 'VALIDATION_ERROR', errors)
    );
  }
  return next();
};

module.exports = validate;
