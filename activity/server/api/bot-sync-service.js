// Real-time Bot Data Synchronization Service
// Keeps Activity in sync with live bot database changes

const { getUserData, getMainDb } = require('./database.js')
const EventEmitter = require('events')

class BotSyncService extends EventEmitter {
  constructor() {
    super()
    this.isRunning = false
    this.syncInterval = null
    this.lastSyncTimestamp = {}
    this.cachedUserData = new Map()
    this.activeSessions = new Set()
    
    console.log('🔄 Bot Sync Service initialized')
  }

  start() {
    if (this.isRunning) return
    
    console.log('🚀 STARTING REAL-TIME BOT DATA SYNC SERVICE...')
    this.isRunning = true
    
    // Start periodic sync every 30 seconds for active users
    this.syncInterval = setInterval(() => {
      this.syncActiveUsers()
    }, 30000)
    
    // Start database change monitoring if available
    this.startDatabaseMonitoring()
    
    console.log('✅ Bot Sync Service is now running')
  }

  stop() {
    if (!this.isRunning) return
    
    console.log('⏹️ Stopping Bot Sync Service...')
    this.isRunning = false
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    
    this.activeSessions.clear()
    this.cachedUserData.clear()
    
    console.log('✅ Bot Sync Service stopped')
  }

  // Register a user session for real-time sync
  registerUserSession(userId, sessionInfo = {}) {
    console.log(`📋 REGISTERING USER SESSION: ${userId}`)
    
    this.activeSessions.add(userId)
    this.lastSyncTimestamp[userId] = Date.now()
    
    // Immediately sync this user's data
    this.syncUserData(userId).catch(error => {
      console.log(`⚠️ Initial sync failed for user ${userId}:`, error.message)
    })
    
    // Set session timeout (remove after 10 minutes of inactivity)
    setTimeout(() => {
      if (!this.activeSessions.has(userId)) return
      
      const lastActivity = this.lastSyncTimestamp[userId] || 0
      const now = Date.now()
      const inactiveTime = now - lastActivity
      
      if (inactiveTime > 600000) { // 10 minutes
        console.log(`⏰ Removing inactive user session: ${userId}`)
        this.activeSessions.delete(userId)
        delete this.lastSyncTimestamp[userId]
        this.cachedUserData.delete(userId)
      }
    }, 600000)
  }

  // Update user activity timestamp
  updateUserActivity(userId) {
    if (this.activeSessions.has(userId)) {
      this.lastSyncTimestamp[userId] = Date.now()
    }
  }

  // Sync all currently active users
  async syncActiveUsers() {
    if (this.activeSessions.size === 0) return
    
    console.log(`🔄 Syncing ${this.activeSessions.size} active user sessions...`)
    
    const syncPromises = Array.from(this.activeSessions).map(userId => 
      this.syncUserData(userId).catch(error => {
        console.log(`⚠️ Sync failed for user ${userId}:`, error.message)
        return null
      })
    )
    
    const results = await Promise.allSettled(syncPromises)
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length
    
    console.log(`📊 User sync complete: ${successful}/${this.activeSessions.size} successful`)
  }

  // Sync individual user data from bot database
  async syncUserData(userId) {
    try {
      console.log(`🔄 Syncing user data: ${userId}`)
      
      // Get fresh data from bot database
      const freshData = await getUserData(userId)
      
      if (!freshData) {
        console.log(`📋 No data found for user ${userId}`)
        return null
      }
      
      // Check if data has changed since last sync
      const cachedData = this.cachedUserData.get(userId)
      const hasChanges = !cachedData || this.hasDataChanged(cachedData, freshData)
      
      if (hasChanges) {
        console.log(`📈 DATA CHANGES DETECTED for user ${userId}:`, {
          fragments: freshData.user.fragments,
          level: freshData.user.level,
          achievements: freshData.achievements.length
        })
        
        // Update cache
        this.cachedUserData.set(userId, JSON.parse(JSON.stringify(freshData)))
        
        // Emit change event for real-time updates
        this.emit('userDataChanged', {
          userId,
          data: freshData,
          timestamp: Date.now(),
          changes: this.getChangesSummary(cachedData, freshData)
        })
        
        return freshData
      } else {
        console.log(`📊 No changes detected for user ${userId}`)
        return cachedData
      }
      
    } catch (error) {
      console.error(`❌ User data sync error for ${userId}:`, error)
      throw error
    }
  }

  // Check if user data has meaningful changes
  hasDataChanged(oldData, newData) {
    if (!oldData || !newData) return true
    
    // Compare key fields that matter for the Activity
    const oldUser = oldData.user || {}
    const newUser = newData.user || {}
    
    const keyFields = ['fragments', 'data_shards', 'level', 'xp', 'lives', 'daily_streak']
    for (const field of keyFields) {
      if (oldUser[field] !== newUser[field]) {
        return true
      }
    }
    
    // Compare achievement counts
    if ((oldData.achievements?.length || 0) !== (newData.achievements?.length || 0)) {
      return true
    }
    
    // Compare quest counts
    if ((oldData.quests?.length || 0) !== (newData.quests?.length || 0)) {
      return true
    }
    
    return false
  }

  // Generate a summary of what changed
  getChangesSummary(oldData, newData) {
    const changes = []
    
    if (!oldData) return ['initial_data_load']
    
    const oldUser = oldData.user || {}
    const newUser = newData.user || {}
    
    // Check economic changes
    if (oldUser.fragments !== newUser.fragments) {
      const diff = newUser.fragments - oldUser.fragments
      changes.push(diff > 0 ? `gained_${diff}_fragments` : `lost_${Math.abs(diff)}_fragments`)
    }
    
    if (oldUser.level !== newUser.level) {
      const diff = newUser.level - oldUser.level
      if (diff > 0) changes.push(`level_up_to_${newUser.level}`)
    }
    
    if (oldUser.xp !== newUser.xp) {
      const diff = newUser.xp - oldUser.xp
      if (diff > 0) changes.push(`gained_${diff}_xp`)
    }
    
    // Check achievement changes
    const oldAchievements = oldData.achievements?.length || 0
    const newAchievements = newData.achievements?.length || 0
    if (newAchievements > oldAchievements) {
      changes.push(`earned_${newAchievements - oldAchievements}_achievements`)
    }
    
    // Check quest changes
    const oldQuests = oldData.quests?.length || 0
    const newQuests = newData.quests?.length || 0
    if (newQuests !== oldQuests) {
      changes.push(`quest_progress_updated`)
    }
    
    return changes
  }

  // Start monitoring database changes (if possible)
  startDatabaseMonitoring() {
    try {
      const db = getMainDb()
      if (!db) {
        console.log('⚠️ Database not available for change monitoring')
        return
      }
      
      console.log('👁️ Database change monitoring would be implemented here')
      // Note: SQLite doesn't have built-in change notifications
      // This would require a different approach like file system watching
      // or implementing a trigger-based system in the bot
      
    } catch (error) {
      console.log('⚠️ Database monitoring setup failed:', error.message)
    }
  }

  // Get cached user data (for quick access)
  getCachedUserData(userId) {
    return this.cachedUserData.get(userId) || null
  }

  // Force sync a specific user (on-demand)
  async forceSyncUser(userId) {
    console.log(`🔄 FORCE SYNC requested for user ${userId}`)
    
    try {
      // Remove from cache to force fresh fetch
      this.cachedUserData.delete(userId)
      
      // Register as active session if not already
      this.registerUserSession(userId)
      
      // Perform immediate sync
      const freshData = await this.syncUserData(userId)
      
      console.log(`✅ Force sync completed for user ${userId}`)
      return freshData
      
    } catch (error) {
      console.error(`❌ Force sync failed for user ${userId}:`, error)
      throw error
    }
  }

  // Get service statistics
  getStats() {
    return {
      isRunning: this.isRunning,
      activeSessions: this.activeSessions.size,
      cachedUsers: this.cachedUserData.size,
      lastSyncCount: Object.keys(this.lastSyncTimestamp).length,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    }
  }
}

// Create singleton instance
const botSyncService = new BotSyncService()

// Auto-start service
botSyncService.start()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down Bot Sync Service...')
  botSyncService.stop()
})

process.on('SIGTERM', () => {
  console.log('🔄 Shutting down Bot Sync Service...')
  botSyncService.stop()
})

module.exports = {
  botSyncService,
  registerUserSession: (userId, info) => botSyncService.registerUserSession(userId, info),
  updateUserActivity: (userId) => botSyncService.updateUserActivity(userId),
  syncUserData: (userId) => botSyncService.syncUserData(userId),
  forceSyncUser: (userId) => botSyncService.forceSyncUser(userId),
  getCachedUserData: (userId) => botSyncService.getCachedUserData(userId),
  getStats: () => botSyncService.getStats()
}