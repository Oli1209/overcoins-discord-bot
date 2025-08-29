const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');

module.exports = {
    name: 'help',
    description: 'Shows all available commands and bot information',
    
    async execute(message, args) {
        const commands = message.client.commands;
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('🤖 Bot Help')
            .setDescription('Here are all the commands I can help you with!')
            .setTimestamp()
            .setFooter({ 
                text: `Requested by ${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL() 
            });
        
        // Organize commands by category
        const economyCommands = ['balance', 'deposit', 'withdraw', 'dailyreward', 'pay', 'inventory', 'sell', 'search', 'work', 'addcoins', 'removebalance'];
        const gamblingCommands = ['coinflip', 'blackjack', 'slots', 'russianroulette', 'roulette', 'higherlower'];
        const utilityCommands = ['help', 'info', 'ping', 'leaderboard'];

        const economyList = commands
            .filter(cmd => economyCommands.includes(cmd.name))
            .map(cmd => `**!${cmd.name}** - ${cmd.description}`)
            .join('\n') || 'No economy commands';

        const gamblingList = commands
            .filter(cmd => gamblingCommands.includes(cmd.name))
            .map(cmd => `**!${cmd.name}** - ${cmd.description}`)
            .join('\n') || 'No gambling commands';

        const utilityList = commands
            .filter(cmd => utilityCommands.includes(cmd.name))
            .map(cmd => `**!${cmd.name}** - ${cmd.description}`)
            .join('\n') || 'No utility commands';
        
        embed.addFields(
            { name: '💰 Economy Commands', value: economyList, inline: false },
            { name: '🎲 Gambling Commands', value: gamblingList, inline: false },
            { name: '⚙️ Utility Commands', value: utilityList, inline: false },
            {
                name: '💡 Tips',
                value: '• All commands start with `!`\n' +
                       '• You can mention me to get a quick response\n' +
                       '• Use `!ping` to check if I\'m responsive',
                inline: false
            }
        );
        
        // Add bot stats
        const botStats = [
            `**Servers:** ${message.client.guilds.cache.size}`,
            `**Commands:** ${commands.size}`,
            `**Uptime:** ${Math.floor(message.client.uptime / 1000 / 60)} minutes`
        ].join('\n');
        
        embed.addFields({
            name: '📊 Bot Statistics',
            value: botStats,
            inline: true
        });
        
        await message.reply({ embeds: [embed] });
    }
};
