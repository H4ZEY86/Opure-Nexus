import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DiscordSDK, Types } from '@discord/embedded-app-sdk';

// Define the shape of our context
interface DiscordContextType {
  user: Types.User | null;
  isLoading: boolean;
  discordSdk: DiscordSDK | null;
}

// Create the context
const DiscordContext = createContext<DiscordContextType>({
  user: null,
  isLoading: true,
  discordSdk: null,
});

// Custom hook to easily access the context
export const useDiscord = () => useContext(DiscordContext);

// The provider component that wraps our app
export const DiscordContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Types.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);

  useEffect(() => {
    const setupDiscordSdk = async () => {
      try {
        // 1. Initialize the Discord SDK
        const sdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
        setDiscordSdk(sdk);
        await sdk.ready();

        // 2. Authorize with Discord to get a code
        const { code } = await sdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds'],
        });

        // 3. Exchange the code for an access token via our server
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();

        // 4. Authenticate with the SDK using the access token
        const auth = await sdk.commands.authenticate({ access_token });
        setUser(auth.user);

      } catch (error) {
        console.error('Error authenticating with Discord:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setupDiscordSdk();
  }, []);

  return (
    <DiscordContext.Provider value={{ user, isLoading, discordSdk }}>
      {children}
    </DiscordContext.Provider>
  );
};
