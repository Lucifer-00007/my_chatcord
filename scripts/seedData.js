require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { DEMO_CONFIG, DEFAULT_CHANNELS } = require('../config/constants');

async function createCollectionsIfNotExist() {
    try {
        // Get list of all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);

        // Check and create User collection
        if (!collectionNames.includes('users')) {
            await mongoose.connection.createCollection('users');
            console.log('Created users collection');
        }

        // Check and create Channel collection
        if (!collectionNames.includes('channels')) {
            await mongoose.connection.createCollection('channels');
            console.log('Created channels collection');
        }

        // Check and create Message collection
        if (!collectionNames.includes('messages')) {
            await mongoose.connection.createCollection('messages');
            console.log('Created messages collection');
        }

        console.log('Collection check completed');
    } catch (err) {
        console.error('Error checking/creating collections:', err);
        throw err;
    }
}

async function seedDatabase() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Add collection check before seeding
        await createCollectionsIfNotExist();

        // Create users
        const users = [];
        for (const userData of DEMO_CONFIG.users) {
            const user = new User(userData);
            await user.save();
            users.push(user);
            console.log(`Created user: ${user.username}`);
        }

        // Create all default channels
        const channels = [];
        for (const channelData of DEFAULT_CHANNELS) {
            const channel = new Channel({
                ...channelData,
                description: `Channel for ${channelData.name} developers`,
                createdBy: users[0]._id // Admin creates all channels
            });
            await channel.save();
            channels.push(channel);
            console.log(`Created channel: ${channel.name}`);
        }

        // Create demo messages in JavaScript channel
        const jsChannel = channels.find(ch => ch.name === 'JavaScript');
        if (jsChannel) {
            const messagePromises = DEMO_CONFIG.messages.map((content, index) => {
                const user = users[index % users.length];
                const timeOffset = index * DEMO_CONFIG.messageInterval;
                
                return new Message({
                    content,
                    user: user._id,
                    channel: jsChannel._id,
                    createdAt: new Date(Date.now() - timeOffset)
                }).save();
            });

            await Promise.all(messagePromises);
            console.log('Created demo messages in JavaScript channel');
        }

        console.log('Database seeded successfully!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
}

seedDatabase();
