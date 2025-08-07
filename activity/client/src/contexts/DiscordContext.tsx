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
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('🚀 SIMPLE Discord authentication starting...')
      
      if (!discordSdk || !ready) {
        throw new Error('Discord SDK not ready. Please refresh the Activity.')
      }

      // SIMPLE: Just use Discord's built-in authenticate() method
      console.log('🔐 Calling Discord authenticate()...')
      const authResponse = await discordSdk.commands.authenticate({
        scopes: ['identify', 'rpc', 'rpc.activities.write', 'rpc.voice.read'],
      })
      
      console.log('✅ Authentication response received:', authResponse)
      
      if (!authResponse || !authResponse.user) {
        throw new Error('Discord authentication failed - no user data returned')
      }
      
      const userData = {
        id: authResponse.user.id,
        username: authResponse.user.username,
        discriminator: authResponse.user.discriminator || '0001',
        avatar: authResponse.user.avatar,
        global_name: authResponse.user.global_name || authResponse.user.username,
        bot: authResponse.user.bot || false,
        avatar_decoration_data: authResponse.user.avatar_decoration_data || null
      }
      
      console.log('🎉 SUCCESS! Authenticated user:', userData.username, 'ID:', userData.id)
      setUser(userData)
      
      // Store for persistence
      localStorage.setItem('discord_authenticated', 'true')
      localStorage.setItem('discord_user', JSON.stringify(userData))
      
    } catch (authError) {
      console.error('❌ Authentication failed:', authError.message)
      setError(`Authentication failed: ${authError.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        console.log('🔄 Initializing Discord SDK...')
        
        const sdk = new DiscordSDK(process.env.REACT_APP_DISCORD_CLIENT_ID || '1388207626944249856')
        
        console.log('⏳ Waiting for Discord SDK ready...')
        await sdk.ready()
        
        console.log('✅ Discord SDK is ready!')
        setDiscordSdk(sdk)
        setReady(true)
        
      } catch (error) {
        console.error('❌ SDK initialization failed:', error)
        setError(`SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSDK()
  }, [])

  // Auto-authenticate on SDK ready if not already authenticated
  useEffect(() => {
    if (ready && discordSdk && !user && !error) {
      console.log('🔄 Auto-authenticating...')
      authenticate()
    }
  }, [ready, discordSdk, user, error])

  const value = {
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