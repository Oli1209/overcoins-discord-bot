const http = require('http');
const logger = require('./logger.js');

class HttpServer {
    constructor(client, port = 3000) {
        this.client = client;
        this.port = port;
        this.server = null;
        this.startTime = Date.now();
        this.pingCount = 0;
    }

    start() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            logger.info(`[HTTP] Keep-alive server listening on port ${this.port}`);
            logger.info(`[HTTP] Ping URL: http://localhost:${this.port}/ping`);
        });

        this.server.on('error', (error) => {
            logger.error(`[HTTP] Server error:`, error.message);
        });
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                logger.info('[HTTP] Keep-alive server stopped');
            });
        }
    }

    handleRequest(req, res) {
        const url = req.url;
        const method = req.method;
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (method === 'GET') {
            switch (url) {
                case '/':
                case '/ping':
                    this.handlePing(req, res);
                    break;
                case '/status':
                    this.handleStatus(req, res);
                    break;
                case '/health':
                    this.handleHealth(req, res);
                    break;
                default:
                    this.handle404(req, res);
                    break;
            }
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        }
    }

    handlePing(req, res) {
        this.pingCount++;
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Minimalne logowanie dla częstych pingow
        if (this.pingCount % 50 === 1) { // Loguj co 50. ping
            logger.info(`[HTTP] Ping received (${this.pingCount}) - Bot alive for ${uptime}s`);
        }

        const response = {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: uptime,
            bot: {
                ready: this.client?.isReady() || false,
                guilds: this.client?.guilds?.cache?.size || 0,
                ping: this.client?.ws?.ping || 0
            },
            ping_count: this.pingCount
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
    }

    handleStatus(req, res) {
        const uptime = process.uptime();
        const memUsage = process.memoryUsage();
        
        const response = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            system: {
                uptime: Math.floor(uptime),
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memUsage.heapTotal / 1024 / 1024)
                },
                node_version: process.version
            },
            discord: {
                ready: this.client?.isReady() || false,
                guilds: this.client?.guilds?.cache?.size || 0,
                users: this.client?.guilds?.cache?.reduce((acc, guild) => acc + (guild.memberCount || 0), 0) || 0,
                ws_status: this.client?.ws?.status || 'unknown',
                ping: this.client?.ws?.ping || 0
            },
            http: {
                ping_count: this.pingCount,
                server_uptime: Math.floor((Date.now() - this.startTime) / 1000)
            }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
        
        logger.info(`[HTTP] Status check requested - Bot in ${response.discord.guilds} guilds`);
    }

    handleHealth(req, res) {
        const isHealthy = this.client?.isReady() && this.client?.ws?.ping < 10000;
        const statusCode = isHealthy ? 200 : 503;
        
        const response = {
            healthy: isHealthy,
            timestamp: new Date().toISOString(),
            checks: {
                bot_ready: this.client?.isReady() || false,
                websocket_ok: (this.client?.ws?.ping || 0) < 10000,
                guilds_connected: (this.client?.guilds?.cache?.size || 0) > 0
            }
        };

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
    }

    handle404(req, res) {
        const response = {
            error: 'Not Found',
            message: 'Available endpoints: /ping, /status, /health',
            timestamp: new Date().toISOString()
        };

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
    }
}

module.exports = HttpServer;
