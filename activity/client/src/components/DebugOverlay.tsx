import React from 'react';
import { useDiscord } from '../contexts/DiscordContextDirect'; // Ensure this path is correct

export default function DebugOverlay() {
  // --- FIX ---
  // We now get the authenticated discordSdk instance from our context
  // instead of creating a new one.
  const { discordSdk, user, isLoading } = useDiscord();
  
  const [isOpen, setIsOpen] = React.useState(true);

  if (!isOpen) {
    return null;
  }

  // Early return if the SDK is not yet available from the context
  if (!discordSdk) {
    return (
        <div className="fixed bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl z-[100] max-w-sm text-xs border border-gray-700">
            <h3 className="font-bold text-sm mb-2 text-yellow-400">DEBUG INFO</h3>
            <p>Waiting for Discord SDK from context...</p>
        </div>
    );
  }

  const runTests = async () => {
    console.log("Running all tests...");
    // Example test: Get channel information
    try {
      const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId! });
      console.log("Get Channel Success:", channel);
    } catch (error) {
      console.error("Get Channel Error:", error);
    }
  };

  const testAuth = async () => {
    console.log("Testing authentication...");
    if (user) {
        console.log("Authentication successful. User:", user);
    } else {
        console.error("Authentication failed. No user data.");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl z-[100] max-w-sm text-xs border border-gray-700">
      <h3 className="font-bold text-sm mb-2 text-yellow-400">DEBUG INFO</h3>
      
      <div className="space-y-1">
        <p>isLoading: {isLoading ? '✅' : '❌'}</p>
        <p>ready: {discordSdk ? '✅' : '❌'}</p>
        <p>discordSdk: {discordSdk ? '✅' : '❌'}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="font-bold text-sm mb-2 text-cyan-400">ENVIRONMENT:</h4>
        <div className="space-y-1 break-all">
            <p>Domain: {window.location.hostname}</p>
            <p>Referrer: {document.referrer || 'N/A'}</p>
            <p>URL Params: {window.location.search || 'N/A'}</p>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="font-bold text-sm mb-2 text-green-400">TEST RESULTS:</h4>
        <p className="text-gray-400">{user ? `Authenticated as ${user.username}` : 'Not Authenticated'}</p>
        <p className="text-gray-400">{discordSdk ? 'Discord SDK available' : 'No Discord SDK available'}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={runTests} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">
          RUN TESTS
        </button>
        <button onClick={testAuth} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">
          TEST AUTH
        </button>
        <button onClick={() => console.clear()} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">
          CLEAR TESTS
        </button>
        <button onClick={() => setIsOpen(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">
          CLOSE
        </button>
      </div>
    </div>
  );
}
