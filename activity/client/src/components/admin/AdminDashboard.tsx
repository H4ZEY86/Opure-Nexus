import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  DollarSign, 
  Activity, 
  Shield, 
  Brain,
  MessageSquare,
  TrendingUp,
  Settings,
  AlertTriangle,
  BarChart3,
  Database,
  Zap,
  Globe,
  Lock,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Search,
  Bell
} from 'lucide-react'

// Import admin components
import UserManagement from './UserManagement'
import EconomyManagement from './EconomyManagement'
import GameSystemAdmin from './GameSystemAdmin'
import AIModelManagement from './AIModelManagement'
import DiscordIntegration from './DiscordIntegration'
import ContentModeration from './ContentModeration'
import AnalyticsDashboard from './AnalyticsDashboard'
import SystemMonitoring from './SystemMonitoring'
import AuditLogs from './AuditLogs'
import AdminSettings from './AdminSettings'

// Types
interface AdminStats {
  totalUsers: number
  activeUsers24h: number
  totalTokens: number
  dailyTokenTransactions: number
  totalGames: number
  activeGameSessions: number
  pendingReports: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  aiModelStatus: 'online' | 'offline' | 'maintenance'
  discordBotStatus: 'online' | 'offline'
}

interface AdminDashboardProps {
  user: any
  permissions: string[]
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, permissions }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [realTimeData, setRealTimeData] = useState<any>({})

  // Admin tabs configuration
  const adminTabs = useMemo(() => [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      permission: 'admin.overview',
      component: null // Special case for overview
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      permission: 'admin.users',
      component: UserManagement
    },
    {
      id: 'economy',
      label: 'Economy & Marketplace',
      icon: DollarSign,
      permission: 'admin.economy',
      component: EconomyManagement
    },
    {
      id: 'games',
      label: 'Gaming System',
      icon: Activity,
      permission: 'admin.games',
      component: GameSystemAdmin
    },
    {
      id: 'ai',
      label: 'AI Models',
      icon: Brain,
      permission: 'admin.ai',
      component: AIModelManagement
    },
    {
      id: 'discord',
      label: 'Discord Integration',
      icon: MessageSquare,
      permission: 'admin.discord',
      component: DiscordIntegration
    },
    {
      id: 'moderation',
      label: 'Content Moderation',
      icon: Shield,
      permission: 'admin.moderation',
      component: ContentModeration
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      permission: 'admin.analytics',
      component: AnalyticsDashboard
    },
    {
      id: 'monitoring',
      label: 'System Monitoring',
      icon: Globe,
      permission: 'admin.monitoring',
      component: SystemMonitoring
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: Eye,
      permission: 'admin.audit',
      component: AuditLogs
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      permission: 'admin.settings',
      component: AdminSettings
    }
  ], [])

  // Filter tabs based on permissions
  const availableTabs = useMemo(() => {
    return adminTabs.filter(tab => 
      permissions.includes(tab.permission) || permissions.includes('admin.all')
    )
  }, [adminTabs, permissions])

  // Load initial data
  useEffect(() => {
    loadAdminStats()
    loadNotifications()
    setupRealTimeUpdates()
  }, [])

  const loadAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const setupRealTimeUpdates = () => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/admin/ws`)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setRealTimeData(prev => ({ ...prev, [data.type]: data.payload }))
      
      // Update stats if needed
      if (data.type === 'stats_update') {
        setStats(prev => ({ ...prev, ...data.payload }))
      }
      
      // Add new notifications
      if (data.type === 'notification') {
        setNotifications(prev => [data.payload, ...prev.slice(0, 9)])
      }
    }

    return () => ws.close()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-400'
      case 'warning':
        return 'text-yellow-400'
      case 'critical':
      case 'offline':
        return 'text-red-400'
      case 'maintenance':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats?.totalUsers?.toLocaleString() || '0'}</p>
              <p className="text-green-400 text-xs mt-1">
                +{stats?.activeUsers24h || 0} active today
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
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
              <p className="text-white/60 text-sm font-medium">AI Tokens</p>
              <p className="text-2xl font-bold text-white">{stats?.totalTokens?.toLocaleString() || '0'}</p>
              <p className="text-blue-400 text-xs mt-1">
                {stats?.dailyTokenTransactions || 0} transactions today
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-400" />
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
              <p className="text-white/60 text-sm font-medium">Game Sessions</p>
              <p className="text-2xl font-bold text-white">{stats?.activeGameSessions || '0'}</p>
              <p className="text-indigo-400 text-xs mt-1">
                {stats?.totalGames || 0} games available
              </p>
            </div>
            <Activity className="w-8 h-8 text-indigo-400" />
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
              <p className="text-white/60 text-sm font-medium">System Health</p>
              <p className={`text-2xl font-bold ${getStatusColor(stats?.systemHealth || 'unknown')}`}>
                {stats?.systemHealth?.toUpperCase() || 'UNKNOWN'}
              </p>
              <p className="text-orange-400 text-xs mt-1">
                {stats?.pendingReports || 0} pending reports
              </p>
            </div>
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
        </motion.div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80">AI Models</span>
              <span className={`font-medium ${getStatusColor(stats?.aiModelStatus || 'unknown')}`}>
                {stats?.aiModelStatus?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Discord Bot</span>
              <span className={`font-medium ${getStatusColor(stats?.discordBotStatus || 'unknown')}`}>
                {stats?.discordBotStatus?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Database</span>
              <span className="font-medium text-green-400">HEALTHY</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">API Gateway</span>
              <span className="font-medium text-green-400">ONLINE</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Notifications
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    notification.priority === 'high' ? 'bg-red-400' :
                    notification.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {notification.title}
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      {notification.message}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/60 text-sm">No recent notifications</p>
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
            onClick={() => setActiveTab('users')}
            className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-white text-sm font-medium">Manage Users</span>
          </button>
          <button
            onClick={() => setActiveTab('economy')}
            className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-white text-sm font-medium">Economy Tools</span>
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Globe className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm font-medium">System Monitor</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-white text-sm font-medium">View Logs</span>
          </button>
        </div>
      </motion.div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20">
          <div className="flex items-center gap-4">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="text-white font-medium">Loading Admin Dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />

      <div className="relative z-10">
        {/* Admin Header */}
        <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">Administrator Access</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={loadAdminStats}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>

                <div className="flex items-center gap-3">
                  <img
                    src={user?.avatar || '/default-avatar.png'}
                    alt={user?.username || 'Admin'}
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                  />
                  <div className="hidden md:block">
                    <p className="text-white text-sm font-medium">{user?.username}</p>
                    <p className="text-white/60 text-xs">Administrator</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Navigation */}
        <nav className="backdrop-blur-xl bg-white/5 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto py-4">
              {availableTabs.map((tab) => {
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
        </nav>

        {/* Admin Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' ? (
                renderOverview()
              ) : (
                (() => {
                  const ActiveComponent = availableTabs.find(tab => tab.id === activeTab)?.component
                  return ActiveComponent ? (
                    <ActiveComponent 
                      user={user} 
                      permissions={permissions}
                      realTimeData={realTimeData}
                      onNotification={(notification: any) => {
                        setNotifications(prev => [notification, ...prev.slice(0, 9)])
                      }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Component Not Found</h3>
                      <p className="text-white/60">This admin section is under development.</p>
                    </div>
                  )
                })()
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard