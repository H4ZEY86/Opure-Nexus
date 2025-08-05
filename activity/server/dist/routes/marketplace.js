"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
const db = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
const tradingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many trading actions'
});
const listingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many listing actions'
});
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'No valid authorization header' });
        }
        const userId = authHeader.substring(7);
        const userQuery = await db.query('SELECT user_id, discord_username, is_premium FROM users WHERE user_id = $1 AND is_active = true', [userId]);
        if (userQuery.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'User not found or inactive' });
        }
        req.user = userQuery.rows[0];
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
const antifraudCheck = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        const action = req.route?.path;
        const now = new Date();
        const recentActions = await db.query(`
      SELECT COUNT(*) as action_count 
      FROM analytics_events 
      WHERE user_id = $1 
      AND event_name = $2 
      AND created_at > $3
    `, [userId, action, new Date(now.getTime() - 5 * 60 * 1000)]);
        const actionCount = parseInt(recentActions.rows[0]?.action_count || '0');
        if (actionCount > 20) {
            logger_1.logger.warn(`Suspicious activity detected for user ${userId}: ${actionCount} actions in 5 minutes`);
            await db.query(`
        INSERT INTO analytics_events (event_name, event_category, user_id, event_data, contains_pii)
        VALUES ('suspicious_activity', 'security', $1, $2, false)
      `, [userId, JSON.stringify({ action, actionCount, timestamp: now })]);
            return res.status(429).json({
                success: false,
                error: 'Suspicious activity detected. Please slow down.'
            });
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Anti-fraud check error:', error);
        next();
    }
};
const router = express_1.default.Router();
router.use(generalLimiter);
router.use(authenticateUser);
router.get('/listings', [
    (0, express_validator_1.query)('category').optional().isIn(['collectible', 'boost', 'cosmetic', 'premium', 'consumable']),
    (0, express_validator_1.query)('rarity').optional().isIn(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']),
    (0, express_validator_1.query)('price_min').optional().isInt({ min: 0 }),
    (0, express_validator_1.query)('price_max').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('listing_type').optional().isIn(['fixed_price', 'auction', 'offer_wanted']),
    (0, express_validator_1.query)('search_query').optional().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.query)('sort_by').optional().isIn(['price', 'time_remaining', 'newest', 'rarity', 'popularity']),
    (0, express_validator_1.query)('sort_order').optional().isIn(['asc', 'desc']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }),
    handleValidationErrors
], async (req, res) => {
    try {
        const { category, rarity, price_min, price_max, listing_type, search_query, sort_by = 'newest', sort_order = 'desc', page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let whereConditions = ['ml.status = $1', 'ml.expires_at > $2'];
        let queryParams = ['active', new Date()];
        let paramCounter = 3;
        if (category) {
            whereConditions.push(`mi.category = $${paramCounter}`);
            queryParams.push(category);
            paramCounter++;
        }
        if (rarity) {
            whereConditions.push(`mi.rarity = $${paramCounter}`);
            queryParams.push(rarity);
            paramCounter++;
        }
        if (price_min) {
            whereConditions.push(`ml.price_per_item >= $${paramCounter}`);
            queryParams.push(price_min);
            paramCounter++;
        }
        if (price_max) {
            whereConditions.push(`ml.price_per_item <= $${paramCounter}`);
            queryParams.push(price_max);
            paramCounter++;
        }
        if (listing_type) {
            whereConditions.push(`ml.listing_type = $${paramCounter}`);
            queryParams.push(listing_type);
            paramCounter++;
        }
        if (search_query) {
            whereConditions.push(`(mi.search_vector @@ plainto_tsquery('english', $${paramCounter}) OR mi.name ILIKE $${paramCounter + 1})`);
            queryParams.push(search_query);
            queryParams.push(`%${search_query}%`);
            paramCounter += 2;
        }
        let orderClause = 'ml.created_at DESC';
        switch (sort_by) {
            case 'price':
                orderClause = `ml.price_per_item ${sort_order}`;
                break;
            case 'time_remaining':
                orderClause = `ml.expires_at ${sort_order}`;
                break;
            case 'rarity':
                orderClause = `
          CASE mi.rarity 
            WHEN 'mythic' THEN 6 
            WHEN 'legendary' THEN 5 
            WHEN 'epic' THEN 4 
            WHEN 'rare' THEN 3 
            WHEN 'uncommon' THEN 2 
            ELSE 1 
          END ${sort_order}`;
                break;
            case 'newest':
                orderClause = `ml.created_at ${sort_order}`;
                break;
        }
        const query = `
      SELECT 
        ml.*,
        mi.name, mi.description, mi.category, mi.rarity, mi.icon_url, mi.image_url,
        mi.properties, mi.effects, mi.color_scheme,
        u.discord_username as seller_username, u.is_premium as seller_premium,
        CASE WHEN ml.listing_type = 'auction' THEN
          (SELECT COUNT(*) FROM auction_bids WHERE listing_id = ml.listing_id)
        ELSE 0 END as bid_count,
        CASE WHEN ml.expires_at < NOW() + INTERVAL '1 hour' THEN true ELSE false END as ending_soon
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      JOIN users u ON ml.seller_id = u.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
        queryParams.push(limit, offset.toString());
        const result = await db.query(query, queryParams);
        const countQuery = `
      SELECT COUNT(*) as total
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      WHERE ${whereConditions.join(' AND ')}
    `;
        const countResult = await db.query(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0]?.total || '0');
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                hasMore: offset + result.rows.length < total
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching marketplace listings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch listings' });
    }
});
router.post('/listings', [
    listingLimiter,
    antifraudCheck,
    (0, express_validator_1.body)('item_id').isUUID(),
    (0, express_validator_1.body)('quantity').isInt({ min: 1, max: 1000 }),
    (0, express_validator_1.body)('price_per_item').isInt({ min: 1, max: 1000000 }),
    (0, express_validator_1.body)('listing_type').isIn(['fixed_price', 'auction']),
    (0, express_validator_1.body)('starting_bid').optional().isInt({ min: 1 }),
    (0, express_validator_1.body)('duration_hours').optional().isInt({ min: 1, max: 168 }),
    (0, express_validator_1.body)('auto_accept_percentage').optional().isInt({ min: 50, max: 100 }),
    handleValidationErrors
], async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user.user_id;
        const { item_id, quantity, price_per_item, listing_type, starting_bid, duration_hours = 168, auto_accept_percentage, accepts_item_trades = false, preferred_trade_items = [] } = req.body;
        const inventoryCheck = await client.query(`
      SELECT inventory_id, quantity, is_locked
      FROM user_inventory 
      WHERE user_id = $1 AND item_id = $2 AND quantity >= $3 AND is_locked = false
    `, [userId, item_id, quantity]);
        if (inventoryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Insufficient items or items are locked'
            });
        }
        const inventoryItem = inventoryCheck.rows[0];
        const itemCheck = await client.query(`
      SELECT properties, name FROM marketplace_items WHERE item_id = $1 AND is_active = true
    `, [item_id]);
        if (itemCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Item not found or inactive' });
        }
        const item = itemCheck.rows[0];
        if (!item.properties?.tradeable) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Item is not tradeable' });
        }
        const totalValue = price_per_item * quantity;
        const listingFee = Math.max(1, Math.floor(totalValue * 0.01));
        const tokenCheck = await client.query('SELECT balance FROM ai_tokens WHERE user_id = $1', [userId]);
        if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].balance < listingFee) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Insufficient tokens for listing fee'
            });
        }
        await client.query(`
      UPDATE user_inventory 
      SET is_locked = true, locked_reason = 'marketplace_listing'
      WHERE inventory_id = $1
    `, [inventoryItem.inventory_id]);
        await client.query(`
      INSERT INTO token_transactions (
        user_id, amount, balance_before, balance_after, transaction_type, 
        transaction_category, source_identifier, context_data
      ) VALUES (
        $1, $2, $3, $4, 'spend', 'marketplace', 'listing_fee',
        $5
      )
    `, [
            userId,
            -listingFee,
            tokenCheck.rows[0].balance,
            tokenCheck.rows[0].balance - listingFee,
            JSON.stringify({ item_id, listing_fee: listingFee })
        ]);
        const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000);
        const listingResult = await client.query(`
      INSERT INTO marketplace_listings (
        seller_id, item_id, quantity, price_per_item, listing_type,
        starting_bid, expires_at, auto_accept_percentage, accepts_item_trades,
        preferred_trade_items, listing_fee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
            userId, item_id, quantity, price_per_item, listing_type,
            starting_bid || null, expiresAt, auto_accept_percentage || null,
            accepts_item_trades, preferred_trade_items, listingFee
        ]);
        const fullListingQuery = await client.query(`
      SELECT 
        ml.*,
        mi.name, mi.description, mi.category, mi.rarity, mi.icon_url, mi.image_url,
        mi.properties, mi.effects, mi.color_scheme,
        u.discord_username as seller_username, u.is_premium as seller_premium
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      JOIN users u ON ml.seller_id = u.user_id
      WHERE ml.listing_id = $1
    `, [listingResult.rows[0].listing_id]);
        await client.query('COMMIT');
        const listing = fullListingQuery.rows[0];
        if (req.io) {
            req.io.to('marketplace').emit('listing-created', listing);
        }
        await db.query(`
      INSERT INTO analytics_events (event_name, event_category, user_id, event_data)
      VALUES ('listing_created', 'marketplace', $1, $2)
    `, [userId, JSON.stringify({
                item_id,
                quantity,
                price_per_item,
                listing_type,
                total_value: totalValue
            })]);
        res.status(201).json({
            success: true,
            data: listing,
            message: `${item.name} listed successfully for ${totalValue} tokens`
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error('Error creating marketplace listing:', error);
        res.status(500).json({ success: false, error: 'Failed to create listing' });
    }
    finally {
        client.release();
    }
});
router.delete('/listings/:listingId', [
    listingLimiter,
    (0, express_validator_1.param)('listingId').isUUID(),
    handleValidationErrors
], async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user.user_id;
        const { listingId } = req.params;
        const listingCheck = await client.query(`
      SELECT ml.*, mi.name
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      WHERE ml.listing_id = $1 AND ml.seller_id = $2 AND ml.status = 'active'
    `, [listingId, userId]);
        if (listingCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Listing not found or not owned by user'
            });
        }
        const listing = listingCheck.rows[0];
        if (listing.listing_type === 'auction') {
            const bidCheck = await client.query('SELECT COUNT(*) as bid_count FROM auction_bids WHERE listing_id = $1', [listingId]);
            if (parseInt(bidCheck.rows[0].bid_count) > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: 'Cannot cancel auction with active bids'
                });
            }
        }
        await client.query('UPDATE marketplace_listings SET status = $1 WHERE listing_id = $2', ['cancelled', listingId]);
        await client.query(`
      UPDATE user_inventory 
      SET is_locked = false, locked_reason = null
      WHERE user_id = $1 AND item_id = $2 AND locked_reason = 'marketplace_listing'
    `, [userId, listing.item_id]);
        await client.query('COMMIT');
        if (req.io) {
            req.io.to('marketplace').emit('listing-cancelled', { listing_id: listingId });
        }
        await db.query(`
      INSERT INTO analytics_events (event_name, event_category, user_id, event_data)
      VALUES ('listing_cancelled', 'marketplace', $1, $2)
    `, [userId, JSON.stringify({ listing_id: listingId, item_name: listing.name })]);
        res.json({
            success: true,
            message: `${listing.name} listing cancelled successfully`
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error('Error cancelling marketplace listing:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel listing' });
    }
    finally {
        client.release();
    }
});
router.post('/bids', [
    tradingLimiter,
    antifraudCheck,
    (0, express_validator_1.body)('listing_id').isUUID(),
    (0, express_validator_1.body)('bid_amount').isInt({ min: 1, max: 1000000 }),
    (0, express_validator_1.body)('is_auto_bid').optional().isBoolean(),
    (0, express_validator_1.body)('max_auto_bid').optional().isInt({ min: 1, max: 1000000 }),
    handleValidationErrors
], async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user.user_id;
        const { listing_id, bid_amount, is_auto_bid = false, max_auto_bid } = req.body;
        const listingCheck = await client.query(`
      SELECT ml.*, mi.name, u.discord_username as seller_username
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      JOIN users u ON ml.seller_id = u.user_id
      WHERE ml.listing_id = $1 AND ml.status = 'active' AND ml.listing_type = 'auction'
      AND ml.expires_at > NOW()
    `, [listing_id]);
        if (listingCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Auction not found or expired'
            });
        }
        const listing = listingCheck.rows[0];
        if (listing.seller_id === userId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Cannot bid on your own auction'
            });
        }
        const minimumBid = listing.current_bid
            ? listing.current_bid + listing.bid_increment
            : listing.starting_bid;
        if (bid_amount < minimumBid) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `Minimum bid is ${minimumBid} tokens`
            });
        }
        const tokenCheck = await client.query('SELECT balance FROM ai_tokens WHERE user_id = $1', [userId]);
        if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].balance < bid_amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Insufficient tokens for bid'
            });
        }
        if (listing.highest_bidder_id) {
            await client.query('UPDATE auction_bids SET is_winning = false, is_outbid = true WHERE listing_id = $1 AND is_winning = true', [listing_id]);
        }
        const bidResult = await client.query(`
      INSERT INTO auction_bids (
        listing_id, bidder_id, bid_amount, is_auto_bid, max_auto_bid, is_winning
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [listing_id, userId, bid_amount, is_auto_bid, max_auto_bid || null]);
        await client.query(`
      UPDATE marketplace_listings 
      SET current_bid = $1, highest_bidder_id = $2
      WHERE listing_id = $3
    `, [bid_amount, userId, listing_id]);
        const updatedListing = await client.query(`
      SELECT 
        ml.*,
        mi.name, mi.description, mi.category, mi.rarity, mi.icon_url,
        u.discord_username as seller_username,
        ub.discord_username as highest_bidder_username
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      JOIN users u ON ml.seller_id = u.user_id
      LEFT JOIN users ub ON ml.highest_bidder_id = ub.user_id
      WHERE ml.listing_id = $1
    `, [listing_id]);
        await client.query('COMMIT');
        const bid = bidResult.rows[0];
        const updatedListingData = updatedListing.rows[0];
        if (req.io) {
            req.io.to('marketplace').emit('bid-placed', {
                listing_id,
                bid: {
                    ...bid,
                    bidder: { user_id: userId, discord_username: req.user.discord_username }
                }
            });
            req.io.to('marketplace').emit('listing-updated', updatedListingData);
            if (listing.highest_bidder_id && listing.highest_bidder_id !== userId) {
                req.io.to(`user-${listing.highest_bidder_id}`).emit('outbid-notification', {
                    listing_id,
                    item_name: listing.name,
                    your_bid: listing.current_bid,
                    new_bid: bid_amount
                });
            }
        }
        await db.query(`
      INSERT INTO analytics_events (event_name, event_category, user_id, event_data)
      VALUES ('bid_placed', 'marketplace', $1, $2)
    `, [userId, JSON.stringify({
                listing_id,
                bid_amount,
                item_name: listing.name,
                is_auto_bid
            })]);
        res.status(201).json({
            success: true,
            data: {
                ...bid,
                bidder: { user_id: userId, discord_username: req.user.discord_username }
            },
            message: `Bid of ${bid_amount} tokens placed successfully`
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error('Error placing bid:', error);
        res.status(500).json({ success: false, error: 'Failed to place bid' });
    }
    finally {
        client.release();
    }
});
router.get('/inventory', async (req, res) => {
    try {
        const userId = req.user.user_id;
        const result = await db.query(`
      SELECT 
        ui.*,
        mi.name, mi.description, mi.category, mi.rarity, mi.icon_url, mi.image_url,
        mi.properties, mi.effects, mi.color_scheme, mi.base_value
      FROM user_inventory ui
      JOIN marketplace_items mi ON ui.item_id = mi.item_id
      WHERE ui.user_id = $1
      ORDER BY ui.acquired_at DESC
    `, [userId]);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching user inventory:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
    }
});
router.get('/prices', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT * FROM market_price_summary 
      ORDER BY total_sales DESC, avg_price DESC
      LIMIT 100
    `);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching market prices:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch market prices' });
    }
});
exports.default = router;
//# sourceMappingURL=marketplace.js.map