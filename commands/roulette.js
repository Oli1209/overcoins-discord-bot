const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'roulette',
    description: 'Play casino roulette - bet on red, black, or green',

    async execute(message, args) {
        try {
            if (args.length !== 2) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!roulette <amount> <color>`')
                    .addFields(
                        { name: '💰 Amount', value: 'Enter bet amount in coins', inline: true },
                        { name: '🎨 Colors', value: '**red** - 2x payout\n**black** - 2x payout\n**green** - 14x payout', inline: true },
                        { name: '🎯 Example', value: '`!roulette 100 red`', inline: false }
                    )
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const amount = parseInt(args[0]);
            const color = args[1].toLowerCase();

            // Validate bet amount
            if (isNaN(amount) || amount <= 0) {
                await message.reply('❌ Please enter a valid positive number for the bet amount.');
                return;
            }

            if (amount > 10000) {
                await message.reply('❌ Maximum bet is 10,000 coins per spin.');
                return;
            }

            // Validate color choice
            if (!['red', 'black', 'green'].includes(color)) {
                await message.reply('❌ Invalid color! Choose: **red**, **black**, or **green**');
                return;
            }

            // Check user balance
            const user = await economyService.getUser(message.guild.id, message.author.id);
            const userBalance = user ? user.balance : 0;
            if (userBalance < amount) {
                await message.reply(`❌ You don't have enough coins! Your balance: **${userBalance}** coins`);
                return;
            }

            // Check cooldown
            const cooldownCheck = await economyService.checkCooldownSeconds(message.guild.id, message.author.id, 'roulette');
            if (cooldownCheck.onCooldown) {
                await message.reply(`⏳ You must wait ${cooldownCheck.timeLeft} seconds before using this command again.`);
                return;
            }

            // Deduct bet
            await economyService.updateBalance(message.guild.id, message.author.id, -amount);
            await economyService.setCooldownSeconds(message.guild.id, message.author.id, 'roulette', 10);

            // Show spinning animation
            const spinEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🎰 Casino Roulette')
                .setDescription('**The ball is spinning...**')
                .addFields(
                    { name: '💰 Bet', value: `${amount} coins on **${color}**`, inline: true },
                    { name: '🎯 Possible Payouts', value: `Red/Black: ${amount * 2}\nGreen: ${amount * 14}`, inline: true },
                    { name: '⏳ Status', value: 'Spinning...', inline: false }
                )
                .setTimestamp();

            const gameMessage = await message.reply({ embeds: [spinEmbed] });

            // Dramatic pause
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Generate result
            // 18 red numbers: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
            // 18 black numbers: 2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35
            // 1 green: 0
            
            const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
            const blackNumbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
            const greenNumbers = [0];
            
            const allNumbers = [...redNumbers, ...blackNumbers, ...greenNumbers];
            const winningNumber = allNumbers[Math.floor(Math.random() * allNumbers.length)];
            
            let winningColor;
            if (redNumbers.includes(winningNumber)) {
                winningColor = 'red';
            } else if (blackNumbers.includes(winningNumber)) {
                winningColor = 'black';
            } else {
                winningColor = 'green';
            }

            // Determine win/loss
            const isWin = color === winningColor;
            let winnings = 0;
            
            if (isWin) {
                if (winningColor === 'green') {
                    winnings = amount * 14;
                } else {
                    winnings = amount * 2;
                }
                await economyService.updateBalance(message.guild.id, message.author.id, winnings);
            }

            // Color emojis for display
            const colorEmojis = {
                'red': '🔴',
                'black': '⚫',
                'green': '🟢'
            };

            // Create result embed
            const resultEmbed = new EmbedBuilder()
                .setColor(isWin ? '#00ff00' : '#ff0000')
                .setTitle(isWin ? '🎉 You Win!' : '💸 You Lose!')
                .setDescription(`The ball landed on **${winningNumber}** ${colorEmojis[winningColor]}`)
                .addFields(
                    { name: '🎯 Your Bet', value: `${amount} coins on ${colorEmojis[color]} **${color}**`, inline: true },
                    { name: '🎰 Result', value: `${colorEmojis[winningColor]} **${winningColor}** (${winningNumber})`, inline: true },
                    { name: '💰 Outcome', value: isWin ? `+${winnings} coins` : `-${amount} coins`, inline: true }
                )
                .setFooter({ text: `${message.author.tag} | New balance: ${userBalance - amount + winnings} coins` })
                .setTimestamp();

            if (isWin && winningColor === 'green') {
                resultEmbed.addFields({ 
                    name: '🍀 Jackpot!', 
                    value: 'Amazing! You hit the green zero for 14x payout!', 
                    inline: false 
                });
            }

            await gameMessage.edit({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Error in roulette command:', error);
            await message.reply('❌ Sorry, there was an error with the roulette game. Please try again later.');
            
            // Refund bet on error (if amount was deducted)
            if (typeof amount !== 'undefined') {
                try {
                    await economyService.updateBalance(message.guild.id, message.author.id, amount);
                } catch (refundError) {
                    console.error('Error refunding roulette bet:', refundError);
                }
            }
        }
    }
};
