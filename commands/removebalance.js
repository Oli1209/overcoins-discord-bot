const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'removebalance',
    description: 'Remove coins from a user (Admin only)',
    
    async execute(message, args) {
        try {
            // Check if user has administrator permissions
            if (!message.member.permissions.has('Administrator')) {
                await message.reply('❌ You need Administrator permissions to use this command.');
                return;
            }

            if (args.length < 2) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!removebalance @user <amount>`\\n\\nExample: `!removebalance @user 100`')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Parse mentioned user
            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                await message.reply('❌ Please mention a valid user to remove coins from.');
                return;
            }

            // Check if trying to remove from a bot
            if (mentionedUser.bot) {
                await message.reply('❌ You cannot remove coins from bots!');
                return;
            }

            // Parse amount
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) {
                await message.reply('❌ Please provide a valid positive amount of coins to remove.');
                return;
            }

            // Make sure target user exists
            await economyService.getUser(message.guild.id, mentionedUser.id, mentionedUser.username);

            // Perform balance removal
            const result = await economyService.removeBalance(
                message.guild.id,
                mentionedUser.id, 
                mentionedUser.username,
                amount
            );

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Removal Failed')
                    .setDescription(result.message)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Success message
            const user = result.user;
            const embed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('⚠️ Balance Removed')
                .setDescription(result.message)
                .addFields(
                    { name: '🎯 Target User', value: `${mentionedUser.username}`, inline: true },
                    { name: '💸 Amount Removed', value: `${amount.toLocaleString()} coins`, inline: true },
                    { name: '👨‍💼 Admin', value: `${message.author.username}`, inline: true },
                    { name: '💵 New In Hand', value: `${user.balance.toLocaleString()} coins`, inline: true },
                    { name: '🏦 New OverBanking', value: `${user.bank_balance.toLocaleString()} coins`, inline: true },
                    { name: '💎 New Total', value: `${(user.balance + user.bank_balance).toLocaleString()} coins`, inline: true }
                )
                .setThumbnail(mentionedUser.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Action by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in removebalance command:', error);
            await message.reply('❌ Sorry, there was an error removing the balance. Please try again later.');
        }
    }
};
