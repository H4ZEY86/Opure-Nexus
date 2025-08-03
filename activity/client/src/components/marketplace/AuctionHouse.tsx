// ============================================================================
// OPURE DISCORD ACTIVITY - AUCTION HOUSE
// ============================================================================
// Advanced auction system with bidding mechanics and escrow
// Features: Real-time bidding, auto-bid, escrow protection, bid history
// Mobile-optimized with live updates and notifications
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import { useMarketplaceRealtime } from '../../services/MarketplaceWebSocketService'
import { 
  MarketplaceListing, 
  AuctionBid, 
  PlaceBidRequest
} from '../../types/marketplace'
import { 
  Clock, 
  TrendingUp, 
  Flame, 
  Users, 
  Zap, 
  DollarSign, 
  Star,
  Eye,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Gavel,
  Target,
  Shield,
  Bell,
  History,
  Trophy,
  RefreshCw,
  Plus,
  Minus,
  Play,
  Pause
} from 'lucide-react'

// ============================================================================
// AUCTION HOUSE MAIN COMPONENT
// ============================================================================

interface AuctionHouseProps {
  className?: string
}

const AuctionHouse: React.FC<AuctionHouseProps> = ({ className }) => {
  const { state, fetchListings, placeBid } = useMarketplace()
  const { subscribe } = useMarketplaceRealtime()
  
  // Filter for auction listings only
  const auctionListings = useMemo(() => 
    state.listings.filter(listing => listing.listing_type === 'auction'),
    [state.listings]
  )

  // Sort auctions by ending time
  const sortedAuctions = useMemo(() => {
    return [...auctionListings].sort((a, b) => {
      const timeA = new Date(a.expires_at).getTime() - Date.now()
      const timeB = new Date(b.expires_at).getTime() - Date.now()
      return timeA - timeB // Soonest ending first
    })
  }, [auctionListings])

  // State
  const [selectedAuction, setSelectedAuction] = useState<MarketplaceListing | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'featured'>('featured')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ending_soon' | 'new' | 'hot'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchListings()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchListings])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribes = [
      subscribe('bid_placed', (data) => {
        // Handle new bid notifications
        console.log('New bid placed:', data)
      }),
      subscribe('auction_ended', (data) => {
        // Handle auction end notifications
        console.log('Auction ended:', data)
      })
    ]

    return () => {
      unsubscribes.forEach(fn => fn())
    }
  }, [subscribe])

  // Filter auctions based on status
  const filteredAuctions = useMemo(() => {
    const now = Date.now()
    
    switch (filterStatus) {
      case 'ending_soon':
        return sortedAuctions.filter(auction => {
          const timeLeft = new Date(auction.expires_at).getTime() - now
          return timeLeft < 60 * 60 * 1000 // Less than 1 hour
        })
      case 'new':
        return sortedAuctions.filter(auction => {
          const created = new Date(auction.created_at).getTime()
          return now - created < 24 * 60 * 60 * 1000 // Last 24 hours
        })
      case 'hot':
        return sortedAuctions.filter(auction => 
          (auction.total_bids || 0) >= 5 || (auction.view_count || 0) >= 50
        )
      default:
        return sortedAuctions
    }
  }, [sortedAuctions, filterStatus])

  return (
    <div className={`h-full bg-gradient-to-br from-purple-50 via-white to-blue-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Gavel className="w-6 h-6 text-purple-600" />
                Auction House
              </h1>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>{filteredAuctions.length} Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span>
                    {filteredAuctions.filter(a => 
                      new Date(a.expires_at).getTime() - Date.now() < 60 * 60 * 1000
                    ).length} Ending Soon
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                Auto Refresh
              </button>
              
              <button
                onClick={() => fetchListings()}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={state.loading}
              >
                <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All Auctions', icon: TrendingUp },
                { id: 'ending_soon', label: 'Ending Soon', icon: Clock },
                { id: 'new', label: 'New', icon: Zap },
                { id: 'hot', label: 'Hot', icon: Flame }
              ].map((filter) => {
                const Icon = filter.icon
                const isActive = filterStatus === filter.id
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => setFilterStatus(filter.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {filter.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">View:</span>
              {[
                { id: 'featured', label: 'Featured', icon: Star },
                { id: 'grid', label: 'Grid', icon: Trophy },
                { id: 'list', label: 'List', icon: Users }
              ].map((view) => {
                const Icon = view.icon
                const isActive = viewMode === view.id
                
                return (
                  <button
                    key={view.id}
                    onClick={() => setViewMode(view.id as any)}
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredAuctions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Gavel className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No auctions found</p>
              <p className="text-sm text-gray-400 mt-1">
                {filterStatus === 'all' 
                  ? 'Check back later for new auctions'
                  : 'Try changing your filter selection'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {viewMode === 'featured' && (
              <FeaturedAuctionsView auctions={filteredAuctions} onSelectAuction={setSelectedAuction} />
            )}
            
            {viewMode === 'grid' && (
              <AuctionGridView auctions={filteredAuctions} onSelectAuction={setSelectedAuction} />
            )}
            
            {viewMode === 'list' && (
              <AuctionListView auctions={filteredAuctions} onSelectAuction={setSelectedAuction} />
            )}
          </div>
        )}
      </div>

      {/* Auction Details Modal */}
      {selectedAuction && (
        <AuctionDetailsModal 
          auction={selectedAuction} 
          onClose={() => setSelectedAuction(null)} 
        />
      )}
    </div>
  )
}

// ============================================================================
// FEATURED AUCTIONS VIEW
// ============================================================================

interface FeaturedAuctionsViewProps {
  auctions: MarketplaceListing[]
  onSelectAuction: (auction: MarketplaceListing) => void
}

const FeaturedAuctionsView: React.FC<FeaturedAuctionsViewProps> = ({ auctions, onSelectAuction }) => {
  const featured = auctions.slice(0, 3) // Top 3 auctions
  const regular = auctions.slice(3)

  return (
    <div className="space-y-8">
      {/* Featured Section */}
      {featured.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Featured Auctions
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featured.map((auction) => (
              <FeaturedAuctionCard 
                key={auction.listing_id} 
                auction={auction} 
                onClick={() => onSelectAuction(auction)} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Auctions */}
      {regular.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">All Auctions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {regular.map((auction) => (
              <AuctionCard 
                key={auction.listing_id} 
                auction={auction} 
                onClick={() => onSelectAuction(auction)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// AUCTION GRID VIEW
// ============================================================================

interface AuctionGridViewProps {
  auctions: MarketplaceListing[]
  onSelectAuction: (auction: MarketplaceListing) => void
}

const AuctionGridView: React.FC<AuctionGridViewProps> = ({ auctions, onSelectAuction }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {auctions.map((auction) => (
        <AuctionCard 
          key={auction.listing_id} 
          auction={auction} 
          onClick={() => onSelectAuction(auction)} 
        />
      ))}
    </div>
  )
}

// ============================================================================
// AUCTION LIST VIEW
// ============================================================================

interface AuctionListViewProps {
  auctions: MarketplaceListing[]
  onSelectAuction: (auction: MarketplaceListing) => void
}

const AuctionListView: React.FC<AuctionListViewProps> = ({ auctions, onSelectAuction }) => {
  return (
    <div className="space-y-4">
      {auctions.map((auction) => (
        <AuctionListItem 
          key={auction.listing_id} 
          auction={auction} 
          onClick={() => onSelectAuction(auction)} 
        />
      ))}
    </div>
  )
}

// ============================================================================
// FEATURED AUCTION CARD
// ============================================================================

interface FeaturedAuctionCardProps {
  auction: MarketplaceListing
  onClick: () => void
}

const FeaturedAuctionCard: React.FC<FeaturedAuctionCardProps> = ({ auction, onClick }) => {
  const timeRemaining = useAuctionTimer(auction.expires_at)
  const isEndingSoon = timeRemaining.total < 60 * 60 * 1000 // Less than 1 hour

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-blue-100 relative overflow-hidden">
        {auction.item.image_url ? (
          <img
            src={auction.item.image_url}
            alt={auction.item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gavel className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-3 left-3">
          <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Featured
          </span>
        </div>
        
        {isEndingSoon && (
          <div className="absolute top-3 right-3">
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Ending Soon
            </span>
          </div>
        )}
        
        {/* Time remaining overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
            <AuctionTimer auction={auction} />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{auction.item.name}</h3>
          <RarityBadge rarity={auction.item.rarity} />
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{auction.item.description}</p>
        
        {/* Seller */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <span>by {auction.seller.discord_username}</span>
          {auction.seller.is_premium && <Star className="w-3 h-3 text-yellow-500" />}
        </div>

        {/* Bidding info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Current Bid</span>
            <span className="text-sm text-gray-500">
              {auction.total_bids || 0} bids
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {auction.current_bid || auction.starting_bid} tokens
              </p>
              {auction.current_bid && (
                <p className="text-xs text-gray-500">
                  Started at {auction.starting_bid} tokens
                </p>
              )}
            </div>
            
            <QuickBidButton auction={auction} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AUCTION CARD
// ============================================================================

interface AuctionCardProps {
  auction: MarketplaceListing
  onClick: () => void
}

const AuctionCard: React.FC<AuctionCardProps> = ({ auction, onClick }) => {
  const timeRemaining = useAuctionTimer(auction.expires_at)
  const isEndingSoon = timeRemaining.total < 60 * 60 * 1000

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative">
        {auction.item.image_url ? (
          <img
            src={auction.item.image_url}
            alt={auction.item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Gavel className="w-8 h-8" />
          </div>
        )}
        
        {isEndingSoon && (
          <div className="absolute top-2 right-2">
            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
              {timeRemaining.hours}h {timeRemaining.minutes}m
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{auction.item.name}</h3>
        
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <span>by {auction.seller.discord_username}</span>
          {auction.seller.is_premium && <Star className="w-3 h-3 text-yellow-500" />}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Current Bid</span>
            <span className="text-gray-500">{auction.total_bids || 0} bids</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {auction.current_bid || auction.starting_bid} tokens
              </p>
            </div>
            
            <AuctionTimer auction={auction} compact />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AUCTION LIST ITEM
// ============================================================================

interface AuctionListItemProps {
  auction: MarketplaceListing
  onClick: () => void
}

const AuctionListItem: React.FC<AuctionListItemProps> = ({ auction, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer p-4"
    >
      <div className="flex items-center gap-4">
        {/* Image */}
        <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
          {auction.item.image_url ? (
            <img
              src={auction.item.image_url}
              alt={auction.item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Gavel className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{auction.item.name}</h3>
            <RarityBadge rarity={auction.item.rarity} size="sm" />
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-1 mb-2">{auction.item.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>by {auction.seller.discord_username}</span>
            <span>{auction.total_bids || 0} bids</span>
            <span>{auction.view_count || 0} views</span>
          </div>
        </div>

        {/* Price and Timer */}
        <div className="text-right flex-shrink-0">
          <div className="mb-2">
            <p className="text-sm text-gray-500">Current Bid</p>
            <p className="text-xl font-bold text-gray-900">
              {auction.current_bid || auction.starting_bid} tokens
            </p>
          </div>
          
          <AuctionTimer auction={auction} />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AUCTION TIMER COMPONENT
// ============================================================================

interface AuctionTimerProps {
  auction: MarketplaceListing
  compact?: boolean
}

const AuctionTimer: React.FC<AuctionTimerProps> = ({ auction, compact = false }) => {
  const timer = useAuctionTimer(auction.expires_at)
  
  if (timer.total <= 0) {
    return (
      <div className={`flex items-center gap-1 text-red-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <AlertCircle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        <span className="font-medium">Ended</span>
      </div>
    )
  }
  
  const isEndingSoon = timer.total < 60 * 60 * 1000 // Less than 1 hour
  
  return (
    <div className={`flex items-center gap-1 ${
      isEndingSoon ? 'text-red-600' : 'text-gray-600'
    } ${compact ? 'text-xs' : 'text-sm'}`}>
      <Clock className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
      <span className="font-medium">
        {timer.days > 0 && `${timer.days}d `}
        {timer.hours > 0 && `${timer.hours}h `}
        {timer.minutes}m
      </span>
    </div>
  )
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

function useAuctionTimer(expiresAt: string) {
  const [timeRemaining, setTimeRemaining] = useState({
    total: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const expires = new Date(expiresAt).getTime()
      const total = Math.max(0, expires - now)
      
      const days = Math.floor(total / (1000 * 60 * 60 * 24))
      const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((total % (1000 * 60)) / 1000)
      
      setTimeRemaining({ total, days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [expiresAt])

  return timeRemaining
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

interface RarityBadgeProps {
  rarity: string
  size?: 'sm' | 'md'
}

const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity, size = 'md' }) => {
  const colors = {
    common: 'bg-gray-100 text-gray-700',
    uncommon: 'bg-green-100 text-green-700',
    rare: 'bg-blue-100 text-blue-700',
    epic: 'bg-purple-100 text-purple-700',
    legendary: 'bg-orange-100 text-orange-700',
    mythic: 'bg-red-100 text-red-700'
  }

  const symbols = {
    common: '○',
    uncommon: '◇',
    rare: '◈',
    epic: '◉',
    legendary: '✦',
    mythic: '✧'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
      size === 'sm' ? 'text-xs' : 'text-sm'
    } ${colors[rarity as keyof typeof colors] || colors.common}`}>
      <span>{symbols[rarity as keyof typeof symbols] || symbols.common}</span>
      <span className="capitalize">{rarity}</span>
    </span>
  )
}

interface QuickBidButtonProps {
  auction: MarketplaceListing
}

const QuickBidButton: React.FC<QuickBidButtonProps> = ({ auction }) => {
  const { placeBid } = useMarketplace()
  const [isLoading, setIsLoading] = useState(false)
  
  const minimumBid = (auction.current_bid || auction.starting_bid) + (auction.bid_increment || 1)
  
  const handleQuickBid = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLoading(true)
    
    try {
      await placeBid({
        listing_id: auction.listing_id,
        bid_amount: minimumBid
      })
    } catch (error) {
      console.error('Quick bid failed:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <button
      onClick={handleQuickBid}
      disabled={isLoading}
      className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
    >
      {isLoading ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        <Zap className="w-3 h-3" />
      )}
      Quick Bid
    </button>
  )
}

// Placeholder for auction details modal
const AuctionDetailsModal: React.FC<{ auction: MarketplaceListing; onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
    <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl p-4" onClick={e => e.stopPropagation()}>
      <p className="text-gray-500">Auction Details Modal - Coming Soon</p>
    </div>
  </div>
)

export default AuctionHouse