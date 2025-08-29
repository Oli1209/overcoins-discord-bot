const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'deposit',
    description: 'Deposit coins from hand to OverBank',
    
    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!deposit <amount|half|all>`\\n\\nExamples:\\n`!deposit 500` - deposit 500 coins\\n`!deposit half` - deposit half of in hand\\n`!deposit all` - deposit all in hand')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Make sure user exists and get current balance
            const user = await economyService.getUser(message.guild.id, message.author.id, message.author.username);

            let amount;
            const input = args[0].toLowerCase();
            
            if (input === 'half') {
                amount = Math.floor(user.balance / 2);
            } else if (input === 'all') {
                amount = user.balance;
            } else {
                amount = parseInt(args[0]);
                if (isNaN(amount) || amount <= 0) {
                    await message.reply('❌ Please provide a valid positive amount, "half", or "all".');
                    return;
                }
            }

            if (amount <= 0) {
                await message.reply('❌ You have no coins in hand to deposit.');
                return;
            }

            // Perform deposit
            const result = await economyService.deposit(message.guild.id, message.author.id, amount);

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Deposit Failed')
                    .setDescription(result.message)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Success message
            const updatedUser = result.user;
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🏦 Deposit Successful')
                .setDescription(result.message)
                .addFields(
                    { name: '💰 Amount', value: `${amount.toLocaleString()} coins`, inline: true },
                    { name: '💵 In hand', value: `${updatedUser.balance.toLocaleString()} coins`, inline: true },
                    { name: '🏦 OverBanking', value: `${updatedUser.bank_balance.toLocaleString()} coins`, inline: true },
                    { name: '💎 Total', value: `${(updatedUser.balance + updatedUser.bank_balance).toLocaleString()} coins`, inline: false }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in deposit command:', error);
            await message.reply('❌ Sorry, there was an error processing your deposit. Please try again later.');
        }
    }
};
