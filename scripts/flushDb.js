require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');

async function flushDatabase() {
    try {
        // Add check for MONGODB_URI
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Drop all collections
        await User.deleteMany({});
        await Message.deleteMany({});
        await Channel.deleteMany({});

        console.log('All collections have been flushed!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error flushing database:', err);
        process.exit(1);
    }
}

flushDatabase();
