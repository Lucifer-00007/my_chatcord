require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const RoomChat = require('../models/RoomChat');
const { demo, chat } = require('../config/constants');

async function createCollectionsIfNotExist() {
  try {
    // Get list of all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections.map((col) => col.name);

    // Check and create User collection
    if (!collectionNames.includes('users')) {
      await mongoose.connection.createCollection('users');
      console.log('Created users collection');
    }

    // Check and create Room collection
    if (!collectionNames.includes('rooms')) {
      await mongoose.connection.createCollection('rooms');
      console.log('Created rooms collection');
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
    for (const userData of demo.users) {
      const user = new User(userData);
      await user.save();
      users.push(user);
      console.log(`Created user: ${user.username}`);
    }

    // Create all default rooms
    const rooms = [];
    for (const roomData of chat.DEFAULT_ROOMS) {
      const room = new Room({
        ...roomData,
        description: `Room for ${roomData.name} developers`,
        createdBy: users[0]._id, // Admin creates all rooms
      });
      await room.save();
      rooms.push(room);
      console.log(`Created room: ${room.name}`);
    }

    // Create demo messages in JavaScript room
    const jsRoom = rooms.find((r) => r.name === 'JavaScript');
    if (jsRoom) {
      const messageObjs = demo.messages.map((content, index) => {
        const user = users[index % users.length];
        const timeOffset = index * demo.messageInterval;
        return {
          content,
          user: user._id,
          username: user.username,
          createdAt: new Date(Date.now() - timeOffset),
          roomId: jsRoom._id,
          roomName: jsRoom.name,
        };
      });
      let roomChat = await RoomChat.findOne({ room: jsRoom._id });
      if (!roomChat) {
        roomChat = new RoomChat({
          room: jsRoom._id,
          messages: messageObjs,
          roomName: jsRoom.name,
        });
      } else {
        roomChat.messages.push(...messageObjs);
        roomChat.roomName = jsRoom.name;
      }
      await roomChat.save();
      console.log('Created demo messages in JavaScript room');
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
