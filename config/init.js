const Channel = require('../models/Channel');
const { DEFAULT_CHANNELS } = require('./constants');

const initializeChannels = async () => {
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
