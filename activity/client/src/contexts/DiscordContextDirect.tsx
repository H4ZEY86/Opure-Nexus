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

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Token exchange failed with status ${response.status}: ${errorText}`);
        }

        const { access_token } = await response.json();
        if (!access_token) {
          throw new Error("Access token was not found in the response from /api/token.");
        }

        // 4. Authenticate with the SDK using the access token
        const auth = await sdk.commands.authenticate({ access_token });
        
        if (auth.user) {
          setUser(auth.user);
        } else {
          throw new Error("Authentication with SDK did not return a user.");
        }

      } catch (e: any) {
        console.error('Error during Discord SDK setup:', e);
        setError(e.message || 'An unknown error occurred during authentication.');
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
