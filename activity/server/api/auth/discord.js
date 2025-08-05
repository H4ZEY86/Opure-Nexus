// File: /api/auth/discord.js
// Discord OAuth2 Authentication Handler for Opure Activity

import fetch from 'node-fetch'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

export default async function handler(req, res) {
  // Set CORS headers for Discord Activity
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      })
    }

    console.log('Processing Discord OAuth2 code exchange...')

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '1388207626944249856',
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://api.opure.uk/api/auth/discord',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return res.status(400).json({
        success: false,
        error: 'Invalid authorization code',
        details: errorText,
      })
    }

    const tokenData = await tokenResponse.json()
    const { access_token } = tokenData

    // Get user information
    const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('User fetch failed:', await userResponse.text())
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user information',
      })
    }

    const user = await userResponse.json()
    console.log(`User authenticated: ${user.username}#${user.discriminator}`)

    // Create a simple JWT-like token (in production, use proper JWT)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      timestamp: Date.now(),
    })).toString('base64')

    res.json({
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
    console.error('Discord authentication error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message,
    })
  }
}
