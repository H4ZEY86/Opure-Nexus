import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DiscordSDK, Types } from '@discord/embedded-app-sdk'
import { buildApiUrl, API_CONFIG } from '../config/api'

interface DiscordContextType {
  discordSdk: DiscordSDK | null
  user: Types.User | null
  channel: Types.Channel | null
  isLoading: boolean
  error: string | null
  authenticate: () => Promise<void>
  ready: boolean
}

export const DiscordContext = createContext<DiscordContextType>({
  discordSdk: null,
  user: null,
  channel: null,
  isLoading: true,
  error: null,
  authenticate: async () => {},
  ready: false,
})

export const useDiscord = () => {
  const context = useContext(DiscordContext)
  if (!context) {
    throw new Error('useDiscord must be used within a DiscordProvider')
  }
  return context
}

interface DiscordProviderProps {
  children: ReactNode
}

export const DiscordProvider: React.FC<DiscordProviderProps> = ({ children }) => {
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null)
  const [user, setUser] = useState<Types.User | null>(null)
  const [channel, setChannel] = useState<Types.Channel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const authenticate = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('🔐 Starting Discord Activity authentication...')
      console.log('🔍 SDK state:', { 
        hasSdk: !!discordSdk, 
        isReady: ready, 
        error: error 
      })
      
      // Ensure SDK is ready
      if (!discordSdk || !ready) {
        throw new Error('Discord SDK not ready. Please refresh the Activity and try again.')
      }

      console.log('✅ SDK ready, proceeding with authentication...')

      // Use Discord Activity authorize method (this triggers the OAuth2 popup)
      console.log('🎮 Calling Discord authorize (OAuth2 popup)...')
      console.log('🔍 Available SDK commands:', Object.keys(discordSdk.commands || {}))
      
      // Discord Activities use authorize() to trigger OAuth2 popup, not authenticate()
      let authResult = null
      const scopeAttempts = [
        ['identify', 'rpc.activities.write'],
        ['identify']
      ]
      
      for (const scopes of scopeAttempts) {
        try {
          console.log(`🔄 Attempting authorization with scopes: ${scopes.join(', ')}`)
          
          // Use authorize() which triggers the OAuth2 popup window
          authResult = await discordSdk.commands.authorize({
            client_id: discordSdk.clientId,
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: scopes.join(' ')
          })
          
          console.log('✅ Authorization successful with scopes:', scopes)
          console.log('🔍 Auth result:', { 
            hasCode: !!authResult.code,
            state: authResult.state 
          })
          break
          
        } catch (scopeError) {
          console.warn(`⚠️ Authorization failed with scopes ${scopes.join(', ')}:`, scopeError)
          
          if (scopes === scopeAttempts[scopeAttempts.length - 1]) {
            throw scopeError // Re-throw the last error
          }
        }
      }
      
      if (!authResult || !authResult.code) {
        throw new Error('Authorization failed - no code received')
      }

      // Exchange code for access token via our API
      console.log('🔄 Exchanging authorization code for access token...')
      const tokenResponse = await fetch(buildApiUrl('/api/auth/discord'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: authResult.code 
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        throw new Error(`Token exchange failed: ${errorText}`)
      }

      const tokenData = await tokenResponse.json()
      if (!tokenData.success) {
        throw new Error(`Token exchange error: ${tokenData.error}`)
      }

      console.log('✅ Discord OAuth2 authentication successful:', {
        userId: tokenData.user?.id,
        username: tokenData.user?.username,
        hasAccessToken: !!tokenData.access_token
      })

      // Extract user and token from OAuth2 exchange
      const { user: discordUser, access_token } = tokenData
      
      if (!discordUser) {
        throw new Error('No user data received from OAuth2 exchange')
      }

      // Use the user data from OAuth2 token exchange
      const userData = {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        global_name: discordUser.global_name,
        bot: discordUser.bot ?? false,
        avatar_decoration_data: discordUser.avatar_decoration_data ?? null
      }

      console.log('👤 User authenticated:', userData.username)
      setUser(userData)

      // Optional: Sync with server for app-specific data
      try {
        console.log('🔄 Syncing with server...')
        const response = await fetch(buildApiUrl('/api/auth/activity-sync'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
          },
          body: JSON.stringify({ user: userData, discord_access_token: access_token })
        })

        if (response.ok) {
          const serverData = await response.json()
          console.log('✅ Server sync successful')
          if (serverData.token) {
            localStorage.setItem('auth_token', serverData.token)
          }
        } else {
          console.warn('⚠️ Server sync failed with status:', response.status)
        }
      } catch (serverError) {
        console.warn('⚠️ Server sync failed, continuing with Discord-only auth:', serverError)
      }

      // Get channel info if available
      try {
        if (discordSdk.commands.getChannel) {
          const channelData = await discordSdk.commands.getChannel()
          console.log('📍 Channel data:', channelData)
          setChannel(channelData)
        }
      } catch (channelError) {
        console.warn('⚠️ Could not get channel info:', channelError)
      }

      // Store authentication state
      localStorage.setItem('discord_authenticated', 'true')
      localStorage.setItem('discord_user', JSON.stringify(userData))
      localStorage.setItem('discord_access_token', access_token)

      console.log('🎉 Authentication completed successfully!')

    } catch (err) {
      console.error('💥 Authentication failed:', err)
      
      // Provide specific error messages based on error type
      let errorMessage = 'Authentication failed'
      
      if (err instanceof Error) {
        if (err.message.includes('User declined')) {
          errorMessage = 'Authentication was cancelled. Please try again.'
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error during authentication. Please check your connection.'
        } else if (err.message.includes('scope')) {
          errorMessage = 'Permission error. Please ensure the Activity has proper permissions.'
        } else {
          errorMessage = `Authentication error: ${err.message}`
        }
      }
      
      setError(errorMessage)
      
      // Clear any partial authentication state
      localStorage.removeItem('discord_authenticated')
      localStorage.removeItem('discord_user')
      localStorage.removeItem('discord_access_token')
      localStorage.removeItem('auth_token')
      
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initializeDiscordSdk = async () => {
      try {
        console.log('🎮 Initializing Discord Activity SDK...')
        const clientId = '1388207626944249856'
        
        // Simplified Discord Activity detection
        const inIframe = window.self !== window.top
        const discordReferrer = document.referrer.includes('discord.com')
        const hasDiscordQuery = window.location.search.includes('frame_id') || 
                               window.location.search.includes('instance_id')
        
        // Basic Discord context check
        const isLikelyInDiscord = inIframe || discordReferrer || hasDiscordQuery
        
        console.log('🔍 Environment check:', {
          inIframe,
          discordReferrer,
          hasDiscordQuery,
          isLikelyInDiscord,
          referrer: document.referrer,
          url: window.location.href,
          userAgent: navigator.userAgent.substring(0, 100)
        })
        
        if (!isLikelyInDiscord) {
          console.warn('⚠️ NOT in Discord Activity context!')
          console.warn('💡 To test this Activity:')
          console.warn('   1. Open Discord')
          console.warn('   2. Go to your Discord Application page')
          console.warn('   3. Use the "Test Activity" button')
          console.warn('   4. Or invite the Activity to a voice channel')
          setError('Please open this Activity through Discord, not directly in a browser.')
          setIsLoading(false)
          return
        }

        console.log('🚀 Creating Discord SDK instance...')
        const sdk = new DiscordSDK(clientId)
        
        console.log('⏳ Waiting for Discord SDK to be ready...')
        
        // Simplified initialization with timeout
        const readyPromise = sdk.ready()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SDK initialization timeout')), 15000)
        )
        
        await Promise.race([readyPromise, timeoutPromise])
        
        console.log('✅ Discord SDK ready!')
        console.log('📊 SDK Info:', {
          clientId: sdk.clientId,
          instanceId: (sdk as any).instanceId,
          commands: Object.keys(sdk.commands || {})
        })
        
        setDiscordSdk(sdk)
        setReady(true)

        // Check for stored authentication
        const storedAuth = localStorage.getItem('discord_authenticated')
        const storedUser = localStorage.getItem('discord_user')
        
        if (storedAuth === 'true' && storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            console.log('🔄 Using stored authentication for user:', userData.username)
            setUser(userData)
          } catch (parseError) {
            console.warn('⚠️ Failed to parse stored user data:', parseError)
            localStorage.removeItem('discord_authenticated')
            localStorage.removeItem('discord_user')
          }
        } else {
          console.log('🔐 No stored authentication - user will need to authenticate')
        }

        setIsLoading(false)

      } catch (err) {
        console.error('💥 Discord SDK initialization failed:', err)
        
        // Provide specific error messages based on error type
        let errorMessage = 'Failed to initialize Discord Activity'
        
        if (err instanceof Error) {
          if (err.message.includes('timeout')) {
            errorMessage = 'Discord Activity initialization timed out. Please restart the Activity.'
          } else if (err.message.includes('network') || err.message.includes('fetch')) {
            errorMessage = 'Network error during Discord Activity initialization. Check your connection.'
          } else if (err.message.includes('permission')) {
            errorMessage = 'Permission denied. Please ensure the Activity has proper permissions.'
          } else {
            errorMessage = `Discord Activity error: ${err.message}`
          }
        }
        
        setError(errorMessage)
        setIsLoading(false)
        
        // Log detailed error for debugging
        console.error('🔍 Detailed error info:', {
          error: err,
          stack: err instanceof Error ? err.stack : 'No stack trace',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }
    }

    initializeDiscordSdk()
  }, [])

  const value: DiscordContextType = {
    discordSdk,
    user,
    channel,
    isLoading,
    error,
    authenticate,
    ready,
  }

  return (
    <DiscordContext.Provider value={value}>
      {children}
    </DiscordContext.Provider>
  )
}