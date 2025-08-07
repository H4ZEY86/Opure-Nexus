// OAuth2 Callback Handler for Discord Activity
// File: /api/auth/callback.js

export default async function handler(req, res) {
  console.log('🔐 OAuth2 callback endpoint hit:', req.method, req.url)
  
  // Set CORS headers for Discord Activities
  const allowedOrigins = [
    'https://www.opure.uk',
    'https://opure.uk',
    'https://discord.com',
    'https://activities.discord.com',
    'https://1388207626944249856.discordsays.com',
    'null' // For local development and some Discord Activity contexts
  ]
  
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'false')
  res.setHeader('X-Frame-Options', 'ALLOWALL')
  res.setHeader('Content-Security-Policy', 'frame-ancestors \'self\' https://discord.com https://*.discord.com https://activities.discord.com https://*.activities.discord.com https://*.discordsays.com;')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    // Handle both GET (from Discord redirect) and POST (from frontend)
    const code = req.method === 'GET' 
      ? new URL(req.url, `https://${req.headers.host}`).searchParams.get('code')
      : req.body?.code
    
    const state = req.method === 'GET'
      ? new URL(req.url, `https://${req.headers.host}`).searchParams.get('state')  
      : req.body?.state
      
    const error = req.method === 'GET'
      ? new URL(req.url, `https://${req.headers.host}`).searchParams.get('error')
      : req.body?.error

    console.log('🔍 OAuth2 callback params:', { 
      method: req.method,
      hasCode: !!code, 
      codeLength: code?.length,
      state, 
      error,
      fullUrl: req.url 
    })

    // Handle OAuth2 error (user denied permission)
    if (error) {
      console.error('❌ OAuth2 error from Discord:', error)
      
      // Redirect back to Activity with error
      const activityUrl = 'https://www.opure.uk'
      const redirectUrl = `${activityUrl}?auth_error=${encodeURIComponent(error)}&auth_status=error`
      
      if (req.method === 'GET') {
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(400).json({
          success: false,
          error: 'OAuth2 authorization failed',
          details: error,
          redirectUrl
        })
      }
    }

    // Validate authorization code
    if (!code) {
      console.error('❌ Missing authorization code in OAuth2 callback')
      const errorMessage = 'Missing authorization code from Discord OAuth2'
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(400).json({
          success: false,
          error: errorMessage
        })
      }
    }

    const clientId = process.env.DISCORD_CLIENT_ID || '1388207626944249856'
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://api.opure.uk/api/auth/callback'
    
    // Check environment variables
    if (!clientSecret) {
      console.error('❌ DISCORD_CLIENT_SECRET environment variable missing')
      const errorMessage = 'Server configuration error: Missing Discord client secret'
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(500).json({
          success: false,
          error: errorMessage
        })
      }
    }
    
    console.log('🔄 Exchanging OAuth2 code for access token...')
    console.log('🔍 Token exchange params:', {
      clientId: clientId.substring(0, 8) + '...',
      hasClientSecret: !!clientSecret,
      redirectUri,
      codeLength: code.length
    })

    // Exchange authorization code for access token
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
      console.error('❌ Discord token exchange failed:', tokenResponse.status, errorText)
      
      const errorMessage = `Discord token exchange failed: ${errorText}`
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=token_error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid authorization code',
          details: errorText
        })
      }
    }

    const tokenData = await tokenResponse.json()
    const { access_token, token_type, expires_in, scope } = tokenData
    
    console.log('✅ Discord access token received:', {
      tokenType: token_type,
      expiresIn: expires_in,
      scopes: scope,
      hasAccessToken: !!access_token
    })

    // Get user information with access token
    console.log('👤 Fetching Discord user information...')
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ Failed to fetch Discord user info:', userResponse.status, errorText)
      
      const errorMessage = `Failed to fetch Discord user: ${errorText}`
      
      if (req.method === 'GET') {
        const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=user_error`
        return res.redirect(302, redirectUrl)
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user information',
          details: errorText
        })
      }
    }

    const user = await userResponse.json()
    console.log('✅ Discord user retrieved:', {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator
    })

    // Create application token
    const appToken = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      global_name: user.global_name,
      access_token: access_token,
      token_type: token_type,
      expires_in: expires_in,
      scope: scope,
      timestamp: Date.now(),
      source: 'oauth2_callback'
    })).toString('base64')

    console.log('🎉 OAuth2 callback successful for user:', user.username)

    // For GET requests (direct Discord redirect), redirect back to Activity with auth data
    if (req.method === 'GET') {
      const activityUrl = 'https://www.opure.uk'
      const redirectUrl = `${activityUrl}?auth_success=true&auth_token=${encodeURIComponent(appToken)}&user_id=${user.id}&username=${encodeURIComponent(user.username)}`
      
      console.log('🔄 Redirecting to Activity with authentication data...')
      return res.redirect(302, redirectUrl)
    } 
    
    // For POST requests (AJAX from frontend), return JSON response
    else {
      return res.json({
        success: true,
        message: 'OAuth2 authentication successful',
        user: {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          global_name: user.global_name,
        },
        token: appToken,
        access_token: access_token,
        expires_in: expires_in,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('💥 OAuth2 callback error:', error)
    
    const errorMessage = `OAuth2 callback failed: ${error.message}`
    
    if (req.method === 'GET') {
      const redirectUrl = `https://www.opure.uk?auth_error=${encodeURIComponent(errorMessage)}&auth_status=callback_error`
      return res.redirect(302, redirectUrl)
    } else {
      return res.status(500).json({
        success: false,
        error: 'OAuth2 callback failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}