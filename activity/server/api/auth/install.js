// Discord Bot Installation Handler
// This endpoint redirects to Discord's bot authorization flow
// Separate from Activity authentication

export default async function handler(req, res) {
  console.log(`🤖 Bot Installation: ${req.method} ${req.url}`)
  
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

  // Discord bot installation parameters
  const clientId = process.env.DISCORD_CLIENT_ID || '1388207626944249856'
  const permissions = req.query.permissions || '8' // Administrator by default
  const guildId = req.query.guild_id || '' // Optional server pre-selection
  
  // Bot installation scopes (NOT Activity scopes)
  const botScopes = [
    'bot',
    'applications.commands'
  ]
  
  // Build Discord bot authorization URL
  const authUrl = new URL('https://discord.com/api/oauth2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('permissions', permissions)
  authUrl.searchParams.set('scope', botScopes.join(' '))
  authUrl.searchParams.set('response_type', 'code')
  
  // Use proper Discord bot installation redirect URI
  // Discord's oauth2/authorized doesn't work for bot installations - use proper callback
  authUrl.searchParams.set('redirect_uri', 'https://api.opure.uk/api/auth/install/callback')
  
  if (guildId) {
    authUrl.searchParams.set('guild_id', guildId)
  }

  console.log('🔄 Redirecting to Discord bot installation...')
  console.log('Bot scopes:', botScopes.join(' '))
  console.log('Permissions:', permissions)
  
  // Redirect to Discord for bot installation
  return res.redirect(302, authUrl.toString())
}