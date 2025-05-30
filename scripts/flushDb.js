require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger'); // Import logger

async function loadModels() {
  const modelsDir = path.join(__dirname, '..', 'models');
  const files = await fs.readdir(modelsDir);
  const models = {};
  logger.info('Loading models for DB flush...', { source: 'flushDbScript' });

  for (const file of files) {
    if (file.endsWith('.js')) {
      const modelName = path.basename(file, '.js');
      try {
        models[modelName] = require(path.join(modelsDir, file));
        logger.debug(`Model loaded: ${modelName}`, { source: 'flushDbScript' });
      } catch (err) {
        logger.warn(`Could not load model ${modelName}`, {
          error: err.message,
          source: 'flushDbScript',
          modelFile: file,
        });
      }
    }
  }
  logger.info(`Finished loading models for DB flush. Loaded: ${Object.keys(models).length}`, { source: 'flushDbScript' });
  return models;
}

async function flushDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      logger.error('MONGODB_URI is not defined in environment variables.', { source: 'flushDbScript' });
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for database flush.', { source: 'flushDbScript', database: mongoose.connection.name });

    const models = await loadModels();

    logger.info('Starting database flush operation...', { source: 'flushDbScript' });
    // Drop all collections dynamically
    for (const modelName of Object.keys(models)) {
      if (models[modelName] && typeof models[modelName].deleteMany === 'function') {
        await models[modelName].deleteMany({});
        logger.info(`Flushed collection: ${modelName}`, { source: 'flushDbScript', collectionName: modelName });
      } else {
        logger.warn(`Model ${modelName} does not have deleteMany method or is undefined. Skipping.`, { source: 'flushDbScript', modelName });
      }
    }
    logger.info('All collections have been flushed successfully!', { source: 'flushDbScript' });
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed after flushing database.', { source: 'flushDbScript' });
      process.exit(0);
    });
  } catch (err) {
    logger.error('Error flushing database', {
      error: err.message,
      stack: err.stack,
      source: 'flushDbScript',
    });
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(() => {
        logger.info('MongoDB connection closed after database flush failure.', { source: 'flushDbScript' });
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  }
}

flushDatabase();
