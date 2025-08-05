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
    if (!discordSdk) {
      console.error('❌ Discord SDK not initialized')
      setError('Discord SDK not ready. Please wait and try again.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log('🔐 Starting Discord Activity authentication...')

      // For Discord Activities, we use authenticate instead of authorize
      // This provides direct access to user info without OAuth2 code exchange
      console.log('🎮 Using Discord Activity authenticate method...')
      
      const authResult = await discordSdk.commands.authenticate({
        scope: [
          'identify', // Get user info
          'guilds', // Access guild info
          'rpc.activities.write', // Write activity data
        ],
      })

      console.log('✅ Discord Activity authentication successful:', {
        userId: authResult.user?.id,
        username: authResult.user?.username,
        hasAccessToken: !!authResult.access_token
      })

      // Extract user and token from Discord Activity auth
      const { user: discordUser, access_token } = authResult
      
      if (!discordUser) {
        throw new Error('No user data received from Discord')
      }

      // For Discord Activities, we can work directly with the Discord user data
      // No need for server-side OAuth2 exchange
      const userData = {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        global_name: discordUser.global_name,
      }

      console.log('👤 User authenticated:', userData.username)
      setUser(userData)

      // Optional: Exchange with server for additional app-specific data
      try {
        console.log('🔄 Syncing with server for app-specific data...')
        const response = await fetch(buildApiUrl('/api/auth/activity-sync'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`, // Use Discord's access token
          },
          body: JSON.stringify({ 
            user: userData,
            discord_access_token: access_token 
          }),
        })

        if (response.ok) {
          const serverData = await response.json()
          console.log('✅ Server sync successful:', serverData)
          
          // Store server-provided JWT if available
          if (serverData.token) {
            localStorage.setItem('auth_token', serverData.token)
          }
        } else {
          console.warn('⚠️ Server sync failed, continuing with Discord-only auth')
        }
      } catch (serverError) {
        console.warn('⚠️ Could not sync with server:', serverError)
        // Continue with Discord-only authentication
      }

      // Get current channel info
      try {
        const channelData = await discordSdk.commands.getChannel()
        console.log('📍 Channel data:', channelData)
        setChannel(channelData)
      } catch (channelError) {
        console.warn('⚠️ Could not get channel info:', channelError)
        // Not critical for authentication
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
        
        // Enhanced Discord Activity detection with more reliable checks
        const discordUserAgent = navigator.userAgent.includes('Discord')
        const hasDiscordParent = window.parent !== window
        const hasAncestorOrigins = window.location.ancestorOrigins?.length > 0
        const discordReferrer = document.referrer.includes('discord.com')
        const hasDiscordSDK = typeof (window as any).DiscordSDK !== 'undefined'
        const inIframe = window.self !== window.top
        const hasDiscordQuery = window.location.search.includes('frame_id') || 
                               window.location.search.includes('instance_id')
        
        // Check for Discord Activity specific URL patterns
        const hasActivityParams = window.location.href.includes('opure.uk') && (
          hasDiscordQuery || inIframe || hasDiscordParent
        )
        
        const isInDiscord = (
          discordUserAgent ||
          hasDiscordSDK ||
          discordReferrer ||
          hasActivityParams ||
          (inIframe && (hasAncestorOrigins || hasDiscordParent))
        )
        
        console.log('🔍 Environment check:', {
          isInDiscord,
          discordUserAgent,
          hasDiscordParent,
          hasAncestorOrigins,
          discordReferrer,
          hasDiscordSDK,
          inIframe,
          hasDiscordQuery,
          hasActivityParams,
          referrer: document.referrer,
          hostname: window.location.hostname,
          href: window.location.href,
          search: window.location.search,
          userAgent: navigator.userAgent
        })
        
        if (!isInDiscord) {
          console.log('⚠️ Not running in Discord Activity context')
          // For development, allow testing outside Discord
          if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Development mode - creating mock Discord context')
            setError('Development mode: Discord Activity simulation')
            setIsLoading(false)
            return
          } else {
            setError('This application must be launched as a Discord Activity')
            setIsLoading(false)
            return
          }
        }

        console.log('🚀 Creating Discord SDK instance...')
        const sdk = new DiscordSDK(clientId)
        
        // Enhanced initialization with better error handling and retries
        let initializationComplete = false
        let retryCount = 0
        const maxRetries = 3
        
        const initTimeout = setTimeout(() => {
          if (!initializationComplete) {
            console.error('⏰ Discord SDK initialization timeout after 20 seconds')
            setError('Discord Activity initialization timeout. Please restart the Activity.')
            setIsLoading(false)
          }
        }, 20000) // Increased timeout for better reliability

        const attemptInitialization = async (): Promise<void> => {
          try {
            console.log(`⏳ Attempting Discord SDK initialization (attempt ${retryCount + 1}/${maxRetries})...`)
            
            // Add pre-ready checks
            console.log('🔍 Pre-initialization SDK state:', {
              clientId: sdk.clientId,
              sdkExists: !!sdk,
              hasCommands: !!(sdk as any).commands
            })
            
            // Wait for SDK to be ready with explicit error handling
            await Promise.race([
              sdk.ready(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('SDK ready() timeout')), 8000)
              )
            ])
            
            initializationComplete = true
            clearTimeout(initTimeout)
          } catch (error) {
            retryCount++
            console.warn(`⚠️ SDK initialization attempt ${retryCount} failed:`, error)
            
            if (retryCount < maxRetries) {
              console.log(`🔄 Retrying SDK initialization in 2 seconds...`)
              await new Promise(resolve => setTimeout(resolve, 2000))
              return attemptInitialization()
            } else {
              throw new Error(`SDK initialization failed after ${maxRetries} attempts: ${error}`)
            }
          }
        }

        try {
          await attemptInitialization()
          
          console.log('✅ Discord SDK ready!')
          console.log('📊 SDK Info:', {
            clientId: sdk.clientId,
            instanceId: (sdk as any).instanceId,
            platform: (sdk as any).platform,
            commands: Object.keys(sdk.commands || {}),
            hasSource: !!(sdk as any).source,
            hasSourceOrigin: !!(sdk as any).sourceOrigin
          })
          
          setDiscordSdk(sdk)
          setReady(true)

          // Get initial Discord context
          try {
            const commands = sdk.commands
            if (commands && commands.getInstanceConnectParams) {
              const connectParams = await commands.getInstanceConnectParams()
              console.log('🔗 Instance connect params:', connectParams)
            }
          } catch (contextError) {
            console.warn('⚠️ Could not get instance context:', contextError)
            // Not critical for Activity initialization
          }

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

        } catch (sdkError) {
          initializationComplete = true
          clearTimeout(initTimeout)
          throw sdkError
        }

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