import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Ban,
  AlertTriangle,
  Gift,
  Eye,
  Download,
  UserPlus,
  UserMinus,
  Shield,
  Crown,
  Zap,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  Check,
  Mail,
  MessageSquare,
  Activity
} from 'lucide-react'

interface User {
  user_id: string
  username: string
  discriminator?: string
  avatar_hash?: string
  is_active: boolean
  is_premium: boolean
  premium_expires_at?: string
  created_at: string
  last_seen: string
  token_balance: number
  lifetime_earned: number
  lifetime_spent: number
  daily_streak: number
  achievements_count: number
  games_played: number
  total_playtime: number
  warnings: number
  is_banned: boolean
  ban_expires_at?: string
  roles: string[]
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  premiumUsers: number
  bannedUsers: number
  newUsersToday: number
  avgTokenBalance: number
  topSpenders: User[]
  recentActivity: any[]
}

interface UserManagementProps {
  user: any
  permissions: string[]
  realTimeData: any
  onNotification: (notification: any) => void
}

const UserManagement: React.FC<UserManagementProps> = ({ 
  user, 
  permissions, 
  realTimeData, 
  onNotification 
}) => {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('last_seen')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const [showUserModal, setShowUserModal] = useState<User | null>(null)
  const [showGiftModal, setShowGiftModal] = useState<User | null>(null)

  // Load users and stats
  useEffect(() => {
    loadUsers()
    loadUserStats()
  }, [])

  // Real-time updates
  useEffect(() => {
    if (realTimeData.user_activity) {
      updateUserActivity(realTimeData.user_activity)
    }
    if (realTimeData.user_registered) {
      handleNewUser(realTimeData.user_registered)
    }
  }, [realTimeData])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      onNotification({
        title: 'Error',
        message: 'Failed to load user data',
        priority: 'high',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load user stats:', error)
    }
  }

  const updateUserActivity = (activity: any) => {
    setUsers(prev => prev.map(u => 
      u.user_id === activity.user_id 
        ? { ...u, last_seen: activity.timestamp }
        : u
    ))
  }

  const handleNewUser = (newUser: User) => {
    setUsers(prev => [newUser, ...prev])
    setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers + 1 } : null)
    onNotification({
      title: 'New User Registered',
      message: `${newUser.username} joined the platform`,
      priority: 'low',
      timestamp: new Date().toISOString()
    })
  }

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.user_id.includes(searchTerm)
      
      const matchesFilter = (() => {
        switch (filterType) {
          case 'active': return user.is_active && !user.is_banned
          case 'premium': return user.is_premium
          case 'banned': return user.is_banned
          case 'new': return new Date(user.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          case 'inactive': return new Date(user.last_seen) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          default: return true
        }
      })()
      
      return matchesSearch && matchesFilter
    })

    // Sort users
    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy) {
        case 'username':
          aVal = a.username.toLowerCase()
          bVal = b.username.toLowerCase()
          break
        case 'created_at':
          aVal = new Date(a.created_at)
          bVal = new Date(b.created_at)
          break
        case 'last_seen':
          aVal = new Date(a.last_seen)
          bVal = new Date(b.last_seen)
          break
        case 'token_balance':
          aVal = a.token_balance
          bVal = b.token_balance
          break
        case 'achievements':
          aVal = a.achievements_count
          bVal = b.achievements_count
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [users, searchTerm, filterType, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ action, data })
      })

      if (response.ok) {
        await loadUsers()
        onNotification({
          title: 'Action Complete',
          message: `User action "${action}" completed successfully`,
          priority: 'medium',
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('User action failed:', error)
      onNotification({
        title: 'Action Failed',
        message: `Failed to perform action "${action}"`,
        priority: 'high',
        timestamp: new Date().toISOString()
      })
    }
  }

  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedUsers.length === 0) return

    try {
      const response = await fetch('/api/admin/users/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ 
          action, 
          userIds: selectedUsers, 
          data 
        })
      })

      if (response.ok) {
        await loadUsers()
        setSelectedUsers([])
        setShowBulkActions(false)
        onNotification({
          title: 'Bulk Action Complete',
          message: `Bulk action "${action}" applied to ${selectedUsers.length} users`,
          priority: 'medium',
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Bulk action failed:', error)
      onNotification({
        title: 'Bulk Action Failed',
        message: `Failed to perform bulk action "${action}"`,
        priority: 'high',
        timestamp: new Date().toISOString()
      })
    }
  }

  const exportUsers = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/admin/users/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return time.toLocaleDateString()
  }

  const getUserAvatar = (user: User) => {
    if (user.avatar_hash) {
      return `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar_hash}.png?size=64`
    }
    return '/default-avatar.png'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-white font-medium">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Statistics */}
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
                +{stats?.newUsersToday || 0} today
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
              <p className="text-white/60 text-sm font-medium">Active Users</p>
              <p className="text-2xl font-bold text-white">{stats?.activeUsers?.toLocaleString() || '0'}</p>
              <p className="text-blue-400 text-xs mt-1">
                {stats?.activeUsers && stats?.totalUsers ? 
                  Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% active
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
              <p className="text-white/60 text-sm font-medium">Premium Users</p>
              <p className="text-2xl font-bold text-white">{stats?.premiumUsers?.toLocaleString() || '0'}</p>
              <p className="text-yellow-400 text-xs mt-1">
                {stats?.premiumUsers && stats?.totalUsers ? 
                  Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}% premium
              </p>
            </div>
            <Crown className="w-8 h-8 text-yellow-400" />
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
              <p className="text-white/60 text-sm font-medium">Avg Token Balance</p>
              <p className="text-2xl font-bold text-white">{stats?.avgTokenBalance?.toLocaleString() || '0'}</p>
              <p className="text-red-400 text-xs mt-1">
                {stats?.bannedUsers || 0} banned
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="all" className="bg-gray-800">All Users</option>
              <option value="active" className="bg-gray-800">Active</option>
              <option value="premium" className="bg-gray-800">Premium</option>
              <option value="banned" className="bg-gray-800">Banned</option>
              <option value="new" className="bg-gray-800">New (7 days)</option>
              <option value="inactive" className="bg-gray-800">Inactive (30+ days)</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field)
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="last_seen-desc" className="bg-gray-800">Last Seen (Recent)</option>
              <option value="last_seen-asc" className="bg-gray-800">Last Seen (Oldest)</option>
              <option value="created_at-desc" className="bg-gray-800">Newest First</option>
              <option value="created_at-asc" className="bg-gray-800">Oldest First</option>
              <option value="username-asc" className="bg-gray-800">Username A-Z</option>
              <option value="username-desc" className="bg-gray-800">Username Z-A</option>
              <option value="token_balance-desc" className="bg-gray-800">Highest Balance</option>
              <option value="token_balance-asc" className="bg-gray-800">Lowest Balance</option>
            </select>
          </div>

          <div className="flex gap-2">
            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/30 transition-colors"
              >
                Bulk Actions ({selectedUsers.length})
              </button>
            )}

            {/* Export */}
            <div className="relative group">
              <button className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors">
                <Download className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-32 bg-gray-800 border border-white/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => exportUsers('csv')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportUsers('json')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={loadUsers}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Panel */}
        <AnimatePresence>
          {showBulkActions && selectedUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"
            >
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkAction('gift_tokens', { amount: 100 })}
                  className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm hover:bg-green-500/30"
                >
                  Gift 100 Tokens
                </button>
                <button
                  onClick={() => handleBulkAction('send_message')}
                  className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-sm hover:bg-blue-500/30"
                >
                  Send Message
                </button>
                <button
                  onClick={() => handleBulkAction('add_role', { role: 'beta_tester' })}
                  className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 text-sm hover:bg-purple-500/30"
                >
                  Add Beta Role
                </button>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm hover:bg-red-500/30"
                >
                  Clear Selection
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Users Table */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(paginatedUsers.map(u => u.user_id))
                      } else {
                        setSelectedUsers([])
                      }
                    }}
                    className="rounded border-white/20 bg-white/10"
                  />
                </th>
                <th className="px-6 py-4 text-left text-white font-medium">User</th>
                <th className="px-6 py-4 text-left text-white font-medium">Status</th>
                <th className="px-6 py-4 text-left text-white font-medium">Tokens</th>
                <th className="px-6 py-4 text-left text-white font-medium">Activity</th>
                <th className="px-6 py-4 text-left text-white font-medium">Joined</th>
                <th className="px-6 py-4 text-left text-white font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedUsers.map((userData) => (
                <tr key={userData.user_id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(userData.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(prev => [...prev, userData.user_id])
                        } else {
                          setSelectedUsers(prev => prev.filter(id => id !== userData.user_id))
                        }
                      }}
                      className="rounded border-white/20 bg-white/10"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={getUserAvatar(userData)}
                        alt={userData.username}
                        className="w-10 h-10 rounded-full border-2 border-white/20"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{userData.username}</p>
                          {userData.is_premium && <Crown className="w-4 h-4 text-yellow-400" />}
                          {userData.roles?.includes('admin') && <Shield className="w-4 h-4 text-red-400" />}
                        </div>
                        <p className="text-white/60 text-sm">ID: {userData.user_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        userData.is_banned 
                          ? 'bg-red-500/20 text-red-400'
                          : userData.is_active 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {userData.is_banned ? 'Banned' : userData.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {userData.warnings > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          {userData.warnings} warnings
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">
                      <p className="font-medium">{userData.token_balance.toLocaleString()}</p>
                      <p className="text-white/60 text-sm">
                        Earned: {userData.lifetime_earned.toLocaleString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white/80">
                      <p className="text-sm">Last seen: {formatTimeAgo(userData.last_seen)}</p>
                      <p className="text-white/60 text-xs">
                        {userData.achievements_count} achievements • {userData.games_played} games
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white/80 text-sm">
                      {new Date(userData.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowUserModal(userData)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => setShowGiftModal(userData)}
                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
                        title="Gift Tokens"
                      >
                        <Gift className="w-4 h-4 text-green-400" />
                      </button>
                      <div className="relative group">
                        <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                          <MoreVertical className="w-4 h-4 text-white" />
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-white/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => handleUserAction(userData.user_id, 'edit')}
                            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit User
                          </button>
                          <button
                            onClick={() => handleUserAction(userData.user_id, 'message')}
                            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Send Message
                          </button>
                          <button
                            onClick={() => handleUserAction(userData.user_id, userData.is_banned ? 'unban' : 'ban')}
                            className={`w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 ${
                              userData.is_banned ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {userData.is_banned ? <UserPlus className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            {userData.is_banned ? 'Unban User' : 'Ban User'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-white/60 text-sm">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded ${
                    currentPage === i + 1 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowUserModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">User Details</h2>
                  <button
                    onClick={() => setShowUserModal(null)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* User Profile */}
                  <div className="flex items-center gap-4">
                    <img
                      src={getUserAvatar(showUserModal)}
                      alt={showUserModal.username}
                      className="w-16 h-16 rounded-full border-2 border-white/20"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">{showUserModal.username}</h3>
                        {showUserModal.is_premium && <Crown className="w-5 h-5 text-yellow-400" />}
                        {showUserModal.roles?.includes('admin') && <Shield className="w-5 h-5 text-red-400" />}
                      </div>
                      <p className="text-white/60">ID: {showUserModal.user_id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          showUserModal.is_banned 
                            ? 'bg-red-500/20 text-red-400'
                            : showUserModal.is_active 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {showUserModal.is_banned ? 'Banned' : showUserModal.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {showUserModal.is_premium && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                            Premium until {new Date(showUserModal.premium_expires_at!).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/60 text-sm">Token Balance</p>
                      <p className="text-xl font-bold text-white">{showUserModal.token_balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/60 text-sm">Lifetime Earned</p>
                      <p className="text-xl font-bold text-white">{showUserModal.lifetime_earned.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/60 text-sm">Achievements</p>
                      <p className="text-xl font-bold text-white">{showUserModal.achievements_count}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/60 text-sm">Games Played</p>
                      <p className="text-xl font-bold text-white">{showUserModal.games_played}</p>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Account Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Joined:</span>
                          <span className="text-white">{new Date(showUserModal.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Last Seen:</span>
                          <span className="text-white">{formatTimeAgo(showUserModal.last_seen)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Daily Streak:</span>
                          <span className="text-white">{showUserModal.daily_streak} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Warnings:</span>
                          <span className={showUserModal.warnings > 0 ? 'text-yellow-400' : 'text-white'}>
                            {showUserModal.warnings}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Activity Stats</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Total Playtime:</span>
                          <span className="text-white">{Math.round(showUserModal.total_playtime / 60)} hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Tokens Spent:</span>
                          <span className="text-white">{showUserModal.lifetime_spent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Roles:</span>
                          <span className="text-white">{showUserModal.roles?.join(', ') || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleUserAction(showUserModal.user_id, 'gift_premium')}
                      className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 hover:bg-yellow-500/30"
                    >
                      Gift Premium
                    </button>
                    <button
                      onClick={() => setShowGiftModal(showUserModal)}
                      className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30"
                    >
                      Gift Tokens
                    </button>
                    <button
                      onClick={() => handleUserAction(showUserModal.user_id, 'reset_progress')}
                      className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/30"
                    >
                      Reset Progress
                    </button>
                    <button
                      onClick={() => handleUserAction(showUserModal.user_id, showUserModal.is_banned ? 'unban' : 'ban')}
                      className={`px-4 py-2 border rounded-lg hover:opacity-80 ${
                        showUserModal.is_banned
                          ? 'bg-green-500/20 border-green-500/30 text-green-400'
                          : 'bg-red-500/20 border-red-500/30 text-red-400'
                      }`}
                    >
                      {showUserModal.is_banned ? 'Unban User' : 'Ban User'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Modal */}
      <AnimatePresence>
        {showGiftModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowGiftModal(null)}
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
                  <h2 className="text-xl font-bold text-white">Gift Tokens</h2>
                  <button
                    onClick={() => setShowGiftModal(null)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <img
                      src={getUserAvatar(showGiftModal)}
                      alt={showGiftModal.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="text-white font-medium">{showGiftModal.username}</p>
                      <p className="text-white/60 text-sm">Current balance: {showGiftModal.token_balance.toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Amount to Gift
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      defaultValue="100"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
                      id="giftAmount"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Reason (Optional)
                    </label>
                    <textarea
                      placeholder="Admin gift, event reward, etc."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400 resize-none"
                      rows={3}
                      id="giftReason"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowGiftModal(null)}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const amount = parseInt((document.getElementById('giftAmount') as HTMLInputElement).value)
                        const reason = (document.getElementById('giftReason') as HTMLTextAreaElement).value
                        handleUserAction(showGiftModal.user_id, 'gift_tokens', { amount, reason })
                        setShowGiftModal(null)
                      }}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium"
                    >
                      <Gift className="w-4 h-4 inline mr-2" />
                      Gift Tokens
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

export default UserManagement