const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'leaderboard',
    description: 'Show top 10 richest players',
    
    async execute(message, args) {
        try {
            // Get top players
            const topPlayers = await economyService.getTopPlayers(message.guild.id, 10);

            if (topPlayers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('📊 Leaderboard')
                    .setDescription('No players found in the database.')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Create leaderboard text
            const leaderboardText = topPlayers.map((player, index) => {
                let medal = '';
                switch (index) {
                    case 0: medal = '🥇'; break;
                    case 1: medal = '🥈'; break;
                    case 2: medal = '🥉'; break;
                    default: medal = `${index + 1}.`; break;
                }
                
                // Format number with commas - show total balance (in hand + bank)
                const totalBalance = (player.balance || 0) + (player.bank_balance || 0);
                const formattedBalance = totalBalance.toLocaleString();
                
                return `${medal} **${player.username}** — ${formattedBalance} coins`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle('🏆 TOP 10 Players')
                .setDescription(leaderboardText)
                .addFields(
                    { 
                        name: '📊 Statistics', 
                        value: `Total players: ${topPlayers.length}${topPlayers.length >= 10 ? '+' : ''}`, 
                        inline: true 
                    },
                    { 
                        name: '💰 Top Balance', 
                        value: `${((topPlayers[0].balance || 0) + (topPlayers[0].bank_balance || 0)).toLocaleString()} coins`, 
                        inline: true 
                    }
                )
                .setThumbnail(message.guild.iconURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await message.reply('❌ Sorry, there was an error showing the leaderboard. Please try again later.');
        }
    }
};
