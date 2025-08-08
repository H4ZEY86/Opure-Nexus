// Discord OAuth2 token exchange endpoint for Activity authentication
import fetch from 'node-fetch'

export default async function handler(req, res) {
  // CORS headers for Discord Activity
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' })
  }

  try {
    console.log('🔑 Exchanging Discord OAuth2 code for access token...')

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '1388207626944249856',
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://opure.uk/auth/callback'
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Discord token exchange failed:', errorText)
      return res.status(tokenResponse.status).json({ 
        error: 'Discord token exchange failed',
        details: errorText 
      })
    }

    const data = await tokenResponse.json()
    console.log('✅ Discord OAuth2 token exchange successful!')
    
    res.status(200).json(data)

  } catch (error) {
    console.error('❌ Token exchange error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
