const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

// Emoji mapping for items
const ITEM_EMOJIS = {
    'Stara myszka': '🖱️',
    'Klawiatura mechaniczna': '⌨️',
    'Stary telefon': '📱',
    'Pendrive 32GB': '💾',
    'Słuchawki': '🎧',
    'Karta graficzna (stara)': '🎮',
    'Laptop (uszkodzony)': '💻',
    'Zasilacz': '🔌'
};

module.exports = {
    name: 'inventory',
    description: 'Show your inventory items',
    
    async execute(message, args) {
        try {
            // Make sure user exists
            await economyService.getUser(message.guild.id, message.author.id, message.author.username);

            // Get user inventory
            const inventory = await economyService.getInventory(message.guild.id, message.author.id);

            if (inventory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('📦 Twój Ekwipunek')
                    .setDescription('Twój ekwipunek jest pusty 📦\\n\\nUżyj `!search` żeby znaleźć przedmioty!')
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ 
                        text: `Requested by ${message.author.tag}`, 
                        iconURL: message.author.displayAvatarURL() 
                    });

                await message.reply({ embeds: [embed] });
                return;
            }

            // Create items list with emojis and quantities
            const itemsList = inventory.map(item => {
                const emoji = ITEM_EMOJIS[item.item_name] || '📦';
                const quantity = item.quantity > 1 ? ` (x${item.quantity})` : '';
                return `${emoji} **${item.item_name}**${quantity} - ${item.value * item.quantity} coins`;
            }).join('\\n');

            // Calculate total value
            const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.value), 0);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('📦 Twój Ekwipunek')
                .setDescription(itemsList)
                .addFields(
                    { name: '💰 Łączna wartość', value: `${totalValue} coins`, inline: true },
                    { name: '📊 Przedmioty', value: `${inventory.length} różnych`, inline: true },
                    { name: '💡 Tip', value: 'Użyj `!sell all` żeby sprzedać wszystko', inline: false }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in inventory command:', error);
            await message.reply('❌ Sorry, there was an error showing your inventory. Please try again later.');
        }
    }
};
