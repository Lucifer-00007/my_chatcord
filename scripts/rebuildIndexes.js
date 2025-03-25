require('dotenv').config();
const mongoose = require('mongoose');

async function rebuildIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Drop all indexes from imageapis collection
        await mongoose.connection.db.collection('imageapis').dropIndexes();
        console.log('Dropped all indexes');

        // Recreate the indexes fresh
        await mongoose.connection.db.collection('imageapis').createIndex(
            { name: 1 },
            { 
                unique: true,
                collation: { locale: 'en', strength: 2 },
                background: true,
                sparse: true
            }
        );
        console.log('Created new indexes');

        await mongoose.connection.close();
        console.log('Done');
        process.exit(0);
    } catch (err) {
        console.error('Error rebuilding indexes:', err);
        process.exit(1);
    }
}

rebuildIndexes();
