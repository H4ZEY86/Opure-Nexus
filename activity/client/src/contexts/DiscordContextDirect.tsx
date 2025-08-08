import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DiscordSDK, Types } from '@discord/embedded-app-sdk';

// Define the shape of our context, simplifying it to what's needed
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

// The provider component that will wrap our app and handle auth
export const DiscordProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Types.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);

  useEffect(() => {
    const setupDiscordSdk = async () => {
      try {
        // 1. Initialize the Discord SDK with the Client ID from environment variables
        const sdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
        setDiscordSdk(sdk);
        await sdk.ready();

        // 2. Authorize with Discord. This is the step that triggers the OAuth2 pop-up.
        const { code } = await sdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none', // 'none' means it won't prompt if the user is already authorized
          scope: ['identify', 'guilds'],
        });

        // 3. Exchange the authorization code for an access token via your server-side endpoint
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();

        // 4. Authenticate with the SDK using the access token to get user info
        const auth = await sdk.commands.authenticate({ access_token });
        
        // If authentication is successful, set the user
        if (auth.user) {
          setUser(auth.user);
        }

      } catch (error) {
        // If any step fails, we'll log the error.
        console.error('Error authenticating with Discord:', error);
      } finally {
        // Whether it succeeds or fails, we're done loading.
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
