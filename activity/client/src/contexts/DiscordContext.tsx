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

      // STEP 1: OAuth2 authorization with Activity-specific scopes FIRST
      console.log('🔐 STEP 1: Requesting Activity permissions from Discord...')
      let authCode = null
      
      try {
        // Request Activity-specific scopes for participant access
        const authResult = await discordSdk.commands.authorize({
          client_id: discordSdk.clientId,
          response_type: 'code',
          state: '',
          scope: ['identify', 'rpc', 'rpc.activities.write'].join(' ')
        })
        authCode = authResult.code
        console.log('✅ OAuth2 authorization successful with Activity scopes')
        
      } catch (oauthError) {
        console.error('❌ OAuth2 authorization failed:', oauthError.message)
        throw new Error(`Discord Activity permissions required: ${oauthError.message}. Please refresh and grant permissions.`)
      }

      // STEP 2: Now get participants with proper permissions
      console.log('🎯 STEP 2: Getting Discord Activity participants with authorized permissions...')
      
      let realUser = null
      let participants = null
      
      try {
        // Get participants with proper OAuth2 permissions
        participants = await discordSdk.commands.getInstanceConnectedParticipants()
        console.log('✅ Raw participants data:', JSON.stringify(participants, null, 2))
        
        if (!participants?.participants?.length) {
          console.error('❌ No participants found in Activity')
          throw new Error('No users found in this Discord Activity. Make sure you launched it from a voice channel with other users.')
        }
        
        // Find the current user (Discord provides this automatically)
        realUser = participants.participants[0] // First participant is usually the current user
        console.log('🎯 Current Discord user identified:', {
          id: realUser.id,
          username: realUser.username,
          discriminator: realUser.discriminator,
          avatar: realUser.avatar
        })
        
        // Validate we have real Discord user data (not demo/fake)
        if (!realUser.id || realUser.id.length < 15 || realUser.username === 'DiscordUser' || realUser.username === 'ActivityUser') {
          console.error('❌ Got fake/demo user data:', realUser)
          throw new Error('Received fake user data instead of real Discord user. Check Discord Application configuration.')
        }
        
        console.log('✅ REAL Discord user confirmed - ID length:', realUser.id.length)
        
      } catch (participantsError) {
        console.error('❌ Failed to get participants:', participantsError.message)
        throw new Error(`Cannot access Discord Activity users: ${participantsError.message}. Check Activity permissions in Discord Developer Portal.`)
      }
      
      // STEP 3: Extract Activity context
      const urlParams = new URLSearchParams(window.location.search)
      const instanceId = urlParams.get('instance_id')
      const guildId = urlParams.get('guild_id') 
      const channelId = urlParams.get('channel_id')
      
      console.log('🔍 Activity context:', { instanceId, guildId, channelId })
      
      // STEP 4: Get channel info if available
      let channelInfo = null
      try {
        channelInfo = await discordSdk.commands.getChannel()
        console.log('✅ Channel info:', channelInfo)
      } catch (e) {
        console.warn('⚠️ Could not get channel info:', e.message)
      }
      
      // STEP 5: Create final user object with REAL Discord data
      const userData = {
        id: realUser.id,
        username: realUser.username,
        discriminator: realUser.discriminator || '0001',
        avatar: realUser.avatar,
        global_name: realUser.global_name || realUser.username,
        bot: realUser.bot || false,
        avatar_decoration_data: realUser.avatar_decoration_data || null
      }
      
      console.log('👤 Setting authenticated REAL Discord user:', userData.username, 'ID:', userData.id)
      setUser(userData)
      
      // Optional: Set channel data
      if (channelInfo) {
        setChannel(channelInfo)
      }
      
      console.log('✅ Discord Activity authentication completed successfully!')
      console.log('🎉 Real user authenticated:', {
        id: userData.id,
        username: userData.username,
        participantsCount: participants.participants.length,
        hasOAuth2: !!authCode
      })

      // Optional: Sync with server for app-specific data (don't block authentication if this fails)
      try {
        console.log('🔄 Syncing with server for app-specific data...')
        const response = await fetch(buildApiUrl('/api/auth/activity-sync'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Discord-User-ID': userData.id,
            'X-Activity-Instance': instanceId || 'unknown'
          },
          mode: 'cors',
          credentials: 'omit',
          body: JSON.stringify({ 
            user: userData, 
            discord_access_token: null, // We don't have OAuth2 token, but that's OK
            activity_context: {
              guild_id: guildId,
              channel_id: channelId,
              instance_id: instanceId
            }
          })
        })

        if (response.ok) {
          const serverData = await response.json()
          console.log('✅ Server sync successful:', serverData)
          if (serverData.token) {
            localStorage.setItem('auth_token', serverData.token)
          }
        } else {
          const errorText = await response.text()
          console.warn('⚠️ Server sync failed with status:', response.status, errorText)
        }
      } catch (serverError) {
        console.warn('⚠️ Server sync failed, Discord authentication still successful:', serverError)
        console.warn('💡 This is OK - Discord Activity will work without server sync')
      }

      // Store authentication state
      localStorage.setItem('discord_authenticated', 'true')
      localStorage.setItem('discord_user', JSON.stringify(userData))
      localStorage.setItem('discord_access_token', authCode || 'activity_user')

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
        } else if (err.message.includes('scope') || err.message.includes('permission') || err.message.includes('participants')) {
          errorMessage = 'Discord Activity permission error. Please check: 1) Activity scopes in Discord Developer Portal, 2) Launch from voice channel, 3) Proper OAuth2 redirect URLs configured.'
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
        const isProductionDomain = window.location.hostname === 'www.opure.uk' || window.location.hostname === 'opure.uk'
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