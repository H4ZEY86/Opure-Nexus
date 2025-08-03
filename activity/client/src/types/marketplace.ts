// ============================================================================
// OPURE DISCORD ACTIVITY - MARKETPLACE TYPE DEFINITIONS
// ============================================================================
// Comprehensive TypeScript definitions for the AI Token Economy Marketplace
// Supports: Trading, Auctions, Escrow, Analytics, Mobile Optimization
// ============================================================================

// Core marketplace entities
export interface MarketplaceItem {
  item_id: string
  name: string
  description: string
  category: ItemCategory
  subcategory?: string
  rarity: ItemRarity
  base_value: number
  item_data: Record<string, any>
  properties: ItemProperties
  icon_url?: string
  image_url?: string
  animation_url?: string
  color_scheme: Record<string, string>
  effects: ItemEffect[]
  duration_minutes?: number
  total_supply?: number
  circulating_supply: number
  is_limited_edition: boolean
  is_active: boolean
  is_premium_only: boolean
  created_at: string
  updated_at: string
}

export interface ItemProperties {
  stackable: boolean
  tradeable: boolean
  sellable: boolean
  consumable: boolean
  durability?: number
}

export interface ItemEffect {
  type: string
  value: number
  duration?: number
  description: string
}

export type ItemCategory = 
  | 'collectible' 
  | 'boost' 
  | 'cosmetic' 
  | 'premium' 
  | 'consumable'
  | 'achievement_badge'
  | 'game_enhancement'

export type ItemRarity = 
  | 'common' 
  | 'uncommon' 
  | 'rare' 
  | 'epic' 
  | 'legendary' 
  | 'mythic'

// User inventory
export interface InventoryItem {
  inventory_id: string
  user_id: string
  item_id: string
  item: MarketplaceItem
  quantity: number
  acquired_at: string
  acquired_from: string
  item_state: Record<string, any>
  durability_current?: number
  durability_max?: number
  times_used: number
  last_used?: string
  is_locked: boolean
  locked_reason?: string
  locked_until?: string
}

// Marketplace listings
export interface MarketplaceListing {
  listing_id: string
  seller_id: string
  seller: {
    user_id: string
    discord_username: string
    is_premium: boolean
    reputation_score?: number
  }
  item_id: string
  item: MarketplaceItem
  quantity: number
  price_per_item: number
  total_price: number
  listing_type: ListingType
  starting_bid?: number
  current_bid?: number
  bid_increment?: number
  highest_bidder_id?: string
  highest_bidder?: {
    user_id: string
    discord_username: string
  }
  status: ListingStatus
  created_at: string
  expires_at: string
  sold_at?: string
  auto_accept_percentage?: number
  accepts_item_trades: boolean
  preferred_trade_items: string[]
  listing_fee: number
  market_tax_rate: number
}

export type ListingType = 'fixed_price' | 'auction' | 'offer_wanted'
export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired'

// Auction system
export interface AuctionBid {
  bid_id: string
  listing_id: string
  bidder_id: string
  bidder: {
    user_id: string
    discord_username: string
  }
  bid_amount: number
  is_auto_bid: boolean
  max_auto_bid?: number
  is_winning: boolean
  is_outbid: boolean
  created_at: string
}

// Trading system
export interface Trade {
  trade_id: string
  initiator_id: string
  initiator: {
    user_id: string
    discord_username: string
    reputation_score?: number
  }
  recipient_id: string
  recipient: {
    user_id: string
    discord_username: string
    reputation_score?: number
  }
  trade_type: TradeType
  listing_id?: string
  status: TradeStatus
  initiator_confirmed: boolean
  recipient_confirmed: boolean
  both_confirmed_at?: string
  escrow_started: boolean
  escrow_tokens_locked: number
  escrow_expires_at?: string
  initiated_at: string
  accepted_at?: string
  completed_at?: string
  total_value: number
  market_fee: number
  disputed_at?: string
  dispute_reason?: string
  trade_items: TradeItem[]
}

export interface TradeItem {
  item_id: string
  item: MarketplaceItem
  quantity: number
  from_user_id: string
  to_user_id: string
  estimated_value: number
}

export type TradeType = 'direct' | 'marketplace' | 'auction_win'
export type TradeStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'disputed'

// Market analytics
export interface MarketPriceHistory {
  price_id: string
  item_id: string
  sale_price: number
  quantity_sold: number
  sale_date: string
  seller_id?: string
  buyer_id?: string
  total_listings: number
  average_market_price: number
}

export interface MarketPriceSummary {
  item_id: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  total_sales: number
  avg_price: number
  min_price: number
  max_price: number
  active_listings: number
  avg_listing_price: number
  price_trend: 'up' | 'down' | 'stable'
  volume_24h: number
  volume_7d: number
}

// Search and filtering
export interface MarketplaceFilters {
  category?: ItemCategory[]
  rarity?: ItemRarity[]
  price_min?: number
  price_max?: number
  listing_type?: ListingType[]
  seller_premium_only?: boolean
  time_ending_soon?: boolean
  search_query?: string
  sort_by?: MarketplaceSortOption
  sort_order?: 'asc' | 'desc'
}

export type MarketplaceSortOption = 
  | 'price' 
  | 'time_remaining' 
  | 'newest' 
  | 'rarity' 
  | 'popularity'
  | 'price_per_unit'

// UI State Management
export interface MarketplaceState {
  // Current view
  currentView: MarketplaceView
  selectedCategory: ItemCategory | null
  
  // Data
  listings: MarketplaceListing[]
  userInventory: InventoryItem[]
  marketPrices: MarketPriceSummary[]
  userTrades: Trade[]
  watchlist: string[]
  
  // UI state
  filters: MarketplaceFilters
  loading: boolean
  error: string | null
  
  // Real-time updates
  lastUpdate: string
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  
  // Mobile optimization
  isMobile: boolean
  bottomSheetOpen: boolean
  selectedListing: MarketplaceListing | null
}

export type MarketplaceView = 
  | 'browse' 
  | 'my_listings' 
  | 'my_inventory' 
  | 'my_trades' 
  | 'watchlist'
  | 'analytics'
  | 'auction_house'

// API responses
export interface MarketplaceResponse<T> {
  success: boolean
  data: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface ListingsResponse extends MarketplaceResponse<MarketplaceListing[]> {
  filters_applied: MarketplaceFilters
  total_results: number
}

// WebSocket events
export interface MarketplaceWebSocketEvent {
  type: MarketplaceEventType
  data: any
  timestamp: string
  user_id?: string
}

export type MarketplaceEventType = 
  | 'listing_created'
  | 'listing_updated' 
  | 'listing_sold'
  | 'bid_placed'
  | 'trade_initiated'
  | 'trade_completed'
  | 'price_update'
  | 'inventory_updated'
  | 'user_online'
  | 'user_offline'

// Transaction types
export interface MarketplaceTransaction {
  transaction_id: string
  type: 'purchase' | 'sale' | 'trade' | 'bid' | 'listing_fee'
  user_id: string
  item_id?: string
  listing_id?: string
  trade_id?: string
  amount: number
  fee: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
  processed_at?: string
}

// User preferences and settings
export interface MarketplacePreferences {
  auto_accept_trades: boolean
  auto_accept_percentage: number
  notification_settings: {
    new_listings: boolean
    price_drops: boolean
    watchlist_updates: boolean
    trade_requests: boolean
    auction_outbid: boolean
    auction_won: boolean
    auction_ending_soon: boolean
  }
  display_settings: {
    items_per_page: number
    default_sort: MarketplaceSortOption
    show_owned_items: boolean
    compact_view: boolean
  }
  trading_settings: {
    allow_item_trades: boolean
    minimum_reputation: number
    auto_decline_lowball: boolean
    lowball_threshold: number
  }
}

// Analytics and insights
export interface MarketplaceAnalytics {
  user_stats: {
    total_purchases: number
    total_sales: number
    total_spent: number
    total_earned: number
    reputation_score: number
    successful_trades: number
    disputed_trades: number
  }
  market_insights: {
    trending_items: MarketplaceItem[]
    price_predictions: Record<string, number>
    recommended_investments: MarketplaceItem[]
    portfolio_value: number
    portfolio_change_24h: number
  }
  performance_metrics: {
    avg_sale_time: number
    success_rate: number
    profit_margin: number
    market_share: number
  }
}

// Mobile-specific interfaces
export interface MobileMarketplaceState {
  isBottomSheetVisible: boolean
  currentBottomSheet: 'filters' | 'item_details' | 'trade_details' | null
  swipeableItemIndex: number
  quickActionsVisible: boolean
  touchGestures: {
    swipeEnabled: boolean
    pullToRefresh: boolean
    longPressEnabled: boolean
  }
}

// Error handling
export interface MarketplaceError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  user_action?: string
}

// Real-time notifications
export interface MarketplaceNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  action?: {
    label: string
    callback: () => void
  }
  duration?: number
  persistent?: boolean
  icon?: string
}

// Security and anti-fraud
export interface SecurityCheck {
  user_id: string
  check_type: 'bot_detection' | 'price_manipulation' | 'suspicious_activity'
  risk_score: number
  flags: string[]
  action_taken?: 'warning' | 'temporary_ban' | 'permanent_ban'
  timestamp: string
}

// Advanced features
export interface SmartContract {
  contract_id: string
  type: 'escrow' | 'auction' | 'subscription' | 'royalty'
  participants: string[]
  terms: Record<string, any>
  status: 'active' | 'executed' | 'cancelled' | 'disputed'
  created_at: string
  expires_at?: string
}

export interface MarketplaceBadge {
  badge_id: string
  name: string
  description: string
  icon_url: string
  criteria: Record<string, any>
  rarity: ItemRarity
  holders_count: number
}

// Social features
export interface UserReputation {
  user_id: string
  reputation_score: number
  positive_reviews: number
  negative_reviews: number
  total_trades: number
  response_time_avg: number
  badges: MarketplaceBadge[]
  verification_status: 'unverified' | 'email' | 'phone' | 'kyc'
}

// API request/response types
export interface CreateListingRequest {
  item_id: string
  quantity: number
  price_per_item: number
  listing_type: ListingType
  starting_bid?: number
  duration_hours?: number
  auto_accept_percentage?: number
  accepts_item_trades?: boolean
  preferred_trade_items?: string[]
}

export interface PlaceBidRequest {
  listing_id: string
  bid_amount: number
  is_auto_bid?: boolean
  max_auto_bid?: number
}

export interface InitiateTradeRequest {
  recipient_id: string
  offering_items: Array<{
    item_id: string
    quantity: number
  }>
  requesting_tokens?: number
  requesting_items?: Array<{
    item_id: string
    quantity: number
  }>
  message?: string
}

// Context provider props
export interface MarketplaceContextProps {
  children: React.ReactNode
}

export interface MarketplaceContextValue {
  // State
  state: MarketplaceState
  
  // Actions
  fetchListings: (filters?: MarketplaceFilters) => Promise<void>
  fetchUserInventory: () => Promise<void>
  fetchUserTrades: () => Promise<void>
  createListing: (request: CreateListingRequest) => Promise<MarketplaceResponse<MarketplaceListing>>
  cancelListing: (listingId: string) => Promise<MarketplaceResponse<void>>
  placeBid: (request: PlaceBidRequest) => Promise<MarketplaceResponse<AuctionBid>>
  initiateTrade: (request: InitiateTradeRequest) => Promise<MarketplaceResponse<Trade>>
  acceptTrade: (tradeId: string) => Promise<MarketplaceResponse<Trade>>
  cancelTrade: (tradeId: string) => Promise<MarketplaceResponse<Trade>>
  addToWatchlist: (listingId: string) => Promise<void>
  removeFromWatchlist: (listingId: string) => Promise<void>
  
  // Utility functions
  setFilters: (filters: MarketplaceFilters) => void
  setCurrentView: (view: MarketplaceView) => void
  clearError: () => void
  
  // Mobile-specific
  openBottomSheet: (sheet: 'filters' | 'item_details' | 'trade_details', data?: any) => void
  closeBottomSheet: () => void
  
  // Real-time
  subscribe: (eventType: MarketplaceEventType, callback: (data: any) => void) => () => void
}