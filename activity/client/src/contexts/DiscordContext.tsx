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
      console.error('Discord SDK not initialized')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log('Starting Discord Activity authentication...')

      // For Discord Activities, use the proper OAuth2 flow
      const authResult = await discordSdk.commands.authorize({
        client_id: '1388207626944249856', // Your Discord Application ID
        response_type: 'code',
        state: crypto.randomUUID(), // Generate random state for security
        prompt: 'none',
        scope: [
          'identify', // Get user info
          'guilds', // Access guild info
          'rpc.activities.write', // Write activity data
        ],
      })

      console.log('Authorization successful:', authResult)

      // Exchange the authorization code with our server
      console.log('🔄 Exchanging authorization code with server...')
      console.log('Auth URL:', buildApiUrl(API_CONFIG.ENDPOINTS.AUTH))
      console.log('Auth code length:', authResult.code.length)
      
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ code: authResult.code }),
      })

      console.log('Server response status:', response.status)
      console.log('Server response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Server response error:', errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }
        
        throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`)
      }

      const responseText = await response.text()
      console.log('Raw server response:', responseText)
      
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ Failed to parse server response:', parseError)
        throw new Error('Invalid server response format')
      }
      
      const { user, token } = responseData
      console.log('Server authentication successful:', { user })
      
      // Store the JWT token for API requests
      localStorage.setItem('auth_token', token)

      console.log('Authentication successful:', { user })
      setUser(user)

      // Get current channel info
      try {
        const channelData = await discordSdk.commands.getChannel()
        console.log('Channel data:', channelData)
        setChannel(channelData)
      } catch (err) {
        console.warn('Could not get channel info:', err)
      }

      // Store authentication state
      localStorage.setItem('discord_authenticated', 'true')
      localStorage.setItem('discord_user', JSON.stringify(user))

    } catch (err) {
      console.error('Authentication error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initializeDiscordSdk = async () => {
      try {
        console.log('Initializing Discord SDK...')
        const clientId = '1388207626944249856' // Hardcoded for reliability
        
        // Check if we're running in Discord
        const isInDiscord = window.parent !== window || window.location.ancestorOrigins?.length > 0
        
        if (!isInDiscord) {
          console.log('Not running in Discord - OAuth2 authentication required')
          // Don't set mock user - force proper authentication flow
          setError('This application must be run within Discord as an Activity')
          setIsLoading(false)
          return
        }

        console.log('Creating Discord SDK instance...')
        const sdk = new DiscordSDK(clientId)
        
        // Set timeout for SDK initialization
        const initTimeout = setTimeout(() => {
          console.error('Discord SDK initialization timeout')
          setError('Discord SDK initialization timeout')
          setIsLoading(false)
        }, 10000)

        await sdk.ready()
        clearTimeout(initTimeout)
        
        console.log('Discord SDK ready!')
        setDiscordSdk(sdk)
        setReady(true)

        // Check for stored authentication first
        const storedAuth = localStorage.getItem('discord_authenticated')
        const storedUser = localStorage.getItem('discord_user')
        
        if (storedAuth === 'true' && storedUser) {
          console.log('Using stored authentication')
          setUser(JSON.parse(storedUser))
        } else {
          console.log('No stored authentication, will need to authenticate manually')
          // Don't auto-authenticate, wait for user action
          // This ensures proper OAuth2 flow
        }

        setIsLoading(false)

      } catch (err) {
        console.error('Discord SDK initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize Discord SDK')
        setIsLoading(false)
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