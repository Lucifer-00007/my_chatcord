require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Import all models
const models = {
    User: require('../models/User'),
    Channel: require('../models/Channel'),
    Message: require('../models/Message'),
    AiApi: require('../models/AiApi'),
    AiChat: require('../models/AiChat'),
    ImageApi: require('../models/ImageApi'),
    ImageSettings: require('../models/ImageSettings'),
    VoiceApi: require('../models/VoiceApi'),
    VoiceSettings: require('../models/VoiceSettings')
};

async function importData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

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
                    console.log(`No data file found for ${name}`);
                    continue;
                }

                const data = JSON.parse(
                    await fs.readFile(filePath, 'utf8')
                );

                if (data.length > 0) {
                    await model.deleteMany({}); // Clear existing data
                    await model.insertMany(data);
                    console.log(`Imported ${data.length} documents`);
                }
            } catch (err) {
                console.error(`Error importing ${name}:`, err);
            }
        }

        console.log('\nImport completed');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Import failed:', err);
        process.exit(1);
    }
}

importData();
