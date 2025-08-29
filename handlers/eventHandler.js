const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger.js');

class EventHandler {
    /**
     * Load all events from the events directory
     * @param {Client} client - Discord client instance
     */
    loadEvents(client) {
        const eventsPath = path.join(__dirname, '..', 'events');
        
        try {
            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
            
            for (const file of eventFiles) {
                const filePath = path.join(eventsPath, file);
                
                try {
                    // Clear require cache to allow hot reloading in development
                    delete require.cache[require.resolve(filePath)];
                    
                    const event = require(filePath);
                    
                    // Validate event structure
                    if (!this.validateEvent(event)) {
                        logger.warn(`Invalid event structure in ${file}`);
                        continue;
                    }
                    
                    // Register the event
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args, client));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args, client));
                    }
                    
                    logger.info(`Loaded event: ${event.name}`);
                    
                } catch (error) {
                    logger.error(`Error loading event ${file}:`, error);
                }
            }
            
        } catch (error) {
            logger.error('Error reading events directory:', error);
            throw error;
        }
    }
    
    /**
     * Validate event structure
     * @param {Object} event - Event object to validate
     * @returns {boolean} - Whether the event is valid
     */
    validateEvent(event) {
        return (
            event &&
            event.name &&
            typeof event.execute === 'function'
        );
    }
}

module.exports = new EventHandler();
