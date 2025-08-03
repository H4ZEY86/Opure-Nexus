// ============================================================================
// OPURE MARKETPLACE API GATEWAY - MARKETPLACE ROUTES
// ============================================================================
// Comprehensive marketplace API endpoints for external deployment
// Features: CRUD operations, real-time updates, analytics, security
// ============================================================================

import { Router, Request, Response } from 'express'
import { body, query, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js'
import { SecurityMiddleware } from '../middleware/SecurityMiddleware.js'
import { CacheMiddleware } from '../middleware/CacheMiddleware.js'
import { 
  MarketplaceListing, 
  CreateListingRequest, 
  PlaceBidRequest, 
  InitiateTradeRequest,
  MarketplaceFilters,
  AuctionBid,
  Trade
} from '../types/marketplace.js'

const router = Router()

// ============================================================================
// RATE LIMITING
// ============================================================================

const tradingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 trading actions per minute
  message: { error: 'Too many trading actions, please slow down' }
})

const listingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 listing actions per minute
  message: { error: 'Too many listing actions, please slow down' }
})

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: { error: 'Too many search requests, please slow down' }
})

// ============================================================================
// MARKETPLACE LISTINGS ENDPOINTS
// ============================================================================

/**
 * GET /api/marketplace/listings
 * Fetch marketplace listings with filtering, pagination, and search
 */
router.get('/listings', [
  searchLimiter,
  query('category').optional().isIn(['collectible', 'boost', 'cosmetic', 'premium', 'consumable', 'achievement_badge', 'game_enhancement']),
  query('rarity').optional().isIn(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']),
  query('price_min').optional().isInt({ min: 0 }),
  query('price_max').optional().isInt({ min: 1 }),
  query('listing_type').optional().isIn(['fixed_price', 'auction', 'offer_wanted']),
  query('search_query').optional().isLength({ min: 1, max: 100 }),
  query('sort_by').optional().isIn(['price', 'time_remaining', 'newest', 'rarity', 'popularity', 'price_per_unit']),
  query('sort_order').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('seller_premium_only').optional().isBoolean(),
  query('time_ending_soon').optional().isBoolean(),
  ValidationMiddleware.handleErrors,
  CacheMiddleware.cache('listings', 30) // Cache for 30 seconds
], async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db
    const redis = req.app.locals.redis
    
    const {
      category,
      rarity,
      price_min,
      price_max,
      listing_type,
      search_query,
      sort_by = 'newest',
      sort_order = 'desc',
      page = 1,
      limit = 20,
      seller_premium_only,
      time_ending_soon
    } = req.query

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)
    
    // Build dynamic query
    let whereConditions = ['ml.status = $1', 'ml.expires_at > $2']
    let queryParams: any[] = ['active', new Date()]
    let paramCounter = 3

    // Add filters
    if (category) {
      whereConditions.push(`mi.category = $${paramCounter}`)
      queryParams.push(category)
      paramCounter++
    }

    if (rarity) {
      whereConditions.push(`mi.rarity = $${paramCounter}`)
      queryParams.push(rarity)
      paramCounter++
    }

    if (price_min) {
      whereConditions.push(`ml.price_per_item >= $${paramCounter}`)
      queryParams.push(parseInt(price_min as string))
      paramCounter++
    }

    if (price_max) {
      whereConditions.push(`ml.price_per_item <= $${paramCounter}`)
      queryParams.push(parseInt(price_max as string))
      paramCounter++
    }

    if (listing_type) {
      whereConditions.push(`ml.listing_type = $${paramCounter}`)
      queryParams.push(listing_type)
      paramCounter++
    }

    if (seller_premium_only === 'true') {
      whereConditions.push('u.is_premium = true')
    }

    if (time_ending_soon === 'true') {
      whereConditions.push('ml.expires_at < NOW() + INTERVAL \'1 hour\'')
    }

    if (search_query) {
      whereConditions.push(`(
        mi.search_vector @@ plainto_tsquery('english', $${paramCounter}) 
        OR mi.name ILIKE $${paramCounter + 1}
        OR mi.description ILIKE $${paramCounter + 2}
      )`)
      queryParams.push(search_query)
      queryParams.push(`%${search_query}%`)
      queryParams.push(`%${search_query}%`)
      paramCounter += 3
    }

    // Build ORDER BY clause
    let orderClause = 'ml.created_at DESC'
    switch (sort_by) {
      case 'price':
        orderClause = `ml.price_per_item ${sort_order}`
        break
      case 'time_remaining':
        orderClause = `ml.expires_at ${sort_order}`
        break
      case 'rarity':
        orderClause = `
          CASE mi.rarity 
            WHEN 'mythic' THEN 6 
            WHEN 'legendary' THEN 5 
            WHEN 'epic' THEN 4 
            WHEN 'rare' THEN 3 
            WHEN 'uncommon' THEN 2 
            ELSE 1 
          END ${sort_order}`
        break
      case 'newest':
        orderClause = `ml.created_at ${sort_order}`
        break
      case 'popularity':
        orderClause = `ml.view_count ${sort_order}, ml.created_at DESC`
        break
      case 'price_per_unit':
        orderClause = `(ml.price_per_item / ml.quantity) ${sort_order}`
        break
    }

    // Main query
    const listingsQuery = `
      SELECT 
        ml.*,
        mi.name, mi.description, mi.category, mi.rarity, mi.icon_url, mi.image_url,
        mi.properties, mi.effects, mi.color_scheme, mi.base_value,
        u.discord_username as seller_username, u.is_premium as seller_premium,
        ur.reputation_score as seller_reputation,
        CASE WHEN ml.listing_type = 'auction' THEN
          (SELECT COUNT(*) FROM auction_bids WHERE listing_id = ml.listing_id)
        ELSE 0 END as bid_count,
        CASE WHEN ml.expires_at < NOW() + INTERVAL '1 hour' THEN true ELSE false END as ending_soon,
        COALESCE(ml.view_count, 0) as view_count,
        (SELECT COUNT(*) FROM user_watchlist WHERE listing_id = ml.listing_id) as watchlist_count
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      JOIN users u ON ml.seller_id = u.user_id
      LEFT JOIN user_reputation ur ON ml.seller_id = ur.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `

    queryParams.push(parseInt(limit as string), offset)

    const [listingsResult, totalCountResult] = await Promise.all([
      db.query(listingsQuery, queryParams),
      db.query(`
        SELECT COUNT(*) as total
        FROM marketplace_listings ml
        JOIN marketplace_items mi ON ml.item_id = mi.item_id
        JOIN users u ON ml.seller_id = u.user_id
        WHERE ${whereConditions.join(' AND ')}
      `, queryParams.slice(0, -2))
    ])

    const total = parseInt(totalCountResult.rows[0]?.total || '0')

    // Increment view counts for displayed listings
    if (listingsResult.rows.length > 0) {
      const listingIds = listingsResult.rows.map(row => row.listing_id)
      await db.query(`
        UPDATE marketplace_listings 
        SET view_count = COALESCE(view_count, 0) + 1 
        WHERE listing_id = ANY($1)
      `, [listingIds])
    }

    res.json({
      success: true,
      data: listingsResult.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
        hasMore: offset + listingsResult.rows.length < total
      },
      filters: {
        category,
        rarity,
        price_min,
        price_max,
        listing_type,
        search_query,
        sort_by,
        sort_order
      },
      meta: {
        totalListings: total,
        resultsShown: listingsResult.rows.length,
        cached: false
      }
    })

  } catch (error) {
    logger.error('Error fetching marketplace listings:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch listings',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
})

/**
 * POST /api/marketplace/listings
 * Create a new marketplace listing
 */
router.post('/listings', [
  listingLimiter,
  SecurityMiddleware.antifraud,
  body('item_id').isUUID('4').withMessage('Invalid item ID format'),
  body('quantity').isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000'),
  body('price_per_item').isInt({ min: 1, max: 1000000 }).withMessage('Price must be between 1 and 1,000,000 tokens'),
  body('listing_type').isIn(['fixed_price', 'auction']).withMessage('Invalid listing type'),
  body('starting_bid').optional().isInt({ min: 1 }).withMessage('Starting bid must be at least 1 token'),
  body('duration_hours').optional().isInt({ min: 1, max: 168 }).withMessage('Duration must be between 1 and 168 hours'),
  body('auto_accept_percentage').optional().isInt({ min: 50, max: 100 }).withMessage('Auto accept percentage must be between 50 and 100'),
  body('accepts_item_trades').optional().isBoolean(),
  body('preferred_trade_items').optional().isArray(),
  ValidationMiddleware.handleErrors
], async (req: Request, res: Response) => {
  const db = req.app.locals.db
  const wsManager = req.app.locals.wsManager
  const client = await db.getClient()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.user_id
    const {
      item_id,
      quantity,
      price_per_item,
      listing_type,
      starting_bid,
      duration_hours = 168, // Default 1 week
      auto_accept_percentage,
      accepts_item_trades = false,
      preferred_trade_items = []
    }: CreateListingRequest = req.body

    // Verify user owns the item and has sufficient quantity
    const inventoryCheck = await client.query(`
      SELECT inventory_id, quantity, is_locked
      FROM user_inventory 
      WHERE user_id = $1 AND item_id = $2 AND quantity >= $3 AND is_locked = false
    `, [userId, item_id, quantity])

    if (inventoryCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient items or items are locked',
        code: 'INSUFFICIENT_ITEMS'
      })
    }

    const inventoryItem = inventoryCheck.rows[0]

    // Verify item is tradeable and active
    const itemCheck = await client.query(`
      SELECT properties, name, rarity, category FROM marketplace_items 
      WHERE item_id = $1 AND is_active = true
    `, [item_id])

    if (itemCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        success: false, 
        error: 'Item not found or inactive',
        code: 'ITEM_NOT_FOUND'
      })
    }

    const item = itemCheck.rows[0]
    if (!item.properties?.tradeable) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        success: false, 
        error: 'Item is not tradeable',
        code: 'ITEM_NOT_TRADEABLE'
      })
    }

    // Validate auction-specific requirements
    if (listing_type === 'auction') {
      if (!starting_bid || starting_bid <= 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          error: 'Starting bid is required for auctions',
          code: 'MISSING_STARTING_BID'
        })
      }

      // Minimum auction duration check
      if (duration_hours < 1) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          error: 'Auction duration must be at least 1 hour',
          code: 'INVALID_DURATION'
        })
      }
    }

    // Calculate listing fee (1% of total value, minimum 1 token)
    const totalValue = price_per_item * quantity
    const listingFee = Math.max(1, Math.floor(totalValue * 0.01))

    // Check user has enough tokens for listing fee
    const tokenCheck = await client.query(
      'SELECT balance FROM ai_tokens WHERE user_id = $1',
      [userId]
    )

    if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].balance < listingFee) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient tokens for listing fee (${listingFee} tokens required)`,
        code: 'INSUFFICIENT_TOKENS',
        required: listingFee,
        available: tokenCheck.rows[0]?.balance || 0
      })
    }

    // Lock the inventory items
    await client.query(`
      UPDATE user_inventory 
      SET is_locked = true, locked_reason = 'marketplace_listing', locked_until = $1
      WHERE inventory_id = $2
    `, [new Date(Date.now() + duration_hours * 60 * 60 * 1000), inventoryItem.inventory_id])

    // Deduct listing fee
    const newBalance = tokenCheck.rows[0].balance - listingFee
    await Promise.all([
      client.query('UPDATE ai_tokens SET balance = $1 WHERE user_id = $2', [newBalance, userId]),
      client.query(`
        INSERT INTO token_transactions (
          user_id, amount, balance_before, balance_after, transaction_type, 
          transaction_category, source_identifier, context_data
        ) VALUES ($1, $2, $3, $4, 'spend', 'marketplace', 'listing_fee', $5)
      `, [
        userId, 
        -listingFee, 
        tokenCheck.rows[0].balance, 
        newBalance,
        JSON.stringify({ item_id, listing_fee: listingFee, item_name: item.name })
      ])
    ])

    // Calculate bid increment for auctions
    const bidIncrement = listing_type === 'auction' 
      ? Math.max(1, Math.floor((starting_bid || 0) * 0.05)) // 5% of starting bid, minimum 1
      : null

    // Create the listing
    const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000)
    
    const listingResult = await client.query(`
      INSERT INTO marketplace_listings (
        seller_id, item_id, quantity, price_per_item, listing_type,
        starting_bid, bid_increment, expires_at, auto_accept_percentage, 
        accepts_item_trades, preferred_trade_items, listing_fee, market_tax_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      userId, item_id, quantity, price_per_item, listing_type,
      starting_bid || null, bidIncrement, expiresAt, auto_accept_percentage || null,
      accepts_item_trades, preferred_trade_items, listingFee, 0.05 // 5% market tax
    ])

    // Get full listing details for response
    const fullListingQuery = await client.query(`
      SELECT 
        ml.*,
        mi.name, mi.description, mi.category, mi.rarity, mi.icon_url, mi.image_url,
        mi.properties, mi.effects, mi.color_scheme, mi.base_value,
        u.discord_username as seller_username, u.is_premium as seller_premium,
        ur.reputation_score as seller_reputation
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      JOIN users u ON ml.seller_id = u.user_id
      LEFT JOIN user_reputation ur ON ml.seller_id = ur.user_id
      WHERE ml.listing_id = $1
    `, [listingResult.rows[0].listing_id])

    await client.query('COMMIT')

    const listing = fullListingQuery.rows[0]

    // Emit real-time event to all marketplace users
    if (wsManager) {
      wsManager.emitToRoom('marketplace', 'listing-created', listing)
    }

    // Log analytics event
    await db.query(`
      INSERT INTO analytics_events (event_name, event_category, user_id, event_data, contains_pii)
      VALUES ('listing_created', 'marketplace', $1, $2, false)
    `, [userId, JSON.stringify({ 
      item_id, 
      quantity, 
      price_per_item, 
      listing_type,
      total_value: totalValue,
      listing_fee: listingFee,
      item_rarity: item.rarity,
      item_category: item.category
    })])

    res.status(201).json({
      success: true,
      data: listing,
      message: `${item.name} listed successfully for ${totalValue} tokens`,
      fees: {
        listing_fee: listingFee,
        market_tax_rate: 0.05
      }
    })

  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Error creating marketplace listing:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create listing',
      code: 'INTERNAL_ERROR'
    })
  } finally {
    client.release()
  }
})

/**
 * DELETE /api/marketplace/listings/:listingId
 * Cancel a marketplace listing
 */
router.delete('/listings/:listingId', [
  listingLimiter,
  param('listingId').isUUID('4').withMessage('Invalid listing ID format'),
  ValidationMiddleware.handleErrors
], async (req: Request, res: Response) => {
  const db = req.app.locals.db
  const wsManager = req.app.locals.wsManager
  const client = await db.getClient()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.user_id
    const { listingId } = req.params

    // Verify listing belongs to user and is active
    const listingCheck = await client.query(`
      SELECT ml.*, mi.name, mi.category
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      WHERE ml.listing_id = $1 AND ml.seller_id = $2 AND ml.status = 'active'
    `, [listingId, userId])

    if (listingCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ 
        success: false, 
        error: 'Listing not found or not owned by user',
        code: 'LISTING_NOT_FOUND'
      })
    }

    const listing = listingCheck.rows[0]

    // Check if there are active bids (for auctions)
    if (listing.listing_type === 'auction') {
      const bidCheck = await client.query(
        'SELECT COUNT(*) as bid_count FROM auction_bids WHERE listing_id = $1',
        [listingId]
      )

      if (parseInt(bidCheck.rows[0].bid_count) > 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot cancel auction with active bids',
          code: 'AUCTION_HAS_BIDS'
        })
      }
    }

    // Update listing status
    await client.query(
      'UPDATE marketplace_listings SET status = $1, cancelled_at = NOW() WHERE listing_id = $2',
      ['cancelled', listingId]
    )

    // Unlock inventory items
    await client.query(`
      UPDATE user_inventory 
      SET is_locked = false, locked_reason = null, locked_until = null
      WHERE user_id = $1 AND item_id = $2 AND locked_reason = 'marketplace_listing'
    `, [userId, listing.item_id])

    await client.query('COMMIT')

    // Emit real-time event
    if (wsManager) {
      wsManager.emitToRoom('marketplace', 'listing-cancelled', { 
        listing_id: listingId,
        seller_id: userId 
      })
    }

    // Log analytics event
    await db.query(`
      INSERT INTO analytics_events (event_name, event_category, user_id, event_data, contains_pii)
      VALUES ('listing_cancelled', 'marketplace', $1, $2, false)
    `, [userId, JSON.stringify({ 
      listing_id: listingId, 
      item_name: listing.name,
      item_category: listing.category,
      listing_type: listing.listing_type
    })])

    res.json({
      success: true,
      message: `${listing.name} listing cancelled successfully`,
      data: {
        listing_id: listingId,
        status: 'cancelled'
      }
    })

  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Error cancelling marketplace listing:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel listing',
      code: 'INTERNAL_ERROR'
    })
  } finally {
    client.release()
  }
})

// ============================================================================
// AUCTION BIDDING ENDPOINTS
// ============================================================================

/**
 * POST /api/marketplace/bids
 * Place a bid on an auction
 */
router.post('/bids', [
  tradingLimiter,
  SecurityMiddleware.antifraud,
  body('listing_id').isUUID('4').withMessage('Invalid listing ID format'),
  body('bid_amount').isInt({ min: 1, max: 1000000 }).withMessage('Bid amount must be between 1 and 1,000,000 tokens'),
  body('is_auto_bid').optional().isBoolean(),
  body('max_auto_bid').optional().isInt({ min: 1, max: 1000000 }).withMessage('Max auto bid must be between 1 and 1,000,000 tokens'),
  ValidationMiddleware.handleErrors
], async (req: Request, res: Response) => {
  const db = req.app.locals.db
  const wsManager = req.app.locals.wsManager
  const client = await db.getClient()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.user_id
    const { listing_id, bid_amount, is_auto_bid = false, max_auto_bid }: PlaceBidRequest = req.body

    // Verify listing exists and is an active auction
    const listingCheck = await client.query(`
      SELECT ml.*, mi.name, mi.rarity, u.discord_username as seller_username
      FROM marketplace_listings ml
      JOIN marketplace_items mi ON ml.item_id = mi.item_id
      JOIN users u ON ml.seller_id = u.user_id
      WHERE ml.listing_id = $1 AND ml.status = 'active' AND ml.listing_type = 'auction'
      AND ml.expires_at > NOW()
    `, [listing_id])

    if (listingCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ 
        success: false, 
        error: 'Auction not found or expired',
        code: 'AUCTION_NOT_FOUND'
      })
    }

    const listing = listingCheck.rows[0]

    // Can't bid on own auction
    if (listing.seller_id === userId) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot bid on your own auction',
        code: 'CANNOT_BID_OWN_AUCTION'
      })
    }

    // Check if bid meets minimum requirements
    const minimumBid = listing.current_bid 
      ? listing.current_bid + (listing.bid_increment || 1)
      : listing.starting_bid

    if (bid_amount < minimumBid) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        success: false, 
        error: `Minimum bid is ${minimumBid} tokens`,
        code: 'BID_TOO_LOW',
        minimum_bid: minimumBid,
        current_bid: listing.current_bid
      })
    }

    // Validate auto bid settings
    if (is_auto_bid && max_auto_bid && max_auto_bid < bid_amount) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        error: 'Maximum auto bid cannot be less than current bid amount',
        code: 'INVALID_AUTO_BID'
      })
    }

    // Check user has sufficient tokens
    const tokenCheck = await client.query(
      'SELECT balance FROM ai_tokens WHERE user_id = $1',
      [userId]
    )

    const requiredTokens = is_auto_bid && max_auto_bid ? max_auto_bid : bid_amount
    
    if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].balance < requiredTokens) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient tokens for bid (${requiredTokens} tokens required)`,
        code: 'INSUFFICIENT_TOKENS',
        required: requiredTokens,
        available: tokenCheck.rows[0]?.balance || 0
      })
    }

    // Check for existing bids from this user
    const existingBidCheck = await client.query(
      'SELECT bid_id, bid_amount, is_winning FROM auction_bids WHERE listing_id = $1 AND bidder_id = $2 ORDER BY bid_amount DESC LIMIT 1',
      [listing_id, userId]
    )

    // Mark previous winning bid as outbid
    if (listing.highest_bidder_id) {
      await client.query(
        'UPDATE auction_bids SET is_winning = false, is_outbid = true WHERE listing_id = $1 AND is_winning = true',
        [listing_id]
      )

      // Notify previous highest bidder if different user
      if (listing.highest_bidder_id !== userId && wsManager) {
        wsManager.emitToUser(listing.highest_bidder_id, 'outbid-notification', {
          listing_id,
          item_name: listing.name,
          your_bid: listing.current_bid,
          new_bid: bid_amount,
          bidder_username: req.user!.discord_username
        })
      }
    }

    // Place the bid
    const bidResult = await client.query(`
      INSERT INTO auction_bids (
        listing_id, bidder_id, bid_amount, is_auto_bid, max_auto_bid, is_winning
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [listing_id, userId, bid_amount, is_auto_bid, max_auto_bid || null])

    // Update listing with new highest bid
    await client.query(`
      UPDATE marketplace_listings 
      SET current_bid = $1, highest_bidder_id = $2, total_bids = COALESCE(total_bids, 0) + 1
      WHERE listing_id = $3
    `, [bid_amount, userId, listing_id])

    // Get updated listing info
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
    `, [listing_id])

    await client.query('COMMIT')

    const bid = bidResult.rows[0]
    const updatedListingData = updatedListing.rows[0]

    // Emit real-time events
    if (wsManager) {
      const bidData = {
        ...bid,
        bidder: { 
          user_id: userId, 
          discord_username: req.user!.discord_username 
        }
      }

      wsManager.emitToRoom('marketplace', 'bid-placed', { 
        listing_id, 
        bid: bidData
      })
      
      wsManager.emitToRoom('marketplace', 'listing-updated', updatedListingData)
    }

    // Log analytics event
    await db.query(`
      INSERT INTO analytics_events (event_name, event_category, user_id, event_data, contains_pii)
      VALUES ('bid_placed', 'marketplace', $1, $2, false)
    `, [userId, JSON.stringify({ 
      listing_id, 
      bid_amount, 
      item_name: listing.name,
      item_rarity: listing.rarity,
      is_auto_bid,
      previous_bid: listing.current_bid
    })])

    res.status(201).json({
      success: true,
      data: {
        ...bid,
        bidder: { 
          user_id: userId, 
          discord_username: req.user!.discord_username 
        }
      },
      message: `Bid of ${bid_amount} tokens placed successfully`,
      listing: {
        current_bid: bid_amount,
        total_bids: updatedListingData.total_bids,
        time_remaining: Math.max(0, new Date(listing.expires_at).getTime() - Date.now())
      }
    })

  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Error placing bid:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to place bid',
      code: 'INTERNAL_ERROR'
    })
  } finally {
    client.release()
  }
})

export { router as marketplaceRoutes }