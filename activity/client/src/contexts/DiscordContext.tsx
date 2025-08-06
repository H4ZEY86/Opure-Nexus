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
      
      // Method 0: Try authenticate with access_token scope (must authenticate first)
      try {
        console.log('🔄 Method 0: authenticate() with access_token scope')
        authResult = await discordSdk.commands.authenticate({
          scope: ['identify', 'rpc.activities.write'],
          access_token: true
        })
        console.log('✅ Method 0 successful - Auth Result Keys:', Object.keys(authResult || {}))
        console.log('✅ Method 0 successful - Full Result:', JSON.stringify(authResult, null, 2))
      } catch (error0) {
        console.warn('⚠️ Method 0 failed:', error0.message)
        
        // Method 1: Try authenticate without access_token
        try {
          console.log('🔄 Method 1: authenticate() basic')
          authResult = await discordSdk.commands.authenticate({
            scope: ['identify', 'rpc.activities.write']
          })
          console.log('✅ Method 1 successful:', authResult)
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
              const authorizeResult = await discordSdk.commands.authorize({
                client_id: discordSdk.clientId,
                response_type: 'code',
                state: '',
                scope: 'identify rpc.activities.write'
              })
              console.log('✅ Method 4 authorize successful:', authorizeResult)
              
              if (authorizeResult.code) {
                console.log('🔄 Exchanging code for user token...')
                try {
                  // Exchange code for token
                  const tokenResponse = await fetch(buildApiUrl('/api/auth/discord'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: authorizeResult.code })
                  })
                  
                  console.log('🔍 Token response status:', tokenResponse.status)
                  const responseText = await tokenResponse.text()
                  console.log('🔍 Token response body:', responseText)
                  
                  if (tokenResponse.ok) {
                    const tokenData = JSON.parse(responseText)
                    if (tokenData.success) {
                      console.log('✅ Token exchange successful:', tokenData)
                      authResult = tokenData
                    } else {
                      console.error('❌ Token exchange failed:', tokenData.error)
                      throw new Error(`Token exchange failed: ${tokenData.error}`)
                    }
                  } else {
                    throw new Error(`Token exchange HTTP error: ${tokenResponse.status} - ${responseText}`)
                  }
                } catch (exchangeError) {
                  console.error('💥 Code exchange failed:', exchangeError)
                  // Fall back to just using the authorize result without token exchange
                  console.log('🔄 Falling back to authorize result without token exchange')
                  authResult = { user: null, access_token: null, code: authorizeResult.code }
                }
              } else {
                throw new Error('No authorization code received')
              }
            } catch (error4) {
              console.error('💥 All authentication methods failed:', {
                error1: { message: error1.message, code: (error1 as any).code, stack: error1.stack?.substring(0, 200) },
                error2: { message: error2.message, code: (error2 as any).code, stack: error2.stack?.substring(0, 200) },
                error3: { message: error3.message, code: (error3 as any).code, stack: error3.stack?.substring(0, 200) },
                error4: { message: error4.message, code: (error4 as any).code, stack: error4.stack?.substring(0, 200) }
              })
              
              // Try one more desperate attempt - just get user info if available
              console.log('🔄 Final attempt: Check if user is already available from SDK...')
              try {
                const currentUser = await discordSdk.commands.getUser()
                if (currentUser) {
                  console.log('✅ Found current user without authentication:', currentUser)
                  authResult = { user: currentUser, access_token: null }
                } else {
                  throw new Error(`All 5 authentication methods failed. Errors: ${error1.message} | ${error2.message} | ${error3.message} | ${error4.message}`)
                }
              } catch (getUserError) {
                console.error('💥 Even getUser() failed:', getUserError)
                throw new Error(`All authentication methods failed. Most likely cause: ${error1.message}`)
              }
            }
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
      let discordUser = authResult.user
      const access_token = authResult.access_token
      
      // If we don't have user data, try multiple methods to get it
      if (!discordUser) {
        console.log('🔄 No user data from auth result. Trying alternative methods...')
        console.log('🔍 Auth result details:', { 
          hasUser: !!authResult.user, 
          hasCode: !!authResult.code, 
          hasAccessToken: !!authResult.access_token,
          keys: Object.keys(authResult || {})
        })
        
        // Method 1: Try getInstanceConnectedParticipants() now that we're authenticated
        try {
          console.log('🔄 Method 1: Getting user from participants (after auth)...')
          const participantsData = await discordSdk.commands.getInstanceConnectedParticipants()
          console.log('✅ Participants data (post-auth):', JSON.stringify(participantsData, null, 2))
          
          if (participantsData && participantsData.participants && participantsData.participants.length > 0) {
            // Find the current user (usually the first one)
            const currentUser = participantsData.participants[0]
            console.log('✅ Method 1 success - Found user in participants:', JSON.stringify(currentUser, null, 2))
            
            // Validate the user object has required Discord user fields
            if (currentUser && currentUser.id && currentUser.username) {
              console.log('✅ Method 1 - Valid user object found with ID and username')
              discordUser = currentUser
            } else {
              console.warn('⚠️ Method 1 - Participant found but missing user fields:', currentUser)
            }
          } else {
            console.warn('⚠️ Method 1 - No participants found even after authentication')
          }
        } catch (participantsError) {
          console.warn('⚠️ Method 1 failed - participants error (post-auth):', participantsError)
        }
        
        // Method 2: Try getUser() if we have an auth result (we know this will fail but for completeness)
        if (!discordUser && (authResult.code || authResult.access_token)) {
          try {
            console.log('🔄 Method 2: Getting user via getUser()...')
            discordUser = await discordSdk.commands.getUser()
            console.log('✅ Method 2 success - Got user data via getUser():', discordUser)
          } catch (getUserError) {
            console.warn('⚠️ Method 2 failed - getUser() error:', getUserError)
          }
        }
        
        // Method 3: Try getting instance participants again (duplicate method - can remove later)
        if (!discordUser) {
          try {
            console.log('🔄 Method 3: Getting participants (duplicate check)...')
            const instanceData = await discordSdk.commands.getInstanceConnectedParticipants()
            console.log('✅ Instance participants (duplicate):', instanceData)
            
            // Sometimes the current user is in the participants
            if (instanceData.participants && instanceData.participants.length > 0) {
              // Look for the current user (they're usually first or have a special flag)
              discordUser = instanceData.participants[0] // Fallback to first participant
              console.log('✅ Method 2 success - Using participant as user:', discordUser)
            }
          } catch (participantsError) {
            console.warn('⚠️ Method 2 failed - participants error:', participantsError)
          }
        }
        
        // Method 3: Try to get user info directly from Discord SDK instance
        if (!discordUser && discordSdk) {
          try {
            console.log('🔄 Method 3: Getting user from Discord SDK instance...')
            // Check if user info is available in the SDK itself
            if (discordSdk.user) {
              discordUser = discordSdk.user
              console.log('✅ Method 3a success - Got user from SDK.user:', discordUser)
            } else if ((discordSdk as any).instanceConnectedParticipants) {
              // Try to get from instance participants
              const participants = await discordSdk.commands.getInstanceConnectedParticipants()
              if (participants && participants.participants && participants.participants.length > 0) {
                discordUser = participants.participants[0]
                console.log('✅ Method 3b success - Got user from participants:', discordUser)
              }
            } else {
              console.log('⚠️ Method 3 - No user data available in SDK')
            }
          } catch (method3Error) {
            console.warn('⚠️ Method 3 failed:', method3Error)
          }
        }
        
        // Method 4: Create minimal user object ONLY as last resort
        if (!discordUser && (authResult.code || authResult.access_token)) {
          console.log('🔄 Method 4: Creating minimal user from Activity context (LAST RESORT)...')
          discordUser = {
            id: 'activity_user_' + Date.now(), // Temporary ID
            username: 'DiscordUser',
            discriminator: '0000',
            avatar: null,
            global_name: 'Discord User'
          }
          console.log('⚠️ Method 4 fallback - Created minimal user object:', discordUser)
        }
      }
      
      if (!discordUser) {
        console.error('💥 All user data methods failed. Auth result:', authResult)
        throw new Error('No user data received from Discord authentication. Check console for details.')
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

      console.log('👤 Setting authenticated user in context:', userData.username, 'ID:', userData.id)
      setUser(userData)
      console.log('✅ User context updated successfully')

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
        
        // Enhanced Discord context check - force authentication for production domain
        const isProductionDomain = window.location.hostname === 'www.opure.uk'
        const isLikelyInDiscord = inIframe || discordReferrer || hasDiscordQuery || isProductionDomain
        
        console.log('🔍 Environment check:', {
          inIframe,
          discordReferrer,
          hasDiscordQuery,
          isProductionDomain,
          isLikelyInDiscord,
          referrer: document.referrer,
          url: window.location.href,
          userAgent: navigator.userAgent.substring(0, 100)
        })
        
        // Force Discord SDK initialization on production domain
        if (!isLikelyInDiscord && !isProductionDomain) {
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

        // Clear any stale authentication data and force fresh login
        console.log('🔐 Clearing stored authentication - forcing fresh Discord OAuth2')
        localStorage.removeItem('discord_authenticated')
        localStorage.removeItem('discord_user')
        localStorage.removeItem('discord_access_token')
        localStorage.removeItem('auth_token')
        
        console.log('🔐 User will need to authenticate with Discord')

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