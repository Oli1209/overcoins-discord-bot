const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'withdraw',
    description: 'Withdraw coins from OverBank to hand',
    
    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!withdraw <amount|half|all>`\\n\\nExamples:\\n`!withdraw 500` - withdraw 500 coins\\n`!withdraw half` - withdraw half from bank\\n`!withdraw all` - withdraw all from bank')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Make sure user exists and get current balance
            const user = await economyService.getUser(message.guild.id, message.author.id, message.author.username);

            let amount;
            const input = args[0].toLowerCase();
            
            if (input === 'half') {
                amount = Math.floor((user.bank_balance || 0) / 2);
            } else if (input === 'all') {
                amount = user.bank_balance || 0;
            } else {
                amount = parseInt(args[0]);
                if (isNaN(amount) || amount <= 0) {
                    await message.reply('❌ Please provide a valid positive amount, "half", or "all".');
                    return;
                }
            }

            if (amount <= 0) {
                await message.reply('❌ You have no coins in your OverBank to withdraw.');
                return;
            }

            // Perform withdrawal
            const result = await economyService.withdraw(message.guild.id, message.author.id, amount);

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Withdrawal Failed')
                    .setDescription(result.message)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Success message
            const updatedUser = result.user;
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💰 Withdrawal Successful')
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
            console.error('Error in withdraw command:', error);
            await message.reply('❌ Sorry, there was an error processing your withdrawal. Please try again later.');
        }
    }
};
