const { Events } = require('discord.js');
const logger = require('../utils/logger.js');
const config = require('../config/config.js');
const commandHandler = require('../handlers/commandHandler.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore messages from bots
        if (message.author.bot) return;
        
        // Handle mentions
        if (message.mentions.has(client.user)) {
            try {
                await message.reply({
                    content: `Hello ${message.author}! I use commands starting with \`!\`. Type \`!help\` to see what I can do!`,
                    allowedMentions: { repliedUser: false }
                });
                
                logger.info(`Responded to mention from ${message.author.tag} in ${message.guild?.name || 'DM'}`);
            } catch (error) {
                logger.error('Error responding to mention:', error);
            }
            return;
        }
        
        // Handle prefix commands
        if (message.content.startsWith(config.prefix)) {
            const args = message.content.slice(config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Execute command through handler
            await commandHandler.executeCommand(message, client, commandName, args);
            return;
        }
        
        // Log messages in development (optional)
        if (config.environment === 'development' && config.logLevel === 'debug') {
            logger.debug(`Message from ${message.author.tag} in ${message.guild?.name || 'DM'}: ${message.content}`);
        }
    }
};
