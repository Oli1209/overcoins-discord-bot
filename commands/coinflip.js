const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'coinflip',
    description: 'Start or join a coinflip game',
    
    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage:\\n`!coinflip <amount|half|all>` - Start a new coinflip\\n`!coinflip <amount|half|all> join` - Join existing coinflip\\n\\nExamples:\\n`!coinflip 100` - coinflip for 100 coins\\n`!coinflip half` - coinflip for half of in hand\\n`!coinflip all` - coinflip for all in hand')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const isJoining = args.length > 1 && args[1].toLowerCase() === 'join';

            // Make sure user exists and has enough balance
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
                await message.reply('❌ You have no coins in hand to gamble.');
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

            // Check for existing active coinflip in this channel
            const activeCoinflip = await economyService.getActiveCoinflip(message.guild.id, message.channel.id);

            if (isJoining) {
                if (!activeCoinflip) {
                    await message.reply('❌ No active coinflip found in this channel.');
                    return;
                }

                if (activeCoinflip.amount !== amount) {
                    await message.reply(`❌ The active coinflip is for **${activeCoinflip.amount} coins**, not **${amount} coins**.`);
                    return;
                }

                const participants = JSON.parse(activeCoinflip.participants);
                if (participants.includes(message.author.id)) {
                    await message.reply('❌ You are already participating in this coinflip.');
                    return;
                }

                // Deduct coins from joiner
                await economyService.updateBalance(message.guild.id, message.author.id, -amount);

                // Join the coinflip
                const joinResult = await economyService.joinCoinflip(message.guild.id, activeCoinflip.id, message.author.id);

                if (!joinResult.success) {
                    // Refund if join failed
                    await economyService.updateBalance(message.guild.id, message.author.id, amount);
                    await message.reply(`❌ ${joinResult.message}`);
                    return;
                }

                // Check if we have enough participants to complete (2 players)
                if (joinResult.participants >= 2) {
                    // Complete the coinflip
                    const result = await economyService.completeCoinflip(message.guild.id, activeCoinflip.id);
                    
                    if (result) {
                        const winnerUser = message.guild.members.cache.get(result.winnerId);
                        const embed = new EmbedBuilder()
                            .setColor('#ffff00')
                            .setTitle('🪙 Coinflip Completed!')
                            .setDescription(`The coinflip has been decided!`)
                            .addFields(
                                { name: '🏆 Winner', value: winnerUser ? winnerUser.displayName : 'Unknown User', inline: true },
                                { name: '💰 Prize', value: `${result.totalAmount} coins`, inline: true },
                                { name: '👥 Participants', value: `${result.participants} players`, inline: true }
                            )
                            .setTimestamp();

                        await message.reply({ embeds: [embed] });
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Joined Coinflip')
                        .setDescription(`You joined the coinflip for **${amount} coins**!\\nWaiting for more players...`)
                        .addFields(
                            { name: '👥 Participants', value: `${joinResult.participants}/2`, inline: true },
                            { name: '💰 Your Bet', value: `${amount} coins`, inline: true }
                        )
                        .setTimestamp();

                    await message.reply({ embeds: [embed] });
                }

            } else {
                // Starting a new coinflip
                if (activeCoinflip) {
                    const participants = JSON.parse(activeCoinflip.participants);
                    await message.reply(`❌ There's already an active coinflip in this channel for **${activeCoinflip.amount} coins** with **${participants.length}** participant(s). Join it with \`!coinflip ${activeCoinflip.amount} join\``);
                    return;
                }

                // Deduct coins from creator
                await economyService.updateBalance(message.guild.id, message.author.id, -amount);

                // Create new coinflip
                const newCoinflip = await economyService.createCoinflip(message.guild.id, message.channel.id, message.author.id, amount);

                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('🪙 New Coinflip Started!')
                    .setDescription(`${message.author.displayName} started a coinflip!`)
                    .addFields(
                        { name: '💰 Bet Amount', value: `${amount} coins`, inline: true },
                        { name: '👥 Participants', value: '1/2', inline: true },
                        { name: '🎯 How to Join', value: `\`!coinflip ${amount} join\``, inline: false }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: 'One more player needed to start!' });

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in coinflip command:', error);
            await message.reply('❌ Sorry, there was an error with the coinflip. Please try again later.');
        }
    }
};
