const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'balance',
    description: 'Check your coin balance',
    
    async execute(message, args) {
        try {
            // Get or create user for this guild
            const user = await economyService.getUser(message.guild.id, message.author.id, message.author.username);
            
            const inHand = user.balance || 0;
            const overBanking = user.bank_balance || 0;
            const sum = inHand + overBanking;
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💰 Your Balance')
                .setDescription(`**Financial Overview**`)
                .addFields(
                    { name: '💵 In hand', value: `${inHand.toLocaleString()} coins`, inline: true },
                    { name: '🏦 OverBanking', value: `${overBanking.toLocaleString()} coins`, inline: true },
                    { name: '💎 Sum', value: `${sum.toLocaleString()} coins`, inline: true },
                    { name: '📊 Total Earned', value: `${user.total_earned.toLocaleString()} coins`, inline: true },
                    { name: '📅 Last Daily', value: user.last_daily ? `<t:${Math.floor(new Date(user.last_daily).getTime() / 1000)}:R>` : 'Never claimed', inline: true },
                    { name: '💡 Banking', value: 'Use `!deposit` and `!withdraw`', inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in balance command:', error);
            await message.reply('❌ Sorry, there was an error checking your balance. Please try again later.');
        }
    }
};
