// File: /api/health.js
// Health check endpoint for Opure Activity

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    service: 'Opure Activity API',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth/discord',
      health: '/api/health'
    },
    discord: {
      client_id: process.env.DISCORD_CLIENT_ID || '1388207626944249856',
      redirect_configured: !!process.env.DISCORD_REDIRECT_URI
    }
  }

  res.status(200).json(healthData)
}