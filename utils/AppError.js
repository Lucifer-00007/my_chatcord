// utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode, errorCode, details) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = String(this.statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Operational, trusted error: send to client
    this.errorCode = errorCode; // Optional custom error code
    this.details = details; // Optional additional details

    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;
