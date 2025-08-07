// Discord OAuth2 Callback Handler for Discord Activities
// This handles the OAuth2 redirect and exchanges authorization code for user data

export default async function handler(req, res) {
  console.log(`🔐 OAuth2 Callback: ${req.method} ${req.url}`)
  
  // Set CORS headers for Discord Activities
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('X-Frame-Options', 'ALLOWALL')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { code, state, error } = req.query
    
    // Handle OAuth2 error
    if (error) {
      console.error('❌ OAuth2 error:', error)
      return res.status(400).json({
        success: false,
        error: 'OAuth2 authorization failed',
        details: error
      })
    }
    
    // Require authorization code
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code',
        message: 'OAuth2 callback requires authorization code parameter'
      })
    }

    console.log('✅ Authorization code received:', code.substring(0, 10) + '...')
    
    // Exchange authorization code for access token
    const clientId = process.env.DISCORD_CLIENT_ID || '1388207626944249856'
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    const redirectUri = 'https://api.opure.uk/api/auth/callback'
    
    if (!clientSecret) {
      console.error('❌ DISCORD_CLIENT_SECRET not set')
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Discord OAuth2 not properly configured'
      })
    }
    
    console.log('🔄 Exchanging code for access token...')
    
    // Token exchange with Discord
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
        error: 'Discord token exchange failed',
        details: errorText
      })
    }

    const tokenData = await tokenResponse.json()
    const { access_token, token_type, scope } = tokenData
    
    console.log('✅ Access token received, scopes:', scope)

    // Fetch Discord user data
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ User fetch failed:', errorText)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch Discord user data',
        details: errorText
      })
    }

    const userData = await userResponse.json()
    console.log(`✅ Real Discord user authenticated: ${userData.username}#${userData.discriminator}`)

    // For GET requests (browser redirects), redirect back to Activity
    if (req.method === 'GET') {
      // Create success redirect URL back to Activity
      const activityUrl = new URL('https://www.opure.uk')
      activityUrl.searchParams.set('auth', 'success')
      activityUrl.searchParams.set('user_id', userData.id)
      activityUrl.searchParams.set('username', userData.username)
      
      console.log('🔄 Redirecting back to Activity with auth data...')
      return res.redirect(302, activityUrl.toString())
    }

    // For POST requests (AJAX), return JSON response
    return res.json({
      success: true,
      message: 'Discord OAuth2 authentication successful',
      user: {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        global_name: userData.global_name,
        email: userData.email
      },
      access_token,
      token_type,
      scope,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 OAuth2 callback error:', error)
    return res.status(500).json({
      success: false,
      error: 'OAuth2 callback failed',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}