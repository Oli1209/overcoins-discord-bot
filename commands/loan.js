const { EmbedBuilder } = require('discord.js');
const economyService = require('../services/economy');

module.exports = {
    name: 'loan',
    description: 'Take a loan from the bank (max: 2500 coins, 15% interest)',
    
    async execute(message, args) {
        try {
            // Check if amount is provided
            if (args.length === 0 || !args[0]) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Missing Amount')
                    .setDescription('Please specify the loan amount! Usage: `!loan <amount>`\n\nMaximum loan: 2500 coins\nInterest rate: 15%')
                    .addFields(
                        { name: 'Example', value: '`!loan 1000` - Borrow 1000 coins, repay 1150 coins', inline: false }
                    )
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Parse the amount
            const loanAmount = parseInt(args[0]);
            if (isNaN(loanAmount) || loanAmount <= 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Amount')
                    .setDescription('Please enter a valid positive number!')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Attempt to take the loan
            const result = await economyService.takeLoan(message.guild.id, message.author.id, message.author.username, loanAmount);
            
            const embed = new EmbedBuilder()
                .setColor(result.success ? '#00ff00' : '#ff6b6b')
                .setTitle(result.success ? '💳 Loan Approved!' : '❌ Loan Denied')
                .setDescription(result.message)
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            if (result.success) {
                embed.addFields(
                    { name: '💰 Loan Amount', value: `${result.loanAmount} coins`, inline: true },
                    { name: '💳 Total Repayment', value: `${result.totalRepayment} coins`, inline: true },
                    { name: '🏦 New Bank Balance', value: `${result.user.bank_balance} coins`, inline: true }
                );
            }

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in loan command:', error);
            await message.reply('❌ Sorry, there was an error processing your loan. Please try again later.');
        }
    }
};
