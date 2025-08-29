const { EmbedBuilder } = require('discord.js');
const economyService = require('../services/economy');

module.exports = {
    name: 'loanstatus',
    description: 'Check your current loan status and repayment information',
    
    async execute(message, args) {
        try {
            // Get loan status
            const loanStatus = await economyService.getLoanStatus(message.guild.id, message.author.id);
            
            const embed = new EmbedBuilder()
                .setColor(loanStatus.hasLoan ? '#ffaa00' : '#00ff00')
                .setTitle(loanStatus.hasLoan ? '💳 Current Loan Status' : '✅ No Active Loan')
                .setDescription(loanStatus.message)
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            if (loanStatus.hasLoan) {
                embed.addFields(
                    { name: '💰 Original Loan', value: `${loanStatus.loanAmount} coins`, inline: true },
                    { name: '💳 Remaining Balance', value: `${loanStatus.remainingBalance} coins`, inline: true },
                    { name: '📊 Total Repayment', value: `${loanStatus.totalRepayment} coins`, inline: true }
                );

                const paidAmount = loanStatus.totalRepayment - loanStatus.remainingBalance;
                const progressPercentage = Math.floor((paidAmount / loanStatus.totalRepayment) * 100);
                
                embed.addFields(
                    { name: '✅ Amount Paid', value: `${paidAmount} coins (${progressPercentage}%)`, inline: false }
                );
            } else {
                embed.addFields(
                    { name: '💡 Tip', value: 'You can take a loan up to 2500 coins with `!loan <amount>`\nInterest rate: 15%', inline: false }
                );
            }

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in loanstatus command:', error);
            await message.reply('❌ Sorry, there was an error checking your loan status. Please try again later.');
        }
    }
};
