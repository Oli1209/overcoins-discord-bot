// Use direct database connection since we're in a JS file
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class EconomyService {
    async initializeDatabase() {
        try {
            // Create users table if it doesn't exist
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    balance INTEGER DEFAULT 0 NOT NULL,
                    bank_balance INTEGER DEFAULT 0 NOT NULL,
                    last_daily TIMESTAMP,
                    total_earned INTEGER DEFAULT 0 NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
                )
            `);

            // Create inventory table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id SERIAL PRIMARY KEY,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    item_name TEXT NOT NULL,
                    quantity INTEGER DEFAULT 1 NOT NULL,
                    value INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL
                )
            `);

            // Create cooldowns table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS cooldowns (
                    id SERIAL PRIMARY KEY,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    command TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL
                )
            `);

            // Create coinflips table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS coinflips (
                    id SERIAL PRIMARY KEY,
                    guild_id TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    creator_id TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    participants TEXT DEFAULT '[]' NOT NULL,
                    is_active BOOLEAN DEFAULT true NOT NULL,
                    winner_id TEXT,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    completed_at TIMESTAMP
                )
            `);

            // Create loans table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS loans (
                    id SERIAL PRIMARY KEY,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    loan_amount INTEGER NOT NULL,
                    total_repayment INTEGER NOT NULL,
                    remaining_balance INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
                )
            `);

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    async getUser(guildId, userId, username) {
        try {
            const compositeId = `${guildId}:${userId}`;
            // Try to get existing user for this guild
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [compositeId]);
            
            if (result.rows.length === 0) {
                // Create new user if doesn't exist for this guild
                const insertResult = await pool.query(
                    'INSERT INTO users (id, username, balance, bank_balance, total_earned, guild_id, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                    [compositeId, username, 0, 0, 0, guildId, userId]
                );
                return insertResult.rows[0];
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    async updateBalance(guildId, userId, amount) {
        try {
            const compositeId = `${guildId}:${userId}`;
            const result = await pool.query(
                'UPDATE users SET balance = balance + $1, total_earned = total_earned + $2, updated_at = NOW() WHERE id = $3 RETURNING *',
                [amount, amount > 0 ? amount : 0, compositeId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error updating balance:', error);
            throw error;
        }
    }

    async setBalance(guildId, userId, amount) {
        try {
            const compositeId = `${guildId}:${userId}`;
            const result = await pool.query(
                'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [amount, compositeId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error setting balance:', error);
            throw error;
        }
    }

    async claimDailyReward(guildId, userId, username) {
        try {
            const user = await this.getUser(guildId, userId, username);
            const now = new Date();
            const lastDaily = user.last_daily ? new Date(user.last_daily) : null;
            
            // Check if 24 hours have passed since last daily
            if (lastDaily && (now - lastDaily) < 24 * 60 * 60 * 1000) {
                const timeLeft = 24 * 60 * 60 * 1000 - (now - lastDaily);
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                
                return {
                    success: false,
                    message: `You already claimed your daily reward! Come back in ${hoursLeft}h ${minutesLeft}m.`,
                    timeLeft: timeLeft
                };
            }

            // Give daily reward (500 coins)
            const dailyAmount = 500;
            const compositeId = `${guildId}:${userId}`;
            const result = await pool.query(
                'UPDATE users SET balance = balance + $1, total_earned = total_earned + $1, last_daily = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
                [dailyAmount, compositeId]
            );

            return {
                success: true,
                message: `You received ${dailyAmount} coins! Your new balance: ${result.rows[0].balance} coins.`,
                amount: dailyAmount,
                newBalance: result.rows[0].balance
            };
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            throw error;
        }
    }

    async addCoins(guildId, userId, username, amount) {
        try {
            // Make sure user exists first
            await this.getUser(guildId, userId, username);
            
            const result = await this.updateBalance(guildId, userId, amount);
            return result;
        } catch (error) {
            console.error('Error adding coins:', error);
            throw error;
        }
    }

    // ===== COOLDOWN METHODS =====
    async checkCooldown(guildId, userId, command) {
        try {
            const result = await pool.query(
                'SELECT * FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND command = $3 AND expires_at > NOW()',
                [guildId, userId, command]
            );
            
            if (result.rows.length > 0) {
                const cooldown = result.rows[0];
                const timeLeft = new Date(cooldown.expires_at) - new Date();
                return {
                    onCooldown: true,
                    timeLeft: Math.ceil(timeLeft / 1000 / 60) // minutes
                };
            }
            
            return { onCooldown: false };
        } catch (error) {
            console.error('Error checking cooldown:', error);
            throw error;
        }
    }

    async checkCooldownSeconds(guildId, userId, command) {
        try {
            const result = await pool.query(
                'SELECT * FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND command = $3 AND expires_at > NOW()',
                [guildId, userId, command]
            );
            
            if (result.rows.length > 0) {
                const cooldown = result.rows[0];
                const timeLeft = new Date(cooldown.expires_at) - new Date();
                return {
                    onCooldown: true,
                    timeLeft: Math.ceil(timeLeft / 1000) // seconds
                };
            }
            
            return { onCooldown: false };
        } catch (error) {
            console.error('Error checking cooldown:', error);
            throw error;
        }
    }

    async setCooldown(guildId, userId, command, minutes) {
        try {
            // Remove any existing cooldown first
            await pool.query(
                'DELETE FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND command = $3',
                [guildId, userId, command]
            );
            
            // Set new cooldown
            const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
            await pool.query(
                'INSERT INTO cooldowns (guild_id, user_id, command, expires_at) VALUES ($1, $2, $3, $4)',
                [guildId, userId, command, expiresAt]
            );
        } catch (error) {
            console.error('Error setting cooldown:', error);
            throw error;
        }
    }

    async setCooldownSeconds(guildId, userId, command, seconds) {
        try {
            // Remove any existing cooldown first
            await pool.query(
                'DELETE FROM cooldowns WHERE guild_id = $1 AND user_id = $2 AND command = $3',
                [guildId, userId, command]
            );
            
            // Set new cooldown
            const expiresAt = new Date(Date.now() + seconds * 1000);
            await pool.query(
                'INSERT INTO cooldowns (guild_id, user_id, command, expires_at) VALUES ($1, $2, $3, $4)',
                [guildId, userId, command, expiresAt]
            );
        } catch (error) {
            console.error('Error setting cooldown:', error);
            throw error;
        }
    }

    // ===== INVENTORY METHODS =====
    async addItem(guildId, userId, itemName, quantity, value) {
        try {
            // Check if item already exists in inventory for this guild
            const existing = await pool.query(
                'SELECT * FROM inventory WHERE guild_id = $1 AND user_id = $2 AND item_name = $3',
                [guildId, userId, itemName]
            );
            
            if (existing.rows.length > 0) {
                // Update quantity
                const result = await pool.query(
                    'UPDATE inventory SET quantity = quantity + $1 WHERE guild_id = $2 AND user_id = $3 AND item_name = $4 RETURNING *',
                    [quantity, guildId, userId, itemName]
                );
                return result.rows[0];
            } else {
                // Add new item
                const result = await pool.query(
                    'INSERT INTO inventory (guild_id, user_id, item_name, quantity, value) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [guildId, userId, itemName, quantity, value]
                );
                return result.rows[0];
            }
        } catch (error) {
            console.error('Error adding item to inventory:', error);
            throw error;
        }
    }

    async getInventory(guildId, userId) {
        try {
            const result = await pool.query(
                'SELECT * FROM inventory WHERE guild_id = $1 AND user_id = $2 ORDER BY item_name',
                [guildId, userId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting inventory:', error);
            throw error;
        }
    }

    async sellAllItems(guildId, userId) {
        try {
            // Get all items for user in this guild
            const items = await this.getInventory(guildId, userId);
            
            if (items.length === 0) {
                return { totalValue: 0, itemsSold: 0 };
            }
            
            // Calculate total value
            const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.value), 0);
            
            // Clear inventory for this guild
            await pool.query('DELETE FROM inventory WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
            
            // Add coins to balance
            await this.updateBalance(guildId, userId, totalValue);
            
            return { totalValue, itemsSold: items.length };
        } catch (error) {
            console.error('Error selling all items:', error);
            throw error;
        }
    }

    // ===== COINFLIP METHODS =====
    async createCoinflip(guildId, channelId, creatorId, amount) {
        try {
            const participants = JSON.stringify([creatorId]);
            const result = await pool.query(
                'INSERT INTO coinflips (guild_id, channel_id, creator_id, amount, participants) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [guildId, channelId, creatorId, amount, participants]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error creating coinflip:', error);
            throw error;
        }
    }

    async getActiveCoinflip(guildId, channelId) {
        try {
            const result = await pool.query(
                'SELECT * FROM coinflips WHERE guild_id = $1 AND channel_id = $2 AND is_active = true ORDER BY created_at DESC LIMIT 1',
                [guildId, channelId]
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error getting active coinflip:', error);
            throw error;
        }
    }

    async joinCoinflip(coinflipId, userId) {
        try {
            const result = await pool.query('SELECT * FROM coinflips WHERE id = $1', [coinflipId]);
            const coinflip = result.rows[0];
            
            if (!coinflip || !coinflip.is_active) {
                return { success: false, message: 'Coinflip not found or inactive' };
            }
            
            const participants = JSON.parse(coinflip.participants);
            if (participants.includes(userId)) {
                return { success: false, message: 'You are already in this coinflip' };
            }
            
            participants.push(userId);
            
            await pool.query(
                'UPDATE coinflips SET participants = $1 WHERE id = $2',
                [JSON.stringify(participants), coinflipId]
            );
            
            return { success: true, participants: participants.length };
        } catch (error) {
            console.error('Error joining coinflip:', error);
            throw error;
        }
    }

    async completeCoinflip(coinflipId) {
        try {
            const result = await pool.query('SELECT * FROM coinflips WHERE id = $1', [coinflipId]);
            const coinflip = result.rows[0];
            
            if (!coinflip || !coinflip.is_active) {
                return null;
            }
            
            const participants = JSON.parse(coinflip.participants);
            if (participants.length < 2) {
                return null;
            }
            
            // Pick random winner
            const winnerId = participants[Math.floor(Math.random() * participants.length)];
            const totalAmount = coinflip.amount * participants.length;
            
            // Update coinflip as completed
            await pool.query(
                'UPDATE coinflips SET is_active = false, winner_id = $1, completed_at = NOW() WHERE id = $2',
                [winnerId, coinflipId]
            );
            
            // Give winnings to winner (use guild_id from coinflip)
            await this.updateBalance(coinflip.guild_id, winnerId, totalAmount);
            
            return {
                winnerId,
                totalAmount,
                participants: participants.length,
                coinflip
            };
        } catch (error) {
            console.error('Error completing coinflip:', error);
            throw error;
        }
    }

    // ===== TRANSFER METHODS =====
    async transferCoins(guildId, fromUserId, fromUsername, toUserId, toUsername, amount) {
        try {
            // Validate users exist in this guild
            const fromUser = await this.getUser(guildId, fromUserId, fromUsername);
            const toUser = await this.getUser(guildId, toUserId, toUsername);

            // Check if sender has enough balance
            if (fromUser.balance < amount) {
                return {
                    success: false,
                    message: `Insufficient balance. You have ${fromUser.balance} coins but need ${amount} coins.`
                };
            }

            // Perform transfer using database transaction
            await pool.query('BEGIN');

            try {
                const fromCompositeId = `${guildId}:${fromUserId}`;
                const toCompositeId = `${guildId}:${toUserId}`;
                
                // Deduct from sender
                await pool.query(
                    'UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
                    [amount, fromCompositeId]
                );

                // Add to receiver
                await pool.query(
                    'UPDATE users SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE id = $2',
                    [amount, toCompositeId]
                );

                await pool.query('COMMIT');

                return {
                    success: true,
                    message: `Successfully transferred ${amount} coins to ${toUsername}.`
                };

            } catch (transactionError) {
                await pool.query('ROLLBACK');
                throw transactionError;
            }

        } catch (error) {
            console.error('Error transferring coins:', error);
            throw error;
        }
    }

    // ===== LEADERBOARD METHODS =====
    async getTopPlayers(guildId, limit = 10) {
        try {
            const result = await pool.query(
                'SELECT user_id, username, balance, bank_balance, total_earned FROM users WHERE guild_id = $1 ORDER BY (balance + bank_balance) DESC LIMIT $2',
                [guildId, limit]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting top players:', error);
            throw error;
        }
    }

    // ===== BANKING METHODS =====
    async deposit(guildId, userId, amount) {
        try {
            const compositeId = `${guildId}:${userId}`;
            // Check if user has enough balance (in hand)
            const user = await pool.query('SELECT balance FROM users WHERE id = $1', [compositeId]);
            if (user.rows.length === 0 || user.rows[0].balance < amount) {
                return {
                    success: false,
                    message: `Insufficient balance. You have ${user.rows[0]?.balance || 0} coins in hand.`
                };
            }

            // Transfer from balance to bank_balance
            const result = await pool.query(
                'UPDATE users SET balance = balance - $1, bank_balance = bank_balance + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [amount, compositeId]
            );

            return {
                success: true,
                user: result.rows[0],
                message: `🏦 You successfully deposited ${amount} coins to the OverBank.`
            };
        } catch (error) {
            console.error('Error depositing coins:', error);
            throw error;
        }
    }

    async withdraw(guildId, userId, amount) {
        try {
            const compositeId = `${guildId}:${userId}`;
            // Check if user has enough bank balance
            const user = await pool.query('SELECT bank_balance FROM users WHERE id = $1', [compositeId]);
            if (user.rows.length === 0 || user.rows[0].bank_balance < amount) {
                return {
                    success: false,
                    message: `Insufficient bank balance. You have ${user.rows[0]?.bank_balance || 0} coins in the OverBank.`
                };
            }

            // Transfer from bank_balance to balance
            const result = await pool.query(
                'UPDATE users SET balance = balance + $1, bank_balance = bank_balance - $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [amount, compositeId]
            );

            return {
                success: true,
                user: result.rows[0],
                message: `💰 You successfully withdrew ${amount} coins from the OverBank.`
            };
        } catch (error) {
            console.error('Error withdrawing coins:', error);
            throw error;
        }
    }

    async removeBalance(guildId, userId, username, amount) {
        try {
            // Ensure user exists in this guild
            await this.getUser(guildId, userId, username);

            const compositeId = `${guildId}:${userId}`;
            // Get current balances
            const user = await pool.query('SELECT balance, bank_balance FROM users WHERE id = $1', [compositeId]);
            const { balance, bank_balance } = user.rows[0];
            const totalBalance = balance + bank_balance;

            if (totalBalance < amount) {
                return {
                    success: false,
                    message: `User only has ${totalBalance} total coins (${balance} in hand + ${bank_balance} in bank).`
                };
            }

            // Remove from balance first, then bank if needed
            let newBalance = balance;
            let newBankBalance = bank_balance;
            let remaining = amount;

            if (remaining > 0 && newBalance > 0) {
                const fromBalance = Math.min(remaining, newBalance);
                newBalance -= fromBalance;
                remaining -= fromBalance;
            }

            if (remaining > 0 && newBankBalance > 0) {
                const fromBank = Math.min(remaining, newBankBalance);
                newBankBalance -= fromBank;
                remaining -= fromBank;
            }

            // Update user balances
            const result = await pool.query(
                'UPDATE users SET balance = $1, bank_balance = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
                [newBalance, newBankBalance, compositeId]
            );

            return {
                success: true,
                user: result.rows[0],
                message: `✅ Odebrano ${amount} coins od ${username}.`
            };
        } catch (error) {
            console.error('Error removing balance:', error);
            throw error;
        }
    }

    // ===== LOAN METHODS =====
    async takeLoan(guildId, userId, username, loanAmount) {
        try {
            // Ensure user exists
            await this.getUser(guildId, userId, username);

            // Check if user already has a loan in this guild
            const existingLoan = await pool.query(
                'SELECT * FROM loans WHERE guild_id = $1 AND user_id = $2',
                [guildId, userId]
            );

            if (existingLoan.rows.length > 0) {
                return {
                    success: false,
                    message: 'You already have an active loan. Repay your current loan before taking a new one.'
                };
            }

            // Validate loan amount (max 2500)
            if (loanAmount <= 0 || loanAmount > 2500) {
                return {
                    success: false,
                    message: 'Loan amount must be between 1 and 2500 coins.'
                };
            }

            // Calculate total repayment with 15% interest
            const totalRepayment = Math.floor(loanAmount * 1.15);

            // Create the loan record
            await pool.query(
                'INSERT INTO loans (guild_id, user_id, loan_amount, total_repayment, remaining_balance) VALUES ($1, $2, $3, $4, $5)',
                [guildId, userId, loanAmount, totalRepayment, totalRepayment]
            );

            // Add loan amount to user's bank balance
            const compositeId = `${guildId}:${userId}`;
            const result = await pool.query(
                'UPDATE users SET bank_balance = bank_balance + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [loanAmount, compositeId]
            );

            return {
                success: true,
                user: result.rows[0],
                loanAmount,
                totalRepayment,
                message: `✅ You took a loan of ${loanAmount} coins. Total repayment: ${totalRepayment} coins.`
            };
        } catch (error) {
            console.error('Error taking loan:', error);
            throw error;
        }
    }

    async repayLoan(guildId, userId, repayAmount) {
        try {
            const compositeId = `${guildId}:${userId}`;

            // Check if user has a loan
            const loanResult = await pool.query(
                'SELECT * FROM loans WHERE guild_id = $1 AND user_id = $2',
                [guildId, userId]
            );

            if (loanResult.rows.length === 0) {
                return {
                    success: false,
                    message: 'You have no active loan to repay.'
                };
            }

            const loan = loanResult.rows[0];

            // Check if user has enough bank balance
            const userResult = await pool.query('SELECT bank_balance FROM users WHERE id = $1', [compositeId]);
            const userBankBalance = userResult.rows[0]?.bank_balance || 0;

            if (userBankBalance < repayAmount) {
                return {
                    success: false,
                    message: `Insufficient bank balance. You have ${userBankBalance} coins in the OverBank but need ${repayAmount} coins.`
                };
            }

            // Don't allow overpayment
            const actualRepayAmount = Math.min(repayAmount, loan.remaining_balance);
            const newRemainingBalance = loan.remaining_balance - actualRepayAmount;

            // Update loan balance
            if (newRemainingBalance <= 0) {
                // Loan fully repaid, delete the loan record
                await pool.query('DELETE FROM loans WHERE id = $1', [loan.id]);
            } else {
                // Update remaining balance
                await pool.query(
                    'UPDATE loans SET remaining_balance = $1, updated_at = NOW() WHERE id = $2',
                    [newRemainingBalance, loan.id]
                );
            }

            // Deduct from user's bank balance
            const result = await pool.query(
                'UPDATE users SET bank_balance = bank_balance - $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [actualRepayAmount, compositeId]
            );

            return {
                success: true,
                user: result.rows[0],
                repaidAmount: actualRepayAmount,
                remainingBalance: newRemainingBalance,
                isFullyPaid: newRemainingBalance <= 0,
                message: newRemainingBalance <= 0 
                    ? '✅ Loan fully repaid!'
                    : `💰 You repaid ${actualRepayAmount} coins. Remaining loan: ${newRemainingBalance} coins.`
            };
        } catch (error) {
            console.error('Error repaying loan:', error);
            throw error;
        }
    }

    async getLoanStatus(guildId, userId) {
        try {
            const loanResult = await pool.query(
                'SELECT * FROM loans WHERE guild_id = $1 AND user_id = $2',
                [guildId, userId]
            );

            if (loanResult.rows.length === 0) {
                return {
                    hasLoan: false,
                    message: 'You have no active loan.'
                };
            }

            const loan = loanResult.rows[0];
            return {
                hasLoan: true,
                loanAmount: loan.loan_amount,
                totalRepayment: loan.total_repayment,
                remainingBalance: loan.remaining_balance,
                message: `💳 Current loan: ${loan.remaining_balance} coins. Total repayment due: ${loan.total_repayment} coins.`
            };
        } catch (error) {
            console.error('Error getting loan status:', error);
            throw error;
        }
    }
}

module.exports = new EconomyService();
