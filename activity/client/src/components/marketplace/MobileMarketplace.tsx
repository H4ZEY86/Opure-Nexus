// ============================================================================
// OPURE DISCORD ACTIVITY - MOBILE MARKETPLACE INTERFACE
// ============================================================================
// Touch-optimized marketplace for Discord mobile applications
// Features: Swipe gestures, bottom sheets, pull-to-refresh, haptic feedback
// Optimized for iOS and Android Discord app integration
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import { useDiscord } from '../../hooks/useDiscord'
import { MarketplaceListing, MarketplaceView, ItemCategory, ItemRarity } from '../../types/marketplace'
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  TrendingUp, 
  Star, 
  Clock, 
  Heart, 
  Grid3X3,
  Users,
  List,
  Eye,
  Flame,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ArrowLeft,
  Share,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Minus
} from 'lucide-react'

// ============================================================================
// MOBILE MARKETPLACE MAIN COMPONENT
// ============================================================================

interface MobileMarketplaceProps {
  className?: string
}

const MobileMarketplace: React.FC<MobileMarketplaceProps> = ({ className }) => {
  const { state, setCurrentView, fetchListings, openBottomSheet, closeBottomSheet } = useMarketplace()
  const { user } = useDiscord()
  
  // Mobile-specific state
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<MarketplaceView>('browse')
  const [pullToRefreshState, setPullToRefreshState] = useState<'idle' | 'pulling' | 'loading'>('idle')
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  // Refs for gesture handling
  const pullToRefreshRef = useRef<HTMLDivElement>(null)
  const cardContainerRef = useRef<HTMLDivElement>(null)

  // Filter state
  const [quickFilters, setQuickFilters] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Mobile navigation tabs
  const mobileTabs = [
    { id: 'browse', label: 'Browse', icon: ShoppingBag, color: 'text-blue-500' },
    { id: 'auction_house', label: 'Auctions', icon: TrendingUp, color: 'text-purple-500' },
    { id: 'my_inventory', label: 'Items', icon: Grid3X3, color: 'text-green-500' },
    { id: 'my_trades', label: 'Trades', icon: Users, color: 'text-orange-500' },
    { id: 'watchlist', label: 'Saved', icon: Heart, color: 'text-red-500' }
  ]

  // Quick action filters for mobile
  const mobileQuickFilters = [
    { id: 'ending_soon', label: 'Ending Soon', icon: Clock, color: 'bg-red-100 text-red-700' },
    { id: 'auctions', label: 'Auctions', icon: TrendingUp, color: 'bg-purple-100 text-purple-700' },
    { id: 'premium', label: 'Premium', icon: Star, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'rare', label: 'Rare+', icon: Trophy, color: 'bg-indigo-100 text-indigo-700' }
  ]

  // Filtered listings for mobile view
  const filteredListings = useMemo(() => {
    let filtered = [...state.listings]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(listing => 
        listing.item.name.toLowerCase().includes(query) ||
        listing.item.description.toLowerCase().includes(query)
      )
    }

    if (quickFilters.includes('ending_soon')) {
      filtered = filtered.filter(listing => {
        const timeLeft = new Date(listing.expires_at).getTime() - Date.now()
        return timeLeft < 60 * 60 * 1000 // Less than 1 hour
      })
    }

    if (quickFilters.includes('auctions')) {
      filtered = filtered.filter(listing => listing.listing_type === 'auction')
    }

    if (quickFilters.includes('premium')) {
      filtered = filtered.filter(listing => listing.seller.is_premium)
    }

    if (quickFilters.includes('rare')) {
      filtered = filtered.filter(listing => 
        ['epic', 'legendary', 'mythic'].includes(listing.item.rarity)
      )
    }

    return filtered
  }, [state.listings, searchQuery, quickFilters])

  // Handle pull to refresh
  const handlePullToRefresh = useCallback(async () => {
    setPullToRefreshState('loading')
    try {
      await fetchListings()
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    } finally {
      setPullToRefreshState('idle')
    }
  }, [fetchListings])

  // Handle touch start for gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }, [])

  // Handle touch move for pull to refresh
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || pullToRefreshState === 'loading') return

    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStart.y
    const deltaX = Math.abs(touch.clientX - touchStart.x)

    // Only handle vertical swipes for pull to refresh
    if (deltaX > 50) return

    if (deltaY > 100 && window.scrollY === 0) {
      setPullToRefreshState('pulling')
    }
  }, [touchStart, pullToRefreshState])

  // Handle touch end for gestures
  const handleTouchEnd = useCallback(() => {
    if (pullToRefreshState === 'pulling') {
      handlePullToRefresh()
    }
    setTouchStart(null)
    setPullToRefreshState('idle')
  }, [pullToRefreshState, handlePullToRefresh])

  // Handle card swipe
  const handleCardSwipe = useCallback((direction: 'left' | 'right', listing: MarketplaceListing) => {
    setSwipeDirection(direction)
    
    if (direction === 'right') {
      // Add to watchlist
      console.log('Add to watchlist:', listing.listing_id)
    } else {
      // Quick action (buy/bid)
      console.log('Quick action:', listing.listing_id)
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(25)
    }

    setTimeout(() => setSwipeDirection(null), 300)
  }, [])

  // Handle listing tap
  const handleListingTap = useCallback((listing: MarketplaceListing) => {
    setSelectedListing(listing)
    openBottomSheet('item_details', listing)
  }, [openBottomSheet])

  // Toggle quick filter
  const toggleQuickFilter = useCallback((filterId: string) => {
    setQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    )
  }, [])

  return (
    <div 
      className={`h-full bg-gray-50 overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Marketplace</h1>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className={`w-2 h-2 rounded-full ${
              state.connectionStatus === 'connected' 
                ? 'bg-green-500' 
                : state.connectionStatus === 'reconnecting'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`} />
            
            {/* Search Toggle */}
            <button
              onClick={() => setSearchExpanded(!searchExpanded)}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Search */}
        {searchExpanded && (
          <div className="px-4 pb-3 border-t border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {mobileQuickFilters.map((filter) => {
              const Icon = filter.icon
              const isActive = quickFilters.includes(filter.id)
              
              return (
                <button
                  key={filter.id}
                  onClick={() => toggleQuickFilter(filter.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    isActive ? filter.color : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {pullToRefreshState !== 'idle' && (
        <div className="flex items-center justify-center py-2 bg-blue-50">
          <div className={`text-sm text-blue-600 ${
            pullToRefreshState === 'loading' ? 'animate-pulse' : ''
          }`}>
            {pullToRefreshState === 'pulling' ? 'Release to refresh' : 'Refreshing...'}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'browse' && (
          <MobileListingsGrid 
            listings={filteredListings}
            onListingTap={handleListingTap}
            onCardSwipe={handleCardSwipe}
            loading={state.loading}
          />
        )}
        
        {activeTab === 'auction_house' && (
          <MobileAuctionView 
            listings={filteredListings.filter(l => l.listing_type === 'auction')}
            onListingTap={handleListingTap}
          />
        )}
        
        {activeTab === 'my_inventory' && (
          <MobileInventoryView />
        )}
        
        {activeTab === 'my_trades' && (
          <MobileTradesView />
        )}
        
        {activeTab === 'watchlist' && (
          <MobileWatchlistView />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as MarketplaceView)
                  setCurrentView(tab.id as MarketplaceView)
                }}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                  isActive ? tab.color : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
                {isActive && (
                  <div className="w-1 h-1 bg-current rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile Item Details Bottom Sheet */}
      {state.bottomSheetOpen && selectedListing && (
        <MobileItemDetailsSheet 
          listing={selectedListing}
          onClose={closeBottomSheet}
        />
      )}
    </div>
  )
}

// ============================================================================
// MOBILE LISTINGS GRID
// ============================================================================

interface MobileListingsGridProps {
  listings: MarketplaceListing[]
  onListingTap: (listing: MarketplaceListing) => void
  onCardSwipe: (direction: 'left' | 'right', listing: MarketplaceListing) => void
  loading: boolean
}

const MobileListingsGrid: React.FC<MobileListingsGridProps> = ({
  listings,
  onListingTap,
  onCardSwipe,
  loading
}) => {
  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading items...</p>
        </div>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center px-4">
        <div>
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No items found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {listings.map((listing) => (
          <MobileListingCard
            key={listing.listing_id}
            listing={listing}
            onTap={() => onListingTap(listing)}
            onSwipe={(direction) => onCardSwipe(direction, listing)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MOBILE LISTING CARD
// ============================================================================

interface MobileListingCardProps {
  listing: MarketplaceListing
  onTap: () => void
  onSwipe: (direction: 'left' | 'right') => void
}

const MobileListingCard: React.FC<MobileListingCardProps> = ({ listing, onTap, onSwipe }) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwipeThresholdMet, setIsSwipeThresholdMet] = useState(false)

  const timeRemaining = useMemo(() => {
    const now = new Date().getTime()
    const expires = new Date(listing.expires_at).getTime()
    const diff = expires - now
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d`
    }
    
    if (hours > 0) {
      return `${hours}h`
    }
    
    return `${minutes}m`
  }, [listing.expires_at])

  const isEndingSoon = useMemo(() => {
    const now = new Date().getTime()
    const expires = new Date(listing.expires_at).getTime()
    return (expires - now) < (60 * 60 * 1000)
  }, [listing.expires_at])

  const rarityColor = {
    common: 'border-gray-300',
    uncommon: 'border-green-400',
    rare: 'border-blue-400',
    epic: 'border-purple-400',
    legendary: 'border-orange-400',
    mythic: 'border-red-400'
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = Math.abs(touch.clientY - touchStart.y)

    // Only handle horizontal swipes
    if (deltaY > 50) return

    setSwipeOffset(deltaX)
    setIsSwipeThresholdMet(Math.abs(deltaX) > 80)
  }

  const handleTouchEnd = () => {
    if (Math.abs(swipeOffset) > 80) {
      onSwipe(swipeOffset > 0 ? 'right' : 'left')
    } else if (Math.abs(swipeOffset) < 10) {
      // Tap
      onTap()
    }
    
    setTouchStart(null)
    setSwipeOffset(0)
    setIsSwipeThresholdMet(false)
  }

  return (
    <div
      className="relative bg-white rounded-lg border shadow-sm overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
      }}
    >
      {/* Swipe Actions Background */}
      {isSwipeThresholdMet && (
        <div className={`absolute inset-0 flex items-center justify-center ${
          swipeOffset > 0 
            ? 'bg-green-500 text-white' 
            : 'bg-blue-500 text-white'
        }`}>
          {swipeOffset > 0 ? (
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <span className="font-medium">Save</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Quick Buy</span>
            </div>
          )}
        </div>
      )}

      {/* Card Content */}
      <div className={`relative bg-white border-l-4 ${rarityColor[listing.item.rarity]}`}>
        {/* Item Image */}
        <div className="aspect-square bg-gray-100 relative">
          {listing.item.image_url ? (
            <img
              src={listing.item.image_url}
              alt={listing.item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
          )}
          
          {/* Overlay Badges */}
          {listing.listing_type === 'auction' && (
            <div className="absolute top-2 left-2">
              <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                Auction
              </span>
            </div>
          )}
          
          {isEndingSoon && (
            <div className="absolute top-2 right-2">
              <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                <Flame className="w-2.5 h-2.5" />
                {timeRemaining}
              </span>
            </div>
          )}
        </div>

        {/* Item Details */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-1 mb-1">
            {listing.item.name}
          </h3>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              by {listing.seller.discord_username}
              {listing.seller.is_premium && <Star className="w-2.5 h-2.5 text-yellow-500 inline ml-1" />}
            </span>
            <span className="text-xs text-gray-400">{timeRemaining}</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {listing.listing_type === 'auction' ? 'Current Bid' : 'Price'}
              </p>
              <p className="text-sm font-bold text-gray-900">
                {listing.listing_type === 'auction' 
                  ? (listing.current_bid || listing.starting_bid)
                  : listing.price_per_item
                } tokens
              </p>
            </div>
            
            {listing.quantity > 1 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                x{listing.quantity}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MOBILE ITEM DETAILS BOTTOM SHEET
// ============================================================================

interface MobileItemDetailsSheetProps {
  listing: MarketplaceListing
  onClose: () => void
}

const MobileItemDetailsSheet: React.FC<MobileItemDetailsSheetProps> = ({ listing, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [showBidInput, setShowBidInput] = useState(false)

  const timeRemaining = useMemo(() => {
    const now = new Date().getTime()
    const expires = new Date(listing.expires_at).getTime()
    const diff = expires - now
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }, [listing.expires_at])

  const handleBidSubmit = () => {
    console.log('Submit bid:', bidAmount)
    setShowBidInput(false)
    setBidAmount('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl transition-all duration-300 ${
          isExpanded ? 'h-full' : 'h-3/4'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-12 h-1 bg-gray-300 rounded-full cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Item Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Item Image */}
          <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
            {listing.item.image_url ? (
              <img
                src={listing.item.image_url}
                alt={listing.item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ShoppingBag className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Item Info */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{listing.item.name}</h3>
            <p className="text-gray-600 mb-4">{listing.item.description}</p>
            
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium text-gray-900 capitalize">{listing.item.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rarity</p>
                <p className="font-medium text-gray-900 capitalize">{listing.item.rarity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Seller</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  {listing.seller.discord_username}
                  {listing.seller.is_premium && <Star className="w-3 h-3 text-yellow-500" />}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time Remaining</p>
                <p className="font-medium text-gray-900">{timeRemaining}</p>
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            {listing.listing_type === 'auction' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Current Bid</span>
                  <span className="text-sm text-gray-500">Starting Bid: {listing.starting_bid} tokens</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  {listing.current_bid || listing.starting_bid} tokens
                </p>
                
                {showBidInput ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Enter bid amount"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={(listing.current_bid || listing.starting_bid) + 1}
                      />
                      <span className="text-sm text-gray-500">tokens</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleBidSubmit}
                        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-medium"
                        disabled={!bidAmount || parseInt(bidAmount) <= (listing.current_bid || listing.starting_bid)}
                      >
                        Place Bid
                      </button>
                      <button
                        onClick={() => setShowBidInput(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBidInput(true)}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium"
                  >
                    Place Bid
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-1">Price</p>
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  {listing.price_per_item} tokens
                </p>
                <button className="w-full bg-green-500 text-white py-3 rounded-lg font-medium">
                  Buy Now
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg text-gray-700">
              <Heart className="w-4 h-4" />
              Save
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg text-gray-700">
              <Share className="w-4 h-4" />
              Share
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg text-gray-700">
              <AlertCircle className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder components for other mobile views
const MobileAuctionView: React.FC<{ listings: MarketplaceListing[], onListingTap: (listing: MarketplaceListing) => void }> = ({ listings, onListingTap }) => (
  <MobileListingsGrid listings={listings} onListingTap={onListingTap} onCardSwipe={() => {}} loading={false} />
)

const MobileInventoryView: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">Mobile Inventory - Coming Soon</p>
  </div>
)

const MobileTradesView: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">Mobile Trades - Coming Soon</p>
  </div>
)

const MobileWatchlistView: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-500">Mobile Watchlist - Coming Soon</p>
  </div>
)

export default MobileMarketplace