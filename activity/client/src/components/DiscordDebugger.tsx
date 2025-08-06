import React from 'react'
import { useDiscord } from '../contexts/DiscordContext'

export const DiscordDebugger: React.FC = () => {
  const { discordSdk, user, isLoading, error, ready, authenticate } = useDiscord()

  const debugInfo = {
    // Environment
    inIframe: window.self !== window.top,
    referrer: document.referrer,
    url: window.location.href,
    userAgent: navigator.userAgent.substring(0, 100),
    
    // Discord Context
    hasDiscordSdk: !!discordSdk,
    sdkReady: ready,
    hasUser: !!user,
    isLoading,
    error,
    
    // Storage
    storedAuth: localStorage.getItem('discord_authenticated'),
    storedUser: !!localStorage.getItem('discord_user')
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md text-xs font-mono">
      <h3 className="text-yellow-400 font-bold mb-2">Discord Activity Debug</h3>
      
      {/* Status */}
      <div className="mb-3 space-y-1">
        <div className={`flex items-center gap-2 ${debugInfo.inIframe ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${debugInfo.inIframe ? 'bg-green-400' : 'bg-red-400'}`} />
          In iframe: {debugInfo.inIframe ? 'YES' : 'NO'}
        </div>
        
        <div className={`flex items-center gap-2 ${debugInfo.hasDiscordSdk ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${debugInfo.hasDiscordSdk ? 'bg-green-400' : 'bg-red-400'}`} />
          SDK loaded: {debugInfo.hasDiscordSdk ? 'YES' : 'NO'}
        </div>
        
        <div className={`flex items-center gap-2 ${debugInfo.sdkReady ? 'text-green-400' : 'text-yellow-400'}`}>
          <div className={`w-2 h-2 rounded-full ${debugInfo.sdkReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
          SDK ready: {debugInfo.sdkReady ? 'YES' : 'NO'}
        </div>
        
        <div className={`flex items-center gap-2 ${debugInfo.hasUser ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`w-2 h-2 rounded-full ${debugInfo.hasUser ? 'bg-green-400' : 'bg-gray-400'}`} />
          Authenticated: {debugInfo.hasUser ? 'YES' : 'NO'}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 p-2 bg-red-900/50 border border-red-600 rounded text-red-300">
          <div className="font-bold">Error:</div>
          <div>{error}</div>
        </div>
      )}

      {/* User Info */}
      {user && (
        <div className={`mb-3 p-2 border rounded ${
          user.id.includes('activity_user_') || user.username === 'DiscordUser' 
            ? 'bg-red-900/50 border-red-600 text-red-300' 
            : 'bg-green-900/50 border-green-600 text-green-300'
        }`}>
          <div className="font-bold">User:</div>
          <div>{user.username}#{user.discriminator}</div>
          <div>ID: {user.id}</div>
          {(user.id.includes('activity_user_') || user.username === 'DiscordUser') && (
            <div className="mt-1 text-xs">
              ⚠️ FAKE USER DATA - Launch through Discord Activity!
            </div>
          )}
        </div>
      )}

      {/* Environment Info */}
      <details className="mb-3">
        <summary className="cursor-pointer text-blue-400 hover:text-blue-300">Environment</summary>
        <div className="mt-2 space-y-1 text-gray-400">
          <div>Referrer: {debugInfo.referrer || 'none'}</div>
          <div>URL: {debugInfo.url}</div>
          <div>UA: {debugInfo.userAgent}...</div>
        </div>
      </details>

      {/* Critical Discord Activity Parameters */}
      <details className="mb-3">
        <summary className="cursor-pointer text-red-400 hover:text-red-300">🚨 Activity Parameters</summary>
        <div className="mt-2 space-y-1 text-gray-300">
          <div>Instance ID: {new URLSearchParams(window.location.search).get('instance_id') || '❌ MISSING'}</div>
          <div>Guild ID: {new URLSearchParams(window.location.search).get('guild_id') || '❌ MISSING'}</div>
          <div>Channel ID: {new URLSearchParams(window.location.search).get('channel_id') || '❌ MISSING'}</div>
          <div>Launch ID: {new URLSearchParams(window.location.search).get('launch_id') || '❌ MISSING'}</div>
          {!new URLSearchParams(window.location.search).get('instance_id') && (
            <div className="p-2 bg-red-900/50 border border-red-600 rounded text-red-300 text-xs">
              ⚠️ CRITICAL: Missing Discord Activity parameters!<br/>
              You're accessing this wrong - launch through Discord Activity, not browser!
            </div>
          )}
        </div>
      </details>

      {/* Actions */}
      <div className="space-y-2">
        {!debugInfo.inIframe && (
          <div className="p-2 bg-yellow-900/50 border border-yellow-600 rounded text-yellow-300 text-center">
            ⚠️ Not in Discord iframe!<br/>
            Open through Discord Activity
          </div>
        )}
        
        {debugInfo.inIframe && debugInfo.sdkReady && !debugInfo.hasUser && (
          <button
            onClick={authenticate}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-2 rounded transition-colors"
          >
            {isLoading ? 'Authenticating...' : 'Test Authenticate'}
          </button>
        )}
      </div>
    </div>
  )
}