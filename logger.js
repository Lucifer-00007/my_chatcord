// logger.js - Winston logger with daily rotate and DB integration
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const SystemLog = require('./models/SystemLog');

// Define console format based on environment
const consoleFormat = process.env.NODE_ENV === 'development'
  ? winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(
      (info) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        `${info.timestamp} ${info.level}: ${info.message} ${
          // Check if metadata is an object and not empty before stringifying
          info.metadata && Object.keys(info.metadata).length > 0 ? JSON.stringify(info.metadata) : ''
        }`
    )
  )
  : winston.format.json(); // Use JSON format for console in production

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info', // Adjust console level
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'combined.log'),
    format: winston.format.json(), // Explicitly set JSON format for file transport
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info', // Keep level for this specific file transport
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'error.log'),
    format: winston.format.json(), // Explicitly set JSON format for file transport
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error', // Keep level for this specific file transport
  }),
];

const logger = winston.createLogger({
  level: 'debug', // Set base level to debug to allow all levels through transports
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Standardized timestamp
    winston.format.errors({ stack: true }), // Log stack traces for Error objects
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label', 'service'] }), // Puts rest into metadata
    winston.format.json() // Global format for file transports unless overridden
  ),
  defaultMeta: { service: 'chatcord-app' }, // Example default metadata
  transports,
});

// Save logs to MongoDB SystemLog collection
logger.on('data', async (logEntry) => {
  // Prevent recursive logging from DB write failures
  if (logEntry.metadata && logEntry.metadata.internalLog) {
    return;
  }

  try {
    // Only save info, warn, error to DB (or adjust as needed)
    if (['info', 'warn', 'error'].includes(logEntry.level)) {
      await SystemLog.create({
        level: logEntry.level,
        message: logEntry.message,
        // Source and metadata are now typically part of logEntry.metadata due to the new global format
        source: logEntry.metadata?.source || logEntry.source || 'application',
        metadata: logEntry.metadata || {},
        timestamp: logEntry.timestamp ? new Date(logEntry.timestamp) : new Date(),
      });
    }
  } catch (err) {
    // Fallback: log DB error to file only, marking it as an internal log
    logger.error('Failed to write log to SystemLog DB', {
      internalLog: true, // Mark this as an internal log to prevent recursion
      originalLogLevel: logEntry.level,
      originalLogMessage: logEntry.message,
      dbError: err.message,
      dbStack: err.stack,
    });
  }
});

module.exports = logger;
