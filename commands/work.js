const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'work',
    description: 'Work to earn coins (cooldown: 5 minutes)',
    
    async execute(message, args) {
        try {
            // Check cooldown
            const cooldownCheck = await economyService.checkCooldown(message.guild.id, message.author.id, 'work');
            if (cooldownCheck.onCooldown) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('⏰ Work Cooldown')
                    .setDescription(`You need to rest! You can work again in **${cooldownCheck.timeLeft} minutes**.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Make sure user exists
            await economyService.getUser(message.guild.id, message.author.id, message.author.username);

            // Random outcome: 70% chance for gain, 30% chance for loss
            const isGain = Math.random() < 0.7;
            let amount, resultMessage, color;

            if (isGain) {
                // Gain between 30-110 coins
                amount = Math.floor(Math.random() * 81) + 30; // 30 to 110
                resultMessage = `You completed your work successfully and earned **${amount} coins**! 💰`;
                color = '#00ff00';
            } else {
                // Loss between 20-80 coins
                amount = -(Math.floor(Math.random() * 61) + 20); // -20 to -80
                resultMessage = `You had a bad day at work and lost **${Math.abs(amount)} coins**... 😓`;
                color = '#ff6b6b';
            }

            // Update balance
            const updatedUser = await economyService.updateBalance(message.guild.id, message.author.id, amount);

            // Set cooldown (5 minutes)
            await economyService.setCooldown(message.guild.id, message.author.id, 'work', 5);

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle('🔨 Work Result')
                .setDescription(resultMessage)
                .addFields(
                    { name: '💰 Change', value: `${amount > 0 ? '+' : ''}${amount} coins`, inline: true },
                    { name: '💎 New Balance', value: `${updatedUser.balance} coins`, inline: true },
                    { name: '⏰ Next Work', value: 'Available in 5 minutes', inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in work command:', error);
            await message.reply('❌ Sorry, there was an error with your work. Please try again later.');
        }
    }
};
