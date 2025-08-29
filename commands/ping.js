module.exports = {
    name: 'ping',
    description: 'Replies with Pong and shows bot latency!',
    
    async execute(message, args) {
        const sent = await message.reply('Pinging...');
        
        const timeDiff = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(message.client.ws.ping);
        
        await sent.edit({
            content: `🏓 Pong!\n` +
                    `**Roundtrip latency:** ${timeDiff}ms\n` +
                    `**Websocket heartbeat:** ${apiLatency}ms`
        });
    }
};
