const { EmbedBuilder } = require('discord.js');
const economyService = require('../services/economy');

module.exports = {
    name: 'loanpay',
    description: 'Repay part or all of your loan from your bank balance',
    
    async execute(message, args) {
        try {
            // Check if amount is provided
            if (args.length === 0 || !args[0]) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Missing Amount')
                    .setDescription('Please specify the repayment amount! Usage: `!loanpay <amount>`')
                    .addFields(
                        { name: 'Example', value: '`!loanpay 500` - Repay 500 coins from your bank balance', inline: false }
                    )
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Parse the amount
            const repayAmount = parseInt(args[0]);
            if (isNaN(repayAmount) || repayAmount <= 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Amount')
                    .setDescription('Please enter a valid positive number!')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Attempt to repay the loan
            const result = await economyService.repayLoan(message.guild.id, message.author.id, repayAmount);
            
            const embed = new EmbedBuilder()
                .setColor(result.success ? '#00ff00' : '#ff6b6b')
                .setTitle(result.success ? (result.isFullyPaid ? '✅ Loan Fully Repaid!' : '💰 Loan Payment Made') : '❌ Payment Failed')
                .setDescription(result.message)
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            if (result.success) {
                embed.addFields(
                    { name: '💸 Payment Amount', value: `${result.repaidAmount} coins`, inline: true },
                    { name: '🏦 New Bank Balance', value: `${result.user.bank_balance} coins`, inline: true }
                );

                if (!result.isFullyPaid) {
                    embed.addFields(
                        { name: '💳 Remaining Loan', value: `${result.remainingBalance} coins`, inline: true }
                    );
                }
            }

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in loanpay command:', error);
            await message.reply('❌ Sorry, there was an error processing your payment. Please try again later.');
        }
    }
};
