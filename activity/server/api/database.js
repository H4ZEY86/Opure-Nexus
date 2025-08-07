// Database connection utility for live bot data access  
// This connects to both SQLite database AND Supabase for comprehensive data access

const Database = require('better-sqlite3')
const path = require('path')

// Supabase integration for cloud data
let supabaseClient = null
try {
  const { createClient } = require('@supabase/supabase-js')
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
  
  if (supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey)
    console.log('🌐 Supabase client initialized')
  } else {
    console.log('⚠️ Supabase credentials not found, using SQLite only')
  }
} catch (error) {
  console.log('⚠️ Supabase not available, using SQLite only:', error.message)
}

// Database paths - main bot database has the live user data
const MAIN_BOT_DB = path.join(__dirname, '../../../opure.db')
const ACTIVITY_DB = path.join(__dirname, '../opure_activity.db')

console.log('📊 Database paths:', {
  mainBotDb: MAIN_BOT_DB,
  activityDb: ACTIVITY_DB
})

let mainDb = null
let activityDb = null

// Initialize database connections
function initializeDatabases() {
  try {
    // Connect to main bot database (READ ONLY for safety)
    console.log('🔌 Connecting to main bot database...')
    mainDb = new Database(MAIN_BOT_DB, { 
      readonly: true,
      fileMustExist: true 
    })
    
    // Test connection
    const result = mainDb.prepare('SELECT COUNT(*) as count FROM players').get()
    console.log(`✅ Main bot database connected! ${result.count} players found`)
    
    // Connect to activity database (READ/WRITE for activity-specific data)
    console.log('🔌 Connecting to activity database...')
    activityDb = new Database(ACTIVITY_DB, { 
      readonly: false 
    })
    
    // Create activity tables if needed
    activityDb.exec(`
      CREATE TABLE IF NOT EXISTS activity_sessions (
        user_id TEXT PRIMARY KEY,
        session_start INTEGER,
        last_active INTEGER,
        activity_data TEXT
      )
    `)
    
    console.log('✅ Activity database connected!')
    
    return true
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return false
  }
}

// Get live user data - PRIORITIZE REAL BOT DATABASE
async function getUserData(userId) {
  console.log(`🔍 CRITICAL: Fetching REAL bot data for user: ${userId}`)
  
  // SKIP Supabase - Go straight to REAL bot database
  console.log('💰 INCOME CRITICAL: Using REAL bot SQLite database for live data')
  
  if (!mainDb) {
    console.error('❌ BUSINESS CRITICAL: Main database not connected - no income possible!')
    return null
  }
  
  try {
    console.log('💾 PRIORITY: Getting REAL user data from bot SQLite...')
    
    // Get REAL player data from your actual bot
    const player = mainDb.prepare(`
      SELECT 
        user_id,
        fragments,
        data_shards,
        level,
        xp,
        lives,
        daily_streak,
        last_daily,
        log_keys
      FROM players 
      WHERE user_id = ?
    `).get(userId)
    
    if (!player) {
      console.log(`🆕 NEW USER: Creating initial data for user ${userId}`)
      // Create new user in bot database
      try {
        mainDb.prepare(`
          INSERT INTO players (user_id, fragments, data_shards, level, xp, lives, daily_streak, log_keys)
          VALUES (?, 100, 0, 1, 0, 3, 0, 1)
        `).run(userId)
        console.log(`✅ NEW USER CREATED in bot database: ${userId}`)
        // Fetch the newly created user
        const newPlayer = mainDb.prepare(`
          SELECT user_id, fragments, data_shards, level, xp, lives, daily_streak, last_daily, log_keys
          FROM players WHERE user_id = ?
        `).get(userId)
        if (newPlayer) player = newPlayer
      } catch (createError) {
        console.warn(`⚠️ Could not create new user in readonly database: ${createError.message}`)
        return null
      }
    }
    
    if (!player) {
      console.error(`❌ Still no player data after creation attempt for ${userId}`)
      return null
    }
    
    // Get REAL user stats
    const stats = mainDb.prepare(`
      SELECT 
        messages_sent,
        commands_used,
        music_tracks_played,
        achievements_earned,
        music_time_listened,
        songs_queued,
        games_completed,
        daily_streak,
        social_interactions,
        unique_achievements
      FROM user_stats 
      WHERE user_id = ?
    `).get(userId) || {}
    
    // Get REAL achievements  
    const achievements = mainDb.prepare(`
      SELECT achievement_name, description, category, rarity, fragments_reward, unlocked_at, progress_data
      FROM achievements 
      WHERE user_id = ?
      ORDER BY unlocked_at DESC
    `).all(userId)
    
    // Get REAL active quests
    const quests = mainDb.prepare(`
      SELECT quest_id, name, description, quest_type, target, current_progress, reward, status, date_assigned
      FROM user_quests 
      WHERE user_id = ? AND status = 'active'
    `).all(userId)
    
    // Get REAL inventory items
    const inventory = mainDb.prepare(`
      SELECT item_id, quantity
      FROM player_items 
      WHERE user_id = ?
    `).all(userId)
    
    // Get REAL RPG data
    const rpgPlayer = mainDb.prepare(`
      SELECT class, level as rpg_level, experience, health, mana, strength, defense, agility, intelligence
      FROM rpg_players 
      WHERE user_id = ?
    `).get(userId)
    
    const userData = {
      user: {
        id: player.user_id,
        fragments: player.fragments || 0,
        data_shards: player.data_shards || 0,
        level: player.level || 1,
        xp: player.xp || 0,
        lives: player.lives || 3,
        daily_streak: player.daily_streak || 0,
        last_daily: player.last_daily,
        log_keys: player.log_keys || 1
      },
      stats: {
        messages_sent: stats.messages_sent || 0,
        commands_used: stats.commands_used || 0,
        music_tracks_played: stats.music_tracks_played || 0,
        achievements_earned: stats.achievements_earned || 0,
        music_time_listened: stats.music_time_listened || 0,
        songs_queued: stats.songs_queued || 0,
        games_completed: stats.games_completed || 0,
        daily_streak: stats.daily_streak || 0,
        social_interactions: stats.social_interactions || 0,
        unique_achievements: stats.unique_achievements || 0
      },
      achievements: achievements.map(a => ({
        name: a.achievement_name,
        description: a.description,
        category: a.category,
        rarity: a.rarity,
        fragments_reward: a.fragments_reward,
        unlocked_at: a.unlocked_at,
        progress_data: a.progress_data
      })),
      quests: quests.map(q => ({
        id: q.quest_id,
        name: q.name,
        description: q.description,
        type: q.quest_type,
        target: q.target,
        current_progress: q.current_progress,
        reward: q.reward,
        status: q.status,
        date_assigned: q.date_assigned
      })),
      inventory: inventory.map(i => ({
        item_id: i.item_id,
        quantity: i.quantity
      })),
      rpg: rpgPlayer ? {
        class: rpgPlayer.class,
        level: rpgPlayer.rpg_level,
        experience: rpgPlayer.experience,
        health: rpgPlayer.health,
        mana: rpgPlayer.mana,
        strength: rpgPlayer.strength,
        defense: rpgPlayer.defense,
        agility: rpgPlayer.agility,
        intelligence: rpgPlayer.intelligence
      } : null,
      source: 'REAL_BOT_DATABASE'
    }
    
    console.log(`💰 REAL USER DATA RETRIEVED FOR INCOME:`, {
      userId: userData.user.id,
      fragments: userData.user.fragments,
      level: userData.user.level,
      achievements: userData.achievements.length,
      quests: userData.quests.length,
      source: 'LIVE_BOT_DB'
    })
    
    return userData
    
  } catch (error) {
    console.error('❌ BUSINESS CRITICAL: Error fetching REAL user data:', error)
    return null
  }
  
  // Fallback to SQLite database  
  if (!mainDb) {
    console.error('❌ Main database not connected')
    return null
  }
  
  try {
    console.log('💾 Trying SQLite for live data...')
    
    // Get player data
    const player = mainDb.prepare(`
      SELECT 
        user_id,
        fragments,
        data_shards,
        level,
        xp,
        lives,
        daily_streak,
        last_daily
      FROM players 
      WHERE user_id = ?
    `).get(userId)
    
    if (!player) {
      console.log(`📋 No player data found for user ${userId}`)
      return null
    }
    
    // Get user stats
    const stats = mainDb.prepare(`
      SELECT 
        messages_sent,
        commands_used,
        music_tracks_played,
        ai_conversations,
        games_played
      FROM user_stats 
      WHERE user_id = ?
    `).get(userId)
    
    // Get achievements  
    const achievements = mainDb.prepare(`
      SELECT achievement_name, unlocked_at
      FROM achievements 
      WHERE user_id = ?
    `).all(userId)
    
    // Get active quests
    const quests = mainDb.prepare(`
      SELECT quest_name, progress, completed
      FROM user_quests 
      WHERE user_id = ?
    `).all(userId)
    
    // Get inventory items
    const inventory = mainDb.prepare(`
      SELECT item_id, quantity
      FROM player_items 
      WHERE user_id = ?
    `).all(userId)
    
    const userData = {
      user: {
        id: player.user_id,
        fragments: player.fragments || 0,
        data_shards: player.data_shards || 0,
        level: player.level || 1,
        xp: player.xp || 0,
        lives: player.lives || 3,
        daily_streak: player.daily_streak || 0,
        last_daily: player.last_daily
      },
      stats: stats || {
        messages_sent: 0,
        commands_used: 0,
        music_tracks_played: 0,
        ai_conversations: 0,
        games_played: 0
      },
      achievements: achievements.map(a => ({
        name: a.achievement_name,
        unlocked_at: a.unlocked_at
      })),
      quests: quests.map(q => ({
        name: q.quest_name,
        progress: q.progress,
        completed: q.completed === 1
      })),
      inventory: inventory.map(i => ({
        item_id: i.item_id,
        quantity: i.quantity
      }))
    }
    
    console.log(`✅ Live user data retrieved:`, {
      userId: userData.user.id,
      fragments: userData.user.fragments,
      level: userData.user.level,
      achievements: userData.achievements.length,
      quests: userData.quests.length
    })
    
    return userData
    
  } catch (error) {
    console.error('❌ Error fetching user data:', error)
    return null
  }
}

// Get user playlists from main bot database
function getUserPlaylists(userId) {
  if (!mainDb) {
    console.error('❌ Main database not connected')
    return []
  }
  
  try {
    console.log(`🎵 Fetching playlists for user: ${userId}`)
    
    const playlists = mainDb.prepare(`
      SELECT 
        playlist_id,
        name,
        track_data,
        guild_id
      FROM playlists 
      WHERE creator_id = ? OR is_public = 1
    `).all(userId)
    
    const formattedPlaylists = playlists.map(playlist => {
      let tracks = []
      try {
        tracks = JSON.parse(playlist.track_data || '[]')
      } catch (e) {
        console.warn(`Failed to parse track data for playlist ${playlist.playlist_id}`)
      }
      
      return {
        id: playlist.playlist_id.toString(),
        name: playlist.name,
        tracks: tracks.map((track, index) => ({
          id: `${playlist.playlist_id}-${index}`,
          title: track.title || 'Unknown Title',
          videoId: track.videoId || track.url?.split('v=')[1]?.split('&')[0] || '',
          duration: track.duration || '0:00',
          thumbnail: track.thumbnail || `https://img.youtube.com/vi/${track.videoId || ''}/hqdefault.jpg`
        })),
        thumbnail: tracks.length > 0 
          ? tracks[0].thumbnail || `https://img.youtube.com/vi/${tracks[0].videoId || ''}/hqdefault.jpg`
          : 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      }
    })
    
    console.log(`✅ Found ${formattedPlaylists.length} playlists for user ${userId}`)
    return formattedPlaylists
    
  } catch (error) {
    console.error('❌ Error fetching user playlists:', error)
    return []
  }
}

// Record activity session
function recordActivitySession(userId, activityData = {}) {
  if (!activityDb) {
    console.warn('⚠️ Activity database not connected')
    return false
  }
  
  try {
    const now = Date.now()
    
    activityDb.prepare(`
      INSERT OR REPLACE INTO activity_sessions 
      (user_id, session_start, last_active, activity_data)
      VALUES (?, ?, ?, ?)
    `).run(
      userId,
      now,
      now, 
      JSON.stringify(activityData)
    )
    
    console.log(`📝 Activity session recorded for user ${userId}`)
    return true
    
  } catch (error) {
    console.error('❌ Error recording activity session:', error)
    return false
  }
}

// Get all users with data (for admin)
function getAllUsers() {
  if (!mainDb) {
    return []
  }
  
  try {
    const users = mainDb.prepare(`
      SELECT 
        user_id,
        fragments,
        level,
        xp,
        lives
      FROM players 
      ORDER BY level DESC, fragments DESC
      LIMIT 100
    `).all()
    
    return users
    
  } catch (error) {
    console.error('❌ Error fetching all users:', error)
    return []
  }
}

// Export functions
module.exports = {
  initializeDatabases,
  getUserData,
  getUserPlaylists,
  recordActivitySession,
  getAllUsers,
  // Expose database connections for direct queries if needed
  getMainDb: () => mainDb,
  getActivityDb: () => activityDb
}