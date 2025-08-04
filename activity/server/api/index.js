const express = require('express')
const cors = require('cors')

const app = express()

// CORS configuration for Discord Activities
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "https://discord.com",
    "https://ptb.discord.com", 
    "https://canary.discord.com",
    /\.discord\.com$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
    version: '1.0.0'
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

// Auth routes
app.post('/api/auth/discord', async (req, res) => {
  try {
    const { code } = req.body
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Invalid authorization code'
      })
    }

    const { access_token } = await tokenResponse.json()

    // Get user information
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Failed to get user info'
      })
    }

    const user = await userResponse.json()

    // Create simple token
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      timestamp: Date.now()
    })).toString('base64')

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        globalName: user.global_name,
      },
      token,
    })
  } catch (error) {
    console.error('Discord authentication failed:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
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


module.exports = app
