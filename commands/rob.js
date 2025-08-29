const { EmbedBuilder } = require('discord.js');
const economyService = require('../services/economy');

module.exports = {
    name: 'rob',
    description: 'Attempt to rob another user for their coins (cooldown: 10 minutes)',
    
    async execute(message, args) {
        try {
            // Check if user mentioned someone
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Target')
                    .setDescription('You need to mention someone to rob! Usage: `!rob @username`')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Can't rob yourself
            if (targetUser.id === message.author.id) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Target')
                    .setDescription("You can't rob yourself!")
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Can't rob bots
            if (targetUser.bot) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Target')
                    .setDescription("You can't rob bots!")
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Check cooldown (10 minutes)
            const cooldownCheck = await economyService.checkCooldown(message.guild.id, message.author.id, 'rob');
            if (cooldownCheck.onCooldown) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('⏰ Rob Cooldown')
                    .setDescription(`You need to wait before robbing again! Available in **${cooldownCheck.timeLeft} minutes**.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Ensure both users exist
            const robber = await economyService.getUser(message.guild.id, message.author.id, message.author.username);
            const victim = await economyService.getUser(message.guild.id, targetUser.id, targetUser.username);

            // Check if victim has at least 250 in-hand coins
            if (victim.balance < 250) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Poor Target')
                    .setDescription(`${targetUser.username} doesn't have enough coins to rob! They need at least 250 coins in hand.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Set cooldown first (10 minutes)
            await economyService.setCooldown(message.guild.id, message.author.id, 'rob', 10);

            // 50/50 chance of success
            const isSuccess = Math.random() < 0.5;
            let resultEmbed;

            if (isSuccess) {
                // Success: steal up to 75% of victim's in-hand balance
                const maxSteal = Math.floor(victim.balance * 0.75);
                const stolenAmount = Math.floor(Math.random() * maxSteal) + 1; // 1 to maxSteal

                // Transfer coins from victim to robber
                await economyService.updateBalance(message.guild.id, targetUser.id, -stolenAmount);
                await economyService.updateBalance(message.guild.id, message.author.id, stolenAmount);

                resultEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Robbery Successful!')
                    .setDescription(`You successfully robbed ${targetUser} and got **${stolenAmount} coins**!`)
                    .addFields(
                        { name: '💰 Stolen', value: `${stolenAmount} coins`, inline: true },
                        { name: '⏰ Next Rob', value: 'Available in 10 minutes', inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ 
                        text: `Requested by ${message.author.tag}`, 
                        iconURL: message.author.displayAvatarURL() 
                    });
            } else {
                // Failure: lose random amount (100, 250, 500, or 1000 coins)
                const fines = [100, 250, 500, 1000];
                const fine = fines[Math.floor(Math.random() * fines.length)];
                
                // Make sure robber doesn't go negative
                const actualFine = Math.min(fine, robber.balance);
                if (actualFine > 0) {
                    await economyService.updateBalance(message.guild.id, message.author.id, -actualFine);
                }

                resultEmbed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Robbery Failed!')
                    .setDescription(`You got caught robbing! Fine: **${actualFine} coins**`)
                    .addFields(
                        { name: '💸 Fine', value: `${actualFine} coins`, inline: true },
                        { name: '⏰ Next Rob', value: 'Available in 10 minutes', inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ 
                        text: `Requested by ${message.author.tag}`, 
                        iconURL: message.author.displayAvatarURL() 
                    });
            }

            await message.reply({ embeds: [resultEmbed] });
            
        } catch (error) {
            console.error('Error in rob command:', error);
            await message.reply('❌ Sorry, there was an error with the robbery. Please try again later.');
        }
    }
};
