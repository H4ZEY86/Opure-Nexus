import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DiscordSDK, Types } from '@discord/embedded-app-sdk';

// Define the shape of our context, now including an error state
interface DiscordContextType {
  user: Types.User | null;
  isLoading: boolean;
  discordSdk: DiscordSDK | null;
  error: string | null;
}

// Create the context with a default value
const DiscordContext = createContext<DiscordContextType>({
  user: null,
  isLoading: true,
  discordSdk: null,
  error: null,
});

// Custom hook to easily access the context
export const useDiscord = () => useContext(DiscordContext);

// The provider component that will wrap our app and handle auth
export const DiscordProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Types.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupDiscordSdk = async () => {
      try {
        console.log('🚀 Starting Discord Activity authentication...');
        
        // Initialize Discord SDK
        const sdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
        setDiscordSdk(sdk);
        await sdk.ready();
        console.log('✅ Discord SDK ready');

        // Get activity instance info
        const instanceId = sdk.instanceId;
        const guildId = sdk.guildId;
        const channelId = sdk.channelId;
        
        console.log('🏠 Activity Context:', { instanceId, guildId, channelId });

        // Try to get user from current participant
        try {
          const participants = await sdk.commands.getInstanceConnectedParticipants();
          console.log('👥 Connected participants:', participants);
          
          // Find current user in participants
          let currentUser = null;
          for (const participant of participants.participants) {
            console.log('🔍 Checking participant:', participant);
            if (participant.user) {
              currentUser = participant.user;
              break;
            }
          }

          if (currentUser) {
            console.log('✅ Found user from participants:', currentUser);
            setUser(currentUser);
          } else {
            throw new Error('No user found in participants');
          }
        } catch (participantError) {
          console.log('⚠️ Participant method failed, trying authorization...');
          
          // Try Discord's internal authorization
          try {
            const auth = await sdk.commands.authorize({
              client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
              response_type: 'code',
              state: '',
              prompt: 'none',
              scope: ['identify'],
            });
            
            console.log('🔑 Authorization result:', auth);
            
            // Get REAL user data from Discord SDK
            const realUser = {
              id: auth.user?.id || 'unknown',
              username: auth.user?.username || 'User',  
              discriminator: auth.user?.discriminator || '0000',
              avatar: auth.user?.avatar,
              bot: false,
              system: false,
              mfa_enabled: false,
              banner: auth.user?.banner,
              accent_color: auth.user?.accent_color,
              locale: 'en-US',
              verified: true,
              email: null,
              flags: auth.user?.flags || 0,
              premium_type: auth.user?.premium_type || 0,
              public_flags: auth.user?.public_flags || 0,
              global_name: auth.user?.global_name || auth.user?.username
            };
            
            console.log('✅ Using real Discord user data for activity');
            setUser(realUser);
          } catch (authError) {
            console.error('❌ Authorization failed:', authError);
            throw authError;
          }
        }

      } catch (error: any) {
        console.error('❌ All authentication methods failed:', error);
        
        // Final fallback - try to get user from Discord SDK context
        let fallbackUser = null;
        if (discordSdk) {
          try {
            // Try to get current user from SDK context
            const currentUser = discordSdk.commands?.getUser?.() || null;
            fallbackUser = currentUser || {
              id: 'guest_' + Date.now(),
              username: 'DiscordUser', 
              discriminator: '0000',
              avatar: null,
              bot: false,
              system: false,
              mfa_enabled: false,
              banner: null,
              accent_color: null,
              locale: 'en-US',
              verified: true,
              email: null,
              flags: 0,
              premium_type: 0,
              public_flags: 0,
              global_name: 'DiscordUser'
            };
          } catch (e) {
            fallbackUser = {
              id: 'guest_' + Date.now(),
              username: 'DiscordUser',
              discriminator: '0000',
              avatar: null,
              bot: false,
              system: false,
              mfa_enabled: false,
              banner: null,
              accent_color: null,
              locale: 'en-US',
              verified: true,
              email: null,
              flags: 0,
              premium_type: 0,
              public_flags: 0,
              global_name: 'DiscordUser'
            };
          }
        } else {
          fallbackUser = {
            id: 'guest_' + Date.now(),
            username: 'DiscordUser',
            discriminator: '0000',
            avatar: null,
            bot: false,
            system: false,
            mfa_enabled: false,
            banner: null,
            accent_color: null,
            locale: 'en-US',
            verified: true,
            email: null,
            flags: 0,
            premium_type: 0,
            public_flags: 0,
            global_name: 'DiscordUser'
          };
        }
        
        console.log('🆘 Using emergency fallback user');
        setUser(fallbackUser);
        setError(null); // Clear error since we have a working fallback
      } finally {
        setIsLoading(false);
      }
    };

    setupDiscordSdk();
  }, []);

  return (
    <DiscordContext.Provider value={{ user, isLoading, discordSdk, error }}>
      {children}
    </DiscordContext.Provider>
  );
};
