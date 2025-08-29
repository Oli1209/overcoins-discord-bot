const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'addcoins',
    description: 'Add coins to a user (Admin only)',
    
    async execute(message, args) {
        try {
            // Check if user has admin permissions
            if (!message.member.permissions.has('Administrator')) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Access Denied')
                    .setDescription('Only server administrators can use this command.')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Parse arguments
            if (args.length < 2) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!addcoins <amount> <@user>`\\nExample: `!addcoins 1000 @username`')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const amount = parseInt(args[0]);
            const targetUser = message.mentions.users.first();

            if (isNaN(amount)) {
                await message.reply('❌ Please provide a valid number for the amount.');
                return;
            }

            if (!targetUser) {
                await message.reply('❌ Please mention a valid user.');
                return;
            }

            // Add coins to the target user
            const updatedUser = await economyService.addCoins(message.guild.id, targetUser.id, targetUser.username, amount);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Coins Added Successfully')
                .setDescription(`Added **${amount} coins** to ${targetUser.username}`)
                .addFields(
                    { name: '👤 Target User', value: targetUser.tag, inline: true },
                    { name: '💰 Amount Added', value: `${amount} coins`, inline: true },
                    { name: '💎 New Balance', value: `${updatedUser.balance} coins`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Action by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in addcoins command:', error);
            await message.reply('❌ Sorry, there was an error adding coins. Please try again later.');
        }
    }
};
