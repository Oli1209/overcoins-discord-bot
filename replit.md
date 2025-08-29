# OverCoins Discord Bot

## Overview

A feature-rich Discord bot built with Node.js and Discord.js, leveraging Neon Database and Drizzle ORM for robust data management. The bot provides advanced economy features, custom commands, interactive gambling games, and comprehensive user experiences with built-in cooldown management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture Pattern
The bot follows a **modular, handler-based architecture** that separates concerns and promotes maintainability:

- **Entry Point (`index.js`)**: Initializes the Discord client, loads handlers, and manages the bot lifecycle
- **Command System**: Dynamic command loading with slash command support via Discord.js builders
- **Event System**: Event-driven architecture handling Discord gateway events
- **Configuration Management**: Centralized config with environment variable support and validation
- **Logging System**: Custom logger with configurable levels and colored output

### Directory Structure
```
├── commands/           # Slash command implementations
├── config/            # Configuration management
├── events/            # Discord event handlers
├── handlers/          # Command and event loading logic
├── utils/             # Utility functions (logger)
├── deploy-commands.js # Command deployment script
└── index.js          # Main entry point
```

### Command Architecture  
**Problem Addressed**: Need for scalable economy bot with cooldown management
**Solution**: Dynamic command loading with global cooldown system
- Commands are auto-loaded from the `commands/` directory  
- Each command exports `name`, `description`, and `execute` function
- Commands are stored in a Discord.js Collection for efficient lookup
- **10-Second Global Cooldown System** (Added: Aug 28, 2025):
  - Applied to economic commands: balance, deposit, withdraw, sell, inventory, leaderboard, pay, coinflip
  - Commands with existing cooldowns (search: 2min, work: 5min, dailyreward: 24hr) remain unchanged
  - Individual cooldowns per user using database storage
  - English cooldown messages: "⏳ You must wait X seconds before using this command again."

### Event Handling
**Problem Addressed**: Managing multiple Discord events efficiently
**Solution**: Modular event system with automatic registration
- Events are dynamically loaded from the `events/` directory
- Each event module exports name, execute function, and optional `once` flag
- Supports all Discord.js gateway events (ready, interactionCreate, messageCreate, etc.)
- Events receive the client instance for full bot context

### Configuration Management
**Problem Addressed**: Secure and flexible configuration
**Solution**: Environment-based config with validation
- Uses dotenv for environment variable loading
- Built-in validation for required configuration values
- Supports different environments (development, production)
- Centralized configuration object with type safety

### Error Handling
**Problem Addressed**: Robust error management and debugging
**Solution**: Multi-layered error handling approach
- Global process error handlers for unhandled rejections and exceptions
- Per-command error handling with user-friendly responses
- Comprehensive logging with configurable levels
- Graceful degradation for non-critical failures

## External Dependencies

### Core Framework
- **Discord.js**: Discord API wrapper providing client and event handling
- **Node.js**: Runtime environment with ES6+ features
- **Neon Database**: PostgreSQL database for persistent data storage
- **Drizzle ORM**: Type-safe ORM for database operations

### Database & ORM
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **drizzle-orm**: Type-safe database operations
- **drizzle-kit**: Database migration and management tools

### Configuration & Environment  
- **dotenv**: Environment variable management for secure token storage
- **fs/path**: Native Node.js modules for file system operations

### Required Environment Variables
- `DISCORD_TOKEN`: Bot authentication token from Discord Developer Portal
- `DATABASE_URL`: Neon PostgreSQL connection string
- `NODE_ENV`: Environment specification (development/production)

### Database Schema
- **users**: User profiles, balances, banking, daily rewards
- **inventory**: User items with quantities and values  
- **cooldowns**: Command cooldown tracking per user
- **coinflips**: Active gambling games and history

## Recent Changes

### August 28, 2025 - Global Cooldown System
✓ Added 10-second global cooldown for economic commands  
✓ Enhanced economy service with seconds-based cooldown methods
✓ Modified command handler to enforce cooldowns automatically
✓ Preserved existing cooldowns: search (2min), work (5min), dailyreward (24hr)
✓ Commands covered: balance, deposit, withdraw, sell, inventory, leaderboard, pay, coinflip

### August 28, 2025 - Gambling Features Implementation
✓ Added blackjack command with interactive button controls
✓ Added slots command with symbol combinations and jackpots  
✓ Added Russian roulette multiplayer gambling game
✓ Created interaction handler for button-based games
✓ All gambling games integrated with existing economy system
✓ Applied 10-second cooldown to all new gambling commands
✓ Persistent data storage using existing database infrastructure

### August 28, 2025 - Gambling Features Enhanced
✓ **Blackjack improvements**: Show dealer cards at all times, 2x winnings, proper balance checking
✓ **Russian roulette overhaul**: Multi-player support (up to 6), round-based elimination, survivors win 2x
✓ Enhanced game mechanics with proper cooldown management and balance verification
✓ Real-time game progression with detailed status updates and dramatic effects
✓ Comprehensive error handling and automatic bet refunds on game failures

### August 28, 2025 - New Gambling Commands Added
✓ **Casino Roulette (!roulette)**: Classic casino game with red/black (2x) and green (14x) payouts
✓ **Higher/Lower (!higherlower)**: Progressive risk-reward game with up to 10 rounds and increasing multipliers
✓ **Russian Roulette Rewrite**: Now realistic 2-player turn-based game with proper chamber mechanics
✓ Enhanced interaction system supporting button-based gameplay for multiple gambling commands
✓ All new commands integrated with existing economy system and 10-second cooldowns

### August 28, 2025 - New Economic Mechanics (Robbing & Loans)
✓ **Robbing System (!rob @user)**: 50/50 success/failure mechanic with 10-minute cooldown
  - Success: Steal up to 75% of victim's in-hand coins
  - Failure: Lose random fine (100, 250, 500, or 1000 coins)
  - Requires victim to have at least 250 coins in hand
✓ **Loan System**: Complete lending functionality with 15% interest rate
  - !loan <amount>: Take loans up to 2500 coins (added to bank balance)
  - !loanpay <amount>: Repay loans from bank balance (partial or full)
  - !loanstatus: Check current loan information and progress
  - One active loan per user per guild, fully integrated with existing economy

### August 28, 2025 - Advanced Keep-Alive System Implementation
✓ **Enhanced Stay-Active System**: Prevents bot sleeping on free Replit hosting
  - **Dynamic Status Rotation**: Random activity changes every 3-5 minutes
  - **Diverse Activities**: 17 different statuses across Playing, Watching, Listening, Custom types
  - **Background Tasks**: Light server/user iteration every 8 minutes without data modification
  - **Cache Refresh**: Memory and system stats monitoring every 6 minutes
  - **HTTP Ping Server**: External monitoring endpoint on port 5000
✓ **HTTP Endpoints for UptimeRobot**:
  - /ping: Basic alive status with bot info
  - /status: Detailed system and Discord statistics  
  - /health: Health check with service status validation
✓ **System Integration**: Full compatibility with existing economy, per-guild data separation
✓ **Graceful Shutdown**: Proper cleanup of all keep-alive processes during bot restart