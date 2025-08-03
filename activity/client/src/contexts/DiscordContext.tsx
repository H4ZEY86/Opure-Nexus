import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DiscordSDK, Types } from '@discord/embedded-app-sdk'

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
    if (!discordSdk) return

    try {
      setIsLoading(true)
      setError(null)

      // Authenticate with Discord
      const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: [
          'identify',
          'guilds',
          'applications.commands',
        ],
      })

      // Exchange code for access token
      const response = await fetch('/api/auth/discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error('Failed to authenticate')
      }

      const { access_token } = await response.json()

      // Get user info
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!userResponse.ok) {
        throw new Error('Failed to get user info')
      }

      const userData = await userResponse.json()
      setUser(userData)

      // Get channel info if available
      try {
        const channelData = await discordSdk.commands.getChannel()
        setChannel(channelData)
      } catch (err) {
        console.warn('Could not get channel info:', err)
      }

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
          console.log('Not running in Discord - using mock user')
          setUser({
            id: 'browser-user-id',
            username: 'Browser User',
            discriminator: '0001',
            avatar: null,
            bot: false,
            system: false,
            mfa_enabled: false,
            verified: true,
            email: null,
            flags: 0,
            premium_type: 0,
            public_flags: 0,
          })
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

        // Simple authentication
        try {
          const auth = await sdk.commands.authenticate({
            access_token: null,
          })
          
          if (auth?.user) {
            setUser(auth.user)
          } else {
            // Fallback user
            setUser({
              id: 'discord-user-id',
              username: 'Discord User',
              discriminator: '0001',
              avatar: null,
              bot: false,
              system: false,
              mfa_enabled: false,
              verified: true,
              email: null,
              flags: 0,
              premium_type: 0,
              public_flags: 0,
            })
          }
        } catch (authError) {
          console.warn('Authentication failed, using fallback user:', authError)
          setUser({
            id: 'discord-user-id',
            username: 'Discord User',
            discriminator: '0001',
            avatar: null,
            bot: false,
            system: false,
            mfa_enabled: false,
            verified: true,
            email: null,
            flags: 0,
            premium_type: 0,
            public_flags: 0,
          })
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