// ============================================================================
// OPURE DISCORD ACTIVITY - TOKEN ECONOMY SYSTEM
// ============================================================================
// Comprehensive token economy with earning, spending, and reward loops
// Features: Daily rewards, achievement bonuses, marketplace economy, 
// social engagement rewards, premium benefits, and anti-inflation mechanics
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useDiscord } from '../../hooks/useDiscord'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import { 
  Coins, 
  TrendingUp, 
  Gift, 
  Star, 
  Crown, 
  Zap, 
  Target, 
  Calendar, 
  Clock, 
  Trophy, 
  Heart, 
  Users, 
  ShoppingBag, 
  Flame, 
  Award,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle,
  Lock,
  Unlock,
  DollarSign,
  PiggyBank,
  Wallet,
  CreditCard,
  Sparkles,
  Gamepad2,
  MessageCircle,
  Eye,
  ThumbsUp,
  Share2,
  ChevronRight,
  Info,
  AlertCircle,
  ExternalLink
} from 'lucide-react'

// ============================================================================
// TOKEN BALANCE DISPLAY
// ============================================================================

interface TokenBalanceDisplayProps {
  showDetails?: boolean
  showEarningOpportunities?: boolean
  className?: string
}

const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({
  showDetails = false,
  showEarningOpportunities = false,
  className
}) => {
  const { user } = useDiscord()
  const [balance, setBalance] = useState<number>(0)
  const [balanceHistory, setBalanceHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    if (user) {
      loadTokenBalance()
    }
  }, [user])

  const loadTokenBalance = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/tokens', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBalance(data.data.balance || 0)
        setBalanceHistory(data.data.recent_transactions || [])
      }
    } catch (error) {
      console.error('Failed to load token balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTokens = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`
    return amount.toLocaleString()
  }

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white bg-opacity-20 rounded w-24 mb-2" />
          <div className="h-8 bg-white bg-opacity-20 rounded w-32" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-100 mb-1">Your Balance</p>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-300" />
            <span className="text-2xl font-bold">{formatTokens(balance)}</span>
            <span className="text-blue-100 text-sm">tokens</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
          
          <button
            onClick={loadTokenBalance}
            className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Balance Breakdown */}
      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-white border-opacity-20">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-100">Today's Earnings</p>
              <p className="text-lg font-semibold text-green-300">+{formatTokens(125)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-100">Weekly Total</p>
              <p className="text-lg font-semibold text-yellow-300">{formatTokens(980)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {showDetails && balanceHistory.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-blue-100 font-medium">Recent Activity</p>
          {balanceHistory.slice(0, 3).map((transaction, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-blue-100">{transaction.description}</span>
              <span className={`font-medium ${
                transaction.amount > 0 ? 'text-green-300' : 'text-red-300'
              }`}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Earning Opportunities */}
      {showEarningOpportunities && (
        <div className="mt-4">
          <EarningOpportunities />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EARNING OPPORTUNITIES COMPONENT
// ============================================================================

const EarningOpportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEarningOpportunities()
  }, [])

  const loadEarningOpportunities = async () => {
    try {
      const response = await fetch('/api/user/earning-opportunities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load earning opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  const earnTokens = async (opportunityId: string) => {
    try {
      const response = await fetch('/api/user/claim-tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ opportunity_id: opportunityId })
      })
      
      if (response.ok) {
        loadEarningOpportunities() // Refresh opportunities
      }
    } catch (error) {
      console.error('Failed to claim tokens:', error)
    }
  }

  if (loading) {
    return <div className="text-center text-blue-100">Loading opportunities...</div>
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-blue-100 font-medium flex items-center gap-1">
        <Sparkles className="w-4 h-4" />
        Quick Earnings
      </p>
      
      {opportunities.length === 0 ? (
        <p className="text-xs text-blue-200">Check back later for new opportunities!</p>
      ) : (
        <div className="space-y-2">
          {opportunities.slice(0, 3).map((opportunity) => (
            <button
              key={opportunity.id}
              onClick={() => earnTokens(opportunity.id)}
              className="w-full flex items-center justify-between bg-white bg-opacity-10 rounded-lg p-2 hover:bg-opacity-20 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <div className="text-lg">{opportunity.icon}</div>
                <div>
                  <p className="text-sm font-medium text-white">{opportunity.title}</p>
                  <p className="text-xs text-blue-200">{opportunity.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-yellow-300">
                <span className="text-sm font-bold">+{opportunity.reward}</span>
                <Coins className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// DAILY REWARDS SYSTEM
// ============================================================================

interface DailyRewardsProps {
  isOpen: boolean
  onClose: () => void
}

const DailyRewards: React.FC<DailyRewardsProps> = ({ isOpen, onClose }) => {
  const [dailyReward, setDailyReward] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [canClaim, setCanClaim] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadDailyReward()
    }
  }, [isOpen])

  const loadDailyReward = async () => {
    try {
      const response = await fetch('/api/user/daily-reward', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDailyReward(data.data)
        setStreak(data.data.current_streak || 0)
        setCanClaim(data.data.can_claim || false)
      }
    } catch (error) {
      console.error('Failed to load daily reward:', error)
    } finally {
      setLoading(false)
    }
  }

  const claimDailyReward = async () => {
    try {
      setClaiming(true)
      const response = await fetch('/api/user/claim-daily-reward', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDailyReward(data.data)
        setCanClaim(false)
        setStreak(data.data.current_streak || 0)
      }
    } catch (error) {
      console.error('Failed to claim daily reward:', error)
    } finally {
      setClaiming(false)
    }
  }

  if (!isOpen) return null

  const getStreakBonus = (day: number) => {
    const baseReward = 50
    if (day >= 7) return baseReward * 3 // Triple for weekly
    if (day >= 3) return baseReward * 2 // Double for 3+ days
    return baseReward
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 text-center">
          <Gift className="w-12 h-12 mx-auto mb-2" />
          <h2 className="text-xl font-bold">Daily Rewards</h2>
          <p className="text-sm text-yellow-100">
            Current Streak: {streak} days
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p>Loading your daily reward...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Today's Reward */}
              <div className="text-center">
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                  canClaim 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Coins className="w-10 h-10" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2">
                  {canClaim ? "Today's Reward Ready!" : "Come Back Tomorrow!"}
                </h3>
                
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  +{getStreakBonus(streak + 1)} tokens
                </div>
                
                {streak >= 2 && (
                  <p className="text-sm text-green-600 font-medium">
                    Streak Bonus Active! 🔥
                  </p>
                )}
              </div>

              {/* Streak Calendar */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Weekly Progress</h4>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const isCompleted = day <= streak
                    const isToday = day === streak + 1 && canClaim
                    
                    return (
                      <div
                        key={day}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
                          isCompleted 
                            ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                            : isToday
                            ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300 animate-pulse'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <div className="font-bold">Day {day}</div>
                        <div>{getStreakBonus(day)}</div>
                        {isCompleted && <CheckCircle className="w-3 h-3 mt-1" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Claim Button */}
              <button
                onClick={claimDailyReward}
                disabled={!canClaim || claiming}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  canClaim && !claiming
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {claiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Claiming...
                  </span>
                ) : canClaim ? (
                  'Claim Daily Reward'
                ) : (
                  'Already Claimed Today'
                )}
              </button>

              {/* Next Reward Preview */}
              {!canClaim && (
                <div className="text-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mx-auto mb-1" />
                  <p>Next reward in {24 - new Date().getHours()} hours</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TOKEN SPENDING HUB
// ============================================================================

interface TokenSpendingHubProps {
  className?: string
}

const TokenSpendingHub: React.FC<TokenSpendingHubProps> = ({ className }) => {
  const [spendingCategories, setSpendingCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSpendingOptions()
  }, [])

  const loadSpendingOptions = async () => {
    try {
      const response = await fetch('/api/marketplace/spending-options', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSpendingCategories(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load spending options:', error)
    } finally {
      setLoading(false)
    }
  }

  const spendingOptions = [
    {
      id: 'marketplace',
      title: 'Marketplace',
      description: 'Buy items, bid on auctions, and trade with others',
      icon: <ShoppingBag className="w-6 h-6" />,
      color: 'from-blue-500 to-purple-600',
      buttonText: 'Browse Items'
    },
    {
      id: 'premium',
      title: 'Premium Features',
      description: 'Unlock exclusive perks and enhanced functionality',
      icon: <Crown className="w-6 h-6" />,
      color: 'from-yellow-400 to-orange-500',
      buttonText: 'Go Premium'
    },
    {
      id: 'cosmetics',
      title: 'Cosmetics & Boosts',
      description: 'Customize your profile and boost your earnings',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'from-pink-500 to-purple-600',
      buttonText: 'View Collection'
    },
    {
      id: 'games',
      title: 'Game Enhancements',
      description: 'Power-ups, characters, and game improvements',
      icon: <Gamepad2 className="w-6 h-6" />,
      color: 'from-green-500 to-blue-600',
      buttonText: 'Enhance Games'
    }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Spend Your Tokens</h2>
        <button 
          onClick={loadSpendingOptions}
          disabled={loading}
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {spendingOptions.map((option) => (
          <div
            key={option.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`bg-gradient-to-r ${option.color} p-4 text-white`}>
              <div className="flex items-center gap-3">
                {option.icon}
                <h3 className="text-lg font-semibold">{option.title}</h3>
              </div>
            </div>
            
            <div className="p-4">
              <p className="text-gray-600 mb-4">{option.description}</p>
              
              <button className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors">
                {option.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Spending */}
      <RecentSpending />
    </div>
  )
}

// ============================================================================
// RECENT SPENDING COMPONENT
// ============================================================================

const RecentSpending: React.FC = () => {
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentSpending()
  }, [])

  const loadRecentSpending = async () => {
    try {
      const response = await fetch('/api/user/transactions?type=spend&limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRecentTransactions(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load recent spending:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-12 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Recent Spending</h3>
      
      {recentTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <PiggyBank className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No recent spending</p>
          <p className="text-sm">Start shopping to see your transactions here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentTransactions.map((transaction, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Minus className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600">
                  -{transaction.amount.toLocaleString()} tokens
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ECONOMY INSIGHTS COMPONENT
// ============================================================================

interface EconomyInsightsProps {
  className?: string
}

const EconomyInsights: React.FC<EconomyInsightsProps> = ({ className }) => {
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEconomyInsights()
  }, [])

  const loadEconomyInsights = async () => {
    try {
      const response = await fetch('/api/marketplace/economy-insights', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setInsights(data.data)
      }
    } catch (error) {
      console.error('Failed to load economy insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !insights) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        Economy Insights
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <ArrowUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-green-600">
            {insights.circulation_increase}%
          </div>
          <div className="text-xs text-gray-600">Token Circulation</div>
        </div>
        
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-blue-600">
            {insights.active_traders.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Active Traders</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <ShoppingBag className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-purple-600">
            {insights.daily_volume.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Daily Volume</div>
        </div>
        
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <Flame className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-yellow-600">
            {insights.hot_items}
          </div>
          <div className="text-xs text-gray-600">Trending Items</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Market Health</span>
          <span className={`font-medium ${
            insights.market_health > 80 ? 'text-green-600' : 
            insights.market_health > 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {insights.market_health}% Healthy
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              insights.market_health > 80 ? 'bg-green-500' : 
              insights.market_health > 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${insights.market_health}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TokenBalanceDisplay,
  DailyRewards,
  TokenSpendingHub,
  EconomyInsights,
  EarningOpportunities
}

export default TokenBalanceDisplay