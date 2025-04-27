const { chat } = require('./constants');
const Room = require('../models/Room');
const Settings = require('../models/Settings');

async function initializeRooms() {
    try {
        // Check if we have any rooms
        const roomCount = await Room.countDocuments();
        
        if (roomCount === 0) {
            console.log('No rooms found. Creating default rooms...');
            
            // Create default rooms
            await Promise.all(
                chat.DEFAULT_ROOMS.map(async room => {
                    const newRoom = new Room({
                        name: room.name,
                        topic: room.topic,
                        isDefault: true
                    });
                    await newRoom.save();
                })
            );
            
            console.log('Default rooms created successfully');
        }
    } catch (err) {
        console.error('Error initializing rooms:', err);
    }
}

async function initializeSettings() {
    try {
        const settingsCount = await Settings.countDocuments();
        if (settingsCount === 0) {
            console.log('No settings found. Creating default settings...');
            const settings = new Settings();
            await settings.save();
            console.log('Default settings created successfully');
        }
    } catch (err) {
        console.error('Error initializing settings:', err);
    }
}

async function initialize() {
    await initializeRooms();
    await initializeSettings();
}

module.exports = {
    initialize,
    initializeRooms,
    initializeSettings
};
