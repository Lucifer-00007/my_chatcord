// logger.js - Winston logger with daily rotate and DB integration
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const SystemLog = require('./models/SystemLog');
const path = require('path');

const transports = [
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'combined.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'error.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
  })
];

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports
});

// Save logs to MongoDB SystemLog collection
logger.on('data', async (log) => {
  try {
    // Only save info, warn, error
    if (['info', 'warn', 'error'].includes(log.level)) {
      await SystemLog.create({
        level: log.level,
        message: log.message,
        source: log.source || 'system',
        metadata: log.metadata || {},
        timestamp: log.timestamp || new Date()
      });
    }
  } catch (err) {
    // Fallback: log DB error to file only
    logger.error('Failed to write log to SystemLog DB', { error: err.message });
  }
});

module.exports = logger;