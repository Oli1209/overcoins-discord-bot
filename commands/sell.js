const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'sell',
    description: 'Sell all items in your inventory',
    
    async execute(message, args) {
        try {
            // Check if user wants to sell all
            if (args.length === 0 || args[0].toLowerCase() !== 'all') {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!sell all`\\nThis will sell all items in your inventory.')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Make sure user exists
            await economyService.getUser(message.guild.id, message.author.id, message.author.username);

            // Get inventory before selling
            const inventory = await economyService.getInventory(message.guild.id, message.author.id);

            if (inventory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('📦 Empty Inventory')
                    .setDescription('You have no items to sell! Use `!search` to find some items first.')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Sell all items
            const result = await economyService.sellAllItems(message.guild.id, message.author.id);

            // Create items list for display
            const itemsList = inventory.map(item => 
                `${item.quantity}x **${item.item_name}** (${item.value * item.quantity} coins)`
            ).join('\\n');

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💰 Items Sold Successfully')
                .setDescription(`You sold all your items!`)
                .addFields(
                    { name: '📦 Items Sold', value: itemsList, inline: false },
                    { name: '💰 Total Earned', value: `${result.totalValue} coins`, inline: true },
                    { name: '📊 Items Count', value: `${result.itemsSold} different items`, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in sell command:', error);
            await message.reply('❌ Sorry, there was an error selling your items. Please try again later.');
        }
    }
};
