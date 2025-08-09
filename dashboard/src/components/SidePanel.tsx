'use client'

import { motion } from 'framer-motion'
import { BotData, RealTimeData } from '@/types'
import { formatNumber } from '@/lib/utils'
import { 
  Music, Brain, Gamepad2, Coins, Settings, 
  Play, Pause, SkipForward, Volume2,
  TrendingUp, Users, Zap, Clock
} from 'lucide-react'

interface SidePanelProps {
  botData: BotData
  realTimeData: RealTimeData
}

export default function SidePanel({ botData, realTimeData }: SidePanelProps) {
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 glass-panel m-4 p-6 space-y-6 overflow-y-auto"
    >
      {/* Music Player */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-cyber-neon" />
          Music Player
        </h3>
        
        <div className="glass-panel p-4 space-y-3">
          {realTimeData.music?.is_playing && realTimeData.music.current_track ? (
            <>
              <div className="text-sm text-white font-semibold truncate">
                {realTimeData.music.current_track.title}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {realTimeData.music.current_track.artist}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-1">
                <div 
                  className="bg-cyber-neon h-1 rounded-full transition-all"
                  style={{ 
                    width: `${(realTimeData.music.current_track.position / realTimeData.music.current_track.duration) * 100}%` 
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-400">
                <span>{Math.floor(realTimeData.music.current_track.position / 60)}:{String(realTimeData.music.current_track.position % 60).padStart(2, '0')}</span>
                <span>{Math.floor(realTimeData.music.current_track.duration / 60)}:{String(realTimeData.music.current_track.duration % 60).padStart(2, '0')}</span>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-4">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No music playing</div>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <SkipForward className="w-4 h-4 rotate-180 text-gray-400" />
            </button>
            <button className="p-3 bg-cyber-neon/20 hover:bg-cyber-neon/30 rounded-lg transition-colors">
              {realTimeData.music?.is_playing ? (
                <Pause className="w-5 h-5 text-cyber-neon" />
              ) : (
                <Play className="w-5 h-5 text-cyber-neon ml-1" />
              )}
            </button>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <SkipForward className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Volume & Queue */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {realTimeData.music?.volume || 0}%
            </div>
            <div>Queue: {realTimeData.music?.queue_length || 0}</div>
          </div>
        </div>
      </div>

      {/* AI System */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyber-purple" />
          AI System
        </h3>
        
        <div className="space-y-3">
          <div className="glass-panel p-3 flex justify-between items-center">
            <span className="text-sm text-gray-300">Requests Today</span>
            <span className="text-cyber-purple font-mono">{realTimeData.ai?.requests_today || 0}</span>
          </div>
          
          <div className="glass-panel p-3 flex justify-between items-center">
            <span className="text-sm text-gray-300">Response Time</span>
            <span className="text-cyber-purple font-mono">{realTimeData.ai?.average_response_time || 0}ms</span>
          </div>
          
          <div className="glass-panel p-3 flex justify-between items-center">
            <span className="text-sm text-gray-300">Memory Entries</span>
            <span className="text-cyber-purple font-mono">{realTimeData.ai?.memory_entries || 0}</span>
          </div>
          
          <div className="glass-panel p-3 flex justify-between items-center">
            <span className="text-sm text-gray-300">Success Rate</span>
            <span className="text-green-400 font-mono">{realTimeData.ai?.success_rate || 0}%</span>
          </div>
        </div>
      </div>

      {/* Gaming Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-cyber-pink" />
          Gaming Hub
        </h3>
        
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Activity Status</span>
            <div className={`w-3 h-3 rounded-full ${
              realTimeData.gaming?.activity_status === 'online' ? 'bg-green-400' : 'bg-red-400'
            }`} />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Active Players</span>
            <span className="text-cyber-pink font-mono">{realTimeData.gaming?.active_players || 0}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Daily Games</span>
            <span className="text-cyber-pink font-mono">{realTimeData.gaming?.daily_games || 0}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Total Games</span>
            <span className="text-cyber-pink font-mono">{formatNumber(realTimeData.gaming?.total_games_played || 0)}</span>
          </div>
        </div>
      </div>

      {/* Economy Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-cyber-orange" />
          Economy
        </h3>
        
        <div className="glass-panel p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Total Fragments</span>
            <span className="text-cyber-orange font-mono">{formatNumber(realTimeData.economy?.total_fragments || 0)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Daily Trades</span>
            <span className="text-cyber-orange font-mono">{realTimeData.economy?.daily_transactions || 0}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Active Traders</span>
            <span className="text-cyber-orange font-mono">{realTimeData.economy?.active_traders || 0}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Shop Items</span>
            <span className="text-cyber-orange font-mono">{realTimeData.economy?.shop_items || 0}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyber-green" />
          Quick Stats
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel p-3 text-center">
            <Users className="w-5 h-5 text-cyber-neon mx-auto mb-1" />
            <div className="text-lg font-bold text-cyber-neon">{formatNumber(botData.users)}</div>
            <div className="text-xs text-gray-400">Users</div>
          </div>
          
          <div className="glass-panel p-3 text-center">
            <Zap className="w-5 h-5 text-cyber-purple mx-auto mb-1" />
            <div className="text-lg font-bold text-cyber-purple">{formatNumber(botData.commands_executed)}</div>
            <div className="text-xs text-gray-400">Commands</div>
          </div>
          
          <div className="glass-panel p-3 text-center">
            <Clock className="w-5 h-5 text-cyber-pink mx-auto mb-1" />
            <div className="text-lg font-bold text-cyber-pink">{Math.floor(realTimeData.performance?.response_time || 0)}ms</div>
            <div className="text-xs text-gray-400">Response</div>
          </div>
          
          <div className="glass-panel p-3 text-center">
            <Settings className="w-5 h-5 text-cyber-orange mx-auto mb-1" />
            <div className="text-lg font-bold text-cyber-orange">{realTimeData.performance?.active_connections || 0}</div>
            <div className="text-xs text-gray-400">Connections</div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="glass-panel p-4 space-y-3">
        <h4 className="font-semibold text-white">System Health</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">CPU Usage</span>
            <span className="text-green-400">{realTimeData.performance?.cpu_usage?.toFixed(1) || 0}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1">
            <div 
              className="bg-green-400 h-1 rounded-full transition-all"
              style={{ width: `${realTimeData.performance?.cpu_usage || 0}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">GPU Usage (RTX 5070 Ti)</span>
            <span className="text-blue-400">{realTimeData.performance?.gpu_usage?.toFixed(1) || 0}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1">
            <div 
              className="bg-blue-400 h-1 rounded-full transition-all"
              style={{ width: `${realTimeData.performance?.gpu_usage || 0}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}