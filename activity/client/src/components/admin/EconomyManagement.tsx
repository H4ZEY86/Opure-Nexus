import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Zap,
  ShoppingCart,
  AlertTriangle,
  Eye,
  Edit,
  Plus,
  Minus,
  RefreshCw,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Calendar,
  Clock,
  Target,
  Award,
  X,
  Check,
  Settings,
  Coins,
  Package,
  ShoppingBag,
  Gavel
} from 'lucide-react'

interface TokenStats {
  totalSupply: number
  totalInCirculation: number
  dailyMinted: number
  dailyBurned: number
  avgBalance: number
  medianBalance: number
  inflationRate: number
  deflationRate: number
}

interface MarketplaceStats {
  totalListings: number
  activeListings: number
  totalSales: number
  dailySales: number
  avgPrice: number
  topSellers: any[]
  topBuyers: any[]
  categoryBreakdown: any[]
}

interface Transaction {
  transaction_id: string
  user_id: string
  username: string
  amount: number
  transaction_type: string
  source: string
  context_data: any
  quality_score?: number
  created_at: string
  status: string
}

interface MarketplaceListing {
  listing_id: string
  seller_id: string
  seller_username: string
  item_name: string
  category: string
  quantity: number
  price_tokens: number
  listing_type: string
  status: string
  created_at: string
  expires_at?: string
}

interface EconomyManagementProps {
  user: any
  permissions: string[]
  realTimeData: any
  onNotification: (notification: any) => void
}

const EconomyManagement: React.FC<EconomyManagementProps> = ({
  user,
  permissions,
  realTimeData,
  onNotification
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [showMintModal, setShowMintModal] = useState(false)
  const [showBurnModal, setShowBurnModal] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState<MarketplaceListing | null>(null)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'tokens', label: 'Token Economy', icon: Zap },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'rewards', label: 'Reward System', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  useEffect(() => {
    loadEconomyData()
  }, [selectedTimeRange])

  useEffect(() => {
    if (realTimeData.token_transaction) {
      handleNewTransaction(realTimeData.token_transaction)
    }
    if (realTimeData.marketplace_activity) {
      handleMarketplaceUpdate(realTimeData.marketplace_activity)
    }
  }, [realTimeData])

  const loadEconomyData = async () => {
    setLoading(true)
    try {
      const [tokenResponse, marketplaceResponse, transactionsResponse, listingsResponse] = await Promise.all([
        fetch(`/api/admin/economy/tokens/stats?timeRange=${selectedTimeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }),
        fetch(`/api/admin/economy/marketplace/stats?timeRange=${selectedTimeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }),
        fetch(`/api/admin/economy/transactions?limit=100&timeRange=${selectedTimeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }),
        fetch(`/api/admin/economy/marketplace/listings?limit=100`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        })
      ])

      if (tokenResponse.ok) {
        const data = await tokenResponse.json()
        setTokenStats(data)
      }

      if (marketplaceResponse.ok) {
        const data = await marketplaceResponse.json()
        setMarketplaceStats(data)
      }

      if (transactionsResponse.ok) {
        const data = await transactionsResponse.json()
        setTransactions(data.transactions)
      }

      if (listingsResponse.ok) {
        const data = await listingsResponse.json()
        setListings(data.listings)
      }
    } catch (error) {
      console.error('Failed to load economy data:', error)
      onNotification({
        title: 'Error',
        message: 'Failed to load economy data',
        priority: 'high',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev.slice(0, 99)])
    // Update token stats if needed
    if (tokenStats) {
      setTokenStats(prev => ({
        ...prev!,
        totalInCirculation: prev!.totalInCirculation + transaction.amount
      }))
    }
  }

  const handleMarketplaceUpdate = (update: any) => {
    if (update.type === 'listing_created') {
      setListings(prev => [update.listing, ...prev])
    } else if (update.type === 'listing_sold') {
      setListings(prev => prev.map(l => 
        l.listing_id === update.listing_id 
          ? { ...l, status: 'sold' }
          : l
      ))
    }
  }

  const performTokenAction = async (action: 'mint' | 'burn', data: any) => {
    try {
      const response = await fetch(`/api/admin/economy/tokens/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        await loadEconomyData()
        onNotification({
          title: `Token ${action.charAt(0).toUpperCase() + action.slice(1)} Complete`,
          message: `Successfully ${action}ed ${data.amount} tokens`,
          priority: 'medium',
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error(`Token ${action} failed:`, error)
      onNotification({
        title: `Token ${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        message: `Failed to ${action} tokens`,
        priority: 'high',
        timestamp: new Date().toISOString()
      })
    }
  }

  const adjustMarketplacePrice = async (listingId: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/admin/economy/marketplace/listings/${listingId}/price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ price: newPrice })
      })

      if (response.ok) {
        setListings(prev => prev.map(l => 
          l.listing_id === listingId 
            ? { ...l, price_tokens: newPrice }
            : l
        ))
        onNotification({
          title: 'Price Adjusted',
          message: `Listing price updated to ${newPrice} tokens`,
          priority: 'medium',
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Price adjustment failed:', error)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earn': return 'text-green-400'
      case 'spend': return 'text-red-400'
      case 'transfer': return 'text-blue-400'
      case 'admin': return 'text-purple-400'
      default: return 'text-white'
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Economy Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Total Supply</p>
              <p className="text-2xl font-bold text-white">{formatNumber(tokenStats?.totalSupply || 0)}</p>
              <p className="text-blue-400 text-xs mt-1">
                {formatNumber(tokenStats?.totalInCirculation || 0)} in circulation
              </p>
            </div>
            <Coins className="w-8 h-8 text-yellow-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Daily Activity</p>
              <p className="text-2xl font-bold text-white">
                +{formatNumber(tokenStats?.dailyMinted || 0)}
              </p>
              <p className="text-red-400 text-xs mt-1">
                -{formatNumber(tokenStats?.dailyBurned || 0)} burned
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Marketplace</p>
              <p className="text-2xl font-bold text-white">{marketplaceStats?.activeListings || 0}</p>
              <p className="text-purple-400 text-xs mt-1">
                {marketplaceStats?.dailySales || 0} sales today
              </p>
            </div>
            <ShoppingBag className="w-8 h-8 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Avg Price</p>
              <p className="text-2xl font-bold text-white">{marketplaceStats?.avgPrice || 0}</p>
              <p className="text-orange-400 text-xs mt-1">
                {((tokenStats?.inflationRate || 0) * 100).toFixed(1)}% inflation
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400" />
          </div>
        </motion.div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-bold text-white mb-4">Token Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Average Balance</span>
              <span className="text-white font-medium">{formatNumber(tokenStats?.avgBalance || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Median Balance</span>
              <span className="text-white font-medium">{formatNumber(tokenStats?.medianBalance || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Inflation Rate</span>
              <span className={`font-medium ${(tokenStats?.inflationRate || 0) > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                {((tokenStats?.inflationRate || 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Deflation Rate</span>
              <span className="text-blue-400 font-medium">
                {((tokenStats?.deflationRate || 0) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-bold text-white mb-4">Top Marketplace Activity</h3>
          <div className="space-y-3">
            {marketplaceStats?.topSellers?.slice(0, 5).map((seller, index) => (
              <div key={seller.user_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="text-white font-medium">{seller.username}</span>
                </div>
                <span className="text-green-400 font-medium">{formatNumber(seller.total_sales)} tokens</span>
              </div>
            )) || (
              <p className="text-white/60 text-center py-4">No marketplace activity yet</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
      >
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowMintModal(true)}
            className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
          >
            <Plus className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-medium">Mint Tokens</span>
          </button>
          <button
            onClick={() => setShowBurnModal(true)}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
          >
            <Minus className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Burn Tokens</span>
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">Manage Market</span>
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors"
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">Adjust Rewards</span>
          </button>
        </div>
      </motion.div>
    </div>
  )

  const renderTransactions = () => (
    <div className="space-y-6">
      {/* Transaction Controls */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="all" className="bg-gray-800">All Types</option>
              <option value="earn" className="bg-gray-800">Earned</option>
              <option value="spend" className="bg-gray-800">Spent</option>
              <option value="transfer" className="bg-gray-800">Transfers</option>
              <option value="admin" className="bg-gray-800">Admin</option>
            </select>

            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="1d" className="bg-gray-800">Last 24 Hours</option>
              <option value="7d" className="bg-gray-800">Last 7 Days</option>
              <option value="30d" className="bg-gray-800">Last 30 Days</option>
              <option value="90d" className="bg-gray-800">Last 3 Months</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                // Export transactions
                const csv = transactions.map(t => 
                  `${t.created_at},${t.username},${t.amount},${t.transaction_type},${t.source},${t.status}`
                ).join('\n')
                const blob = new Blob([`Date,User,Amount,Type,Source,Status\n${csv}`], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
                a.click()
              }}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={loadEconomyData}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-white font-medium">Date</th>
                <th className="px-6 py-4 text-left text-white font-medium">User</th>
                <th className="px-6 py-4 text-left text-white font-medium">Amount</th>
                <th className="px-6 py-4 text-left text-white font-medium">Type</th>
                <th className="px-6 py-4 text-left text-white font-medium">Source</th>
                <th className="px-6 py-4 text-left text-white font-medium">Quality</th>
                <th className="px-6 py-4 text-left text-white font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {transactions
                .filter(t => 
                  (filterType === 'all' || t.transaction_type === filterType) &&
                  (searchTerm === '' || t.username.toLowerCase().includes(searchTerm.toLowerCase()) || t.user_id.includes(searchTerm))
                )
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((transaction) => (
                  <tr key={transaction.transaction_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white/80 text-sm">
                      {new Date(transaction.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{transaction.username}</p>
                        <p className="text-white/60 text-xs">{transaction.user_id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${getTransactionColor(transaction.transaction_type)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.transaction_type === 'earn' ? 'bg-green-500/20 text-green-400' :
                        transaction.transaction_type === 'spend' ? 'bg-red-500/20 text-red-400' :
                        transaction.transaction_type === 'transfer' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {transaction.transaction_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/80 text-sm">
                      {transaction.source}
                    </td>
                    <td className="px-6 py-4">
                      {transaction.quality_score && (
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            transaction.quality_score >= 0.8 ? 'bg-green-400' :
                            transaction.quality_score >= 0.6 ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`} />
                          <span className="text-white/80 text-sm">
                            {(transaction.quality_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {transaction.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderMarketplace = () => (
    <div className="space-y-6">
      {/* Marketplace Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Active Listings</p>
              <p className="text-2xl font-bold text-white">{marketplaceStats?.activeListings || 0}</p>
              <p className="text-blue-400 text-xs mt-1">
                {marketplaceStats?.totalListings || 0} total
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Daily Sales</p>
              <p className="text-2xl font-bold text-white">{marketplaceStats?.dailySales || 0}</p>
              <p className="text-green-400 text-xs mt-1">
                {marketplaceStats?.totalSales || 0} total sales
              </p>
            </div>
            <Gavel className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Average Price</p>
              <p className="text-2xl font-bold text-white">{marketplaceStats?.avgPrice || 0}</p>
              <p className="text-purple-400 text-xs mt-1">tokens per item</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-400" />
          </div>
        </motion.div>
      </div>

      {/* Marketplace Listings */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Recent Listings</h3>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
              >
                <option value="all" className="bg-gray-800">All Status</option>
                <option value="active" className="bg-gray-800">Active</option>
                <option value="sold" className="bg-gray-800">Sold</option>
                <option value="expired" className="bg-gray-800">Expired</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-white font-medium">Item</th>
                <th className="px-6 py-4 text-left text-white font-medium">Seller</th>
                <th className="px-6 py-4 text-left text-white font-medium">Price</th>
                <th className="px-6 py-4 text-left text-white font-medium">Type</th>
                <th className="px-6 py-4 text-left text-white font-medium">Status</th>
                <th className="px-6 py-4 text-left text-white font-medium">Listed</th>
                <th className="px-6 py-4 text-left text-white font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {listings
                .filter(l => filterType === 'all' || l.status === filterType)
                .slice(0, 20)
                .map((listing) => (
                  <tr key={listing.listing_id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{listing.item_name}</p>
                        <p className="text-white/60 text-sm">{listing.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{listing.seller_username}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-bold">{listing.price_tokens.toLocaleString()}</p>
                        <p className="text-white/60 text-xs">
                          {listing.quantity > 1 && `×${listing.quantity}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        listing.listing_type === 'sale' ? 'bg-blue-500/20 text-blue-400' :
                        listing.listing_type === 'auction' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {listing.listing_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        listing.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        listing.status === 'sold' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {listing.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/80 text-sm">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowPriceModal(listing)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                          title="Adjust Price"
                        >
                          <Edit className="w-4 h-4 text-white" />
                        </button>
                        <button
                          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                          title="Remove Listing"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-white font-medium">Loading economy data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedTimeRange}
          onChange={(e) => setSelectedTimeRange(e.target.value)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
        >
          <option value="1d" className="bg-gray-800">Last 24 Hours</option>
          <option value="7d" className="bg-gray-800">Last 7 Days</option>
          <option value="30d" className="bg-gray-800">Last 30 Days</option>
          <option value="90d" className="bg-gray-800">Last 3 Months</option>
        </select>
      </div>

      {/* Sub Navigation */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
        <div className="flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'marketplace' && renderMarketplace()}
          {activeTab === 'tokens' && (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Token Management</h3>
              <p className="text-white/60">Advanced token economy controls coming soon.</p>
            </div>
          )}
          {activeTab === 'rewards' && (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Reward System</h3>
              <p className="text-white/60">Reward management interface under development.</p>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Economy Settings</h3>
              <p className="text-white/60">Configuration panel coming soon.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Mint Tokens Modal */}
      <AnimatePresence>
        {showMintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowMintModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Mint Tokens</h2>
                  <button
                    onClick={() => setShowMintModal(false)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Amount to Mint
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      defaultValue="1000"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
                      id="mintAmount"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Reason
                    </label>
                    <input
                      type="text"
                      placeholder="Event reward, system maintenance, etc."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
                      id="mintReason"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowMintModal(false)}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const amount = parseInt((document.getElementById('mintAmount') as HTMLInputElement).value)
                        const reason = (document.getElementById('mintReason') as HTMLInputElement).value
                        performTokenAction('mint', { amount, reason })
                        setShowMintModal(false)
                      }}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Mint Tokens
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price Adjustment Modal */}
      <AnimatePresence>
        {showPriceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPriceModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Adjust Price</h2>
                  <button
                    onClick={() => setShowPriceModal(null)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-white font-medium">{showPriceModal.item_name}</p>
                    <p className="text-white/60 text-sm">Current price: {showPriceModal.price_tokens.toLocaleString()} tokens</p>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      New Price
                    </label>
                    <input
                      type="number"
                      min="1"
                      defaultValue={showPriceModal.price_tokens}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
                      id="newPrice"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowPriceModal(null)}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const newPrice = parseInt((document.getElementById('newPrice') as HTMLInputElement).value)
                        adjustMarketplacePrice(showPriceModal.listing_id, newPrice)
                        setShowPriceModal(null)
                      }}
                      className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium"
                    >
                      <Edit className="w-4 h-4 inline mr-2" />
                      Update Price
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EconomyManagement