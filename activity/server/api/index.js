const express = require('express')
const cors = require('cors')

const app = express()

// Enhanced CORS configuration for Discord Activities
app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 CORS origin check:', origin)
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      process.env.CLIENT_URL || "http://localhost:3000",
      "https://opure.uk", // Your client domain
      "https://discord.com",
      "https://ptb.discord.com", 
      "https://canary.discord.com",
      // Discord Activities run in iframes with these origins
      "https://activities.discord.com",
      "https://activities.staging.discord.co",
      "null", // Discord Activities often show as null origin in iframe context
    ]
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.includes(origin) || 
                     /\.discord\.com$/.test(origin) ||
                     /\.discord\.co$/.test(origin)
    
    if (isAllowed) {
      console.log('✅ CORS origin allowed:', origin)
      callback(null, true)
    } else {
      console.log('❌ CORS origin blocked:', origin)
      // For Discord Activities, we'll allow it anyway due to iframe constraints
      callback(null, true)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
    cors_origin: req.headers.origin || 'no-origin',
    user_agent: req.headers['user-agent']
  })
})

// Test endpoint for OAuth2 debugging
app.get('/api/auth/test', (req, res) => {
  res.json({
    success: true,
    message: 'OAuth2 endpoint is accessible',
    headers: req.headers,
    timestamp: new Date().toISOString(),
    environment: {
      discord_client_id: process.env.DISCORD_CLIENT_ID ? 'SET' : 'NOT SET',
      discord_client_secret: process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'NOT SET',
      discord_redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://opure.uk (default)',
    }
  })
})

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: "👋 Opure Discord Activity API is running!",
    health_check: "/health",
    docs: "/api-docs",
    endpoints: {
      auth: "/api/auth",
      music: "/api/music"
    }
  })
})

// Auth routes - Discord Activities OAuth2 Flow
app.post('/api/auth/discord', async (req, res) => {
  try {
    console.log('🔐 Discord OAuth2 request received')
    console.log('Request headers:', JSON.stringify(req.headers, null, 2))
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    
    const { code } = req.body
    
    if (!code) {
      console.error('❌ Missing authorization code')
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      })
    }

    // Discord Activities specific configuration
    const clientId = process.env.DISCORD_CLIENT_ID || '1388207626944249856'
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    
    // For Discord Activities, the redirect_uri should match what's configured in Discord Developer Portal
    // This is typically the client domain, not the API endpoint
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://opure.uk'
    
    console.log('🔄 Exchanging code for access token...')
    console.log('Client ID:', clientId)
    console.log('Redirect URI:', redirectUri)

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    console.log('Token exchange params:', tokenParams.toString())

    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    })

    console.log('Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Token exchange failed:', errorText)
      return res.status(400).json({
        success: false,
        error: 'Invalid authorization code',
        details: errorText,
        debug: {
          clientId,
          redirectUri,
          codeLength: code.length
        }
      })
    }

    const tokenData = await tokenResponse.json()
    console.log('✅ Token exchange successful')
    
    const { access_token } = tokenData

    // Get user information
    console.log('👤 Fetching user information...')
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ User fetch failed:', errorText)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user information',
        details: errorText
      })
    }

    const user = await userResponse.json()
    console.log(`✅ User authenticated: ${user.username}#${user.discriminator}`)

    // Create a simple JWT-like token (in production, use proper JWT)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      timestamp: Date.now(),
    })).toString('base64')

    const response = {
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
    }

    console.log('🎉 Authentication successful, sending response')
    res.json(response)

  } catch (error) {
    console.error('💥 Discord authentication error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message,
    })
  }
})

// Bot data endpoint - receives status updates from bot.py
app.post('/api/bot/data', async (req, res) => {
  try {
    const { type, data } = req.body
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Data type is required'
      })
    }

    // Log the bot data update
    console.log(`Bot data update - Type: ${type}`, data ? JSON.stringify(data).substring(0, 100) + '...' : 'No data')
    
    // Store or process the bot data based on type
    switch (type) {
      case 'status':
        // Bot status update
        console.log('Bot status:', data)
        break
      case 'user_data':
        // User data sync
        console.log('User data sync:', data)
        break
      case 'achievement':
        // Achievement unlock
        console.log('Achievement unlocked:', data)
        break
      case 'music':
        // Music activity
        console.log('Music activity:', data)
        break
      default:
        console.log('Unknown bot data type:', type)
    }

    res.json({
      success: true,
      message: `Bot data received: ${type}`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Bot data endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process bot data'
    })
  }
})

// Bot sync endpoint - allows Activity to request current bot data
app.get('/api/bot/sync/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    // TODO: Implement actual database queries to bot's SQLite database
    // For now, return mock data structure
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

    res.json({
      success: true,
      data: botData,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Bot sync endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to sync bot data'
    })
  }
})

// AI Chat endpoint - proxies requests to Ollama
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, userId, context } = req.body
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    // TODO: Replace with actual Ollama endpoint when available
    const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
    
    // Construct prompt with Scottish personality and Juice WRLD context
    const prompt = `You are Opure.exe, a Scottish AI assistant obsessed with Rangers FC and Juice WRLD. 
    User context: ${context || 'No additional context'}
    User ${userId || 'Anonymous'}: ${message}`

    try {
      // Attempt to connect to Ollama (will fail in Vercel, fallback to mock)
      const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'opure',
          prompt: prompt,
          stream: false
        }),
        timeout: 10000
      })

      if (ollamaResponse.ok) {
        const aiData = await ollamaResponse.json()
        return res.json({
          success: true,
          response: aiData.response,
          timestamp: new Date().toISOString()
        })
      }
    } catch (ollamaError) {
      console.log('Ollama not available, using fallback response')
    }

    // Fallback Scottish AI responses for demo/production
    const scottishResponses = [
      "Aye, that's a pure mental question! Rangers are the best team in Scotland, ken!",
      "Juice WRLD was a legend, rest in peace. His music still hits different, ye know?",
      "Opure.exe here, ready tae help! What's on yer mind?",
      "That's some proper Scottish wisdom right there! Rangers forever!",
      "Lucid Dreams by Juice WRLD - absolute banger, that one is!",
      "I'm buzzing like a proper Rangers fan on derby day!"
    ]

    const response = scottishResponses[Math.floor(Math.random() * scottishResponses.length)]

    res.json({
      success: true,
      response: response,
      fallback: true,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('AI chat endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'AI chat failed'
    })
  }
})

// Music endpoints
app.post('/api/music/queue', async (req, res) => {
  try {
    const { query, userId } = req.body
    
    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      })
    }

    // TODO: Implement music queue logic
    res.json({
      success: true,
      message: `Queued "${query}" for user ${userId}`,
      track: {
        title: query,
        duration: '3:45',
        url: `https://example.com/track/${encodeURIComponent(query)}`
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Music queue endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to queue music'
    })
  }
})

app.get('/api/music/now-playing', async (req, res) => {
  try {
    // TODO: Get actual now playing from bot
    res.json({
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
    
  } catch (error) {
    console.error('Now playing endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get now playing'
    })
  }
})

module.exports = app
