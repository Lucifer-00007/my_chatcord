require('dotenv').config();
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

async function importData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const models = await loadModels();
        const dataDir = path.join(__dirname, 'data');
        
        // Import each collection
        for (const [name, model] of Object.entries(models)) {
            console.log(`\nImporting ${name}...`);
            
            try {
                const filePath = path.join(dataDir, `${name.toLowerCase()}.json`);
                const fileExists = await fs.access(filePath)
                    .then(() => true)
                    .catch(() => false);

                if (!fileExists) {
                    console.log(`No data file found for ${name}, skipping...`);
                    continue;
                }

                const data = JSON.parse(
                    await fs.readFile(filePath, 'utf8')
                );

                if (Array.isArray(data) && data.length > 0) {
                    console.log(`Found ${data.length} documents to import for ${name}`);
                    await model.deleteMany({}); // Clear existing data
                    await model.insertMany(data);
                    console.log(`Successfully imported ${data.length} documents for ${name}`);
                } else {
                    console.log(`No valid data found in ${name.toLowerCase()}.json`);
                }
            } catch (err) {
                console.error(`Error importing ${name}:`, err.message);
            }
        }

        console.log('\nImport completed successfully');
    } catch (err) {
        console.error('Import failed:', err.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

importData();
