import React from 'react';
import { useDiscord } from '../contexts/DiscordContextDirect'; // Ensure this path is correct

export default function DebugOverlay() {
  const { discordSdk, user, isLoading, error } = useDiscord();
  const [isOpen, setIsOpen] = React.useState(true);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl z-[100] max-w-sm text-xs border border-gray-700">
      <h3 className="font-bold text-sm mb-2 text-yellow-400">DEBUG INFO</h3>
      
      <div className="space-y-1">
        <p>isLoading: {isLoading ? '✅' : '❌'}</p>
        <p>SDK Instance: {discordSdk != null ? '✅' : '❌'}</p>
        <p>User Authenticated: {user != null ? '✅' : '❌'}</p>
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
        <h4 className="font-bold text-sm mb-2 text-red-500">ERROR:</h4>
        <p className="text-gray-300 break-all">{error || 'None'}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => console.log({discordSdk, user, isLoading, error})} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">
          LOG STATE
        </button>
        <button onClick={() => console.clear()} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">
          CLEAR LOG
        </button>
        <button onClick={() => window.location.reload()} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors col-span-2">
          RELOAD ACTIVITY
        </button>
        <button onClick={() => setIsOpen(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors col-span-2">
          CLOSE DEBUGGER
        </button>
      </div>
    </div>
  );
}
