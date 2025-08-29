const config = require('../config/config.js');

class Logger {
    constructor() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.currentLevel = this.levels[config.logLevel] || this.levels.info;
        this.colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[35m', // Magenta
            reset: '\x1b[0m'   // Reset
        };
    }
    
    /**
     * Format timestamp for logging
     * @returns {string} - Formatted timestamp
     */
    getTimestamp() {
        return new Date().toISOString();
    }
    
    /**
     * Format log message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {any} data - Additional data
     * @returns {string} - Formatted log message
     */
    formatMessage(level, message, data) {
        const timestamp = this.getTimestamp();
        const color = this.colors[level] || '';
        const reset = this.colors.reset;
        
        let formattedMessage = `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`;
        
        if (data !== undefined) {
            if (data instanceof Error) {
                formattedMessage += `\n${data.stack}`;
            } else if (typeof data === 'object') {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }
        
        return formattedMessage;
    }
    
    /**
     * Log a message if the level is appropriate
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {any} data - Additional data
     */
    log(level, message, data) {
        if (this.levels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, data);
            
            if (level === 'error') {
                console.error(formattedMessage);
            } else if (level === 'warn') {
                console.warn(formattedMessage);
            } else {
                console.log(formattedMessage);
            }
        }
    }
    
    /**
     * Log an error message
     * @param {string} message - Error message
     * @param {any} data - Additional data
     */
    error(message, data) {
        this.log('error', message, data);
    }
    
    /**
     * Log a warning message
     * @param {string} message - Warning message
     * @param {any} data - Additional data
     */
    warn(message, data) {
        this.log('warn', message, data);
    }
    
    /**
     * Log an info message
     * @param {string} message - Info message
     * @param {any} data - Additional data
     */
    info(message, data) {
        this.log('info', message, data);
    }
    
    /**
     * Log a debug message
     * @param {string} message - Debug message
     * @param {any} data - Additional data
     */
    debug(message, data) {
        this.log('debug', message, data);
    }
}

module.exports = new Logger();
