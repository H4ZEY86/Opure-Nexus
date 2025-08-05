"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMarketplaceHandlers = setupMarketplaceHandlers;
exports.broadcastMarketplaceEvent = broadcastMarketplaceEvent;
exports.notifyUser = notifyUser;
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
const db = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
function setupMarketplaceHandlers(io) {
    const marketplaceNamespace = io.of('/marketplace');
    marketplaceNamespace.on('connection', (socket) => {
        logger_1.logger.info(`Marketplace WebSocket connected: ${socket.id}`);
        socket.on('authenticate', async (data) => {
            try {
                const { userId, username } = data;
                const userCheck = await db.query('SELECT user_id, discord_username, is_premium FROM users WHERE user_id = $1 AND is_active = true', [userId]);
                if (userCheck.rows.length === 0) {
                    socket.emit('auth-error', { message: 'User not found or inactive' });
                    socket.disconnect();
                    return;
                }
                socket.userId = userId;
                socket.username = username;
                socket.join(`user-${userId}`);
                socket.join('marketplace-general');
                await db.query(`
          INSERT INTO websocket_connections (session_id, user_id, socket_id, namespace, connected_at)
          VALUES ((SELECT session_id FROM user_sessions WHERE user_id = $1 AND is_active = true LIMIT 1), $1, $2, '/marketplace', NOW())
          ON CONFLICT (socket_id) DO UPDATE SET connected_at = NOW(), is_connected = true
        `, [userId, socket.id]);
                socket.emit('authenticated', { userId, username });
                socket.to('marketplace-general').emit('user-online', { userId, username });
                logger_1.logger.info(`User ${username} (${userId}) authenticated in marketplace`);
            }
            catch (error) {
                logger_1.logger.error('Marketplace authentication error:', error);
                socket.emit('auth-error', { message: 'Authentication failed' });
                socket.disconnect();
            }
        });
        socket.on('subscribe-item-prices', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            try {
                const { itemIds } = data;
                itemIds.forEach(itemId => {
                    socket.join(`item-${itemId}`);
                });
                if (itemIds.length > 0) {
                    const prices = await db.query(`
            SELECT * FROM market_price_summary 
            WHERE item_id = ANY($1)
          `, [itemIds]);
                    socket.emit('item-prices-update', prices.rows);
                }
                logger_1.logger.info(`User ${socket.userId} subscribed to ${itemIds.length} item price updates`);
            }
            catch (error) {
                logger_1.logger.error('Error subscribing to item prices:', error);
                socket.emit('error', { message: 'Failed to subscribe to price updates' });
            }
        });
        socket.on('subscribe-listing', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            try {
                const { listingId } = data;
                const listingCheck = await db.query('SELECT listing_id FROM marketplace_listings WHERE listing_id = $1 AND status = $2', [listingId, 'active']);
                if (listingCheck.rows.length === 0) {
                    socket.emit('error', { message: 'Listing not found or inactive' });
                    return;
                }
                socket.join(`listing-${listingId}`);
                socket.emit('listing-subscribed', { listingId });
                logger_1.logger.info(`User ${socket.userId} subscribed to listing ${listingId}`);
            }
            catch (error) {
                logger_1.logger.error('Error subscribing to listing:', error);
                socket.emit('error', { message: 'Failed to subscribe to listing' });
            }
        });
        socket.on('place-bid', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            try {
                const { listingId, bidAmount, isAutoBid, maxAutoBid } = data;
                const userId = socket.userId;
                const listingCheck = await db.query(`
          SELECT 
            ml.*, mi.name, 
            CASE WHEN ml.current_bid IS NULL THEN ml.starting_bid ELSE ml.current_bid + ml.bid_increment END as min_bid
          FROM marketplace_listings ml
          JOIN marketplace_items mi ON ml.item_id = mi.item_id
          WHERE ml.listing_id = $1 AND ml.status = 'active' AND ml.listing_type = 'auction'
          AND ml.expires_at > NOW()
        `, [listingId]);
                if (listingCheck.rows.length === 0) {
                    socket.emit('bid-error', { message: 'Auction not found or expired' });
                    return;
                }
                const listing = listingCheck.rows[0];
                if (listing.seller_id === userId) {
                    socket.emit('bid-error', { message: 'Cannot bid on your own auction' });
                    return;
                }
                if (bidAmount < listing.min_bid) {
                    socket.emit('bid-error', {
                        message: `Minimum bid is ${listing.min_bid} tokens`,
                        minBid: listing.min_bid
                    });
                    return;
                }
                const tokenCheck = await db.query('SELECT balance FROM ai_tokens WHERE user_id = $1', [userId]);
                if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].balance < bidAmount) {
                    socket.emit('bid-error', { message: 'Insufficient tokens for bid' });
                    return;
                }
                const bidResult = await db.query(`
          INSERT INTO auction_bids (
            listing_id, bidder_id, bid_amount, is_auto_bid, max_auto_bid, is_winning
          ) VALUES ($1, $2, $3, $4, $5, true)
          RETURNING *
        `, [listingId, userId, bidAmount, isAutoBid, maxAutoBid || null]);
                await db.query(`
          UPDATE marketplace_listings 
          SET current_bid = $1, highest_bidder_id = $2
          WHERE listing_id = $3
        `, [bidAmount, userId, listingId]);
                await db.query('UPDATE auction_bids SET is_winning = false, is_outbid = true WHERE listing_id = $1 AND bidder_id != $2', [listingId, userId]);
                const bid = bidResult.rows[0];
                socket.to(`listing-${listingId}`).emit('new-bid', {
                    listingId,
                    bid: {
                        ...bid,
                        bidder_username: socket.username
                    },
                    newHighestBid: bidAmount
                });
                socket.to(`item-${listing.item_id}`).emit('price-change', {
                    itemId: listing.item_id,
                    newPrice: bidAmount,
                    listingId
                });
                if (listing.highest_bidder_id && listing.highest_bidder_id !== userId) {
                    socket.to(`user-${listing.highest_bidder_id}`).emit('outbid-notification', {
                        listingId,
                        itemName: listing.name,
                        yourBid: listing.current_bid,
                        newBid: bidAmount,
                        newBidder: socket.username
                    });
                }
                socket.emit('bid-placed', {
                    bid,
                    message: `Successfully bid ${bidAmount} tokens on ${listing.name}`
                });
                await db.query(`
          INSERT INTO analytics_events (event_name, event_category, user_id, event_data)
          VALUES ('bid_placed_realtime', 'marketplace', $1, $2)
        `, [userId, JSON.stringify({
                        listing_id: listingId,
                        bid_amount: bidAmount,
                        is_auto_bid: isAutoBid,
                        item_name: listing.name
                    })]);
                logger_1.logger.info(`User ${userId} placed bid of ${bidAmount} tokens on listing ${listingId}`);
            }
            catch (error) {
                logger_1.logger.error('Error placing real-time bid:', error);
                socket.emit('bid-error', { message: 'Failed to place bid' });
            }
        });
        socket.on('watch-listing', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            try {
                const { listingId } = data;
                const userId = socket.userId;
                await db.query(`
          INSERT INTO user_watchlist (user_id, listing_id, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (user_id, listing_id) DO NOTHING
        `, [userId, listingId]);
                socket.join(`listing-${listingId}`);
                socket.emit('watchlist-updated', {
                    action: 'added',
                    listingId,
                    message: 'Added to watchlist'
                });
                logger_1.logger.info(`User ${userId} added listing ${listingId} to watchlist`);
            }
            catch (error) {
                logger_1.logger.error('Error adding to watchlist:', error);
                socket.emit('error', { message: 'Failed to add to watchlist' });
            }
        });
        socket.on('unwatch-listing', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            try {
                const { listingId } = data;
                const userId = socket.userId;
                await db.query('DELETE FROM user_watchlist WHERE user_id = $1 AND listing_id = $2', [userId, listingId]);
                socket.leave(`listing-${listingId}`);
                socket.emit('watchlist-updated', {
                    action: 'removed',
                    listingId,
                    message: 'Removed from watchlist'
                });
                logger_1.logger.info(`User ${userId} removed listing ${listingId} from watchlist`);
            }
            catch (error) {
                logger_1.logger.error('Error removing from watchlist:', error);
                socket.emit('error', { message: 'Failed to remove from watchlist' });
            }
        });
        socket.on('quick-buy', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            try {
                const { listingId, quantity = 1 } = data;
                const userId = socket.userId;
                socket.emit('purchase-confirmation-required', {
                    listingId,
                    quantity,
                    message: 'Please confirm your purchase through the marketplace interface'
                });
                logger_1.logger.info(`User ${userId} initiated quick buy for listing ${listingId}`);
            }
            catch (error) {
                logger_1.logger.error('Error processing quick buy:', error);
                socket.emit('error', { message: 'Failed to process quick buy' });
            }
        });
        socket.on('propose-trade', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            try {
                const { recipientId, offeringItems, requestingItems, message } = data;
                const userId = socket.userId;
                const recipientSockets = await marketplaceNamespace.in(`user-${recipientId}`).fetchSockets();
                if (recipientSockets.length === 0) {
                    socket.emit('trade-error', { message: 'Recipient is not online' });
                    return;
                }
                socket.to(`user-${recipientId}`).emit('trade-proposal', {
                    from: {
                        userId,
                        username: socket.username
                    },
                    offeringItems,
                    requestingItems,
                    message,
                    timestamp: new Date().toISOString()
                });
                socket.emit('trade-proposal-sent', {
                    recipientId,
                    message: 'Trade proposal sent successfully'
                });
                logger_1.logger.info(`User ${userId} sent trade proposal to ${recipientId}`);
            }
            catch (error) {
                logger_1.logger.error('Error sending trade proposal:', error);
                socket.emit('trade-error', { message: 'Failed to send trade proposal' });
            }
        });
        socket.on('disconnect', async (reason) => {
            if (socket.userId) {
                try {
                    await db.query('UPDATE websocket_connections SET is_connected = false, disconnected_at = NOW() WHERE socket_id = $1', [socket.id]);
                    socket.to('marketplace-general').emit('user-offline', {
                        userId: socket.userId,
                        username: socket.username
                    });
                    logger_1.logger.info(`User ${socket.username} (${socket.userId}) disconnected from marketplace: ${reason}`);
                }
                catch (error) {
                    logger_1.logger.error('Error handling marketplace disconnect:', error);
                }
            }
        });
        socket.on('error', (error) => {
            logger_1.logger.error(`Marketplace socket error for ${socket.id}:`, error);
        });
    });
    setInterval(async () => {
        try {
            const priceUpdates = await db.query(`
        SELECT item_id, avg_price, total_sales, active_listings
        FROM market_price_summary
        WHERE updated_at > NOW() - INTERVAL '5 minutes'
      `);
            if (priceUpdates.rows.length > 0) {
                marketplaceNamespace.to('marketplace-general').emit('market-prices-update', {
                    prices: priceUpdates.rows,
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error sending periodic price updates:', error);
        }
    }, 5 * 60 * 1000);
    setInterval(async () => {
        try {
            const endingAuctions = await db.query(`
        SELECT 
          ml.listing_id, ml.seller_id, ml.highest_bidder_id,
          mi.name, ml.current_bid, ml.expires_at
        FROM marketplace_listings ml
        JOIN marketplace_items mi ON ml.item_id = mi.item_id
        WHERE ml.listing_type = 'auction' 
        AND ml.status = 'active'
        AND ml.expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
        AND ml.expires_at > NOW() + INTERVAL '55 minutes'
      `);
            endingAuctions.rows.forEach(auction => {
                marketplaceNamespace.to(`listing-${auction.listing_id}`).emit('auction-ending-soon', {
                    listingId: auction.listing_id,
                    itemName: auction.name,
                    currentBid: auction.current_bid,
                    timeRemaining: new Date(auction.expires_at).getTime() - Date.now()
                });
                if (auction.highest_bidder_id) {
                    marketplaceNamespace.to(`user-${auction.highest_bidder_id}`).emit('auction-ending-notification', {
                        listingId: auction.listing_id,
                        itemName: auction.name,
                        yourBid: auction.current_bid,
                        timeRemaining: new Date(auction.expires_at).getTime() - Date.now()
                    });
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error checking ending auctions:', error);
        }
    }, 5 * 60 * 1000);
    logger_1.logger.info('Marketplace WebSocket handlers initialized');
}
async function broadcastMarketplaceEvent(io, eventType, data, targetRoom) {
    try {
        const targetNamespace = io.of('/marketplace');
        const room = targetRoom || 'marketplace-general';
        targetNamespace.to(room).emit(eventType, {
            ...data,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info(`Broadcasted ${eventType} to ${room}`);
    }
    catch (error) {
        logger_1.logger.error(`Error broadcasting marketplace event ${eventType}:`, error);
    }
}
async function notifyUser(io, userId, eventType, data) {
    try {
        const targetNamespace = io.of('/marketplace');
        targetNamespace.to(`user-${userId}`).emit(eventType, {
            ...data,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info(`Notified user ${userId} with ${eventType}`);
    }
    catch (error) {
        logger_1.logger.error(`Error notifying user ${userId} with ${eventType}:`, error);
    }
}
//# sourceMappingURL=marketplaceHandlers.js.map