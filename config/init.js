const Channel = require('../models/Channel');
const { chat } = require('./constants');

const DEFAULT_CHANNELS = chat.DEFAULT_CHANNELS;

const initializeChannels = async () => {
    if (!DEFAULT_CHANNELS || !Array.isArray(DEFAULT_CHANNELS)) {
        console.error('Error: DEFAULT_CHANNELS is missing or not an array in the configuration.');
        return; // Stop execution if config is invalid
    }
    
    try {
        for (const channelData of DEFAULT_CHANNELS) {
            const existing = await Channel.findOne({ name: channelData.name });
            if (!existing) {
                const channel = new Channel({
                    name: channelData.name,
                    topic: channelData.topic,
                    description: `Channel for ${channelData.name} developers`
                });
                await channel.save();
                console.log(`Created channel: ${channelData.name}`);
            }
        }
        console.log('Channels initialized successfully');
    } catch (err) {
        console.error('Error initializing channels:', err);
    }
};

module.exports = { initializeChannels };
