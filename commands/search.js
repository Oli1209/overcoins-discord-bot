const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

// Define search items with their chances and values
const SEARCH_ITEMS = [
    { name: 'Stara myszka', value: 50, chance: 25, emoji: '🖱️' },
    { name: 'Klawiatura mechaniczna', value: 100, chance: 20, emoji: '⌨️' },
    { name: 'Stary telefon', value: 80, chance: 15, emoji: '📱' },
    { name: 'Pendrive 32GB', value: 60, chance: 15, emoji: '💾' },
    { name: 'Słuchawki', value: 120, chance: 10, emoji: '🎧' },
    { name: 'Karta graficzna (stara)', value: 250, chance: 5, emoji: '🎮' },
    { name: 'Laptop (uszkodzony)', value: 300, chance: 5, emoji: '💻' },
    { name: 'Zasilacz', value: 70, chance: 5, emoji: '🔌' }
];

function getRandomItem() {
    const totalChance = SEARCH_ITEMS.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalChance;
    
    for (const item of SEARCH_ITEMS) {
        random -= item.chance;
        if (random <= 0) {
            return item;
        }
    }
    
    return SEARCH_ITEMS[0]; // Fallback
}

module.exports = {
    name: 'search',
    description: 'Search for electronic items in the trash (cooldown: 2 minutes)',
    
    async execute(message, args) {
        try {
            // Check cooldown
            const cooldownCheck = await economyService.checkCooldown(message.guild.id, message.author.id, 'search');
            if (cooldownCheck.onCooldown) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('⏰ Search Cooldown')
                    .setDescription(`You need to wait before searching again! Available in **${cooldownCheck.timeLeft} minutes**.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Make sure user exists
            await economyService.getUser(message.guild.id, message.author.id, message.author.username);

            // Get random item
            const foundItem = getRandomItem();

            // Add item to inventory
            await economyService.addItem(message.guild.id, message.author.id, foundItem.name, 1, foundItem.value);

            // Set cooldown (2 minutes)
            await economyService.setCooldown(message.guild.id, message.author.id, 'search', 2);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔍 Search Result')
                .setDescription(`You found something in the electronic trash!`)
                .addFields(
                    { name: '📦 Found Item', value: `${foundItem.emoji} **${foundItem.name}**`, inline: true },
                    { name: '💰 Value', value: `${foundItem.value} coins`, inline: true },
                    { name: '⏰ Next Search', value: 'Available in 2 minutes', inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in search command:', error);
            await message.reply('❌ Sorry, there was an error searching. Please try again later.');
        }
    }
};
