const logger = require('./logger.js');

class KeepAlive {
    constructor(client) {
        this.client = client;
        this.intervals = [];
        this.activities = [
            // Playing activities
            { name: 'Playing blackjack 🎰', type: 'Playing' },
            { name: '🎲 Rolling dice with players', type: 'Playing' },
            { name: '♠️ Dealing cards at tables', type: 'Playing' },
            { name: '🎯 Russian roulette games', type: 'Playing' },
            { name: '🃏 Poker tournaments', type: 'Playing' },
            { name: '🎊 Slot machine jackpots', type: 'Playing' },
            
            // Watching activities  
            { name: 'Watching over the economy 💰', type: 'Watching' },
            { name: '👀 Monitoring coin transfers', type: 'Watching' },
            { name: '📊 Market fluctuations', type: 'Watching' },
            { name: '🏦 Bank transactions', type: 'Watching' },
            { name: '💎 Valuable inventories', type: 'Watching' },
            
            // Listening activities
            { name: '🎵 Casino ambience', type: 'Listening' },
            { name: '💰 Coins dropping', type: 'Listening' },
            { name: '🔔 Jackpot bells', type: 'Listening' },
            { name: '📢 Winner announcements', type: 'Listening' },
            
            // Custom activities
            { name: '💸 Economy & Gambling Bot 🎰', type: 'Custom' },
            { name: '🌟 Exploring the casino 🃏', type: 'Custom' },
            { name: '💎 Managing guild economies', type: 'Custom' }
        ];
        
        this.lastGuildScan = Date.now();
        this.guildRotationIndex = 0;
    }

    start() {
        logger.info('Keep-alive system starting...');

        // Agresywny heartbeat - każde 2 minuty
        const heartbeatInterval = setInterval(() => {
            this.heartbeat();
        }, 2 * 60 * 1000); // 2 minuty

        // Self-ping do własnego serwera HTTP - co 10 minut
        const selfPingInterval = setInterval(() => {
            this.selfPing();
        }, 10 * 60 * 1000); // 10 minut

        // Dynamiczna zmiana aktywności - co 2-4 minuty (bardziej agresywne)
        this.scheduleNextActivity();

        // Status check - co 7 minut (częściej)
        const statusInterval = setInterval(() => {
            this.checkStatus();
        }, 7 * 60 * 1000); // 7 minut

        // Zadania w tle - co 5 minut (częściej)
        const backgroundTasksInterval = setInterval(() => {
            this.runBackgroundTasks();
        }, 5 * 60 * 1000); // 5 minut

        // Cache refresh - co 3 minuty (bardzo często)
        const cacheRefreshInterval = setInterval(() => {
            this.refreshDataCache();
        }, 3 * 60 * 1000); // 3 minuty

        // Discord API activity ping - co 60 sekund (jeszcze częściej)
        const discordPingInterval = setInterval(() => {
            this.discordApiPing();
        }, 60 * 1000); // 60 sekund
        
        // ULTRA-agresywny CPU keep-alive - co 30 sekund
        const cpuKeepAliveInterval = setInterval(() => {
            this.ultraAggressiveKeepAlive();
        }, 30 * 1000); // 30 sekund

        this.intervals.push(heartbeatInterval, selfPingInterval, statusInterval, backgroundTasksInterval, cacheRefreshInterval, discordPingInterval, cpuKeepAliveInterval);
        
        logger.info('Keep-alive system started successfully');
        logger.info('- Aggressive heartbeat every 2 minutes');
        logger.info('- Self-ping every 10 minutes');
        logger.info('- Dynamic activity rotation every 2-4 minutes');
        logger.info('- Status check every 7 minutes');
        logger.info('- Background tasks every 5 minutes');
        logger.info('- Cache refresh every 3 minutes');
        logger.info('- Discord API ping every 60 seconds');
        logger.info('- Ultra-aggressive CPU keep-alive every 30 seconds');
    }

    scheduleNextActivity() {
        // Bardziej agresywny interwał między 2-4 minuty
        const randomInterval = (2 + Math.random() * 2) * 60 * 1000; // 2-4 minuty
        
        const timeout = setTimeout(() => {
            this.rotateActivity();
            this.scheduleNextActivity(); // Zaplanuj następną zmianę
        }, randomInterval);
        
        this.intervals.push(timeout);
    }

    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        logger.info('Keep-alive system stopped');
    }

    async heartbeat() {
        try {
            const timestamp = new Date().toISOString();
            const uptime = process.uptime();
            const guilds = this.client.guilds.cache.size;
            const users = this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const memoryUsage = process.memoryUsage();
            
            // AGRESYWNE logowanie dla diagnostyki uśpienia
            logger.info(`[HEARTBEAT] ${timestamp} - Bot alive | Uptime: ${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m | Guilds: ${guilds} | Users: ${users} | Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
            
            // Małe żądanie do API Discord - utrzymuje połączenie aktywne
            await this.client.application?.fetch();
            
            // Dodatkowa aktywność CPU - zapobiega usypianiu
            for (let i = 0; i < 10000; i++) {
                Math.random() * Math.random();
            }
            
            // Sprawdź czy Replit nie próbuje nas uśpić
            if (uptime < 120) { // Jeśli uptime < 2 min, to prawdopodobnie restart
                logger.warn(`[HEARTBEAT] POTENTIAL SLEEP DETECTED! Bot uptime only ${Math.floor(uptime)}s - may have been sleeping`);
            }
            
        } catch (error) {
            logger.warn('[HEARTBEAT] Heartbeat error:', error.message);
        }
    }

    async rotateActivity() {
        try {
            // Losowy wybór aktywności
            const randomIndex = Math.floor(Math.random() * this.activities.length);
            const activity = this.activities[randomIndex];
            
            await this.client.user.setPresence({
                activities: [{
                    name: activity.name,
                    type: require('discord.js').ActivityType[activity.type]
                }],
                status: 'online'
            });
            
            logger.info(`[KEEP-ALIVE] Activity changed to: ${activity.name} (${activity.type})`);
            
        } catch (error) {
            logger.warn('[KEEP-ALIVE] Activity rotation error:', error.message);
        }
    }

    async runBackgroundTasks() {
        try {
            const startTime = Date.now();
            let processedGuilds = 0;
            let totalUsers = 0;

            // Iteracja po serwerach - lekkie zadania w tle
            for (const guild of this.client.guilds.cache.values()) {
                try {
                    // Zlicz członków bez pobierania danych
                    const memberCount = guild.memberCount || guild.members.cache.size;
                    totalUsers += memberCount;
                    processedGuilds++;
                    
                    // Mała przerwa co 5 serwerów, żeby nie blokować
                    if (processedGuilds % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    
                } catch (guildError) {
                    logger.warn(`[BACKGROUND] Guild scan error for ${guild.name}:`, guildError.message);
                }
            }

            const processingTime = Date.now() - startTime;
            logger.info(`[BACKGROUND] Processed ${processedGuilds} guilds, ${totalUsers} total users in ${processingTime}ms`);

        } catch (error) {
            logger.warn('[BACKGROUND] Background tasks error:', error.message);
        }
    }

    async refreshDataCache() {
        try {
            // Odświeżenie cache'u aplikacji - małe żądanie API
            const appInfo = await this.client.application?.fetch();
            
            // Statystyki systemu
            const memUsage = process.memoryUsage();
            const uptime = process.uptime();
            
            logger.info(`[CACHE] Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB | Uptime: ${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m`);
            
            // Sprawdzenie połączenia WebSocket
            if (this.client.ws.ping > 0) {
                logger.info(`[CACHE] Discord WS ping: ${this.client.ws.ping}ms`);
            }

        } catch (error) {
            logger.warn('[CACHE] Cache refresh error:', error.message);
        }
    }

    async selfPing() {
        try {
            const http = require('http');
            const url = `http://localhost:5000/ping`;
            
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    logger.info('[SELF-PING] Internal ping successful - bot staying active');
                });
            });

            req.on('error', (error) => {
                logger.warn('[SELF-PING] Internal ping failed:', error.message);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                logger.warn('[SELF-PING] Internal ping timeout');
            });

        } catch (error) {
            logger.warn('[SELF-PING] Self ping error:', error.message);
        }
    }

    async discordApiPing() {
        try {
            // Małe żądania API Discord dla utrzymania aktywności
            if (this.client?.isReady()) {
                // Pobierz informacje o aplikacji
                await this.client.application?.fetch();
                
                // Sprawdź guilds cache
                const guildCount = this.client.guilds.cache.size;
                
                // Ustaw status co jakiś czas
                if (Math.random() < 0.1) { // 10% szans na ustawienie statusu
                    await this.client.user.setStatus('online');
                }
                
                // Loguj tylko co 10. ping (żeby nie spamować)
                if (Math.random() < 0.1) {
                    logger.info(`[DISCORD-PING] API activity ping | Guilds: ${guildCount} | WS: ${this.client.ws.ping}ms`);
                }
            }
        } catch (error) {
            logger.warn('[DISCORD-PING] Discord API ping error:', error.message);
        }
    }

    async ultraAggressiveKeepAlive() {
        try {
            // ULTRA-agresywne środki przeciwko usypianiu
            const timestamp = new Date().toISOString();
            
            // Intensywna aktywność CPU
            for (let i = 0; i < 50000; i++) {
                Math.random() * Math.sqrt(i);
            }
            
            // Sprawdź uptime i ostrzeż o potencjalnym uśpieniu
            const uptime = process.uptime();
            if (uptime < 60) {
                logger.error(`[ULTRA-KEEPALIVE] ⚠️ SLEEP ALERT! Bot uptime only ${Math.floor(uptime)}s - REPLIT MAY BE TRYING TO SLEEP!`);
            }
            
            // Loguj co 10. ping żeby nie spamować
            if (Math.random() < 0.1) {
                logger.info(`[ULTRA-KEEPALIVE] ${timestamp} - CPU activity burst | Uptime: ${Math.floor(uptime)}s`);
            }
            
            // File system activity - czasami pomaga
            require('fs').readFileSync(__filename);
            
        } catch (error) {
            logger.warn('[ULTRA-KEEPALIVE] Ultra keep-alive error:', error.message);
        }
    }

    async checkStatus() {
        try {
            const wsStatus = this.client.ws.status;
            const ping = this.client.ws.ping;
            
            logger.info(`[KEEP-ALIVE] Status check | WS: ${wsStatus} | Ping: ${ping}ms`);
            
            // Jeśli ping jest bardzo wysoki, spróbuj odświeżyć połączenie
            if (ping > 5000) {
                logger.warn(`[KEEP-ALIVE] High ping detected (${ping}ms) - refreshing connection status`);
                await this.client.user.setStatus('online');
            }
            
        } catch (error) {
            logger.warn('[KEEP-ALIVE] Status check error:', error.message);
        }
    }

    // Metoda do bezpiecznego restartowania systemu
    async restart() {
        logger.info('[KEEP-ALIVE] Restarting keep-alive system...');
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Krótka pauza
        this.start();
    }
}

module.exports = KeepAlive;
