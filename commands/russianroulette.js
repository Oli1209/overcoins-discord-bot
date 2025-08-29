const { EmbedBuilder } = require('discord.js');
const economyService = require('../services/economy.js');

// Store active games per channel
const activeGames = new Map();

module.exports = {
    name: 'russianroulette',
    description: 'Play Russian Roulette - realistic 2-player turn-based game',

    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage:\n`!russianroulette <amount>` - Create a new game\n`!russianroulette <amount> join` - Join existing game')
                    .addFields(
                        { name: '🔫 How to Play', value: 'Exactly 2 players take turns pulling the trigger.\nHost goes first, then alternates each round.\nFirst to hit the bullet loses everything.\nWinner gets 2x their bet!', inline: false },
                        { name: '⚠️ Warning', value: 'This is a high-risk gambling game!', inline: false }
                    )
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const isJoining = args.length > 1 && args[1].toLowerCase() === 'join';
            
            // Get user and validate balance
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
                await message.reply('❌ You have no coins to bet.');
                return;
            }

            if (user.balance < amount) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Insufficient Balance')
                    .setDescription(`You need **${amount} coins** but only have **${user.balance} coins**.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const channelId = message.channel.id;
            const existingGame = activeGames.get(channelId);

            if (isJoining) {
                // Player wants to join existing game
                if (!existingGame) {
                    await message.reply('❌ No active Russian Roulette game found in this channel.');
                    return;
                }

                if (existingGame.gameStarted) {
                    await message.reply('❌ This game has already started!');
                    return;
                }

                if (existingGame.host.id === message.author.id) {
                    await message.reply('❌ You cannot join your own game!');
                    return;
                }

                if (existingGame.joiner) {
                    await message.reply('❌ This game already has 2 players! Russian Roulette is for exactly 2 players.');
                    return;
                }

                if (existingGame.amount !== amount) {
                    await message.reply(`❌ The bet amount must match the existing game: **${existingGame.amount} coins**.`);
                    return;
                }

                // Join the game
                existingGame.joiner = {
                    id: message.author.id,
                    username: message.author.username,
                    tag: message.author.tag
                };

                // Deduct bet from joiner
                await economyService.updateBalance(message.guild.id, message.author.id, -amount);

                // Game is now full - start immediately
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🔫 Second Player Joined!')
                    .setDescription(`**${message.author.tag}** joined the game! Starting now...`)
                    .addFields(
                        { name: '👥 Players', value: `**Host:** ${existingGame.host.tag}\n**Challenger:** ${existingGame.joiner.tag}`, inline: false },
                        { name: '💰 Total Pot', value: `${existingGame.amount * 2} coins`, inline: true },
                        { name: '🎯 First Turn', value: `${existingGame.host.tag} goes first`, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

                // Start game after short delay
                setTimeout(async () => {
                    if (activeGames.has(channelId) && activeGames.get(channelId).joiner) {
                        await this.playGame(message, existingGame);
                        activeGames.delete(channelId);
                    }
                }, 3000);

            } else {
                // Player wants to create new game
                if (existingGame) {
                    await message.reply('❌ There is already an active Russian Roulette game in this channel! Use `join` to participate.');
                    return;
                }

                // Deduct bet from creator
                await economyService.updateBalance(message.guild.id, message.author.id, -amount);

                // Create new game
                const game = {
                    host: {
                        id: message.author.id,
                        username: message.author.username,
                        tag: message.author.tag
                    },
                    amount: amount,
                    channelId: channelId,
                    createdAt: Date.now(),
                    joiner: null,
                    gameStarted: false
                };

                activeGames.set(channelId, game);

                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('🔫 Russian Roulette Game Created')
                    .setDescription('**A dangerous game has begun!**')
                    .addFields(
                        { name: '🎯 Host', value: `${message.author.tag}`, inline: true },
                        { name: '💰 Bet Amount', value: `${amount} coins`, inline: true },
                        { name: '👥 Players', value: `1/2`, inline: true },
                        { name: '🔫 Rules', value: 'Exactly 2 players take turns pulling the trigger\nHost goes first, then alternates\nFirst to hit the bullet loses everything\nWinner gets 2x their bet', inline: false },
                        { name: '🎲 How to Join', value: `\`!russianroulette ${amount} join\``, inline: false }
                    )
                    .setFooter({ text: 'Waiting for second player | Expires in 5 minutes' })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

                // Auto-expire game after 5 minutes
                setTimeout(async () => {
                    if (activeGames.has(channelId) && !activeGames.get(channelId).gameStarted) {
                        const expiredGame = activeGames.get(channelId);
                        activeGames.delete(channelId);
                        
                        // Return host's bet (joiner hasn't joined yet)
                        try {
                            await economyService.updateBalance(message.guild.id, expiredGame.host.id, amount);
                        } catch (error) {
                            console.error(`Error refunding host ${expiredGame.host.id}:`, error);
                        }
                        
                        const expiredEmbed = new EmbedBuilder()
                            .setColor('#666666')
                            .setTitle('⏱️ Game Expired')
                            .setDescription('The Russian Roulette game has expired. No second player joined. Your bet has been returned.')
                            .setTimestamp();
                        
                        message.channel.send({ embeds: [expiredEmbed] }).catch(() => {});
                    }
                }, 300000); // 5 minutes
            }

        } catch (error) {
            console.error('Error in russianroulette command:', error);
            await message.reply('❌ Sorry, there was an error with Russian Roulette. Please try again later.');
        }
    },

    async playGame(message, game) {
        try {
            game.gameStarted = true;
            const { host, joiner, amount } = game;
            
            // Determine bullet chamber (1-6)
            const bulletChamber = Math.floor(Math.random() * 6) + 1;
            
            // Show game start
            const startEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('🔫 Russian Roulette - Game Starting!')
                .setDescription('**The revolver is loaded with 1 bullet in 6 chambers...**')
                .addFields(
                    { name: '👥 Players', value: `**Host:** ${host.tag}\n**Challenger:** ${joiner.tag}`, inline: false },
                    { name: '💰 Total Pot', value: `${amount * 2} coins`, inline: true },
                    { name: '🎯 Turn Order', value: `${host.tag} goes first`, inline: true },
                    { name: '🔫 Rules', value: 'Take turns pulling the trigger\nFirst to hit the bullet loses everything\nWinner gets 2x bet (loser loses bet)', inline: false }
                )
                .setFooter({ text: 'The deadly game begins...' })
                .setTimestamp();

            const gameMessage = await message.reply({ embeds: [startEmbed] });
            await new Promise(resolve => setTimeout(resolve, 3000));

            let currentRound = 1;
            let currentPlayer = host; // Host always goes first
            let otherPlayer = joiner;
            
            // Game continues until someone hits the bullet
            while (true) {
                // Show whose turn it is
                const turnEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle(`🔫 Round ${currentRound}`)
                    .setDescription(`**${currentPlayer.tag}'s turn to pull the trigger...**`)
                    .addFields(
                        { name: '🎯 Current Player', value: currentPlayer.tag, inline: true },
                        { name: '🔄 Round', value: currentRound.toString(), inline: true },
                        { name: '💀 Chamber', value: `${currentRound}/6`, inline: true },
                        { name: '⚡ Tension', value: `${6 - currentRound + 1} chambers remaining...`, inline: false }
                    )
                    .setFooter({ text: 'Pulling trigger in 3 seconds...' })
                    .setTimestamp();

                await gameMessage.edit({ embeds: [turnEmbed] });
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check if current player hits the bullet
                if (currentRound === bulletChamber) {
                    // BANG! Current player loses
                    const winnings = amount * 2;
                    await economyService.updateBalance(message.guild.id, otherPlayer.id, winnings);
                    
                    const bangEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🔫💀 BANG!')
                        .setDescription(`**${currentPlayer.tag} pulled the trigger on chamber ${currentRound} - THE BULLET!**`)
                        .addFields(
                            { name: '💀 Loser', value: `${currentPlayer.tag}\n-${amount} coins`, inline: true },
                            { name: '🏆 Winner', value: `${otherPlayer.tag}\n+${winnings} coins`, inline: true },
                            { name: '🔫 Fatal Chamber', value: `Chamber ${bulletChamber}/6`, inline: true },
                            { name: '💰 Final Payout', value: `Winner receives: ${winnings} coins\nLoser loses: ${amount} coins`, inline: false }
                        )
                        .setFooter({ text: `Game ended in round ${currentRound}` })
                        .setTimestamp();

                    await gameMessage.edit({ embeds: [bangEmbed] });
                    break;
                } else {
                    // CLICK! Safe chamber
                    const clickEmbed = new EmbedBuilder()
                        .setColor('#00aa00')
                        .setTitle('🔫✨ CLICK!')
                        .setDescription(`**${currentPlayer.tag} pulled chamber ${currentRound} - Empty!**`)
                        .addFields(
                            { name: '😅 Safe', value: currentPlayer.tag, inline: true },
                            { name: '🔄 Next Turn', value: otherPlayer.tag, inline: true },
                            { name: '📊 Progress', value: `${currentRound}/6 chambers checked`, inline: true },
                            { name: '⚡ Status', value: `${currentPlayer.tag} survives this round!`, inline: false }
                        )
                        .setFooter({ text: `Round ${currentRound} complete - switching turns` })
                        .setTimestamp();

                    await gameMessage.edit({ embeds: [clickEmbed] });
                    await new Promise(resolve => setTimeout(resolve, 2500));
                    
                    // Switch players for next round
                    const temp = currentPlayer;
                    currentPlayer = otherPlayer;
                    otherPlayer = temp;
                    currentRound++;
                }
            }

        } catch (error) {
            console.error('Error playing Russian Roulette game:', error);
            await message.reply('❌ Error occurred during the game. Bets will be refunded.');
            
            // Refund both players
            try {
                await economyService.updateBalance(message.guild.id, game.host.id, game.amount);
                if (game.joiner) {
                    await economyService.updateBalance(message.guild.id, game.joiner.id, game.amount);
                }
            } catch (refundError) {
                console.error('Error refunding players:', refundError);
            }
        }
    }
};
