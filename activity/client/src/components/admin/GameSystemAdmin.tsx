import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Users,
  Gamepad2,
  Target,
  TrendingUp,
  Settings,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Edit,
  Trash2,
  Plus
} from 'lucide-react'

interface GameSystemAdminProps {
  user: any
  permissions: string[]
  realTimeData: any
  onNotification: (notification: any) => void
}

const GameSystemAdmin: React.FC<GameSystemAdminProps> = ({
  user,
  permissions,
  realTimeData,
  onNotification
}) => {
  const [loading, setLoading] = useState(true)
  const [gameStats, setGameStats] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])

  useEffect(() => {
    loadGameData()
  }, [])

  const loadGameData = async () => {
    try {
      setLoading(true)
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setGameStats({
        totalGames: 12,
        activeGames: 8,
        totalSessions: 1543,
        activeSessions: 23,
        avgSessionTime: 845,
        topGame: 'Puzzle Quest'
      })

      setGames([
        {
          id: 'puzzle-quest',
          name: 'Puzzle Quest',
          category: 'Puzzle',
          status: 'active',
          players: 156,
          avgRating: 4.8,
          sessions: 543
        },
        {
          id: 'action-arena',
          name: 'Action Arena',
          category: 'Action',
          status: 'active',
          players: 89,
          avgRating: 4.6,
          sessions: 342
        }
      ])

      setActiveSessions([
        {
          id: 'session-1',
          gameId: 'puzzle-quest',
          gameName: 'Puzzle Quest',
          players: 4,
          duration: 1200,
          status: 'active'
        }
      ])
    } catch (error) {
      console.error('Failed to load game data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-white font-medium">Loading game system...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Game Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Total Games</p>
              <p className="text-2xl font-bold text-white">{gameStats?.totalGames || 0}</p>
              <p className="text-green-400 text-xs mt-1">
                {gameStats?.activeGames || 0} active
              </p>
            </div>
            <Gamepad2 className="w-8 h-8 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Active Sessions</p>
              <p className="text-2xl font-bold text-white">{gameStats?.activeSessions || 0}</p>
              <p className="text-blue-400 text-xs mt-1">
                {gameStats?.totalSessions || 0} total
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Avg Session Time</p>
              <p className="text-2xl font-bold text-white">
                {Math.floor((gameStats?.avgSessionTime || 0) / 60)}m
              </p>
              <p className="text-yellow-400 text-xs mt-1">
                {(gameStats?.avgSessionTime || 0) % 60}s
              </p>
            </div>
            <Target className="w-8 h-8 text-yellow-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm font-medium">Top Game</p>
              <p className="text-lg font-bold text-white">{gameStats?.topGame || 'N/A'}</p>
              <p className="text-indigo-400 text-xs mt-1">
                Most played
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-indigo-400" />
          </div>
        </motion.div>
      </div>

      {/* Games Management */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Game Management</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/30">
              <Plus className="w-4 h-4" />
              Add Game
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-white font-medium">Game</th>
                <th className="px-6 py-4 text-left text-white font-medium">Category</th>
                <th className="px-6 py-4 text-left text-white font-medium">Status</th>
                <th className="px-6 py-4 text-left text-white font-medium">Players</th>
                <th className="px-6 py-4 text-left text-white font-medium">Rating</th>
                <th className="px-6 py-4 text-left text-white font-medium">Sessions</th>
                <th className="px-6 py-4 text-left text-white font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {games.map((game) => (
                <tr key={game.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Gamepad2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{game.name}</p>
                        <p className="text-white/60 text-sm">ID: {game.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                      {game.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      game.status === 'active' 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {game.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">{game.players}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-white">{game.avgRating}</span>
                      <span className="text-yellow-400">★</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white">{game.sessions}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                        <Edit className="w-4 h-4 text-white" />
                      </button>
                      <button className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                      <button className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors">
                        {game.status === 'active' ? (
                          <Pause className="w-4 h-4 text-green-400" />
                        ) : (
                          <Play className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Active Game Sessions</h3>
        </div>

        <div className="p-6">
          {activeSessions.length > 0 ? (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    <div>
                      <p className="text-white font-medium">{session.gameName}</p>
                      <p className="text-white/60 text-sm">
                        {session.players} players • {Math.floor(session.duration / 60)}m {session.duration % 60}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                      ACTIVE
                    </span>
                    <button className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors">
                      <Pause className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No active game sessions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameSystemAdmin