const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');

module.exports = {
    name: 'info',
    description: 'Shows detailed information about the bot',
    
    async execute(message, args) {
        const client = message.client;
        
        // Calculate uptime
        const totalSeconds = Math.floor(client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        // Memory usage
        const memoryUsage = process.memoryUsage();
        const memoryUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('🤖 Bot Information')
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ 
                text: `Requested by ${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL() 
            });
        
        // Bot details
        embed.addFields(
            {
                name: '🎯 Basic Info',
                value: [
                    `**Name:** ${client.user.tag}`,
                    `**ID:** ${client.user.id}`,
                    `**Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`
                ].join('\n'),
                inline: true
            },
            {
                name: '📊 Statistics',
                value: [
                    `**Servers:** ${client.guilds.cache.size}`,
                    `**Users:** ${client.users.cache.size}`,
                    `**Commands:** ${client.commands.size}`
                ].join('\n'),
                inline: true
            },
            {
                name: '⚡ Performance',
                value: [
                    `**Uptime:** ${uptime}`,
                    `**Memory:** ${memoryUsed}MB`,
                    `**Ping:** ${Math.round(client.ws.ping)}ms`
                ].join('\n'),
                inline: true
            },
            {
                name: '🔧 Technical',
                value: [
                    `**Node.js:** ${process.version}`,
                    `**Discord.js:** ${require('discord.js').version}`,
                    `**Environment:** ${config.environment}`
                ].join('\n'),
                inline: false
            }
        );
        
        await message.reply({ embeds: [embed] });
    }
};
