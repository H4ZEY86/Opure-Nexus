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

      // Use Discord Activity authenticate method (the correct one for Activities)
      console.log('🎮 Calling Discord authenticate...')
      console.log('🔍 Available SDK commands:', Object.keys(discordSdk.commands || {}))
      
      // Try the standard Discord Activity authentication with different approaches
      let authResult = null
      
      // Method 1: Try authenticate with access_token scope
      try {
        console.log('🔄 Method 1: authenticate() with access_token')
        authResult = await discordSdk.commands.authenticate({
          scope: ['identify', 'rpc.activities.write'],
          access_token: true
        })
        console.log('✅ Method 1 successful:', authResult)
      } catch (error1) {
        console.warn('⚠️ Method 1 failed:', error1)
        
        // Method 2: Try authenticate without access_token
        try {
          console.log('🔄 Method 2: authenticate() basic')
          authResult = await discordSdk.commands.authenticate({
            scope: ['identify', 'rpc.activities.write']
          })
          console.log('✅ Method 2 successful:', authResult)
        } catch (error2) {
          console.warn('⚠️ Method 2 failed:', error2)
          
          // Method 3: Try with just identify scope
          try {
            console.log('🔄 Method 3: authenticate() with identify only')
            authResult = await discordSdk.commands.authenticate({
              scope: ['identify']
            })
            console.log('✅ Method 3 successful:', authResult)
          } catch (error3) {
            console.warn('⚠️ Method 3 failed:', error3)
            
            // Method 4: Try authorize as fallback
            try {
              console.log('🔄 Method 4: authorize() fallback')
              authResult = await discordSdk.commands.authorize({
                client_id: discordSdk.clientId,
                response_type: 'code',
                state: '',
                scope: 'identify rpc.activities.write'
              })
              console.log('✅ Method 4 successful:', authResult)
              
              if (authResult.code) {
                // Exchange code for token
                const tokenResponse = await fetch(buildApiUrl('/api/auth/discord'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: authResult.code })
                })
                
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json()
                  if (tokenData.success) {
                    authResult = tokenData
                  }
                }
              }
            } catch (error4) {
              console.error('💥 All authentication methods failed:', {
                error1: error1.message,
                error2: error2.message, 
                error3: error3.message,
                error4: error4.message
              })
              throw new Error('All authentication methods failed')
            }
          }
        }
      }
      
      if (!authResult) {
        throw new Error('Authentication failed - no result received')
      }

      console.log('✅ Discord authentication successful:', {
        hasUser: !!authResult.user,
        hasAccessToken: !!authResult.access_token,
        method: authResult.code ? 'OAuth2 exchange' : 'Direct authenticate'
      })

      // Extract user and token from auth result
      const discordUser = authResult.user
      const access_token = authResult.access_token
      
      if (!discordUser) {
        throw new Error('No user data received from Discord authentication')
      }

      // Use the user data from authentication
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