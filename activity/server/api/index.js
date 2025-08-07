// Vercel Serverless Function Handler
// This file handles all API routes for the Opure Discord Activity

export default async function handler(req, res) {
  console.log(`🚀 API Request: ${req.method} ${req.url}`)
  
  // Set CORS headers for Discord Activities
  const allowedOrigins = [
    'https://www.opure.uk',
    'https://opure.uk',
    'https://discord.com',
    'https://activities.discord.com',
    'https://1388207626944249856.discordsays.com',
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
  res.setHeader('Content-Security-Policy', 'frame-ancestors \'self\' https://discord.com https://*.discord.com https://activities.discord.com https://*.activities.discord.com https://*.discordsays.com;')
  
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
      return handleBotSync(req, res)
    }
    
    if (path.startsWith('/api/ai/chat')) {
      return handleAIChat(req, res)
    }
    
    if (path.startsWith('/api/music/')) {
      return handleMusic(req, res)
    }
    
    // 404 for unknown routes
    return res.status(404).json({
      error: 'Not Found',
      message: `Route ${path} not found`,
      availableRoutes: [
        '/',
        '/health', 
        '/api/auth/test',
        '/api/auth/discord',
        '/api/auth/callback',
        '/api/auth/activity-sync',
        '/api/bot/data',
        '/api/bot/sync/:userId',
        '/api/ai/chat',
        '/api/music/queue',
        '/api/music/now-playing'
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
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://api.opure.uk/api/auth/callback'
    
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
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://www.opure.uk'
    
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

function handleBotSync(req, res) {
  const userId = req.url.split('/').pop()
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    })
  }

  // Mock bot data for now
  const botData = {
    user: {
      id: userId,
      fragments: 100,
      data_shards: 0,
      level: 1,
      xp: 0,
      lives: 3
    },
    achievements: [],
    quests: [],
    stats: {
      messages_sent: 0,
      commands_used: 0,
      music_tracks_played: 0
    }
  }

  return res.json({
    success: true,
    data: botData,
    timestamp: new Date().toISOString()
  })
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

    // Fallback Scottish AI responses for demo
    const scottishResponses = [
      "Aye, that's a pure mental question! Rangers are the best team in Scotland, ken!",
      "Juice WRLD was a legend, rest in peace. His music still hits different, ye know?",
      "Opure.exe here, ready tae help! What's on yer mind?",
      "That's some proper Scottish wisdom right there! Rangers forever!",
      "Lucid Dreams by Juice WRLD - absolute banger, that one is!",
      "I'm buzzing like a proper Rangers fan on derby day!"
    ]

    const response = scottishResponses[Math.floor(Math.random() * scottishResponses.length)]

    return res.json({
      success: true,
      response: response,
      fallback: true,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('AI chat endpoint error:', error)
    return res.status(500).json({
      success: false,
      error: 'AI chat failed'
    })
  }
}

function handleMusic(req, res) {
  const path = req.url.split('?')[0]
  
  if (path.includes('/queue') && req.method === 'POST') {
    const { query, userId } = req.body
    
    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      })
    }

    return res.json({
      success: true,
      message: `Queued "${query}" for user ${userId}`,
      track: {
        title: query,
        duration: '3:45',
        url: `https://example.com/track/${encodeURIComponent(query)}`
      },
      timestamp: new Date().toISOString()
    })
  }
  
  if (path.includes('/now-playing') && req.method === 'GET') {
    return res.json({
      success: true,
      nowPlaying: {
        title: 'Lucid Dreams - Juice WRLD',
        artist: 'Juice WRLD',
        duration: '4:04',
        position: '2:30',
        url: 'https://example.com/track/lucid-dreams'
      },
      queue: [],
      timestamp: new Date().toISOString()
    })
  }
  
  return res.status(404).json({
    error: 'Music endpoint not found',
    available: ['/api/music/queue', '/api/music/now-playing']
  })
}