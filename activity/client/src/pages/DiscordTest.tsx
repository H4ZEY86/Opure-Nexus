import React from 'react'
import { motion } from 'framer-motion'
import { useDiscord } from '../hooks/useDiscord'

export default function DiscordTest() {
  const { discordSdk, user, channel, authenticate, isLoading, error, ready } = useDiscord()

  const testDiscordCommands = async () => {
    if (!discordSdk || !ready) {
      console.error('Discord SDK not ready')
      return
    }

    try {
      // Test various Discord Activity commands
      console.log('Testing Discord Activity commands...')

      // Get instance info
      if (discordSdk.commands.getInstanceConnectParams) {
        const connectParams = await discordSdk.commands.getInstanceConnectParams()
        console.log('Instance connect params:', connectParams)
      }

      // Get channel info
      if (discordSdk.commands.getChannel) {
        const channelData = await discordSdk.commands.getChannel()
        console.log('Channel data:', channelData)
      }

      // Test activity updates
      if (discordSdk.commands.setActivity) {
        await discordSdk.commands.setActivity({
          activity: {
            type: 0,
            details: 'Testing Discord Activity',
            state: 'Debugging authentication'
          }
        })
        console.log('Activity status updated')
      }

    } catch (err) {
      console.error('Discord command test failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20"
        >
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            Discord Activity Test Page
          </h1>

          {/* Environment Status */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Environment</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">In iframe:</span>
                  <span className={window.self !== window.top ? 'text-green-400' : 'text-red-400'}>
                    {window.self !== window.top ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Referrer:</span>
                  <span className="text-white text-xs">
                    {document.referrer || 'none'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-white text-xs break-all">
                    {window.location.href}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Discord SDK</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">SDK loaded:</span>
                  <span className={discordSdk ? 'text-green-400' : 'text-red-400'}>
                    {discordSdk ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">SDK ready:</span>
                  <span className={ready ? 'text-green-400' : 'text-yellow-400'}>
                    {ready ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Authenticated:</span>
                  <span className={user ? 'text-green-400' : 'text-gray-400'}>
                    {user ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <h3 className="text-red-300 font-semibold mb-2">Error:</h3>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* User Info */}
          {user && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
              <h3 className="text-green-300 font-semibold mb-2">Authenticated User:</h3>
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : '/default-avatar.png'}
                  alt={user.username}
                  className="w-12 h-12 rounded-full border-2 border-green-400"
                />
                <div>
                  <p className="text-white font-medium">{user.username}#{user.discriminator}</p>
                  <p className="text-green-200 text-sm">ID: {user.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Channel Info */}
          {channel && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
              <h3 className="text-blue-300 font-semibold mb-2">Channel Info:</h3>
              <div className="text-sm space-y-1">
                <p className="text-white">Name: {channel.name}</p>
                <p className="text-blue-200">ID: {channel.id}</p>
                <p className="text-blue-200">Type: {channel.type}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            {!user && (
              <button
                onClick={authenticate}
                disabled={isLoading || !ready}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Authenticating...' : 'Authenticate with Discord'}
              </button>
            )}

            {user && ready && (
              <button
                onClick={testDiscordCommands}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Test Discord Commands
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <h3 className="text-yellow-300 font-semibold mb-2">Testing Instructions:</h3>
            <div className="text-yellow-200 text-sm space-y-2">
              <p><strong>✅ Correct way to test:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Open Discord application</li>
                <li>Go to your Discord Developer Portal</li>
                <li>Find your application (ID: 1388207626944249856)</li>
                <li>Use the "Test Activity" button or invite to a voice channel</li>
              </ol>
              <p className="mt-3"><strong>❌ Wrong way:</strong> Opening https://opure.uk directly in browser</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}