const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'dailyreward',
    description: 'Claim your daily reward of 500 coins',
    
    async execute(message, args) {
        try {
            const result = await economyService.claimDailyReward(message.guild.id, message.author.id, message.author.username);
            
            const embed = new EmbedBuilder()
                .setColor(result.success ? '#00ff00' : '#ff6b6b')
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            if (result.success) {
                embed
                    .setTitle('🎁 Daily Reward Claimed!')
                    .setDescription(result.message)
                    .addFields(
                        { name: '💰 Received', value: `${result.amount} coins`, inline: true },
                        { name: '💎 New Balance', value: `${result.newBalance} coins`, inline: true }
                    );
            } else {
                embed
                    .setTitle('⏰ Daily Reward Already Claimed')
                    .setDescription(result.message);
            }

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in dailyreward command:', error);
            await message.reply('❌ Sorry, there was an error claiming your daily reward. Please try again later.');
        }
    }
};
