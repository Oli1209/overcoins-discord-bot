const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger.js');
const config = require('../config/config.js');
const KeepAlive = require('../utils/keepAlive.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Ready! Logged in as ${client.user.tag}`);
        logger.info(`Bot is running in ${client.guilds.cache.size} servers`);
        
        // Set initial bot presence
        try {
            await client.user.setPresence({
                activities: [{
                    name: '🎰 In casino | Playing blackjack ♠️♥️',
                    type: ActivityType.Playing
                }],
                status: 'online'
            });
            logger.info('Bot activity set successfully');
        } catch (error) {
            logger.error('Failed to set bot activity:', error);
        }
        
        // Log some useful information
        logger.info(`Environment: ${config.environment}`);
        logger.info(`Commands loaded: ${client.commands.size}`);
        
        // Log guild information
        if (config.environment === 'development') {
            client.guilds.cache.forEach(guild => {
                logger.info(`Connected to guild: ${guild.name} (${guild.id})`);
            });
        }
        
        // Initialize keep-alive system
        try {
            const keepAlive = new KeepAlive(client);
            client.keepAlive = keepAlive; // Store reference on client for potential later use
            keepAlive.start();
            logger.info('Keep-alive system initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize keep-alive system:', error);
        }
    }
};
