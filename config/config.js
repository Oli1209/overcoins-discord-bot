require('dotenv').config();

const config = {
console.log("TOKEN:", process.env.DISCORD_TOKEN);
console.log("CLIENT_ID:", process.env.CLIENT_ID);
    // Discord configuration
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // Bot settings
    prefix: '!', // Fallback prefix for non-slash commands
    embedColor: '#0099ff',
    
    // Bot owner (for admin commands) - set this to your Discord user ID
    ownerId: process.env.OWNER_ID || process.env.CLIENT_ID, // Fallback to client ID for now
    
    // Validate required configuration
    validate() {
        const required = ['token', 'clientId'];
        const missing = required.filter(key => !this[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
    }
};

// Validate configuration on load
try {
    config.validate();
} catch (error) {
    console.error('Configuration validation failed:', error.message);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
}

module.exports = config;
