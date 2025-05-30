const { chat } = require('./constants');
const Room = require('../models/Room');
const Settings = require('../models/Settings');
const logger = require('../logger');

async function initializeRooms() {
  try {
    // Check if we have any rooms
    const roomCount = await Room.countDocuments();

    if (roomCount === 0) {
      logger.info('No rooms found. Creating default rooms...', { source: 'init' });

      // Create default rooms
      await Promise.all(
        chat.DEFAULT_ROOMS.map(async (roomData) => { // Renamed room to roomData to avoid conflict
          const newRoom = new Room({
            name: roomData.name,
            topic: roomData.topic,
            isDefault: true,
          });
          await newRoom.save();
          logger.debug(`Default room "${roomData.name}" created.`, { source: 'init', room: newRoom.toObject() });
        })
      );

      logger.info('Default rooms created successfully.', { source: 'init', count: chat.DEFAULT_ROOMS.length });
    } else {
      logger.info('Rooms already initialized.', { source: 'init', count: roomCount });
    }
  } catch (err) {
    logger.error('Error initializing rooms', {
      error: err.message,
      stack: err.stack,
      source: 'init',
    });
  }
}

async function initializeSettings() {
  try {
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      logger.info('No settings found. Creating default settings...', { source: 'init' });
      const settings = new Settings();
      await settings.save();
      logger.info('Default settings created successfully.', { source: 'init', settings: settings.toObject() });
    } else {
      logger.info('Settings already initialized.', { source: 'init' });
    }
  } catch (err) {
    logger.error('Error initializing settings', {
      error: err.message,
      stack: err.stack,
      source: 'init',
    });
  }
}

async function initialize() {
  await initializeRooms();
  await initializeSettings();
}

module.exports = {
  initialize,
  initializeRooms,
  initializeSettings,
};
