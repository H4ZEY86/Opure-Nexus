// Bot Sync Service - Serverless Compatible
// Handles real-time synchronization between Discord bot and Activity API
// Optimized for serverless environments with intelligent caching

import { dbService, getUserData, updateUser, updateStats, logActivity } from '../database/supabase-service.js'

// Active user sessions (in-memory for serverless function lifecycle)
const activeSessions = new Map()
const sessionTimeouts = new Map()

// Session configuration
const SESSION_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MAX_ACTIVE_SESSIONS = 500 // Limit memory usage

// User data cache for real-time sync
const userCache = new Map()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

// Register new user session for real-time sync
export function registerUserSession(userId, sessionData = {}) {
  if (!userId) return false
  
  console.log(`🔄 Registering real-time session for user ${userId}`)
  
  // Limit concurrent sessions to prevent memory issues
  if (activeSessions.size >= MAX_ACTIVE_SESSIONS) {
    cleanupOldestSessions()
  }
  
  // Clear existing timeout if present
  if (sessionTimeouts.has(userId)) {
    clearTimeout(sessionTimeouts.get(userId))
  }
  
  // Register session
  activeSessions.set(userId, {
    userId,
    startTime: Date.now(),
    lastActivity: Date.now(),
    sessionData: {
      ip: sessionData.ip,
      userAgent: sessionData.userAgent,
      source: 'discord_activity',
      ...sessionData
    },
    syncCount: 0,
    cacheHits: 0
  })
  
  // Set timeout for session cleanup
  const timeout = setTimeout(() => {
    console.log(`⏰ Session timeout for user ${userId}`)
    deregisterUserSession(userId)
  }, SESSION_TIMEOUT)
  
  sessionTimeouts.set(userId, timeout)
  
  return true
}

// Update user activity timestamp
export function updateUserActivity(userId) {
  if (!userId || !activeSessions.has(userId)) return false
  
  const session = activeSessions.get(userId)
  session.lastActivity = Date.now()
  
  // Reset timeout
  if (sessionTimeouts.has(userId)) {
    clearTimeout(sessionTimeouts.get(userId))
    
    const timeout = setTimeout(() => {
      deregisterUserSession(userId)
    }, SESSION_TIMEOUT)
    
    sessionTimeouts.set(userId, timeout)
  }
  
  return true
}

// Deregister user session
export function deregisterUserSession(userId) {
  if (!userId) return false
  
  console.log(`❌ Deregistering session for user ${userId}`)
  
  // Clear timeout
  if (sessionTimeouts.has(userId)) {
    clearTimeout(sessionTimeouts.get(userId))
    sessionTimeouts.delete(userId)
  }
  
  // Log session end
  const session = activeSessions.get(userId)
  if (session) {
    const duration = Date.now() - session.startTime
    
    // Log activity session to database
    logActivity(userId, {
      source: 'real_time_sync_session',
      duration: Math.floor(duration / 1000),
      sync_count: session.syncCount,
      cache_hits: session.cacheHits,
      ended_at: new Date().toISOString()
    }).catch(error => {
      console.log('Session logging error (non-critical):', error.message)
    })
  }
  
  activeSessions.delete(userId)
  userCache.delete(userId)
  
  return true
}

// Force sync user data from database
export async function forceSyncUser(userId) {
  if (!userId) return null
  
  console.log(`🔄 Force syncing user ${userId}`)
  
  try {
    // Get fresh data from database
    const userData = await getUserData(userId)
    
    if (userData) {
      // Update cache
      userCache.set(userId, {
        data: userData,
        timestamp: Date.now(),
        source: 'force_sync'
      })
      
      // Update session sync count
      if (activeSessions.has(userId)) {
        const session = activeSessions.get(userId)
        session.syncCount += 1
        updateUserActivity(userId)
      }
      
      console.log(`✅ Force sync completed for user ${userId}`)
      return userData
    } else {
      throw new Error('User data not found')
    }
    
  } catch (error) {
    console.error(`❌ Force sync failed for user ${userId}:`, error.message)
    return null
  }
}

// Get cached user data (for performance)
export function getCachedUserData(userId) {
  if (!userId) return null
  
  const cached = userCache.get(userId)
  
  if (!cached) {
    return null
  }
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    userCache.delete(userId)
    return null
  }
  
  // Update session cache hit count
  if (activeSessions.has(userId)) {
    const session = activeSessions.get(userId)
    session.cacheHits += 1
    updateUserActivity(userId)
  }
  
  console.log(`⚡ Cache hit for user ${userId}`)
  return cached.data
}

// Sync user data with smart caching
export async function syncUserData(userId, forceRefresh = false) {
  if (!userId) return null
  
  // Try cache first unless force refresh
  if (!forceRefresh) {
    const cached = getCachedUserData(userId)
    if (cached) {
      return {
        ...cached,
        cached: true,
        source: 'smart_cache'
      }
    }
  }
  
  // Fetch fresh data
  return await forceSyncUser(userId)
}

// Batch sync multiple users (for efficiency)
export async function batchSyncUsers(userIds, options = {}) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return []
  }
  
  console.log(`🔄 Batch syncing ${userIds.length} users`)
  
  const results = []
  const batchSize = options.batchSize || 10
  
  // Process in batches to avoid overwhelming the database
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (userId) => {
      try {
        const userData = await syncUserData(userId, options.forceRefresh)
        return { userId, success: true, data: userData }
      } catch (error) {
        console.error(`❌ Batch sync failed for user ${userId}:`, error.message)
        return { userId, success: false, error: error.message }
      }
    })
    
    const batchResults = await Promise.allSettled(batchPromises)
    results.push(...batchResults.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    ))
    
    // Small delay between batches to be nice to the database
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log(`✅ Batch sync completed: ${results.filter(r => r.success).length}/${userIds.length} successful`)
  return results
}

// Update user progression (levels, XP, achievements)
export async function updateUserProgression(userId, progressData = {}) {
  if (!userId) return false
  
  try {
    const { xpGained = 0, fragmentsGained = 0, shardsGained = 0 } = progressData
    
    // Get current user data
    const currentData = await getUserData(userId)
    if (!currentData) {
      console.error(`User ${userId} not found for progression update`)
      return false
    }
    
    const user = currentData.user
    const newXP = user.xp + xpGained
    let newLevel = user.level
    
    // Calculate level ups (100 XP per level, with scaling)
    const xpPerLevel = 100 * newLevel
    if (newXP >= xpPerLevel && newLevel < 100) {
      newLevel += 1
      console.log(`🎉 User ${userId} leveled up to ${newLevel}!`)
      
      // Award level up bonus
      const levelBonus = newLevel * 50
      await updateUser(userId, {
        level: newLevel,
        xp: newXP,
        fragments: user.fragments + fragmentsGained + levelBonus,
        data_shards: user.data_shards + shardsGained
      })
      
      // Check for level-based achievements
      await checkLevelAchievements(userId, newLevel)
      
    } else {
      // Regular update without level up
      await updateUser(userId, {
        xp: newXP,
        fragments: user.fragments + fragmentsGained,
        data_shards: user.data_shards + shardsGained
      })
    }
    
    // Clear cache to force refresh
    userCache.delete(userId)
    
    console.log(`✅ Progression updated for user ${userId}: XP +${xpGained}, Fragments +${fragmentsGained}`)
    return true
    
  } catch (error) {
    console.error(`❌ Progression update failed for user ${userId}:`, error.message)
    return false
  }
}

// Check and award level-based achievements
async function checkLevelAchievements(userId, level) {
  try {
    const levelMilestones = [
      { level: 5, achievementId: 4 },   // Level Up achievement
      { level: 10, achievementId: 4 },  // Level Up achievement  
      { level: 25, achievementId: 4 },  // Level Up achievement
      { level: 50, achievementId: 10 }  // Legendary User achievement
    ]
    
    const milestone = levelMilestones.find(m => m.level === level)
    if (milestone) {
      await dbService.awardAchievement(userId, milestone.achievementId)
    }
    
  } catch (error) {
    console.log('Achievement check error (non-critical):', error.message)
  }
}

// Get real-time statistics
export function getStats() {
  return {
    active_sessions: activeSessions.size,
    cached_users: userCache.size,
    total_sessions_processed: Array.from(activeSessions.values()).reduce(
      (sum, session) => sum + session.syncCount, 0
    ),
    total_cache_hits: Array.from(activeSessions.values()).reduce(
      (sum, session) => sum + session.cacheHits, 0
    ),
    uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    memory_usage: process.memoryUsage ? process.memoryUsage() : null,
    timestamp: new Date().toISOString()
  }
}

// Cleanup old sessions to prevent memory leaks
function cleanupOldestSessions() {
  const sessions = Array.from(activeSessions.entries())
  sessions.sort((a, b) => a[1].lastActivity - b[1].lastActivity)
  
  // Remove oldest 20% of sessions
  const toRemove = Math.floor(sessions.length * 0.2)
  for (let i = 0; i < toRemove; i++) {
    const [userId] = sessions[i]
    deregisterUserSession(userId)
  }
  
  console.log(`🧹 Cleaned up ${toRemove} old sessions`)
}

// Periodic cleanup function (call this periodically)
export function performMaintenance() {
  console.log('🧹 Performing sync service maintenance...')
  
  // Clean expired cache entries
  const now = Date.now()
  const expiredUsers = []
  
  for (const [userId, cached] of userCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      expiredUsers.push(userId)
    }
  }
  
  expiredUsers.forEach(userId => {
    userCache.delete(userId)
  })
  
  // Clean inactive sessions
  const inactiveUsers = []
  for (const [userId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      inactiveUsers.push(userId)
    }
  }
  
  inactiveUsers.forEach(userId => {
    deregisterUserSession(userId)
  })
  
  console.log(`🧹 Maintenance complete: removed ${expiredUsers.length} expired cache entries, ${inactiveUsers.length} inactive sessions`)
  
  return {
    expired_cache_entries: expiredUsers.length,
    inactive_sessions: inactiveUsers.length,
    active_sessions: activeSessions.size,
    cached_users: userCache.size
  }
}

// Health check for sync service
export function healthCheck() {
  try {
    const stats = getStats()
    
    return {
      success: true,
      service: 'bot-sync-service',
      status: 'operational',
      statistics: stats,
      health: {
        memory_pressure: activeSessions.size > MAX_ACTIVE_SESSIONS * 0.8,
        cache_efficiency: stats.total_cache_hits / Math.max(stats.total_sessions_processed, 1),
        active_sessions: activeSessions.size
      },
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    return {
      success: false,
      service: 'bot-sync-service',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

// Export all functions
export default {
  registerUserSession,
  updateUserActivity,
  deregisterUserSession,
  forceSyncUser,
  getCachedUserData,
  syncUserData,
  batchSyncUsers,
  updateUserProgression,
  getStats,
  performMaintenance,
  healthCheck
}