// ============================================================================
// OPURE DISCORD ACTIVITY - USER REPUTATION SYSTEM
// ============================================================================
// Comprehensive reputation and social trust system for marketplace
// Features: Trust scores, reviews, badges, verification, social proof
// Designed to build marketplace confidence and prevent fraud
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import { useDiscord } from '../../hooks/useDiscord'
import { 
  UserReputation, 
  MarketplaceBadge, 
  MarketplaceListing,
  Trade
} from '../../types/marketplace'
import { 
  Star, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Trophy, 
  Award, 
  ThumbsUp, 
  ThumbsDown, 
  Heart, 
  Zap, 
  Crown, 
  Eye, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  Clock,
  Target,
  Flame,
  Gift,
  BadgeCheck,
  Verified,
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

// ============================================================================
// USER REPUTATION DISPLAY COMPONENT
// ============================================================================

interface UserReputationDisplayProps {
  userId: string
  username: string
  isPremium?: boolean
  reputation?: UserReputation
  showDetailed?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const UserReputationDisplay: React.FC<UserReputationDisplayProps> = ({
  userId,
  username,
  isPremium = false,
  reputation,
  showDetailed = false,
  size = 'md',
  className
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [reputationData, setReputationData] = useState<UserReputation | null>(reputation || null)
  const [loading, setLoading] = useState(!reputation)

  // Load reputation data if not provided
  useEffect(() => {
    if (!reputation && userId) {
      loadUserReputation()
    }
  }, [userId, reputation])

  const loadUserReputation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/marketplace/users/${userId}/reputation`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReputationData(data.data)
      }
    } catch (error) {
      console.error('Failed to load user reputation:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate trust level
  const trustLevel = useMemo(() => {
    if (!reputationData) return { level: 'new', color: 'text-gray-500', label: 'New User' }
    
    const score = reputationData.reputation_score
    
    if (score >= 1000) return { level: 'legendary', color: 'text-red-600', label: 'Legendary Trader' }
    if (score >= 500) return { level: 'expert', color: 'text-purple-600', label: 'Expert Trader' }
    if (score >= 250) return { level: 'trusted', color: 'text-blue-600', label: 'Trusted Trader' }
    if (score >= 100) return { level: 'verified', color: 'text-green-600', label: 'Verified Trader' }
    if (score >= 50) return { level: 'established', color: 'text-yellow-600', label: 'Established' }
    if (score >= 10) return { level: 'member', color: 'text-gray-600', label: 'Member' }
    
    return { level: 'new', color: 'text-gray-500', label: 'New User' }
  }, [reputationData])

  // Get trust icon
  const getTrustIcon = () => {
    switch (trustLevel.level) {
      case 'legendary': return <Crown className="w-4 h-4" />
      case 'expert': return <Trophy className="w-4 h-4" />
      case 'trusted': return <Shield className="w-4 h-4" />
      case 'verified': return <CheckCircle className="w-4 h-4" />
      case 'established': return <Star className="w-4 h-4" />
      case 'member': return <Users className="w-4 h-4" />
      default: return <Eye className="w-4 h-4" />
    }
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      text: 'text-xs',
      icon: 'w-3 h-3',
      badge: 'w-4 h-4',
      gap: 'gap-1',
      padding: 'px-1.5 py-0.5'
    },
    md: {
      text: 'text-sm',
      icon: 'w-4 h-4',
      badge: 'w-5 h-5',
      gap: 'gap-2',
      padding: 'px-2 py-1'
    },
    lg: {
      text: 'text-base',
      icon: 'w-5 h-5',
      badge: 'w-6 h-6',
      gap: 'gap-3',
      padding: 'px-3 py-2'
    }
  }

  const config = sizeConfig[size]

  if (loading) {
    return (
      <div className={`flex items-center ${config.gap} ${className}`}>
        <div className={`${config.icon} bg-gray-200 rounded animate-pulse`} />
        <div className={`h-4 bg-gray-200 rounded animate-pulse`} style={{ width: '80px' }} />
      </div>
    )
  }

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Username */}
      <span className={`font-medium ${config.text} text-gray-900`}>
        {username}
      </span>

      {/* Premium Badge */}
      {isPremium && (
        <div className="relative">
          <Star className={`${config.badge} text-yellow-500`} />
        </div>
      )}

      {/* Trust Level */}
      {reputationData && (
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className={`flex items-center gap-1 ${trustLevel.color}`}>
            {getTrustIcon()}
            {size !== 'sm' && (
              <span className={`font-medium ${config.text}`}>
                {reputationData.reputation_score}
              </span>
            )}
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap">
                <div className="font-medium">{trustLevel.label}</div>
                <div className="text-xs text-gray-300">
                  {reputationData.total_trades} trades • {reputationData.positive_reviews} positive
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                  <div className="border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification Badges */}
      {reputationData?.verification_status !== 'unverified' && (
        <div className="flex items-center gap-1">
          {reputationData?.verification_status === 'email' && (
            <CheckCircle className={`${config.icon} text-blue-500`} />
          )}
          {reputationData?.verification_status === 'phone' && (
            <BadgeCheck className={`${config.icon} text-green-500`} />
          )}
          {reputationData?.verification_status === 'kyc' && (
            <Verified className={`${config.icon} text-purple-500`} />
          )}
        </div>
      )}

      {/* Show detailed view */}
      {showDetailed && reputationData && (
        <button 
          className={`${config.text} text-blue-600 hover:text-blue-700 transition-colors`}
          onClick={() => {/* Open detailed reputation modal */}}
        >
          View Profile
        </button>
      )}
    </div>
  )
}

// ============================================================================
// DETAILED REPUTATION PROFILE
// ============================================================================

interface DetailedReputationProfileProps {
  userId: string
  isOpen: boolean
  onClose: () => void
}

const DetailedReputationProfile: React.FC<DetailedReputationProfileProps> = ({
  userId,
  isOpen,
  onClose
}) => {
  const [reputationData, setReputationData] = useState<UserReputation | null>(null)
  const [badges, setBadges] = useState<MarketplaceBadge[]>([])
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && userId) {
      loadDetailedProfile()
    }
  }, [isOpen, userId])

  const loadDetailedProfile = async () => {
    try {
      setLoading(true)
      
      const [reputationRes, badgesRes, tradesRes] = await Promise.all([
        fetch(`/api/marketplace/users/${userId}/reputation`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch(`/api/marketplace/users/${userId}/badges`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch(`/api/marketplace/users/${userId}/trades?limit=10`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
      ])

      if (reputationRes.ok) {
        const reputationData = await reputationRes.json()
        setReputationData(reputationData.data)
      }

      if (badgesRes.ok) {
        const badgesData = await badgesRes.json()
        setBadges(badgesData.data || [])
      }

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json()
        setRecentTrades(tradesData.data || [])
      }
    } catch (error) {
      console.error('Failed to load detailed profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Trader Profile</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              ×
            </button>
          </div>
          
          {reputationData && (
            <div className="mt-4">
              <UserReputationDisplay
                userId={userId}
                username={reputationData.user_id} // This should be the actual username
                reputation={reputationData}
                size="lg"
                className="text-white"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              {reputationData && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <ThumbsUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {reputationData.positive_reviews}
                    </div>
                    <div className="text-sm text-gray-600">Positive Reviews</div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {reputationData.total_trades}
                    </div>
                    <div className="text-sm text-gray-600">Total Trades</div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">
                      {Math.round(reputationData.response_time_avg / 60)}m
                    </div>
                    <div className="text-sm text-gray-600">Avg Response</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <Trophy className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {reputationData.reputation_score}
                    </div>
                    <div className="text-sm text-gray-600">Reputation</div>
                  </div>
                </div>
              )}

              {/* Badges */}
              {badges.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Achievements</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {badges.map((badge) => (
                      <div key={badge.badge_id} className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                          <img 
                            src={badge.icon_url} 
                            alt={badge.name}
                            className="w-6 h-6"
                          />
                        </div>
                        <div className="text-xs font-medium text-gray-900">{badge.name}</div>
                        <div className="text-xs text-gray-500">{badge.holders_count} holders</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Trades */}
              {recentTrades.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {recentTrades.slice(0, 5).map((trade) => (
                      <div key={trade.trade_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            trade.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Trade #{trade.trade_id.slice(0, 8)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(trade.initiated_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          {trade.total_value} tokens
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust Indicators */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Trust Indicators</h3>
                <div className="space-y-2">
                  <TrustIndicator
                    icon={<CheckCircle className="w-4 h-4" />}
                    label="Account Verified"
                    status={reputationData?.verification_status !== 'unverified'}
                    color="green"
                  />
                  <TrustIndicator
                    icon={<Shield className="w-4 h-4" />}
                    label="No Recent Disputes"
                    status={(reputationData?.negative_reviews || 0) === 0}
                    color="blue"
                  />
                  <TrustIndicator
                    icon={<Clock className="w-4 h-4" />}
                    label="Fast Response Time"
                    status={(reputationData?.response_time_avg || 0) < 300} // Less than 5 minutes
                    color="purple"
                  />
                  <TrustIndicator
                    icon={<Users className="w-4 h-4" />}
                    label="Active Trader"
                    status={(reputationData?.total_trades || 0) >= 10}
                    color="orange"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TRUST INDICATOR COMPONENT
// ============================================================================

interface TrustIndicatorProps {
  icon: React.ReactNode
  label: string
  status: boolean
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red'
}

const TrustIndicator: React.FC<TrustIndicatorProps> = ({ icon, label, status, color }) => {
  const colorClasses = {
    green: status ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50',
    blue: status ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50',
    purple: status ? 'text-purple-600 bg-purple-50' : 'text-gray-400 bg-gray-50',
    orange: status ? 'text-orange-600 bg-orange-50' : 'text-gray-400 bg-gray-50',
    red: status ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'
  }

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${colorClasses[color]}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {status ? (
        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-gray-400 ml-auto" />
      )}
    </div>
  )
}

// ============================================================================
// SELLER TRUST SCORE COMPONENT
// ============================================================================

interface SellerTrustScoreProps {
  listing: MarketplaceListing
  onViewProfile?: () => void
}

const SellerTrustScore: React.FC<SellerTrustScoreProps> = ({ listing, onViewProfile }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Seller Trust</span>
        {onViewProfile && (
          <button
            onClick={onViewProfile}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View Profile
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
      
      <UserReputationDisplay
        userId={listing.seller_id}
        username={listing.seller.discord_username}
        isPremium={listing.seller.is_premium}
        size="md"
        showDetailed={false}
      />
      
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          Fast shipping
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          Quick replies
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// MARKETPLACE REVIEWS COMPONENT
// ============================================================================

interface MarketplaceReviewsProps {
  userId: string
  className?: string
}

const MarketplaceReviews: React.FC<MarketplaceReviewsProps> = ({ userId, className }) => {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReviews()
  }, [userId])

  const loadReviews = async () => {
    try {
      const response = await fetch(`/api/marketplace/users/${userId}/reviews`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReviews(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">Recent Reviews</h3>
      
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, 5).map((review, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= review.rating ? 'fill-current' : ''}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {review.reviewer_username}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <p className="text-sm text-gray-700">{review.comment}</p>
              
              {review.trade_id && (
                <div className="mt-2 text-xs text-gray-500">
                  Trade #{review.trade_id.slice(0, 8)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  UserReputationDisplay,
  DetailedReputationProfile,
  SellerTrustScore,
  MarketplaceReviews,
  TrustIndicator
}

export default UserReputationDisplay