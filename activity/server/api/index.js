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

module.exports = app