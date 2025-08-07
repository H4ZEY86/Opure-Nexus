// Serverless API endpoint to sync user data from real bot database
// This endpoint connects to the actual SQLite database at /mnt/d/Opure.exe/opure.db

const { getUserData, getUserPlaylists, getUserAchievements } = require('../../database.js')

// CORS headers for Discord Activity
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Discord-User-ID, X-Activity-Instance',
  'Access-Control-Max-Age': '86400'
}

export default async function handler(req, res) {
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key])
  })
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  const { userId } = req.query
  
  if (!userId) {
    console.log('❌ No user ID provided')
    return res.status(400).json({ 
      error: 'User ID required',
      source: 'api_error' 
    })
  }
  
  console.log(`🔄 SYNCING REAL BOT DATA FOR USER: ${userId}`)
  
  try {
    // Get all user data from real bot database
    const [userData, playlists, achievements] = await Promise.all([
      getUserData(userId),
      getUserPlaylists(userId),
      getUserAchievements(userId)
    ])
    
    console.log(`✅ REAL DATA RETRIEVED:`, {
      userId,
      fragments: userData?.fragments || 0,
      level: userData?.level || 1,
      playlistCount: playlists?.length || 0,
      achievementCount: achievements?.length || 0
    })
    
    const responseData = {
      user: userData,
      playlists,
      achievements,
      quests: [], // Add quest support later
      stats: {
        last_sync: Date.now(),
        data_source: 'real_bot_database',
        database_path: '/mnt/d/Opure.exe/opure.db'
      }
    }
    
    return res.status(200).json({
      success: true,
      data: responseData,
      source: 'real_bot_database',
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error(`❌ SYNC ERROR for user ${userId}:`, error)
    
    // Fallback data so Activity still works
    const fallbackData = {
      user: {
        fragments: 1000 + parseInt(userId.slice(-3)) || 1000,
        level: 5,
        xp: 250,
        lives: 3,
        data_shards: 10,
        daily_streak: 3
      },
      playlists: [],
      achievements: [],
      quests: [],
      stats: {
        last_sync: Date.now(),
        data_source: 'fallback_data',
        error: error.message
      }
    }
    
    return res.status(200).json({
      success: true,
      data: fallbackData,
      source: 'fallback_data',
      timestamp: Date.now(),
      warning: 'Database connection failed, using fallback data'
    })
  }
}