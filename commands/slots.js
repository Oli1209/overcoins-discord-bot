const { EmbedBuilder } = require('discord.js');
const economyService = require('../services/economy.js');

// Slot symbols with their weights (higher weight = more common)
const SYMBOLS = [
    { symbol: '🍒', weight: 30, name: 'Cherry' },
    { symbol: '🍋', weight: 25, name: 'Lemon' },
    { symbol: '🍊', weight: 25, name: 'Orange' },
    { symbol: '🍇', weight: 20, name: 'Grape' },
    { symbol: '⭐', weight: 8, name: 'Star' },
    { symbol: '7️⃣', weight: 2, name: 'Lucky Seven' }
];

function getRandomSymbol() {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const symbol of SYMBOLS) {
        random -= symbol.weight;
        if (random <= 0) {
            return symbol;
        }
    }
    
    return SYMBOLS[0]; // Fallback
}

function calculateWinnings(symbols, bet) {
    const [first, second, third] = symbols;
    
    // Check for three of a kind
    if (first.symbol === second.symbol && second.symbol === third.symbol) {
        if (first.symbol === '7️⃣') {
            return { multiplier: 10, type: 'JACKPOT! 🎰', amount: bet * 10 };
        } else if (first.symbol === '⭐') {
            return { multiplier: 7, type: 'TRIPLE STARS! ✨', amount: bet * 7 };
        } else {
            return { multiplier: 5, type: 'THREE OF A KIND! 🎉', amount: bet * 5 };
        }
    }
    
    // Check for two of a kind
    const symbolCounts = {};
    symbols.forEach(s => {
        symbolCounts[s.symbol] = (symbolCounts[s.symbol] || 0) + 1;
    });
    
    const hasPair = Object.values(symbolCounts).includes(2);
    if (hasPair) {
        return { multiplier: 2, type: 'PAIR! 👍', amount: bet * 2 };
    }
    
    // No winning combination
    return { multiplier: 0, type: 'NO MATCH 💸', amount: 0 };
}

function createSlotAnimation() {
    const spinFrames = [
        '🎰 [ ? | ? | ? ] 🎰',
        '🎰 [ ⚡ | ⚡ | ⚡ ] 🎰',
        '🎰 [ 💫 | 💫 | 💫 ] 🎰',
        '🎰 [ ✨ | ✨ | ✨ ] 🎰'
    ];
    
    return spinFrames[Math.floor(Math.random() * spinFrames.length)];
}

module.exports = {
    name: 'slots',
    description: 'Play the slot machine',

    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!slots <amount|half|all>`\n\nExamples:\n`!slots 100` - bet 100 coins\n`!slots half` - bet half of your balance\n`!slots all` - bet all your balance')
                    .addFields(
                        { name: '🎰 Payouts', value: '3x 7️⃣ = **10x** (Jackpot!)\n3x ⭐ = **7x**\n3x any = **5x**\n2x any = **2x**\nNo match = **0x**', inline: false }
                    )
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

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

            // Deduct bet amount
            await economyService.updateBalance(message.guild.id, message.author.id, -amount);

            // Show spinning animation
            const spinningEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🎰 Slot Machine')
                .setDescription(`${createSlotAnimation()}\n\n**Spinning...** 🎲`)
                .addFields(
                    { name: '💰 Bet', value: `${amount} coins`, inline: true },
                    { name: '🎯 Status', value: 'Rolling...', inline: true }
                )
                .setFooter({ text: `${message.author.tag}` })
                .setTimestamp();

            const slotMessage = await message.reply({ embeds: [spinningEmbed] });

            // Wait for dramatic effect
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get random symbols
            const result = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
            const winnings = calculateWinnings(result, amount);

            // Update balance if player won
            if (winnings.amount > 0) {
                await economyService.updateBalance(message.guild.id, message.author.id, winnings.amount);
            }

            // Get updated user data
            const updatedUser = await economyService.getUser(message.guild.id, message.author.id, message.author.username);

            // Create result embed
            const slotDisplay = `🎰 [ ${result[0].symbol} | ${result[1].symbol} | ${result[2].symbol} ] 🎰`;
            
            let resultColor = '#ff6b6b'; // Red for loss
            let resultTitle = '🎰 Slot Machine';
            
            if (winnings.multiplier >= 10) {
                resultColor = '#ffd700'; // Gold for jackpot
                resultTitle = '🎰 JACKPOT! 💰';
            } else if (winnings.multiplier >= 5) {
                resultColor = '#00ff00'; // Green for big win
                resultTitle = '🎰 BIG WIN! 🎉';
            } else if (winnings.multiplier >= 2) {
                resultColor = '#00aa00'; // Darker green for small win
                resultTitle = '🎰 Winner! 🎊';
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(resultColor)
                .setTitle(resultTitle)
                .setDescription(slotDisplay)
                .addFields(
                    { name: '🎯 Result', value: winnings.type, inline: true },
                    { name: '💰 Bet', value: `${amount} coins`, inline: true },
                    { name: winnings.amount > 0 ? '🏆 Won' : '💸 Lost', value: winnings.amount > 0 ? `${winnings.amount} coins` : `${amount} coins`, inline: true }
                )
                .addFields(
                    { name: '💎 Balance', value: `${updatedUser.balance} coins`, inline: true },
                    { name: '📊 Multiplier', value: `${winnings.multiplier}x`, inline: true },
                    { name: '📈 Net', value: winnings.amount > 0 ? `+${winnings.amount - amount}` : `-${amount}`, inline: true }
                )
                .setFooter({ text: `${message.author.tag}` })
                .setTimestamp();

            // Add special messages for big wins
            if (winnings.multiplier >= 10) {
                resultEmbed.addFields({ name: '🎉 Congratulations!', value: 'You hit the JACKPOT! 🎰💰', inline: false });
            } else if (winnings.multiplier >= 7) {
                resultEmbed.addFields({ name: '✨ Amazing!', value: 'Triple stars! Your luck is shining! ⭐', inline: false });
            } else if (winnings.multiplier >= 5) {
                resultEmbed.addFields({ name: '🎉 Excellent!', value: 'Three of a kind! Well done! 🎊', inline: false });
            }

            await slotMessage.edit({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Error in slots command:', error);
            await message.reply('❌ Sorry, there was an error with the slot machine. Please try again later.');
        }
    }
};
