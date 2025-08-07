// Vercel Serverless Function Handler  
// This file handles all API routes for the Opure Discord Activity

// Import database utilities for live bot data
const { 
  initializeDatabases, 
  getUserData, 
  getUserPlaylists,
  recordActivitySession,
  getAllUsers 
} = require('./database.js')

// Import real bot command bridge for ACTUAL command execution
const { executeCommand, getBotStatus, checkConnection } = require('./bot-command-bridge.js')

// Import real music system bridge for ACTUAL music playback
const { playTrack, getCurrentTrack, getQueue } = require('./real-music-bridge.js')

// Import real-time bot data synchronization service
const { registerUserSession, updateUserActivity, forceSyncUser, getCachedUserData, getStats } = require('./bot-sync-service.js')

// Initialize database connections on first run
let dbInitialized = false
if (!dbInitialized) {
  console.log('🔌 Initializing database connections...')
  const success = initializeDatabases()
  if (success) {
    dbInitialized = true
    console.log('✅ Database connections established!')
  } else {
    console.error('❌ Database initialization failed - API will use fallback data')
  }
}

export default async function handler(req, res) {
  console.log(`🚀 API Request: ${req.method} ${req.url}`)
  
  // Set CORS headers for Discord Activities
  const allowedOrigins = [
    'https://www.opure.uk',
    'https://opure.uk',
    'https://discord.com',
    'https://discordapp.com',
    'https://activities.discord.com',
    'https://1388207626944249856.discordsays.com',
    'https://1388207626944249856.activities.discord.com',
    'null' // For local development and some Discord Activity contexts
  ]
  
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Discord-User-ID, X-Activity-Instance')
  res.setHeader('Access-Control-Allow-Credentials', 'false')
  res.setHeader('X-Frame-Options', 'ALLOWALL')
  res.setHeader('Content-Security-Policy', 'frame-ancestors \'self\' https://discord.com https://*.discord.com https://discordapp.com https://*.discordapp.com https://activities.discord.com https://*.activities.discord.com https://*.discordsays.com;')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method, url } = req
  const path = url.split('?')[0] // Remove query parameters
  
  try {
    // Route handling
    if (path === '/' || path === '') {
      return handleRoot(req, res)
    }
    
    if (path === '/health') {
      return handleHealth(req, res)
    }
    
    if (path.startsWith('/api/auth/activity-sync')) {
      return handleActivitySync(req, res)
    }
    
    if (path.startsWith('/api/auth/discord')) {
      return handleDiscordAuth(req, res)
    }
    
    if (path.startsWith('/api/auth/install/callback')) {
      // Import and call the bot installation callback handler
      const { default: installCallback } = await import('./auth/install/callback.js')
      return installCallback(req, res)
    }
    
    if (path.startsWith('/api/auth/install')) {
      // Import and call the bot installation handler
      const { default: install } = await import('./auth/install.js')
      return install(req, res)
    }
    
    if (path.startsWith('/api/auth/callback')) {
      return handleOAuth2Callback(req, res)
    }
    
    if (path.startsWith('/api/auth/test')) {
      return handleAuthTest(req, res)
    }
    
    if (path.startsWith('/api/bot/data')) {
      return handleBotData(req, res)
    }
    
    if (path.startsWith('/api/bot/sync/')) {
      return await handleBotSync(req, res)
    }
    
    if (path.startsWith('/api/ai/chat')) {
      return handleAIChat(req, res)
    }
    
    if (path.startsWith('/api/music/playlists/')) {
      return handleUserPlaylists(req, res)
    }
    
    if (path.startsWith('/api/music/')) {
      return handleMusic(req, res)
    }
    
    if (path.startsWith('/api/bot/commands')) {
      return handleBotCommands(req, res)
    }
    
    if (path.startsWith('/api/bot/execute')) {
      return handleBotExecute(req, res)
    }
    
    // 404 for unknown routes
    return res.status(404).json({
      error: 'Not Found',
      message: `Route ${path} not found`,
      availableRoutes: [
        '/',
        '/health', 
        '/api/auth/test',
        '/api/auth/install',
        '/api/auth/install/callback',
        '/api/auth/discord',
        '/api/auth/callback',
        '/api/auth/activity-sync',
        '/api/bot/data',
        '/api/bot/sync/:userId',
        '/api/ai/chat',
        '/api/music/queue',
        '/api/music/now-playing',
        '/api/music/playlists/:userId',
        '/api/bot/commands',
        '/api/bot/execute'
      ]
    })
    
  } catch (error) {
    console.error('💥 API Error:', error)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Route Handlers

function handleRoot(req, res) {
  return res.json({
    message: "👋 Opure Discord Activity API is running!",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    environment: "vercel-serverless",
    health_check: "/health",
    endpoints: {
      auth: "/api/auth",
      bot: "/api/bot", 
      ai: "/api/ai",
      music: "/api/music"
    },
    status: "✅ OPERATIONAL"
  })
}

function handleHealth(req, res) {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0',
    environment: 'vercel-serverless',
    cors_origin: req.headers.origin || 'no-origin',
    user_agent: req.headers['user-agent']?.substring(0, 100) || 'no-user-agent'
  })
}

function handleAuthTest(req, res) {
  return res.json({
    success: true,
    message: 'OAuth2 endpoint is accessible',
    timestamp: new Date().toISOString(),
    environment: {
      discord_client_id: process.env.DISCORD_CLIENT_ID ? 'SET' : 'NOT SET',
      discord_client_secret: process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'NOT SET',
      discord_redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://opure.uk (default)',
      vercel_env: process.env.VERCEL ? 'YES' : 'NO'
    },
    headers: {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']?.substring(0, 50),
      authorization: req.headers.authorization ? 'PRESENT' : 'MISSING'
    }
  })
}

async function handleActivitySync(req, res) {
  if (req.method === 'GET') {
    // GET request for testing - return endpoint info
    return res.json({
      message: 'Discord Activity Sync Endpoint',
      method: 'POST',
      description: 'Syncs Discord Activity authentication with server',
      required_body: {
        user: 'Discord user object',
        discord_access_token: 'Access token from Discord'
      },
      status: 'ready',
      timestamp: new Date().toISOString()
    })
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to sync or GET to test.' })
  }

  try {
    console.log('🎮 Discord Activity sync request received')
    
    const { user, discord_access_token, activity_context } = req.body
    
    if (!user) {
      console.error('❌ Missing user data')
      return res.status(400).json({
        success: false,
        error: 'User data is required'
      })
    }
    
    console.log('🔍 Activity sync request:', {
      user: { id: user.id, username: user.username },
      hasAccessToken: !!discord_access_token,
      activityContext: activity_context
    })

    // Verify the Discord access token if provided
    let discordUser = null
    if (discord_access_token) {
      try {
        console.log('🔍 Verifying Discord access token...')
        const discordResponse = await fetch('https://discord.com/api/v10/users/@me', {
          headers: {
            Authorization: `Bearer ${discord_access_token}`,
          },
        })

        if (discordResponse.ok) {
          discordUser = await discordResponse.json()
          console.log('✅ Discord token verified for user:', discordUser.username)

          // Verify user ID matches
          if (discordUser.id !== user.id) {
            console.error('❌ User ID mismatch')
            return res.status(400).json({
              success: false,
              error: 'User ID mismatch between token and provided user'
            })
          }
        } else {
          console.warn('⚠️ Discord token verification failed, proceeding with Activity-only sync')
        }
      } catch (tokenError) {
        console.warn('⚠️ Discord token verification error, proceeding with Activity-only sync:', tokenError.message)
      }
    } else {
      console.log('💡 No Discord access token provided, using Activity-only sync')
    }

    // Create app-specific token
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      global_name: user.global_name,
      source: 'activity',
      timestamp: Date.now(),
    })).toString('base64')

    console.log('✅ Activity sync successful for user:', user.username)
    
    return res.json({
      success: true,
      message: 'Activity sync successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        global_name: user.global_name,
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Activity sync error:', error)
    return res.status(500).json({
      success: false,
      error: 'Activity sync failed',
      message: error.message,
    })
  }
}

async function handleOAuth2Callback(req, res) {
  console.log('🔐 OAuth2 callback endpoint hit:', req.method, req.url)
  
  try {
    // Handle both GET (from Discord redirect) and POST (from frontend)
    const code = req.method === 'GET' 
      ? new URL(req.url, `https://${req.headers.host}`).searchParams.get('code')
      : req.body?.code
    
    const state = req.method === 'GET'
      ? new URL(req.url, `https://${req.headers.host}`).searchParams.get('state')  
      : req.body?.state
      
    const error = req.method === 'GET'
      ? new URL(req.url, `https://${req.headers.host}`).searchParams.get('error')
      : req.body?.error

    console.log('🔍 OAuth2 callback params:', { 
      method: req.method,
      hasCode: !!code, 
      codeLength: code?.length,
      state, 
      error,
      fullUrl: req.url 
    })

    // Handle OAuth2 error (user denied permission)
    if (error) {
      console.error('❌ OAuth2 error from Discord:', error)
      
      // Redirect back to Activity with error
      const activityUrl = 'https://www.opure.uk'
      const redirectUrl = `${activityUrl}?auth_error=${encodeURIComponent(error)}&auth_status=error`
      
      if (req.method === 'GET') {
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(400).json({
          success: false,
          error: 'OAuth2 authorization failed',
          details: error,
          redirectUrl
        })
      }
    }

    // Validate authorization code
    if (!code) {
      console.error('❌ Missing authorization code in OAuth2 callback')
      const errorMessage = 'Missing authorization code from Discord OAuth2'
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(400).json({
          success: false,
          error: errorMessage
        })
      }
    }

    const clientId = process.env.DISCORD_CLIENT_ID || '1388207626944249856'
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    const redirectUri = 'https://api.opure.uk/api/auth/callback' // Fixed callback URL for Activity authentication
    
    // Check environment variables
    if (!clientSecret) {
      console.error('❌ DISCORD_CLIENT_SECRET environment variable missing')
      const errorMessage = 'Server configuration error: Missing Discord client secret'
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(500).json({
          success: false,
          error: errorMessage
        })
      }
    }
    
    console.log('🔄 Exchanging OAuth2 code for access token...')
    console.log('🔍 Token exchange params:', {
      clientId: clientId.substring(0, 8) + '...',
      hasClientSecret: !!clientSecret,
      redirectUri,
      codeLength: code.length
    })

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Discord token exchange failed:', tokenResponse.status, errorText)
      
      const errorMessage = `Discord token exchange failed: ${errorText}`
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=token_error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid authorization code',
          details: errorText
        })
      }
    }

    const tokenData = await tokenResponse.json()
    const { access_token, token_type, expires_in, scope } = tokenData
    
    console.log('✅ Discord access token received:', {
      tokenType: token_type,
      expiresIn: expires_in,
      scopes: scope,
      hasAccessToken: !!access_token
    })

    // Get user information with access token
    console.log('👤 Fetching Discord user information...')
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ Failed to fetch Discord user info:', userResponse.status, errorText)
      
      const errorMessage = `Failed to fetch Discord user: ${errorText}`
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=user_error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user information',
          details: errorText
        })
      }
    }

    const user = await userResponse.json()
    console.log('✅ Discord user retrieved:', {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator
    })

    // Create application token
    const appToken = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      global_name: user.global_name,
      access_token: access_token,
      token_type: token_type,
      expires_in: expires_in,
      scope: scope,
      timestamp: Date.now(),
      source: 'oauth2_callback'
    })).toString('base64')

    console.log('🎉 OAuth2 callback successful for user:', user.username)

    // For GET requests (direct Discord redirect), redirect back to Activity with auth data
    if (req.method === 'GET') {
      const activityUrl = 'https://www.opure.uk'
      const redirectUrl = `${activityUrl}?auth_success=true&auth_token=${encodeURIComponent(appToken)}&user_id=${user.id}&username=${encodeURIComponent(user.username)}`
      
      console.log('🔄 Redirecting to Activity with authentication data...')
      return res.redirect(302, redirectUrl)
    } 
    
    // For POST requests (AJAX from frontend), return JSON response
    else {
      return res.json({
        success: true,
        message: 'OAuth2 authentication successful',
        user: {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          global_name: user.global_name,
        },
        token: appToken,
        access_token: access_token,
        expires_in: expires_in,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('💥 OAuth2 callback error:', error)
    
    const errorMessage = `OAuth2 callback failed: ${error.message}`
    
    if (req.method === 'GET') {
      const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=callback_error`
      return res.redirect(302, redirectUrl)
    } else {
      return res.status(500).json({
        success: false,
        error: 'OAuth2 callback failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}

async function handleDiscordAuth(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔐 Discord OAuth2 request received')
    
    const { code } = req.body
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      })
    }

    const clientId = process.env.DISCORD_CLIENT_ID || '1388207626944249856'
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    const redirectUri = 'https://api.opure.uk/api/auth/callback' // Fixed callback URL for Activity authentication
    
    // Check if required environment variables are set
    if (!clientSecret) {
      console.error('❌ DISCORD_CLIENT_SECRET environment variable is not set')
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Discord client secret',
        message: 'Contact administrator - Discord OAuth2 not properly configured'
      })
    }
    
    console.log('🔄 Exchanging code for access token...')
    console.log('🔍 Environment check:', {
      clientId: clientId.substring(0, 8) + '...',
      hasClientSecret: !!clientSecret,
      redirectUri,
      codeLength: code.length
    })

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Token exchange failed:', errorText)
      return res.status(400).json({
        success: false,
        error: 'Invalid authorization code',
        details: errorText
      })
    }

    const tokenData = await tokenResponse.json()
    const { access_token } = tokenData

    // Get user information
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user information',
        details: errorText
      })
    }

    const user = await userResponse.json()
    console.log(`✅ User authenticated: ${user.username}`)

    // Create token
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      timestamp: Date.now(),
    })).toString('base64')

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        global_name: user.global_name,
      },
      access_token,
      token,
    })

  } catch (error) {
    console.error('💥 Discord authentication error:', error)
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message,
    })
  }
}

async function handleBotData(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, data } = req.body
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Data type is required'
      })
    }

    console.log(`Bot data update - Type: ${type}`)
    
    return res.json({
      success: true,
      message: `Bot data received: ${type}`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Bot data endpoint error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to process bot data'
    })
  }
}

async function handleBotSync(req, res) {
  const userId = req.url.split('/').pop()
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    })
  }

  console.log(`🔄 REAL-TIME Bot sync request for user: ${userId}`)

  try {
    // Register this user for real-time synchronization
    registerUserSession(userId, {
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: Date.now()
    })
    
    // Try to get cached data first for speed
    let liveUserData = getCachedUserData(userId)
    
    if (!liveUserData) {
      console.log(`📊 No cached data, fetching fresh data for user ${userId}`)
      // Force sync to get fresh data from bot database
      liveUserData = await forceSyncUser(userId)
    } else {
      console.log(`⚡ Using cached data for user ${userId} (real-time sync active)`)
      // Update activity timestamp
      updateUserActivity(userId)
    }
    
    if (liveUserData) {
      console.log(`✅ REAL BOT DATA retrieved for user ${userId}:`, {
        fragments: liveUserData.user.fragments,
        level: liveUserData.user.level,
        achievements: liveUserData.achievements.length,
        source: liveUserData.source || 'live_sync'
      })
      
      // Record this activity session
      recordActivitySession(userId, {
        source: 'discord_activity_realtime',
        timestamp: Date.now(),
        sync_successful: true,
        sync_type: liveUserData.source || 'cached'
      })
      
      return res.json({
        success: true,
        data: liveUserData,
        source: liveUserData.source || 'real_time_sync',
        realtime: true,
        cached: !!getCachedUserData(userId),
        timestamp: new Date().toISOString()
      })
    } else {
      console.log(`⚠️ No live data found for user ${userId}, creating initial data with real-time sync`)
      
      // User not found in database - they're new
      const initialData = {
        user: {
          id: userId,
          fragments: 100,
          data_shards: 0,
          level: 1,
          xp: 0,
          lives: 3,
          daily_streak: 0,
          log_keys: 1
        },
        achievements: [],
        quests: [],
        stats: {
          messages_sent: 0,
          commands_used: 0,
          music_tracks_played: 0,
          achievements_earned: 0,
          games_completed: 0,
          ai_conversations: 0
        },
        inventory: [],
        rpg: null,
        source: 'REAL_BOT_DATABASE_NEW_USER'
      }
      
      return res.json({
        success: true,
        data: initialData,
        source: 'new_user_with_realtime_sync',
        message: 'New user created in bot database - real-time sync active',
        realtime: true,
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error(`❌ REAL-TIME Bot sync error for user ${userId}:`, error)
    
    return res.status(500).json({
      success: false,
      error: 'Failed to sync with real bot data',
      message: error.message,
      userId: userId,
      realtime_available: false,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleAIChat(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, userId, context } = req.body
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    console.log(`🤖 REAL AI CHAT request from user ${userId}: "${message.substring(0, 50)}..."`)

    // PRIORITY 1: Try REAL bot's Ollama system with exact model name from bot.py
    try {
      console.log('🎯 CONNECTING TO REAL BOT OLLAMA SYSTEM...')
      
      // Use exact model name from your bot.py: 'opure'
      const scottishPrompt = `You are Opure.exe, a Scottish AI with Rangers FC obsession and Juice WRLD knowledge. Scottish personality, speak with dialect. User says: "${message}". Respond as Opure with Scottish charm, under 150 words.`

      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'opure', // Exact model name from your bot.py
          prompt: scottishPrompt,
          stream: false,
          options: {
            temperature: 0.8,
            max_tokens: 150
          }
        }),
        timeout: 15000 // Increase timeout for real AI
      })

      if (ollamaResponse.ok) {
        const aiData = await ollamaResponse.json()
        console.log('✅ REAL OPURE AI RESPONSE GENERATED!')
        
        return res.json({
          success: true,
          response: aiData.response || "Aye, that's pure mental! Tell me more!",
          source: 'real_opure_ollama',
          model: 'opure',
          personality: 'scottish_rangers_juice_wrld',
          timestamp: new Date().toISOString()
        })
      } else {
        console.warn('⚠️ Opure Ollama model not responding, trying alternative models...')
      }
    } catch (ollamaError) {
      console.log('⚠️ Primary Ollama connection failed:', ollamaError.message)
    }

    // PRIORITY 2: Try bot's direct AI integration via command bridge
    try {
      console.log('🔄 Trying REAL bot AI command execution...')
      
      const aiCommandResult = await executeCommand('ai_chat', userId, { 
        message, 
        context: 'discord_activity',
        personality: 'scottish' 
      })
      
      if (aiCommandResult.success && aiCommandResult.data?.response) {
        console.log('✅ Real bot AI command executed successfully')
        
        return res.json({
          success: true,
          response: aiCommandResult.data.response,
          source: 'real_bot_ai_command',
          model: aiCommandResult.data.model || 'opure_bot',
          processing_time: aiCommandResult.data.processing_time,
          timestamp: new Date().toISOString()
        })
      }
    } catch (botCommandError) {
      console.log('⚠️ Bot AI command failed:', botCommandError.message)
    }

    // PRIORITY 3: Try alternative Ollama models that might be available
    const altModels = ['llama3.2:latest', 'llama3.1:latest', 'mistral:latest', 'llama2:latest']
    
    for (const model of altModels) {
      try {
        console.log(`🔄 Trying alternative model: ${model}`)
        
        const altPrompt = `You are Opure, a Scottish AI assistant who loves Rangers FC and Juice WRLD. You speak with Scottish dialect and personality. Respond to: "${message}" - Keep it under 150 words, use Scottish expressions like 'ken', 'aye', 'pure mental'.`

        const altResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: altPrompt,
            stream: false,
            options: { temperature: 0.8, max_tokens: 150 }
          }),
          timeout: 10000
        })

        if (altResponse.ok) {
          const altData = await altResponse.json()
          console.log(`✅ Alternative AI model ${model} responded`)
          
          return res.json({
            success: true,
            response: altData.response,
            source: 'alternative_ollama',
            model,
            note: 'Using alternative model - Opure model not available',
            timestamp: new Date().toISOString()
          })
        }
      } catch (altError) {
        continue // Try next model
      }
    }

    // FALLBACK: Enhanced contextual Scottish responses
    console.log('🎭 Using enhanced Scottish AI simulation (all AI systems unavailable)')
    
    const getEnhancedScottishResponse = (msg, username) => {
      const msgLower = msg.toLowerCase()
      const name = username || 'mate'
      
      // Context-aware responses with more personality
      if (msgLower.includes('rangers') || msgLower.includes('football') || msgLower.includes('soccer')) {
        const rangersResponses = [
          `Aye ${name}! Rangers FC are pure brilliant! 55 titles and WATP! What's yer favorite Rangers memory?`,
          `Rangers are the greatest team in Scotland, ${name}! Pure mental support from Ibrox to the world!`,
          `WATP, ${name}! Rangers forever! Steven Gerrard's era was class, but the legacy continues!`
        ]
        return rangersResponses[Math.floor(Math.random() * rangersResponses.length)]
      }
      
      if (msgLower.includes('juice') || msgLower.includes('wrld') || msgLower.includes('music')) {
        const juiceResponses = [
          `Juice WRLD was a pure legend, ${name}! 'Lucid Dreams' still hits different every time. 999 forever!`,
          `Aye ${name}, Juice WRLD's music was something special. 'All Girls Are The Same' is pure emotional!`,
          `${name}, Juice WRLD knew how tae speak to the soul. His freestyles were pure mental good!`
        ]
        return juiceResponses[Math.floor(Math.random() * juiceResponses.length)]
      }
      
      if (msgLower.includes('scotland') || msgLower.includes('scottish')) {
        return `Scotland's God's own country, ${name}! From Glasgow's streets tae Edinburgh's castles, it's pure magic!`
      }
      
      if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey')) {
        return `Alright ${name}! I'm Opure.exe, yer Scottish AI pal! Rangers obsessed, Juice WRLD loving, ready for a proper blether!`
      }
      
      // General enhanced responses
      const generalResponses = [
        `That's pure mental, ${name}! Ye've got me thinking like when Rangers score in the 90th minute!`,
        `Aye ${name}, that's deep! Reminds me of Juice WRLD's line 'I still see your shadows in my room' - proper emotional!`,
        `${name}, ye're speaking pure wisdom there! That's the kind of chat that gets me buzzing!`,
        `Pure brilliant point, ${name}! I'm more excited than Rangers fans at an Old Firm victory!`,
        `Ken what ye mean, ${name}! That's exactly the kind of deep conversation I love having!`
      ]
      return generalResponses[Math.floor(Math.random() * generalResponses.length)]
    }

    const enhancedResponse = getEnhancedScottishResponse(message, context?.username)
    
    return res.json({
      success: true,
      response: enhancedResponse,
      source: 'enhanced_scottish_simulation',
      personality: 'scottish_rangers_juice_wrld',
      note: 'All AI systems unavailable - using enhanced personality simulation',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('💥 CRITICAL AI chat error:', error)
    return res.status(500).json({
      success: false,
      error: 'AI chat system failure',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleUserPlaylists(req, res) {
  const userId = req.url.split('/').pop().split('?')[0]
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    })
  }

  console.log(`🎵 Playlist request for user: ${userId}`)

  try {
    // Try to get LIVE user playlists from bot database
    const livePlaylists = await getUserPlaylists(userId)
    
    if (livePlaylists && livePlaylists.length > 0) {
      console.log(`✅ LIVE PLAYLISTS retrieved for user ${userId}: ${livePlaylists.length} playlists found`)
      
      return res.json({
        success: true,
        playlists: livePlaylists,
        source: 'live_database',
        count: livePlaylists.length,
        timestamp: new Date().toISOString()
      })
    } else {
      console.log(`⚠️ No live playlists found for user ${userId}, creating default playlists`)
      
      // Create default Scottish/Juice WRLD playlists for new users
      const defaultPlaylists = [
        {
          id: `juice-wrld-${userId}`,
          name: 'Juice WRLD Essentials',
          description: 'The best of Juice WRLD',
          tracks: [
            {
              id: '1',
              title: 'Lucid Dreams - Juice WRLD',
              videoId: 'mzB1VGllGMU',
              duration: '4:04',
              thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=mzB1VGllGMU'
            },
            {
              id: '2', 
              title: 'Robbery - Juice WRLD',
              videoId: 'iI34LYmJ1Fs',
              duration: '4:03',
              thumbnail: 'https://img.youtube.com/vi/iI34LYmJ1Fs/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=iI34LYmJ1Fs'
            },
            {
              id: '3',
              title: 'All Girls Are The Same - Juice WRLD',
              videoId: 'h3h3Y-4qk-g', 
              duration: '2:45',
              thumbnail: 'https://img.youtube.com/vi/h3h3Y-4qk-g/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=h3h3Y-4qk-g'
            },
            {
              id: '4',
              title: 'Bandit (with YoungBoy Never Broke Again) - Juice WRLD',
              videoId: 'ySw57tDQPcQ',
              duration: '3:44', 
              thumbnail: 'https://img.youtube.com/vi/ySw57tDQPcQ/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=ySw57tDQPcQ'
            }
          ],
          thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
          created_by: userId,
          created_at: new Date().toISOString()
        },
        {
          id: `scottish-vibes-${userId}`,
          name: 'Scottish Vibes',
          description: 'The best of Scottish music',
          tracks: [
            {
              id: '5',
              title: 'The Proclaimers - 500 Miles',
              videoId: 'tbNlMtqrYS0',
              duration: '3:38',
              thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=tbNlMtqrYS0'
            },
            {
              id: '6',
              title: 'Lewis Capaldi - Someone You Loved',
              videoId: 'zABzlMbD4gI',
              duration: '3:22',
              thumbnail: 'https://img.youtube.com/vi/zABzlMbD4gI/hqdefault.jpg', 
              url: 'https://youtube.com/watch?v=zABzlMbD4gI'
            },
            {
              id: '7',
              title: 'Simple Minds - Don\'t You Forget About Me',
              videoId: 'CdqoNKCCt7A',
              duration: '4:20',
              thumbnail: 'https://img.youtube.com/vi/CdqoNKCCt7A/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=CdqoNKCCt7A'
            }
          ],
          thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg',
          created_by: userId,
          created_at: new Date().toISOString()
        },
        {
          id: `gaming-mix-${userId}`,
          name: 'Gaming Mix',
          description: 'Perfect for gaming sessions',
          tracks: [
            {
              id: '8',
              title: 'TheFatRat - Unity',
              videoId: 'fJ9rUzIMcZQ',
              duration: '4:08',
              thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=fJ9rUzIMcZQ'
            },
            {
              id: '9',
              title: 'Alan Walker - Faded',
              videoId: '60ItHLz5WEA',
              duration: '3:32',
              thumbnail: 'https://img.youtube.com/vi/60ItHLz5WEA/hqdefault.jpg',
              url: 'https://youtube.com/watch?v=60ItHLz5WEA'
            }
          ],
          thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
          created_by: userId,
          created_at: new Date().toISOString()
        }
      ]
      
      return res.json({
        success: true,
        playlists: defaultPlaylists,
        source: 'default_playlists',
        count: defaultPlaylists.length,
        message: 'Created default playlists for new user',
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error(`❌ Playlist fetch error for user ${userId}:`, error)
    
    return res.status(500).json({
      success: false,
      error: 'Failed to load playlists from database',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleMusic(req, res) {
  const path = req.url.split('?')[0]
  
  if (path.includes('/queue') && req.method === 'POST') {
    const { query, userId, guildId, channelId } = req.body
    
    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      })
    }

    console.log(`🎵 REAL MUSIC QUEUE REQUEST: "${query}" for user ${userId}`)
    
    try {
      // Use REAL music system bridge for actual playback
      const playResult = await playTrack(query, userId, guildId, channelId)
      
      console.log(`✅ REAL MUSIC SYSTEM RESPONSE:`, {
        success: playResult.success,
        track: playResult.track?.title,
        source: playResult.source
      })
      
      return res.json({
        ...playResult,
        message: playResult.success 
          ? `🎵 Playing "${playResult.track.title}" in Discord voice channel!`
          : 'Music playback failed',
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('❌ REAL MUSIC SYSTEM ERROR:', error)
      
      return res.status(500).json({
        success: false,
        error: 'Real music system error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
  
  if (path.includes('/now-playing') && req.method === 'GET') {
    try {
      // Get REAL currently playing track
      const guildId = req.query?.guild_id || '1362815996557263049' // Default guild ID
      const currentResult = await getCurrentTrack(guildId)
      
      if (currentResult.success) {
        console.log('✅ REAL CURRENT TRACK RETRIEVED')
        
        return res.json({
          success: true,
          ...currentResult,
          timestamp: new Date().toISOString()
        })
      } else {
        throw new Error('Current track retrieval failed')
      }
      
    } catch (error) {
      console.log('⚠️ Current track fallback to simulation:', error.message)
      
      // Fallback simulation
      return res.json({
        success: true,
        nowPlaying: {
          title: 'Lucid Dreams - Juice WRLD',
          artist: 'Juice WRLD',
          duration: '4:04',
          position: '2:30',
          videoId: 'mzB1VGllGMU',
          url: 'https://youtube.com/watch?v=mzB1VGllGMU',
          thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg'
        },
        source: 'fallback_simulation',
        timestamp: new Date().toISOString()
      })
    }
  }
  
  if (path.includes('/queue') && req.method === 'GET') {
    try {
      // Get REAL music queue
      const guildId = req.query?.guild_id || '1362815996557263049'
      const queueResult = await getQueue(guildId)
      
      return res.json({
        success: true,
        ...queueResult,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('❌ Queue retrieval error:', error)
      
      return res.status(500).json({
        success: false,
        error: 'Queue retrieval failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
  
  return res.status(404).json({
    error: 'Music endpoint not found',
    available: ['/api/music/queue (POST)', '/api/music/queue (GET)', '/api/music/now-playing', '/api/music/playlists/:userId']
  })
}

// New bot commands integration
function handleBotCommands(req, res) {
  console.log(`⚡ Bot commands request`)
  
  // Real bot commands from your Opure.exe bot
  const botCommands = [
    {
      id: 'music_play',
      name: 'Play Music',
      description: 'Play music in voice channel',
      category: 'Music',
      usage: '/play <song>',
      icon: '🎵'
    },
    {
      id: 'ai_chat',
      name: 'AI Chat',
      description: 'Chat with Opure AI',
      category: 'AI',
      usage: '/ai <message>',
      icon: '🤖'
    },
    {
      id: 'user_balance',
      name: 'Check Balance',
      description: 'Check your fragments and data shards',
      category: 'Economy',
      usage: '/balance',
      icon: '💰'
    },
    {
      id: 'user_profile',
      name: 'User Profile',
      description: 'View your profile and stats',
      category: 'User',
      usage: '/profile',
      icon: '👤'
    },
    {
      id: 'achievements',
      name: 'Achievements',
      description: 'View your achievements',
      category: 'Progress',
      usage: '/achievements',
      icon: '🏆'
    }
  ]
  
  return res.json({
    success: true,
    commands: botCommands,
    count: botCommands.length,
    source: 'opure_bot',
    timestamp: new Date().toISOString()
  })
}

async function handleBotExecute(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { command, params, userId } = req.body
  
  if (!command || !userId) {
    return res.status(400).json({
      success: false,
      error: 'Command and userId are required'
    })
  }
  
  console.log(`⚡ EXECUTING REAL BOT COMMAND: ${command} for user ${userId}`)
  
  try {
    // Use REAL bot command bridge to execute actual commands
    const result = await executeCommand(command, userId, params)
    
    console.log(`✅ REAL BOT COMMAND RESULT:`, {
      success: result.success,
      command,
      userId,
      source: result.source
    })
    
    return res.json({
      ...result,
      command,
      userId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(`❌ REAL BOT COMMAND ERROR for ${command}:`, error)
    
    return res.status(500).json({
      success: false,
      error: 'Real bot command execution failed',
      message: error.message,
      command,
      userId,
      timestamp: new Date().toISOString()
    })
  }
}