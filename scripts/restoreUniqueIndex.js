require('dotenv').config();
const mongoose = require('mongoose');

async function restoreUniqueIndex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Drop the non-unique index if it exists
        try {
            await mongoose.connection.db.collection('aiapis').dropIndex('name_1');
            console.log('Dropped existing index');
        } catch (err) {
            console.log('No existing index to drop');
        }

        // Create unique index
        await mongoose.connection.db.collection('aiapis').createIndex(
            { name: 1 }, 
            { 
                unique: true,
                collation: { locale: 'en', strength: 2 }
            }
        );
        console.log('Successfully restored unique index on name field');

        await mongoose.connection.close();
        console.log('Done. Database connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error restoring unique index:', err);
        process.exit(1);
    }
}

restoreUniqueIndex();
