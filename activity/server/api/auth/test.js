// OAuth2 Test Endpoint for Discord Activity
// File: /api/auth/test.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.json({
    success: true,
    message: 'OAuth2 endpoint is accessible',
    timestamp: new Date().toISOString(),
    environment: {
      discord_client_id: process.env.DISCORD_CLIENT_ID ? 'SET' : 'NOT SET',
      discord_client_secret: process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'NOT SET',
      discord_redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://api.opure.uk/api/auth/callback',
      vercel_env: process.env.VERCEL ? 'YES' : 'NO'
    },
    headers: {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']?.substring(0, 50),
      authorization: req.headers.authorization ? 'PRESENT' : 'MISSING'
    },
    endpoints: {
      callback: '/api/auth/callback',
      health: '/api/health',
      test: '/api/auth/test'
    }
  })
}