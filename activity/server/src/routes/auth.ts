import express from 'express'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import { z } from 'zod'
import { logger } from '../utils/logger'
import { validateRequest } from '../middleware/validation'

const router = express.Router()

// Validation schemas
const discordAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
})

const DISCORD_API_BASE = 'https://discord.com/api/v10'

interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar?: string
  global_name?: string
  email?: string
}

// Exchange Discord authorization code for access token and user info
router.post('/discord', validateRequest(discordAuthSchema), async (req, res): Promise<void> => {
  try {
    const { code } = req.body

    // Exchange code for access token
    const tokenResponse = await axios.post<DiscordTokenResponse>(
      `${DISCORD_API_BASE}/oauth2/token`,
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    )

    const { access_token, refresh_token, expires_in } = tokenResponse.data

    // Get user information
    const userResponse = await axios.get<DiscordUser>(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      timeout: 10000,
    })

    const user = userResponse.data

    // Create JWT token for our application
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        globalName: user.global_name,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d',
        issuer: 'opure-activity',
        audience: 'opure-users',
      }
    )

    // Log successful authentication
    logger.info(`User authenticated: ${user.username}#${user.discriminator} (${user.id})`)

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        globalName: user.global_name,
      },
      token: jwtToken,
      expiresIn: expires_in,
    })
  } catch (error) {
    logger.error('Discord authentication failed:', error)

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        res.status(400).json({
          success: false,
          error: 'Invalid authorization code',
          message: 'The provided authorization code is invalid or expired',
        })
        return
      }
      
      if (error.response?.status === 429) {
        res.status(429).json({
          success: false,
          error: 'Rate limited',
          message: 'Too many authentication requests. Please try again later.',
        })
        return
      }
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Failed to authenticate with Discord. Please try again.',
    })
  }
})

// Refresh JWT token
router.post('/refresh', async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      })
      return
    }

    const token = authHeader.substring(7)
    
    // Verify current token (even if expired)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      ignoreExpiration: true,
    }) as any

    // Create new token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        discriminator: decoded.discriminator,
        avatar: decoded.avatar,
        globalName: decoded.globalName,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d',
        issuer: 'opure-activity',
        audience: 'opure-users',
      }
    )

    res.json({
      success: true,
      token: newToken,
    })
  } catch (error) {
    logger.error('Token refresh failed:', error)
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    })
  }
})

// Verify JWT token
router.get('/verify', async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      })
      return
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    res.json({
      success: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        discriminator: decoded.discriminator,
        avatar: decoded.avatar,
        globalName: decoded.globalName,
      },
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    })
  }
})

// Get user profile with Discord bot data (playlists, economy, etc.)
router.get('/profile', async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      })
      return
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Simulate bot database queries (in real implementation, query the bot's SQLite database)
    const userData = {
      // Discord info
      discord: {
        id: decoded.userId,
        username: decoded.username,
        discriminator: decoded.discriminator,
        avatar: decoded.avatar,
        globalName: decoded.globalName,
        roles: ['member'], // Would fetch from guild
        permissions: ['use_commands', 'play_music'],
      },
      
      // Bot economy data (simulated - replace with actual database queries)
      economy: {
        balance: 1000,
        bank: 5000,
        level: 15,
        experience: 2400,
        daily_streak: 7,
        last_daily: new Date().toISOString(),
      },
      
      // User playlists (simulated)
      playlists: [
        {
          id: 'playlist_1',
          name: 'My Favorites',
          tracks: [
            { title: 'Song 1', artist: 'Artist 1', duration: 240 },
            { title: 'Song 2', artist: 'Artist 2', duration: 180 },
          ],
          created_at: new Date('2024-01-01').toISOString(),
        }
      ],
      
      // User profile data
      profile: {
        bio: 'Rangers fan and music lover! 🎵⚽',
        favorite_artists: ['Juice WRLD', 'Post Malone'],
        total_plays: 342,
        joined_at: new Date('2024-01-01').toISOString(),
      },
      
      // Friends list (simulated)
      friends: [
        {
          id: '123456789',
          username: 'friend1',
          avatar: 'avatar_hash',
          status: 'online',
        }
      ],
      
      // Achievements and stats
      achievements: [
        {
          id: 'first_song',
          name: 'First Song',
          description: 'Played your first song',
          unlocked_at: new Date('2024-01-01').toISOString(),
        }
      ],
      
      // Activity stats
      stats: {
        total_commands: 156,
        songs_played: 342,
        voice_time: 12450, // seconds
        last_active: new Date().toISOString(),
      }
    }

    res.json({
      success: true,
      user: userData,
    })
  } catch (error) {
    logger.error('Profile fetch failed:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    })
  }
})

export { router as authRouter }