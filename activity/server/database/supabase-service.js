// Supabase Database Service - Serverless Compatible
// Optimized for Discord Activity API with connection pooling and caching
// Free-tier optimized with intelligent query batching

import { createClient } from '@supabase/supabase-js'

// Supabase configuration - Environment variables required
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Connection validation
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials missing - database features will be limited')
}

// Create Supabase client with optimal settings for serverless
let supabase = null
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: fetch, // Use native fetch
    },
  })
}

// In-memory cache for performance (serverless function lifecycle)
const cache = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes
const MAX_CACHE_SIZE = 1000 // Limit memory usage

// Cache utilities
function getCacheKey(table, id, extra = '') {
  return `${table}:${id}${extra ? ':' + extra : ''}`
}

function isExpired(timestamp) {
  return Date.now() - timestamp > CACHE_TTL
}

function cleanCache() {
  if (cache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.3))
    toDelete.forEach(([key]) => cache.delete(key))
  }
}

function setCache(key, data) {
  cleanCache()
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

function getCache(key) {
  const cached = cache.get(key)
  if (!cached || isExpired(cached.timestamp)) {
    cache.delete(key)
    return null
  }
  return cached.data
}

// Database service class
export class SupabaseService {
  constructor() {
    this.client = supabase
    this.connected = !!supabase
    this.fallbackMode = !supabase
  }

  // Connection health check
  async isHealthy() {
    if (!this.client) return false
    
    try {
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .limit(1)
      
      return !error
    } catch (err) {
      console.error('🔍 Database health check failed:', err.message)
      return false
    }
  }

  // Get or create user with caching
  async getUserData(userId) {
    if (!userId) throw new Error('User ID is required')
    
    const cacheKey = getCacheKey('user_full', userId)
    const cached = getCache(cacheKey)
    if (cached) {
      console.log(`⚡ Cache hit for user ${userId}`)
      return cached
    }

    if (!this.client) {
      return this.generateFallbackUserData(userId)
    }

    try {
      // Single query to get all user data with joins
      const { data: userData, error } = await this.client
        .rpc('get_user_complete_data', { p_user_id: userId })
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = function not found, fallback to individual queries
        throw error
      }

      let user, stats, achievements, playlists
      
      if (userData) {
        // Use stored procedure result
        user = userData.user_data
        stats = userData.stats_data
        achievements = userData.achievements_data
        playlists = userData.playlists_data
      } else {
        // Fallback to individual queries
        const queries = await Promise.allSettled([
          this.client.from('users').select('*').eq('id', userId).single(),
          this.client.from('user_stats').select('*').eq('user_id', userId).single(),
          this.client
            .from('user_achievements')
            .select(`
              earned_at,
              achievements (
                id, name, description, icon, category, 
                reward_fragments, reward_xp, reward_shards
              )
            `)
            .eq('user_id', userId),
          this.client
            .from('playlists')
            .select(`
              id, name, description, thumbnail, track_count, 
              playlist_tracks (
                id, title, artist, duration, video_id, thumbnail, url, position
              )
            `)
            .eq('user_id', userId)
            .eq('is_public', false) // Only private playlists for user data
        ])

        user = queries[0].status === 'fulfilled' ? queries[0].value.data : null
        stats = queries[1].status === 'fulfilled' ? queries[1].value.data : null
        achievements = queries[2].status === 'fulfilled' ? queries[2].value.data : []
        playlists = queries[3].status === 'fulfilled' ? queries[3].value.data : []
      }

      // Create user if not exists
      if (!user) {
        const newUser = await this.createUser(userId)
        if (!newUser) throw new Error('Failed to create new user')
        user = newUser
      }

      // Create stats if not exists
      if (!stats) {
        stats = await this.createUserStats(userId)
      }

      // Format response
      const result = {
        user: {
          id: user.id,
          username: user.username || 'Unknown',
          fragments: user.fragments || 100,
          data_shards: user.data_shards || 0,
          level: user.level || 1,
          xp: user.xp || 0,
          lives: user.lives || 3,
          daily_streak: user.daily_streak || 0,
          log_keys: user.log_keys || 1
        },
        achievements: achievements.map(a => ({
          id: a.achievements?.id || a.id,
          name: a.achievements?.name || a.name,
          description: a.achievements?.description || a.description,
          icon: a.achievements?.icon || a.icon || '🏆',
          earned_at: a.earned_at
        })),
        playlists: playlists.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          thumbnail: p.thumbnail,
          tracks: p.playlist_tracks?.sort((a, b) => a.position - b.position) || []
        })),
        stats: {
          messages_sent: stats?.messages_sent || 0,
          commands_used: stats?.commands_used || 0,
          music_tracks_played: stats?.music_tracks_played || 0,
          games_completed: stats?.games_completed || 0,
          ai_conversations: stats?.ai_conversations || 0,
          voice_minutes: stats?.voice_minutes || 0,
          total_sessions: stats?.total_sessions || 0,
          last_activity: user.last_activity || new Date().toISOString()
        },
        source: 'supabase_database',
        timestamp: Date.now()
      }

      // Cache the result
      setCache(cacheKey, result)
      
      console.log(`✅ Database: Retrieved user data for ${userId}`)
      return result

    } catch (error) {
      console.error(`❌ Database error for user ${userId}:`, error.message)
      
      // Return fallback data on database error
      return this.generateFallbackUserData(userId)
    }
  }

  // Create new user
  async createUser(userId, userData = {}) {
    if (!this.client) return null

    try {
      const newUser = {
        id: userId,
        username: userData.username || 'Unknown',
        discriminator: userData.discriminator || '0000',
        global_name: userData.global_name,
        avatar: userData.avatar,
        fragments: 100,
        data_shards: 0,
        level: 1,
        xp: 0,
        lives: 3,
        daily_streak: 0,
        log_keys: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }

      const { data, error } = await this.client
        .from('users')
        .insert([newUser])
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Created new user: ${userId}`)
      
      // Also create user stats
      await this.createUserStats(userId)
      
      // Clear cache
      const cacheKey = getCacheKey('user_full', userId)
      cache.delete(cacheKey)

      return data

    } catch (error) {
      console.error(`❌ Failed to create user ${userId}:`, error.message)
      return null
    }
  }

  // Create user stats
  async createUserStats(userId) {
    if (!this.client) return null

    try {
      const newStats = {
        user_id: userId,
        messages_sent: 0,
        commands_used: 0,
        music_tracks_played: 0,
        games_completed: 0,
        ai_conversations: 0,
        voice_minutes: 0,
        total_sessions: 0,
        last_session_duration: 0,
        longest_session: 0
      }

      const { data, error } = await this.client
        .from('user_stats')
        .insert([newStats])
        .select()
        .single()

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error
      }

      return data || newStats

    } catch (error) {
      console.error(`❌ Failed to create user stats for ${userId}:`, error.message)
      return {
        user_id: userId,
        messages_sent: 0,
        commands_used: 0,
        music_tracks_played: 0,
        games_completed: 0,
        ai_conversations: 0,
        voice_minutes: 0,
        total_sessions: 0
      }
    }
  }

  // Update user data
  async updateUser(userId, updates) {
    if (!this.client) return false

    try {
      const { error } = await this.client
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Clear cache
      const cacheKey = getCacheKey('user_full', userId)
      cache.delete(cacheKey)

      console.log(`✅ Updated user ${userId}`)
      return true

    } catch (error) {
      console.error(`❌ Failed to update user ${userId}:`, error.message)
      return false
    }
  }

  // Update user stats
  async updateStats(userId, statUpdates) {
    if (!this.client) return false

    try {
      const { error } = await this.client
        .from('user_stats')
        .update({
          ...statUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error

      // Clear cache
      const cacheKey = getCacheKey('user_full', userId)
      cache.delete(cacheKey)

      return true

    } catch (error) {
      console.error(`❌ Failed to update stats for ${userId}:`, error.message)
      return false
    }
  }

  // Award achievement
  async awardAchievement(userId, achievementId) {
    if (!this.client) return false

    try {
      // Check if user already has achievement
      const { data: existing } = await this.client
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .single()

      if (existing) {
        console.log(`User ${userId} already has achievement ${achievementId}`)
        return true
      }

      // Award achievement
      const { error } = await this.client
        .from('user_achievements')
        .insert([{
          user_id: userId,
          achievement_id: achievementId,
          earned_at: new Date().toISOString()
        }])

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error
      }

      // Get achievement details for rewards
      const { data: achievement } = await this.client
        .from('achievements')
        .select('reward_fragments, reward_xp, reward_shards')
        .eq('id', achievementId)
        .single()

      // Apply rewards
      if (achievement) {
        await this.updateUser(userId, {
          fragments: this.client.raw(`fragments + ${achievement.reward_fragments || 0}`),
          xp: this.client.raw(`xp + ${achievement.reward_xp || 0}`),
          data_shards: this.client.raw(`data_shards + ${achievement.reward_shards || 0}`)
        })
      }

      console.log(`✅ Awarded achievement ${achievementId} to user ${userId}`)
      return true

    } catch (error) {
      console.error(`❌ Failed to award achievement:`, error.message)
      return false
    }
  }

  // Log activity session
  async logActivity(userId, sessionData) {
    if (!this.client) return false

    try {
      const { error } = await this.client
        .from('activity_sessions')
        .insert([{
          user_id: userId,
          source: sessionData.source || 'discord_activity',
          ip_address: sessionData.ip,
          user_agent: sessionData.userAgent,
          activity_data: sessionData.data || {}
        }])

      if (error) throw error

      // Update session counter
      await this.updateStats(userId, {
        total_sessions: this.client.raw('total_sessions + 1')
      })

      return true

    } catch (error) {
      console.error(`❌ Failed to log activity for ${userId}:`, error.message)
      return false
    }
  }

  // Log bot command
  async logCommand(userId, command, params = {}, result = {}) {
    if (!this.client) return false

    try {
      const { error } = await this.client
        .from('bot_commands_log')
        .insert([{
          user_id: userId,
          command: command,
          params: params,
          result: result,
          success: result.success !== false,
          source: 'discord_activity',
          executed_at: new Date().toISOString()
        }])

      if (error) throw error

      // Update command counter
      await this.updateStats(userId, {
        commands_used: this.client.raw('commands_used + 1')
      })

      return true

    } catch (error) {
      console.error(`❌ Failed to log command:`, error.message)
      return false
    }
  }

  // Get user playlists
  async getUserPlaylists(userId) {
    if (!this.client) return this.generateFallbackPlaylists(userId)

    try {
      const { data, error } = await this.client
        .from('playlists')
        .select(`
          id, name, description, thumbnail, track_count,
          playlist_tracks (
            id, title, artist, duration, video_id, thumbnail, url, position
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const playlists = data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        thumbnail: p.thumbnail,
        track_count: p.track_count,
        tracks: (p.playlist_tracks || []).sort((a, b) => a.position - b.position)
      }))

      return playlists

    } catch (error) {
      console.error(`❌ Failed to get playlists for ${userId}:`, error.message)
      return this.generateFallbackPlaylists(userId)
    }
  }

  // Fallback data generators
  generateFallbackUserData(userId) {
    console.log(`🎭 Generating fallback data for user ${userId}`)
    
    const userSeed = parseInt((userId || '123456').slice(-6)) || 123456
    
    return {
      user: {
        id: userId,
        fragments: 100 + (userSeed % 1000),
        data_shards: userSeed % 20,
        level: 1 + (userSeed % 10),
        xp: userSeed % 500,
        lives: 3,
        daily_streak: userSeed % 15,
        log_keys: 1 + (userSeed % 5)
      },
      achievements: [
        { id: 1, name: "First Steps", description: "Complete first quest", icon: "🏃" },
        { id: 2, name: "Music Lover", description: "Listen to music", icon: "🎵" }
      ].slice(0, (userSeed % 3) + 1),
      playlists: this.generateFallbackPlaylists(userId),
      stats: {
        messages_sent: userSeed % 100,
        commands_used: userSeed % 50,
        music_tracks_played: userSeed % 30,
        games_completed: userSeed % 10,
        ai_conversations: userSeed % 20,
        voice_minutes: userSeed % 120,
        total_sessions: (userSeed % 25) + 1,
        last_activity: new Date().toISOString()
      },
      source: 'fallback_simulation',
      timestamp: Date.now()
    }
  }

  generateFallbackPlaylists(userId) {
    return [
      {
        id: `juice-wrld-${userId}`,
        name: 'Juice WRLD Essentials',
        description: 'The best of Juice WRLD',
        tracks: [
          {
            id: '1',
            title: 'Lucid Dreams',
            artist: 'Juice WRLD',
            duration: 244,
            video_id: 'mzB1VGllGMU',
            thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
            url: 'https://youtube.com/watch?v=mzB1VGllGMU'
          }
        ]
      }
    ]
  }

  // Utility methods
  async cleanup() {
    // Clean expired cache entries from database
    if (this.client) {
      try {
        await this.client.rpc('clean_expired_cache')
      } catch (error) {
        console.log('Cache cleanup error (non-critical):', error.message)
      }
    }
  }

  // Get database statistics for monitoring
  async getStats() {
    if (!this.client) return null

    try {
      const { data, error } = await this.client
        .rpc('get_database_stats')

      return error ? null : data

    } catch (error) {
      return null
    }
  }
}

// Create singleton instance
export const dbService = new SupabaseService()

// Export convenience functions
export async function getUserData(userId) {
  return await dbService.getUserData(userId)
}

export async function updateUser(userId, updates) {
  return await dbService.updateUser(userId, updates)
}

export async function updateStats(userId, statUpdates) {
  return await dbService.updateStats(userId, statUpdates)
}

export async function getUserPlaylists(userId) {
  return await dbService.getUserPlaylists(userId)
}

export async function logActivity(userId, sessionData) {
  return await dbService.logActivity(userId, sessionData)
}

export async function logCommand(userId, command, params, result) {
  return await dbService.logCommand(userId, command, params, result)
}

export async function isHealthy() {
  return await dbService.isHealthy()
}

// Initialize database connection check
export async function initializeDatabases() {
  console.log('🔌 Initializing Supabase database connection...')
  
  if (!supabase) {
    console.warn('⚠️ Supabase not configured - using fallback mode')
    return false
  }

  const healthy = await dbService.isHealthy()
  if (healthy) {
    console.log('✅ Supabase database connected successfully')
    return true
  } else {
    console.warn('❌ Supabase connection failed - using fallback mode')
    return false
  }
}

export default dbService