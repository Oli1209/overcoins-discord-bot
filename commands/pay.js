const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');
const economyService = require('../services/economy.js');

module.exports = {
    name: 'pay',
    description: 'Transfer coins to another user',
    
    async execute(message, args) {
        try {
            if (args.length < 2) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Invalid Usage')
                    .setDescription('Usage: `!pay @user <amount|half|all>`\\n\\nExamples:\\n`!pay @friend 100` - send 100 coins\\n`!pay @friend half` - send half of in hand\\n`!pay @friend all` - send all in hand')
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Parse mentioned user
            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                await message.reply('❌ Please mention a valid user to send coins to.');
                return;
            }

            // Check if trying to pay themselves
            if (mentionedUser.id === message.author.id) {
                await message.reply('❌ You cannot send coins to yourself!');
                return;
            }

            // Check if trying to pay a bot
            if (mentionedUser.bot) {
                await message.reply('❌ You cannot send coins to bots!');
                return;
            }

            // Make sure both users exist and get sender's current balance
            const senderUser = await economyService.getUser(message.guild.id, message.author.id, message.author.username);
            await economyService.getUser(message.guild.id, mentionedUser.id, mentionedUser.username);

            // Parse amount
            let amount;
            const input = args[1].toLowerCase();
            
            if (input === 'half') {
                amount = Math.floor(senderUser.balance / 2);
            } else if (input === 'all') {
                amount = senderUser.balance;
            } else {
                amount = parseInt(args[1]);
                if (isNaN(amount) || amount <= 0) {
                    await message.reply('❌ Please provide a valid positive amount, "half", or "all".');
                    return;
                }
            }

            if (amount <= 0) {
                await message.reply('❌ You have no coins in hand to send.');
                return;
            }

            // Perform transfer
            const result = await economyService.transferCoins(
                message.guild.id,
                message.author.id, 
                message.author.username,
                mentionedUser.id,
                mentionedUser.username,
                amount
            );

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Transfer Failed')
                    .setDescription(result.message)
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // Success message
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Transfer Successful')
                .setDescription(`You successfully sent **${amount.toLocaleString()} coins** to ${mentionedUser}!`)
                .addFields(
                    { name: '💸 Sender', value: `${message.author.username}`, inline: true },
                    { name: '💰 Receiver', value: `${mentionedUser.username}`, inline: true },
                    { name: '💎 Amount', value: `${amount.toLocaleString()} coins`, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL() 
                });

            await message.reply({ embeds: [embed] });

            // Send notification to receiver if they're in the same guild
            const receiverMember = message.guild.members.cache.get(mentionedUser.id);
            if (receiverMember) {
                try {
                    const notificationEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('💰 You Received Coins!')
                        .setDescription(`${message.author.username} sent you **${amount} coins**!`)
                        .setTimestamp();
                    
                    await mentionedUser.send({ embeds: [notificationEmbed] });
                } catch (dmError) {
                    // Ignore DM errors - user might have DMs disabled
                }
            }

        } catch (error) {
            console.error('Error in pay command:', error);
            await message.reply('❌ Sorry, there was an error processing the transfer. Please try again later.');
        }
    }
};
