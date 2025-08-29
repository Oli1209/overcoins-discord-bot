const { Events } = require('discord.js');
const logger = require('../utils/logger.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            // Handle button interactions for blackjack
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('blackjack_')) {
                    const blackjackCommand = client.commands.get('blackjack');
                    if (blackjackCommand && blackjackCommand.handleInteraction) {
                        await blackjackCommand.handleInteraction(interaction);
                        logger.info(`Blackjack interaction ${interaction.customId} handled for ${interaction.user.tag}`);
                    } else {
                        logger.warn('Blackjack command not found or missing handleInteraction method');
                        await interaction.reply({ 
                            content: '❌ Blackjack command is currently unavailable.', 
                            ephemeral: true 
                        });
                    }
                    return;
                }

                // Handle higher/lower interactions
                if (interaction.customId.startsWith('hl_')) {
                    const higherLowerCommand = client.commands.get('higherlower');
                    if (higherLowerCommand) {
                        if (interaction.customId === 'hl_cashout') {
                            await higherLowerCommand.handleCashOut(interaction);
                        } else {
                            await higherLowerCommand.handleInteraction(interaction);
                        }
                        logger.info(`HigherLower interaction ${interaction.customId} handled for ${interaction.user.tag}`);
                    } else {
                        logger.warn('HigherLower command not found');
                        await interaction.reply({ 
                            content: '❌ HigherLower command is currently unavailable.', 
                            ephemeral: true 
                        });
                    }
                    return;
                }
            }

            // Handle slash commands (if needed in the future)
            if (interaction.isChatInputCommand()) {
                logger.info(`Slash command ${interaction.commandName} attempted by ${interaction.user.tag}`);
                await interaction.reply({ 
                    content: 'This bot uses prefix commands. Use `!help` to see available commands.', 
                    ephemeral: true 
                });
                return;
            }

        } catch (error) {
            logger.error('Error handling interaction:', error);
            
            try {
                const errorMessage = '❌ There was an error processing your interaction.';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (replyError) {
                logger.error('Failed to send error message for interaction:', replyError);
            }
        }
    }
};
