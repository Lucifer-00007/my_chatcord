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

async function exportData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Ensure data directory exists
        const dataDir = path.join(__dirname, 'data');
        await fs.mkdir(dataDir, { recursive: true });

        // Export each collection
        for (const [name, model] of Object.entries(models)) {
            console.log(`\nExporting ${name}...`);
            
            try {
                const docs = await model.find({});
                console.log(`Found ${docs.length} documents`);

                if (docs.length > 0) {
                    const filePath = path.join(dataDir, `${name.toLowerCase()}.json`);
                    await fs.writeFile(
                        filePath, 
                        JSON.stringify(docs, null, 2)
                    );
                    console.log(`Exported to ${filePath}`);
                }
            } catch (err) {
                console.error(`Error exporting ${name}:`, err);
            }
        }

        console.log('\nExport completed');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Export failed:', err);
        process.exit(1);
    }
}

exportData();
