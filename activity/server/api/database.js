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

// Get live user data - tries Supabase first, then SQLite
async function getUserData(userId) {
  console.log(`🔍 Fetching live data for user: ${userId}`)
  
  // Try Supabase first for real-time cloud data
  if (supabaseClient) {
    try {
      console.log('🌐 Trying Supabase for live data...')
      
      const { data: supabaseUser, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('discord_id', userId)
        .single()
      
      if (!error && supabaseUser) {
        console.log(`✅ SUPABASE DATA found for user ${userId}:`, {
          fragments: supabaseUser.fragments,
          level: supabaseUser.level
        })
        
        // Format Supabase data to match expected structure
        return {
          user: {
            id: supabaseUser.discord_id,
            fragments: supabaseUser.fragments || 0,
            data_shards: supabaseUser.data_shards || 0,
            level: supabaseUser.level || 1,
            xp: supabaseUser.xp || 0,
            lives: supabaseUser.lives || 3,
            daily_streak: supabaseUser.daily_streak || 0,
            last_daily: supabaseUser.last_daily
          },
          stats: {
            messages_sent: supabaseUser.messages_sent || 0,
            commands_used: supabaseUser.commands_used || 0,
            music_tracks_played: supabaseUser.music_tracks_played || 0,
            ai_conversations: supabaseUser.ai_conversations || 0,
            games_played: supabaseUser.games_played || 0
          },
          achievements: supabaseUser.achievements || [],
          quests: supabaseUser.quests || [],
          inventory: supabaseUser.inventory || [],
          source: 'supabase'
        }
      } else {
        console.log(`📋 No Supabase data for user ${userId}, trying SQLite...`)
      }
    } catch (supabaseError) {
      console.log('⚠️ Supabase query failed, falling back to SQLite:', supabaseError.message)
    }
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