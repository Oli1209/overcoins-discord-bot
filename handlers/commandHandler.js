const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger.js');
const economyService = require('../services/economy.js');
const { EmbedBuilder } = require('discord.js');

class CommandHandler {
    constructor() {
        // Commands that require 10-second global cooldown (economic/gambling commands without specific cooldowns)
        this.globalCooldownCommands = [
            'balance', 'deposit', 'withdraw', 'sell', 'inventory', 
            'leaderboard', 'pay', 'coinflip', 'blackjack', 'slots', 'russianroulette',
            'loan', 'loanpay', 'loanstatus'
        ];
        
        // Commands that already have their own specific cooldowns (skip global cooldown)
        this.specificCooldownCommands = [
            'search', 'work', 'dailyreward', 'rob'
        ];
    }

    /**
     * Load all commands from the commands directory
     * @param {Client} client - Discord client instance
     */
    async loadCommands(client) {
        const commandsPath = path.join(__dirname, '..', 'commands');
        
        try {
            const commandFiles = await fs.readdir(commandsPath);
            const jsFiles = commandFiles.filter(file => file.endsWith('.js'));
            
            for (const file of jsFiles) {
                const filePath = path.join(commandsPath, file);
                
                try {
                    // Clear require cache to allow hot reloading in development
                    delete require.cache[require.resolve(filePath)];
                    
                    const command = require(filePath);
                    
                    // Validate command structure
                    if (!this.validateCommand(command)) {
                        logger.warn(`Invalid command structure in ${file}`);
                        continue;
                    }
                    
                    // Set the command in the collection
                    client.commands.set(command.name, command);
                    logger.info(`Loaded command: ${command.name}`);
                    
                } catch (error) {
                    logger.error(`Error loading command ${file}:`, error);
                }
            }
            
            logger.info(`Successfully loaded ${client.commands.size} commands`);
            
        } catch (error) {
            logger.error('Error reading commands directory:', error);
            throw error;
        }
    }
    
    /**
     * Validate command structure
     * @param {Object} command - Command object to validate
     * @returns {boolean} - Whether the command is valid
     */
    validateCommand(command) {
        return (
            command &&
            command.name &&
            command.description &&
            typeof command.execute === 'function'
        );
    }
    
    /**
     * Execute a command
     * @param {Object} message - Discord message object
     * @param {Client} client - Discord client instance
     * @param {string} commandName - Name of the command to execute
     * @param {Array} args - Command arguments
     */
    async executeCommand(message, client, commandName, args) {
        const command = client.commands.get(commandName);
        
        if (!command) {
            logger.warn(`No command matching ${commandName} was found.`);
            return;
        }
        
        try {
            // Check for 10-second global cooldown on specified commands
            if (this.globalCooldownCommands.includes(commandName)) {
                const cooldownKey = `global_${commandName}`;
                const cooldownCheck = await economyService.checkCooldownSeconds(message.guild.id, message.author.id, cooldownKey);
                
                if (cooldownCheck.onCooldown) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff6b6b')
                        .setTitle('⏳ Command Cooldown')
                        .setDescription(`You must wait ${cooldownCheck.timeLeft} seconds before using this command again.`)
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                    return;
                }
            }
            
            await command.execute(message, args);
            
            // Set global cooldown after successful execution
            if (this.globalCooldownCommands.includes(commandName)) {
                const cooldownKey = `global_${commandName}`;
                await economyService.setCooldownSeconds(message.guild.id, message.author.id, cooldownKey, 10);
            }
            
            logger.info(`Command ${commandName} executed by ${message.author.tag}`);
        } catch (error) {
            logger.error(`Error executing command ${commandName}:`, error);
            
            const errorMessage = 'There was an error while executing this command!';
            
            try {
                await message.reply({ 
                    content: errorMessage, 
                    allowedMentions: { repliedUser: false } 
                });
            } catch (replyError) {
                logger.error('Failed to send error message to user:', replyError);
            }
        }
    }
}

module.exports = new CommandHandler();
