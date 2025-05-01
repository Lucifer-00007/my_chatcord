require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

async function loadModels() {
    const modelsDir = path.join(__dirname, '..', 'models');
    const files = await fs.readdir(modelsDir);
    const models = {};
    for (const file of files) {
        if (file.endsWith('.js')) {
            const modelName = path.basename(file, '.js');
            try {
                models[modelName] = require(path.join(modelsDir, file));
            } catch (err) {
                console.warn(`Warning: Could not load model ${modelName}:`, err.message);
            }
        }
    }
    return models;
}

async function flushDatabase() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');
        const models = await loadModels();
        // Drop all collections dynamically
        for (const modelName of Object.keys(models)) {
            if (typeof models[modelName].deleteMany === 'function') {
                await models[modelName].deleteMany({});
                console.log(`Flushed ${modelName}`);
            }
        }
        console.log('All collections have been flushed!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error flushing database:', err);
        process.exit(1);
    }
}

flushDatabase();
