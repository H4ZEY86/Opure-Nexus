// ============================================================================
// OPURE DISCORD ACTIVITY - MARKETPLACE ANALYTICS DASHBOARD
// ============================================================================
// Comprehensive analytics and performance tracking for marketplace
// Features: Real-time metrics, trend analysis, user insights, revenue tracking
// Business intelligence for marketplace optimization and growth
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import { MarketplaceAnalytics as AnalyticsType } from '../../types/marketplace'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Clock, 
  Star, 
  Target, 
  Activity, 
  PieChart, 
  LineChart,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  MousePointer,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Crown,
  Heart,
  MessageCircle,
  Share2,
  Trophy,
  Flame,
  Globe,
  Smartphone,
  Monitor,
  ChevronRight,
  ChevronDown,
  ExternalLink
} from 'lucide-react'

// ============================================================================
// MAIN ANALYTICS DASHBOARD
// ============================================================================

interface MarketplaceAnalyticsProps {
  className?: string
}

const MarketplaceAnalytics: React.FC<MarketplaceAnalyticsProps> = ({ className }) => {
  const { state } = useMarketplace()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsType | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'users' | 'items' | 'trends'>('overview')

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/marketplace/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data.data)
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const timeRangeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sales', label: 'Sales', icon: DollarSign },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'items', label: 'Items', icon: ShoppingBag },
    { id: 'trends', label: 'Trends', icon: TrendingUp }
  ]

  return (
    <div className={`min-h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Marketplace Analytics
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor performance, track trends, and optimize your marketplace
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={loadAnalyticsData}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && !analyticsData ? (
          <AnalyticsLoadingState />
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={analyticsData} timeRange={timeRange} />}
            {activeTab === 'sales' && <SalesTab data={analyticsData} timeRange={timeRange} />}
            {activeTab === 'users' && <UsersTab data={analyticsData} timeRange={timeRange} />}
            {activeTab === 'items' && <ItemsTab data={analyticsData} timeRange={timeRange} />}
            {activeTab === 'trends' && <TrendsTab data={analyticsData} timeRange={timeRange} />}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

interface OverviewTabProps {
  data: AnalyticsType | null
  timeRange: string
}

const OverviewTab: React.FC<OverviewTabProps> = ({ data, timeRange }) => {
  const keyMetrics = [
    {
      label: 'Total Sales',
      value: data?.user_stats.total_sales || 0,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      label: 'Active Users',
      value: '2,847',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      label: 'Total Listings',
      value: '1,234',
      change: '+5.7%',
      trend: 'up',
      icon: ShoppingBag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      label: 'Avg Session',
      value: '8m 32s',
      change: '-2.1%',
      trend: 'down',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon
          
          return (
            <div key={index} className={`bg-white rounded-lg border ${metric.borderColor} p-6`}>
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                
                <div className={`flex items-center gap-1 text-sm ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.trend === 'up' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {metric.change}
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-sm text-gray-600">{metric.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              Revenue
            </div>
          </div>
          
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <LineChart className="w-12 h-12 mx-auto mb-2" />
              <p>Revenue chart visualization</p>
              <p className="text-sm">Integration with charting library needed</p>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Category Distribution</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {[
              { name: 'Collectibles', value: 45, color: 'bg-purple-500' },
              { name: 'Boosts', value: 28, color: 'bg-yellow-500' },
              { name: 'Cosmetics', value: 18, color: 'bg-pink-500' },
              { name: 'Premium', value: 9, color: 'bg-blue-500' }
            ].map((category, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                <span className="flex-1 text-sm text-gray-700">{category.name}</span>
                <span className="text-sm font-medium text-gray-900">{category.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <RecentActivityFeed />
      </div>
    </div>
  )
}

// ============================================================================
// SALES TAB
// ============================================================================

interface SalesTabProps {
  data: AnalyticsType | null
  timeRange: string
}

const SalesTab: React.FC<SalesTabProps> = ({ data, timeRange }) => {
  const salesMetrics = [
    {
      label: 'Total Revenue',
      value: `${(data?.user_stats.total_earned || 0).toLocaleString()} tokens`,
      change: '+15.3%',
      icon: DollarSign
    },
    {
      label: 'Transactions',
      value: data?.user_stats.total_sales || 0,
      change: '+12.1%',
      icon: Activity
    },
    {
      label: 'Avg Order Value',
      value: '1,247 tokens',
      change: '+3.2%',
      icon: Target
    },
    {
      label: 'Conversion Rate',
      value: '3.8%',
      change: '+0.5%',
      icon: TrendingUp
    }
  ]

  return (
    <div className="space-y-6">
      {/* Sales Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {salesMetrics.map((metric, index) => {
          const Icon = metric.icon
          
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
              </div>
              
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  {metric.change}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sales Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Performance</h3>
          <div className="h-80 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2" />
              <p>Sales performance chart</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sellers</h3>
          <TopSellersWidget />
        </div>
      </div>

      {/* Sales Details Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
        </div>
        <SalesTable />
      </div>
    </div>
  )
}

// ============================================================================
// USERS TAB
// ============================================================================

interface UsersTabProps {
  data: AnalyticsType | null
  timeRange: string
}

const UsersTab: React.FC<UsersTabProps> = ({ data, timeRange }) => {
  return (
    <div className="space-y-6">
      {/* User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: '12,847', change: '+18.2%', icon: Users },
          { label: 'New Users', value: '342', change: '+24.1%', icon: UserPlus },
          { label: 'Active Today', value: '2,891', change: '+5.3%', icon: Activity },
          { label: 'Retention Rate', value: '68.4%', change: '+2.1%', icon: Heart }
        ].map((metric, index) => {
          const Icon = metric.icon
          
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
              </div>
              
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  {metric.change}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* User Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2" />
              <p>User growth chart</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <div className="space-y-4">
            {[
              { device: 'Desktop', percentage: 65, icon: Monitor },
              { device: 'Mobile', percentage: 32, icon: Smartphone },
              { device: 'Tablet', percentage: 3, icon: Globe }
            ].map((item, index) => {
              const Icon = item.icon
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="flex-1 text-sm text-gray-700">{item.device}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const AnalyticsLoadingState: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="h-8 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map(i => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const RecentActivityFeed: React.FC = () => {
  const activities = [
    { type: 'sale', user: 'user123', item: 'Legendary Sword', amount: 1500, time: '2 min ago' },
    { type: 'listing', user: 'trader456', item: 'Magic Potion', amount: 250, time: '5 min ago' },
    { type: 'bid', user: 'collector789', item: 'Rare Shield', amount: 800, time: '8 min ago' }
  ]

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            {activity.type === 'sale' && <DollarSign className="w-4 h-4 text-blue-600" />}
            {activity.type === 'listing' && <ShoppingBag className="w-4 h-4 text-blue-600" />}
            {activity.type === 'bid' && <Target className="w-4 h-4 text-blue-600" />}
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{activity.user}</span>
              {activity.type === 'sale' && ' purchased '}
              {activity.type === 'listing' && ' listed '}
              {activity.type === 'bid' && ' bid on '}
              <span className="font-medium">{activity.item}</span>
            </p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
          
          <div className="text-sm font-medium text-gray-900">
            {activity.amount} tokens
          </div>
        </div>
      ))}
    </div>
  )
}

const TopSellersWidget: React.FC = () => (
  <div className="space-y-3">
    {[
      { rank: 1, user: 'PowerTrader', sales: 847, revenue: 125000 },
      { rank: 2, user: 'MarketKing', sales: 623, revenue: 98500 },
      { rank: 3, user: 'ItemMaster', sales: 445, revenue: 76200 }
    ].map((seller) => (
      <div key={seller.rank} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-bold text-yellow-700">
          {seller.rank}
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{seller.user}</p>
          <p className="text-xs text-gray-500">{seller.sales} sales</p>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {seller.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">tokens</p>
        </div>
      </div>
    ))}
  </div>
)

const SalesTable: React.FC = () => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Item
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Buyer
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Amount
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Date
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {[
          { item: 'Legendary Sword', buyer: 'warrior123', amount: 1500, date: '2 hours ago' },
          { item: 'Magic Boots', buyer: 'speedster', amount: 800, date: '4 hours ago' },
          { item: 'Healing Potion', buyer: 'healer99', amount: 150, date: '6 hours ago' }
        ].map((sale, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {sale.item}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {sale.buyer}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {sale.amount} tokens
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {sale.date}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// Placeholder components for missing tabs
const ItemsTab: React.FC<{ data: any; timeRange: string }> = () => (
  <div className="text-center py-12">
    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    <p className="text-gray-500">Items analytics coming soon</p>
  </div>
)

const TrendsTab: React.FC<{ data: any; timeRange: string }> = () => (
  <div className="text-center py-12">
    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    <p className="text-gray-500">Trends analysis coming soon</p>
  </div>
)

// Missing icon placeholder
const UserPlus = Users // Using Users as placeholder

export default MarketplaceAnalytics