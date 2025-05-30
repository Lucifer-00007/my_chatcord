const mongoose = require('mongoose');
const logger = require('../logger'); // Import logger

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB Connected...', { source: 'database' });
  } catch (err) {
    logger.error('MongoDB connection error', {
      error: err.message,
      stack: err.stack,
      source: 'database',
    });
    process.exit(1);
  }
};

module.exports = connectDB;
