const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config/config.js');
const logger = require('./utils/logger.js');
const commandHandler = require('./handlers/commandHandler.js');
const eventHandler = require('./handlers/eventHandler.js');
const economyService = require('./services/economy.js');
const KeepAlive = require('./utils/keepAlive.js');
const HttpServer = require('./utils/httpServer.js');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Create a collection to store commands
client.commands = new Collection();

// Initialize keep-alive system and HTTP server
let keepAliveSystem = null;
let httpServer = null;

// Initialize handlers
async function initializeBot() {
    try {
        // Initialize database
        await economyService.initializeDatabase();
        logger.info('Database initialized successfully');

        // Load commands
        await commandHandler.loadCommands(client);
        logger.info('Commands loaded successfully');

        // Load events
        eventHandler.loadEvents(client);
        logger.info('Events loaded successfully');

        // Login to Discord
        await client.login(config.token);
        logger.info('Bot initialization completed');

        // Start keep-alive system after bot is ready
        keepAliveSystem = new KeepAlive(client);
        keepAliveSystem.start();
        logger.info('Keep-alive system initialized successfully');

        // Start HTTP server for external pinging (port 5000 for Replit)
        const httpPort = process.env.PORT || 5000;
        httpServer = new HttpServer(client, httpPort);
        httpServer.start();
        logger.info(`HTTP keep-alive server started on port ${httpPort}`);
    } catch (error) {
        logger.error('Failed to initialize bot:', error);
        process.exit(1);
    }
}

// Global error handling
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    shutdownGracefully();
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    shutdownGracefully();
});

function shutdownGracefully() {
    // Stop keep-alive system
    if (keepAliveSystem) {
        keepAliveSystem.stop();
        logger.info('Keep-alive system stopped');
    }
    
    // Stop HTTP server
    if (httpServer) {
        httpServer.stop();
        logger.info('HTTP server stopped');
    }
    
    // Destroy Discord client
    client.destroy();
    logger.info('Discord client destroyed');
    
    process.exit(0);
}

// Start the bot
initializeBot();
