require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger'); // Import logger

async function loadModels() {
  const modelsDir = path.join(__dirname, '..', 'models');
  const files = await fs.readdir(modelsDir);
  const models = {};
  logger.info('Loading models...', { source: 'exportDataScript' });

  for (const file of files) {
    if (file.endsWith('.js')) {
      const modelName = path.basename(file, '.js');
      try {
        models[modelName] = require(path.join(modelsDir, file));
        logger.debug(`Model loaded: ${modelName}`, { source: 'exportDataScript' });
      } catch (err) {
        logger.warn(`Could not load model ${modelName}`, {
          error: err.message,
          source: 'exportDataScript',
          modelFile: file,
        });
      }
    }
  }
  logger.info(`Finished loading models. Loaded: ${Object.keys(models).length}`, { source: 'exportDataScript' });
  return models;
}

async function exportData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for data export.', { source: 'exportDataScript', database: mongoose.connection.name });

    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    logger.info(`Data export directory ensured: ${dataDir}`, { source: 'exportDataScript' });

    // Load models dynamically
    const models = await loadModels();

    // Export each collection
    for (const [name, model] of Object.entries(models)) {
      logger.info(`Exporting collection: ${name}...`, { source: 'exportDataScript', collectionName: name });

      try {
        const docs = await model.find({});
        logger.info(`Found ${docs.length} documents in ${name}.`, { source: 'exportDataScript', collectionName: name, count: docs.length });

        if (docs.length > 0) {
          const filePath = path.join(dataDir, `${name.toLowerCase()}.json`);
          await fs.writeFile(filePath, JSON.stringify(docs, null, 2));
          logger.info(`Exported ${name} to ${filePath}`, { source: 'exportDataScript', collectionName: name, filePath });
        } else {
          logger.info(`No documents to export for ${name}.`, { source: 'exportDataScript', collectionName: name });
        }
      } catch (err) {
        logger.error(`Error exporting collection ${name}`, {
          error: err.message,
          stack: err.stack,
          collectionName: name,
          source: 'exportDataScript',
        });
      }
    }

    logger.info('Data export completed successfully.', { source: 'exportDataScript' });
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed after export.', { source: 'exportDataScript' });
      process.exit(0);
    });
  } catch (err) {
    logger.error('Data export failed', {
      error: err.message,
      stack: err.stack,
      source: 'exportDataScript',
    });
    // Ensure connection is closed even on failure, if it was opened.
    if (mongoose.connection.readyState === 1) { // 1 === connected
      mongoose.connection.close(() => {
        logger.info('MongoDB connection closed after export failure.', { source: 'exportDataScript' });
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  }
}

exportData();
