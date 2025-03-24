require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Drop the unique index
        await mongoose.connection.db.collection('aiapis').dropIndex('name_1');
        console.log('Successfully dropped unique index on name field');

        // Recreate index without unique constraint
        await mongoose.connection.db.collection('aiapis').createIndex(
            { name: 1 }, 
            { unique: false, collation: { locale: 'en', strength: 2 } }
        );
        console.log('Created new non-unique index');

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error fixing indexes:', err);
        process.exit(1);
    }
}

fixIndexes();
