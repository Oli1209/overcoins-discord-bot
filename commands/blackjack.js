const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economyService = require('../services/economy.js');

// Card values and suits
const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

class BlackjackGame {
    constructor() {
        this.deck = this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameActive = false;
    }

    createDeck() {
        const deck = [];
        for (const suit of SUITS) {
            for (const value of VALUES) {
                deck.push({ suit, value });
            }
        }
        return this.shuffleDeck(deck);
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    drawCard() {
        return this.deck.pop();
    }

    getCardValue(card) {
        if (card.value === 'A') return 11;
        if (['J', 'Q', 'K'].includes(card.value)) return 10;
        return parseInt(card.value);
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (const card of hand) {
            const cardValue = this.getCardValue(card);
            value += cardValue;
            if (card.value === 'A') aces++;
        }

        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    formatHand(hand, hideDealer = false) {
        if (hideDealer && hand.length > 0) {
            return `${hand[0].value}${hand[0].suit} [?]`;
        }
        return hand.map(card => `${card.value}${card.suit}`).join(' ');
    }

    startGame() {
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.dealerHand = [this.drawCard(), this.drawCard()];
        this.gameActive = true;
    }
}

// Store active games
const activeGames = new Map();

module.exports = {
    name: 'blackjack',
    description: 'Play blackjack against the bot',

    async execute(message, args) {
        try {
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!blackjack <amount|half|all>`\n\nExamples:\n`!blackjack 100` - bet 100 coins\n`!blackjack half` - bet half of your balance\n`!blackjack all` - bet all your balance')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Check if user already has an active game
            if (activeGames.has(message.author.id)) {
                await message.reply('❌ You already have an active blackjack game! Finish it first.');
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

            // Create and start game
            const game = new BlackjackGame();
            game.startGame();
            activeGames.set(message.author.id, { game, amount });

            const playerValue = game.calculateHandValue(game.playerHand);
            const dealerValue = game.calculateHandValue(game.dealerHand);

            // Check for natural blackjack
            if (playerValue === 21) {
                activeGames.delete(message.author.id);
                const initialDealerValue = game.calculateHandValue(game.dealerHand);
                
                if (initialDealerValue === 21) {
                    // Push - return bet
                    await economyService.updateBalance(message.guild.id, message.author.id, amount);
                    const embed = new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('🃏 Blackjack - Push!')
                        .setDescription('Both you and the dealer have blackjack!')
                        .addFields(
                            { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                            { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${initialDealerValue})`, inline: true },
                            { name: '💰 Result', value: `Bet returned: ${amount} coins`, inline: false }
                        );
                    
                    await message.reply({ embeds: [embed] });
                } else {
                    // Player blackjack wins
                    const winnings = Math.floor(amount * 2.5); // 3:2 payout for blackjack
                    await economyService.updateBalance(message.guild.id, message.author.id, winnings);
                    
                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🃏 Blackjack!')
                        .setDescription('Congratulations! You got a natural blackjack!')
                        .addFields(
                            { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                            { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${initialDealerValue})`, inline: true },
                            { name: '💰 Winnings', value: `+${winnings} coins`, inline: false }
                        );
                    
                    await message.reply({ embeds: [embed] });
                }
                return;
            }

            // Create action buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('blackjack_hit')
                        .setLabel('Hit')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🃏'),
                    new ButtonBuilder()
                        .setCustomId('blackjack_stand')
                        .setLabel('Stand')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('✋')
                );

            const currentDealerValue = game.calculateHandValue(game.dealerHand);
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🃏 Blackjack Game')
                .setDescription(`Bet: **${amount} coins**`)
                .addFields(
                    { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                    { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${dealerValue})`, inline: true },
                    { name: '🎯 Goal', value: 'Get as close to 21 as possible without going over!', inline: false }
                )
                .setFooter({ text: `Game expires in 2 minutes | ${message.author.tag}` })
                .setTimestamp();

            const gameMessage = await message.reply({ embeds: [embed], components: [row] });

            // Auto-expire game after 2 minutes
            setTimeout(() => {
                if (activeGames.has(message.author.id)) {
                    activeGames.delete(message.author.id);
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#666666')
                        .setTitle('⏱️ Game Expired')
                        .setDescription('Your blackjack game has expired due to inactivity. Your bet has been lost.');
                    
                    gameMessage.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
                }
            }, 120000); // 2 minutes

        } catch (error) {
            console.error('Error in blackjack command:', error);
            await message.reply('❌ Sorry, there was an error starting the blackjack game. Please try again later.');
            
            // Clean up on error
            if (activeGames.has(message.author.id)) {
                activeGames.delete(message.author.id);
            }
        }
    },

    // Handle button interactions
    async handleInteraction(interaction) {
        const gameData = activeGames.get(interaction.user.id);
        if (!gameData) {
            await interaction.reply({ content: '❌ You don\'t have an active blackjack game.', ephemeral: true });
            return;
        }

        const { game, amount } = gameData;

        if (interaction.customId === 'blackjack_hit') {
            // Player hits
            game.playerHand.push(game.drawCard());
            const playerValue = game.calculateHandValue(game.playerHand);

            if (playerValue > 21) {
                // Player busts
                activeGames.delete(interaction.user.id);
                
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('🃏 Bust!')
                    .setDescription('You went over 21! You lose.')
                    .addFields(
                        { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                        { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${game.calculateHandValue(game.dealerHand)})`, inline: true },
                        { name: '💸 Loss', value: `-${amount} coins`, inline: false }
                    );

                await interaction.update({ embeds: [embed], components: [] });
            } else {
                // Continue game
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('blackjack_hit')
                            .setLabel('Hit')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🃏'),
                        new ButtonBuilder()
                            .setCustomId('blackjack_stand')
                            .setLabel('Stand')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('✋')
                    );

                const hitDealerValue = game.calculateHandValue(game.dealerHand);
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🃏 Blackjack Game')
                    .setDescription(`Bet: **${amount} coins**`)
                    .addFields(
                        { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                        { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${hitDealerValue})`, inline: true },
                        { name: '🎯 Goal', value: 'Get as close to 21 as possible without going over!', inline: false }
                    )
                    .setFooter({ text: `Game expires in 2 minutes | ${interaction.user.tag}` })
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [row] });
            }

        } else if (interaction.customId === 'blackjack_stand') {
            // Player stands - dealer plays
            activeGames.delete(interaction.user.id);
            
            // Dealer draws until 17 or higher
            while (game.calculateHandValue(game.dealerHand) < 17) {
                game.dealerHand.push(game.drawCard());
            }

            const playerValue = game.calculateHandValue(game.playerHand);
            const dealerValue = game.calculateHandValue(game.dealerHand);

            let resultEmbed;
            
            if (dealerValue > 21) {
                // Dealer busts - player wins
                const winnings = amount * 2;
                await economyService.updateBalance(interaction.message.guild.id, interaction.user.id, winnings);
                
                resultEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🃏 You Win!')
                    .setDescription('Dealer busted! You win!')
                    .addFields(
                        { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                        { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${dealerValue})`, inline: true },
                        { name: '💰 Winnings', value: `+${winnings} coins`, inline: false }
                    );
            } else if (playerValue > dealerValue) {
                // Player wins
                const winnings = amount * 2;
                await economyService.updateBalance(interaction.message.guild.id, interaction.user.id, winnings);
                
                resultEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🃏 You Win!')
                    .setDescription('Your hand beats the dealer!')
                    .addFields(
                        { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                        { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${dealerValue})`, inline: true },
                        { name: '💰 Winnings', value: `+${winnings} coins`, inline: false }
                    );
            } else if (playerValue < dealerValue) {
                // Dealer wins
                resultEmbed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('🃏 You Lose!')
                    .setDescription('Dealer\'s hand beats yours.')
                    .addFields(
                        { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                        { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${dealerValue})`, inline: true },
                        { name: '💸 Loss', value: `-${amount} coins`, inline: false }
                    );
            } else {
                // Push - tie
                await economyService.updateBalance(interaction.message.guild.id, interaction.user.id, amount);
                
                resultEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🃏 Push!')
                    .setDescription('It\'s a tie! Your bet is returned.')
                    .addFields(
                        { name: '👤 Your Hand', value: `${game.formatHand(game.playerHand)} (${playerValue})`, inline: true },
                        { name: '🤖 Dealer Hand', value: `${game.formatHand(game.dealerHand)} (${dealerValue})`, inline: true },
                        { name: '💰 Result', value: `Bet returned: ${amount} coins`, inline: false }
                    );
            }

            await interaction.update({ embeds: [resultEmbed], components: [] });
        }
    }
};
