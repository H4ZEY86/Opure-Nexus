import React, { useState, useEffect } from 'react'
import { useDiscord } from '../../contexts/DiscordContext'

interface BotStats {
  uptime: string
  guilds: number
  users: number
  commands_used: number
  music_tracks_played: number
}

interface BotManagementProps {
  className?: string
}

export const BotManagement: React.FC<BotManagementProps> = ({ className = '' }) => {
  const { user } = useDiscord()
  const [botStats, setBotStats] = useState<BotStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [commandInput, setCommandInput] = useState('')
  const [commandResult, setCommandResult] = useState<string | null>(null)

  // Mock admin check - in production, implement proper admin verification
  const isAdmin = user?.id === 'YOUR_ADMIN_USER_ID' // Replace with actual admin user IDs

  useEffect(() => {
    fetchBotStats()
  }, [])

  const fetchBotStats = async () => {
    try {
      setIsLoading(true)
      // Mock bot stats - replace with actual API call
      const mockStats: BotStats = {
        uptime: '2d 14h 32m',
        guilds: 5,
        users: 1250,
        commands_used: 8429,
        music_tracks_played: 1654
      }
      setBotStats(mockStats)
    } catch (error) {
      console.error('Failed to fetch bot stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeCommand = async () => {
    if (!commandInput.trim()) return

    try {
      const response = await fetch('https://api.opure.uk/api/bot/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('opure_auth_token')}`
        },
        body: JSON.stringify({
          command: commandInput.trim(),
          userId: user?.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        setCommandResult(result.message || 'Command executed successfully')
      } else {
        setCommandResult('Command execution failed')
      }
    } catch (error) {
      console.error('Command execution error:', error)
      setCommandResult('Error: Could not execute command')
    }

    setCommandInput('')
  }

  if (!isAdmin) {
    return (
      <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h3 className="text-white text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-400">You don't have permission to access the bot management panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">Bot Management</h2>
            <p className="text-gray-400">Control Opure.exe bot operations</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">Bot Online</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-800 h-20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-blue-400 text-2xl font-bold">{botStats?.uptime}</div>
              <div className="text-gray-400 text-sm">Uptime</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-green-400 text-2xl font-bold">{botStats?.guilds}</div>
              <div className="text-gray-400 text-sm">Servers</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-purple-400 text-2xl font-bold">{botStats?.users}</div>
              <div className="text-gray-400 text-sm">Users</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-yellow-400 text-2xl font-bold">{botStats?.commands_used}</div>
              <div className="text-gray-400 text-sm">Commands</div>
            </div>
          </div>

          {/* Command Console */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">Command Console</h3>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
                  placeholder="Enter bot command..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={executeCommand}
                  disabled={!commandInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                >
                  Execute
                </button>
              </div>
              {commandResult && (
                <div className="bg-gray-700 p-3 rounded border-l-4 border-blue-500">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap">{commandResult}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg text-sm transition-colors">
              Restart Bot
            </button>
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white p-3 rounded-lg text-sm transition-colors">
              Sync Database
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg text-sm transition-colors">
              Update Status
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg text-sm transition-colors">
              Generate Quests
            </button>
            <button className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-lg text-sm transition-colors">
              Clear Cache
            </button>
            <button className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg text-sm transition-colors">
              Emergency Stop
            </button>
          </div>
        </div>
      )}
    </div>
  )
}