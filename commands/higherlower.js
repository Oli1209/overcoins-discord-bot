const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economyService = require('../services/economy.js');

// Store active games per user
const activeGames = new Map();

module.exports = {
    name: 'higherlower',
    description: 'Guess if the next number will be higher or lower - risk vs reward game',

    async execute(message, args) {
        try {
            if (args.length !== 1) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!higherlower <amount>`')
                    .addFields(
                        { name: '🎯 How to Play', value: 'Guess if the next number (1-100) will be higher or lower than the current one', inline: false },
                        { name: '💰 Payouts', value: 'Round 1: 2x\nRound 2: 3x\nRound 3: 4x\n...up to Round 10: 11x', inline: true },
                        { name: '⚠️ Risk', value: 'Wrong guess = lose everything!', inline: true },
                        { name: '🎲 Example', value: '`!higherlower 100`', inline: false }
                    )
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const amount = parseInt(args[0]);

            // Validate bet amount
            if (isNaN(amount) || amount <= 0) {
                await message.reply('❌ Please enter a valid positive number for the bet amount.');
                return;
            }

            if (amount > 10000) {
                await message.reply('❌ Maximum bet is 10,000 coins per game.');
                return;
            }

            // Check if player already has an active game
            if (activeGames.has(message.author.id)) {
                await message.reply('❌ You already have an active Higher/Lower game! Finish it first.');
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
            const cooldownCheck = await economyService.checkCooldownSeconds(message.guild.id, message.author.id, 'higherlower');
            if (cooldownCheck.onCooldown) {
                await message.reply(`⏳ You must wait ${cooldownCheck.timeLeft} seconds before using this command again.`);
                return;
            }

            // Deduct bet and set cooldown
            await economyService.updateBalance(message.guild.id, message.author.id, -amount);
            await economyService.setCooldownSeconds(message.guild.id, message.author.id, 'higherlower', 10);

            // Start new game
            const currentNumber = Math.floor(Math.random() * 100) + 1;
            const game = {
                userId: message.author.id,
                amount: amount,
                round: 1,
                currentNumber: currentNumber,
                startedAt: Date.now()
            };

            activeGames.set(message.author.id, game);

            // Create game embed with buttons
            const gameEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎲 Higher or Lower - Round 1')
                .setDescription(`**Current number: ${currentNumber}**`)
                .addFields(
                    { name: '💰 Original Bet', value: `${amount} coins`, inline: true },
                    { name: '🎯 Current Payout', value: `${amount * 2} coins (2x)`, inline: true },
                    { name: '📊 Progress', value: '🔵⚪⚪⚪⚪⚪⚪⚪⚪⚪ (1/10)', inline: false },
                    { name: '❓ Question', value: 'Will the next number (1-100) be **HIGHER** or **LOWER**?', inline: false }
                )
                .setFooter({ text: 'Game expires in 2 minutes | Wrong guess = lose everything!' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hl_higher')
                        .setLabel('HIGHER')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📈'),
                    new ButtonBuilder()
                        .setCustomId('hl_lower')
                        .setLabel('LOWER')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('📉')
                );

            const gameMessage = await message.reply({ embeds: [gameEmbed], components: [row] });

            // Auto-expire game after 2 minutes
            setTimeout(() => {
                if (activeGames.has(message.author.id)) {
                    activeGames.delete(message.author.id);
                    
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#666666')
                        .setTitle('⏱️ Game Expired')
                        .setDescription('Your Higher/Lower game has expired due to inactivity. Your bet has been lost.')
                        .setTimestamp();
                    
                    gameMessage.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
                }
            }, 120000); // 2 minutes

        } catch (error) {
            console.error('Error in higherlower command:', error);
            await message.reply('❌ Sorry, there was an error starting the Higher/Lower game. Please try again later.');
            
            // Clean up on error
            if (activeGames.has(message.author.id)) {
                activeGames.delete(message.author.id);
                
                // Refund bet on error
                try {
                    await economyService.updateBalance(message.guild.id, message.author.id, amount);
                } catch (refundError) {
                    console.error('Error refunding higherlower bet:', refundError);
                }
            }
        }
    },

    // Handle button interactions
    async handleInteraction(interaction) {
        const game = activeGames.get(interaction.user.id);
        if (!game) {
            await interaction.reply({ content: '❌ You don\'t have an active Higher/Lower game.', ephemeral: true });
            return;
        }

        try {
            const isHigher = interaction.customId === 'hl_higher';
            const newNumber = Math.floor(Math.random() * 100) + 1;
            const userGuessCorrect = isHigher ? (newNumber > game.currentNumber) : (newNumber < game.currentNumber);
            
            // Handle tie (same number) - count as incorrect
            const actuallyCorrect = newNumber !== game.currentNumber && userGuessCorrect;

            if (actuallyCorrect) {
                // Correct guess - advance round
                game.round++;
                game.currentNumber = newNumber;
                
                const currentPayout = game.amount * (game.round + 1);
                const progressBar = '🔵'.repeat(game.round) + '⚪'.repeat(10 - game.round);
                
                if (game.round >= 10) {
                    // Maximum rounds reached - auto cash out
                    activeGames.delete(interaction.user.id);
                    await economyService.updateBalance(interaction.message.guild.id, interaction.user.id, currentPayout);
                    
                    const maxEmbed = new EmbedBuilder()
                        .setColor('#ffd700')
                        .setTitle('🏆 MAXIMUM ROUNDS COMPLETED!')
                        .setDescription(`**Incredible! You've reached the maximum of 10 rounds!**`)
                        .addFields(
                            { name: '📊 Final Stats', value: `Rounds completed: 10/10\nFinal number: **${newNumber}**`, inline: false },
                            { name: '💰 MEGA PAYOUT', value: `+${currentPayout} coins (11x original bet!)`, inline: false },
                            { name: '🎉 Achievement', value: 'Master of Higher/Lower!', inline: false }
                        )
                        .setFooter({ text: `${interaction.user.tag} | New balance: ${(await economyService.getUser(interaction.message.guild.id, interaction.user.id))?.balance || 0} coins` })
                        .setTimestamp();
                    
                    await interaction.update({ embeds: [maxEmbed], components: [] });
                } else {
                    // Continue playing - show cash out option
                    const continueEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle(`✅ Correct! - Round ${game.round}`)
                        .setDescription(`**Previous: ${game.currentNumber === newNumber ? 'TIE' : game.currentNumber} → New: ${newNumber}**`)
                        .addFields(
                            { name: '💰 Original Bet', value: `${game.amount} coins`, inline: true },
                            { name: '🎯 Current Payout', value: `${currentPayout} coins (${game.round + 1}x)`, inline: true },
                            { name: '📊 Progress', value: `${progressBar} (${game.round}/10)`, inline: false },
                            { name: '❓ Next Question', value: 'Will the next number be **HIGHER** or **LOWER** than **' + newNumber + '**?', inline: false },
                            { name: '⚠️ Warning', value: 'Wrong guess = lose everything! Consider cashing out...', inline: false }
                        )
                        .setTimestamp();

                    const continueRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('hl_higher')
                                .setLabel('HIGHER')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('📈'),
                            new ButtonBuilder()
                                .setCustomId('hl_lower')
                                .setLabel('LOWER')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('📉'),
                            new ButtonBuilder()
                                .setCustomId('hl_cashout')
                                .setLabel(`CASH OUT (${currentPayout})`)
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('💰')
                        );

                    await interaction.update({ embeds: [continueEmbed], components: [continueRow] });
                }
            } else {
                // Wrong guess - game over
                activeGames.delete(interaction.user.id);
                
                const loseEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('💸 Game Over!')
                    .setDescription(`**Wrong guess! You lose everything.**`)
                    .addFields(
                        { name: '📊 Final Stats', value: `Previous: **${game.currentNumber}**\nNew: **${newNumber}**\nRounds completed: ${game.round - 1}/10`, inline: false },
                        { name: '🎯 Your Guess', value: isHigher ? 'HIGHER 📈' : 'LOWER 📉', inline: true },
                        { name: '❌ Result', value: newNumber === game.currentNumber ? 'Same number (tie)' : (newNumber > game.currentNumber ? 'HIGHER' : 'LOWER'), inline: true },
                        { name: '💸 Loss', value: `-${game.amount} coins`, inline: false }
                    )
                    .setFooter({ text: `${interaction.user.tag} | Better luck next time!` })
                    .setTimestamp();

                await interaction.update({ embeds: [loseEmbed], components: [] });
            }

        } catch (error) {
            console.error('Error in higherlower interaction:', error);
            await interaction.reply({ content: '❌ Error processing your guess. Please try again later.', ephemeral: true });
        }
    },

    // Handle cash out
    async handleCashOut(interaction) {
        const game = activeGames.get(interaction.user.id);
        if (!game) {
            await interaction.reply({ content: '❌ You don\'t have an active Higher/Lower game.', ephemeral: true });
            return;
        }

        try {
            activeGames.delete(interaction.user.id);
            const payout = game.amount * (game.round + 1);
            await economyService.updateBalance(interaction.message.guild.id, interaction.user.id, payout);
            
            const cashOutEmbed = new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle('💰 Cashed Out Successfully!')
                .setDescription(`**Smart choice! You've secured your winnings.**`)
                .addFields(
                    { name: '📊 Final Stats', value: `Rounds completed: ${game.round - 1}/10\nFinal number: **${game.currentNumber}**`, inline: false },
                    { name: '💰 Payout', value: `+${payout} coins (${game.round + 1}x original bet)`, inline: false },
                    { name: '🎯 Strategy', value: 'Sometimes it\'s better to quit while you\'re ahead!', inline: false }
                )
                .setFooter({ text: `${interaction.user.tag} | New balance: ${(await economyService.getUser(interaction.message.guild.id, interaction.user.id))?.balance || 0} coins` })
                .setTimestamp();
            
            await interaction.update({ embeds: [cashOutEmbed], components: [] });

        } catch (error) {
            console.error('Error in higherlower cashout:', error);
            await interaction.reply({ content: '❌ Error processing cash out. Please try again later.', ephemeral: true });
        }
    }
};
