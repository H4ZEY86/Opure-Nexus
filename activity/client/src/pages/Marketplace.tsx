// ============================================================================
// OPURE DISCORD ACTIVITY - COMPREHENSIVE MARKETPLACE
// ============================================================================
// Advanced AI Token Economy Marketplace for Discord Activities
// Features: Real-time trading, auctions, mobile optimization, reputation system
// Compatible with IONOS static hosting through external APIs
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useMarketplace } from '../contexts/MarketplaceContext'
import { useDiscord } from '../hooks/useDiscord'
import { MarketplaceView, MarketplaceFilters, ItemCategory, ItemRarity, MarketplaceListing } from '../types/marketplace'
import { 
  ShoppingBag, 
  TrendingUp, 
  Star, 
  Clock, 
  DollarSign, 
  Users, 
  Search, 
  Filter,
  Grid3X3,
  List,
  Heart,
  ShoppingCart,
  Flame,
  Trophy,
  Shield,
  Eye,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bell,
  Settings
} from 'lucide-react'

// ============================================================================
// MARKETPLACE MAIN COMPONENT
// ============================================================================

const Marketplace: React.FC = () => {
  const { user } = useDiscord()
  const { 
    state, 
    setCurrentView, 
    setFilters, 
    fetchListings,
    openBottomSheet,
    closeBottomSheet 
  } = useMarketplace()

  // Local state for UI
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [quickFilters, setQuickFilters] = useState<string[]>([])
  const [sortExpanded, setSortExpanded] = useState(false)

  // Mobile detection
  const isMobile = state.isMobile || window.innerWidth < 768

  // Filtered and sorted listings
  const filteredListings = useMemo(() => {
    let filtered = [...state.listings]

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(listing => 
        listing.item.name.toLowerCase().includes(query) ||
        listing.item.description.toLowerCase().includes(query) ||
        listing.item.category.toLowerCase().includes(query)
      )
    }

    // Apply quick filters
    if (quickFilters.includes('ending_soon')) {
      const oneHour = 60 * 60 * 1000
      filtered = filtered.filter(listing => 
        new Date(listing.expires_at).getTime() - Date.now() < oneHour
      )
    }

    if (quickFilters.includes('auctions')) {
      filtered = filtered.filter(listing => listing.listing_type === 'auction')
    }

    if (quickFilters.includes('premium_sellers')) {
      filtered = filtered.filter(listing => listing.seller.is_premium)
    }

    if (quickFilters.includes('rare_items')) {
      filtered = filtered.filter(listing => 
        ['epic', 'legendary', 'mythic'].includes(listing.item.rarity)
      )
    }

    return filtered
  }, [state.listings, searchQuery, quickFilters])

  // Quick filter options
  const quickFilterOptions = [
    { id: 'ending_soon', label: 'Ending Soon', icon: Clock, color: 'text-red-500' },
    { id: 'auctions', label: 'Auctions', icon: TrendingUp, color: 'text-blue-500' },
    { id: 'premium_sellers', label: 'Premium Sellers', icon: Star, color: 'text-yellow-500' },
    { id: 'rare_items', label: 'Rare Items', icon: Trophy, color: 'text-purple-500' }
  ]

  // Navigation tabs
  const navigationTabs = [
    { id: 'browse', label: 'Browse', icon: ShoppingBag },
    { id: 'auction_house', label: 'Auctions', icon: TrendingUp },
    { id: 'my_listings', label: 'My Listings', icon: List },
    { id: 'my_inventory', label: 'Inventory', icon: Grid3X3 },
    { id: 'my_trades', label: 'Trades', icon: Users },
    { id: 'watchlist', label: 'Watchlist', icon: Heart },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ]

  // Toggle quick filter
  const toggleQuickFilter = useCallback((filterId: string) => {
    setQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    )
  }, [])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setFilters({ ...state.filters, search_query: query })
    }
  }, [setFilters, state.filters])

  // Handle view change
  const handleViewChange = useCallback((view: MarketplaceView) => {
    setCurrentView(view)
  }, [setCurrentView])

  // Handle listing click
  const handleListingClick = useCallback((listing: MarketplaceListing) => {
    if (isMobile) {
      openBottomSheet('item_details', listing)
    } else {
      // Open detailed view in desktop mode
      openBottomSheet('item_details', listing)
    }
  }, [isMobile, openBottomSheet])

  // Refresh data
  const handleRefresh = useCallback(() => {
    fetchListings(state.filters)
  }, [fetchListings, state.filters])

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      state.connectionStatus === 'connected' 
        ? 'bg-green-100 text-green-700' 
        : state.connectionStatus === 'reconnecting'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        state.connectionStatus === 'connected' 
          ? 'bg-green-500' 
          : state.connectionStatus === 'reconnecting'
          ? 'bg-yellow-500 animate-pulse'
          : 'bg-red-500'
      }`} />
      {state.connectionStatus === 'connected' 
        ? 'Live' 
        : state.connectionStatus === 'reconnecting'
        ? 'Reconnecting...'
        : 'Offline'
      }
    </div>
  )

  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 via-white to-blue-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title and Connection Status */}
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                AI Token Marketplace
              </h1>
              <ConnectionStatus />
            </div>

            {/* Desktop Controls */}
            {!isMobile && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleRefresh}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={state.loading}
                >
                  <RefreshCw className={`w-5 h-5 ${state.loading ? 'animate-spin' : ''}`} />
                </button>
                
                <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                
                <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide py-2">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = state.currentView === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleViewChange(tab.id as MarketplaceView)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {!isMobile && tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      {(state.currentView === 'browse' || state.currentView === 'auction_house') && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search items, categories, or sellers..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                {!isMobile && 'Filters'}
              </button>

              {!isMobile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              {quickFilterOptions.map((filter) => {
                const Icon = filter.icon
                const isActive = quickFilters.includes(filter.id)
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleQuickFilter(filter.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${isActive ? filter.color : ''}`} />
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {state.currentView === 'browse' && (
          <MarketplaceBrowse 
            listings={filteredListings}
            viewMode={viewMode}
            onListingClick={handleListingClick}
            loading={state.loading}
            error={state.error}
          />
        )}
        
        {state.currentView === 'auction_house' && (
          <AuctionHouse 
            listings={filteredListings.filter(l => l.listing_type === 'auction')}
            viewMode={viewMode}
            onListingClick={handleListingClick}
            loading={state.loading}
          />
        )}
        
        {state.currentView === 'my_listings' && (
          <MyListings />
        )}
        
        {state.currentView === 'my_inventory' && (
          <MyInventory />
        )}
        
        {state.currentView === 'my_trades' && (
          <MyTrades />
        )}
        
        {state.currentView === 'watchlist' && (
          <Watchlist />
        )}
        
        {state.currentView === 'analytics' && (
          <MarketplaceAnalytics />
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      {state.bottomSheetOpen && (
        <MobileBottomSheet onClose={closeBottomSheet} />
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <AdvancedFiltersPanel onClose={() => setShowFilters(false)} />
      )}
    </div>
  )
}

// ============================================================================
// MARKETPLACE BROWSE COMPONENT
// ============================================================================

interface MarketplaceBrowseProps {
  listings: MarketplaceListing[]
  viewMode: 'grid' | 'list'
  onListingClick: (listing: MarketplaceListing) => void
  loading: boolean
  error: string | null
}

const MarketplaceBrowse: React.FC<MarketplaceBrowseProps> = ({
  listings,
  viewMode,
  onListingClick,
  loading,
  error
}) => {
  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading marketplace...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading marketplace</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">No items found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {listings.map((listing) => (
          <ListingCard
            key={listing.listing_id}
            listing={listing}
            viewMode={viewMode}
            onClick={() => onListingClick(listing)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// LISTING CARD COMPONENT
// ============================================================================

interface ListingCardProps {
  listing: MarketplaceListing
  viewMode: 'grid' | 'list'
  onClick: () => void
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, viewMode, onClick }) => {
  const timeRemaining = useMemo(() => {
    const now = new Date().getTime()
    const expires = new Date(listing.expires_at).getTime()
    const diff = expires - now
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    
    return `${hours}h ${minutes}m`
  }, [listing.expires_at])

  const isEndingSoon = useMemo(() => {
    const now = new Date().getTime()
    const expires = new Date(listing.expires_at).getTime()
    return (expires - now) < (60 * 60 * 1000) // Less than 1 hour
  }, [listing.expires_at])

  const rarityColor = {
    common: 'bg-gray-100 text-gray-700',
    uncommon: 'bg-green-100 text-green-700',
    rare: 'bg-blue-100 text-blue-700',
    epic: 'bg-purple-100 text-purple-700',
    legendary: 'bg-orange-100 text-orange-700',
    mythic: 'bg-red-100 text-red-700'
  }

  const rarityIcon = {
    common: '○',
    uncommon: '◇',
    rare: '◈',
    epic: '◉',
    legendary: '✦',
    mythic: '✧'
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer p-4"
      >
        <div className="flex items-center gap-4">
          {/* Item Image */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {listing.item.image_url ? (
              <img
                src={listing.item.image_url}
                alt={listing.item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{listing.item.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rarityColor[listing.item.rarity]}`}>
                {rarityIcon[listing.item.rarity]} {listing.item.rarity}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 truncate mb-2">{listing.item.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>By {listing.seller.discord_username}</span>
              {listing.seller.is_premium && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Star className="w-3 h-3" />
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Price and Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              {listing.listing_type === 'auction' ? (
                <div>
                  <p className="text-sm text-gray-500">Current Bid</p>
                  <p className="text-lg font-bold text-gray-900">
                    {listing.current_bid || listing.starting_bid} tokens
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-lg font-bold text-gray-900">
                    {listing.price_per_item} tokens
                  </p>
                </div>
              )}
            </div>
            
            <div className={`flex items-center gap-1 text-xs ${
              isEndingSoon ? 'text-red-600' : 'text-gray-500'
            }`}>
              <Clock className="w-3 h-3" />
              {timeRemaining}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
    >
      {/* Item Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {listing.item.image_url ? (
          <img
            src={listing.item.image_url}
            alt={listing.item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingBag className="w-12 h-12" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${rarityColor[listing.item.rarity]}`}>
            {rarityIcon[listing.item.rarity]} {listing.item.rarity}
          </span>
        </div>
        
        {listing.listing_type === 'auction' && (
          <div className="absolute top-2 right-2">
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Auction
            </span>
          </div>
        )}
        
        {isEndingSoon && (
          <div className="absolute bottom-2 right-2">
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Ending Soon
            </span>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{listing.item.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{listing.item.description}</p>
        
        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <span>By {listing.seller.discord_username}</span>
          {listing.seller.is_premium && (
            <Star className="w-3 h-3 text-yellow-500" />
          )}
        </div>

        {/* Price and Time */}
        <div className="flex items-center justify-between">
          <div>
            {listing.listing_type === 'auction' ? (
              <div>
                <p className="text-xs text-gray-500">Current Bid</p>
                <p className="text-lg font-bold text-gray-900">
                  {listing.current_bid || listing.starting_bid} tokens
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500">Price</p>
                <p className="text-lg font-bold text-gray-900">
                  {listing.price_per_item} tokens
                </p>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-1 text-xs ${
            isEndingSoon ? 'text-red-600' : 'text-gray-500'
          }`}>
            <Clock className="w-3 h-3" />
            {timeRemaining}
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder components for other views
const AuctionHouse: React.FC<{ listings: MarketplaceListing[], viewMode: 'grid' | 'list', onListingClick: (listing: MarketplaceListing) => void, loading: boolean }> = ({ listings, viewMode, onListingClick, loading }) => (
  <MarketplaceBrowse listings={listings} viewMode={viewMode} onListingClick={onListingClick} loading={loading} error={null} />
)

const MyListings: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">My Listings - Coming Soon</p>
  </div>
)

const MyInventory: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">My Inventory - Coming Soon</p>
  </div>
)

const MyTrades: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">My Trades - Coming Soon</p>
  </div>
)

const Watchlist: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">Watchlist - Coming Soon</p>
  </div>
)

const MarketplaceAnalytics: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">Analytics - Coming Soon</p>
  </div>
)

const MobileBottomSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg p-4" onClick={e => e.stopPropagation()}>
      <p className="text-gray-500">Mobile Bottom Sheet - Coming Soon</p>
    </div>
  </div>
)

const AdvancedFiltersPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
    <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg p-4" onClick={e => e.stopPropagation()}>
      <p className="text-gray-500">Advanced Filters - Coming Soon</p>
    </div>
  </div>
)

export default Marketplace