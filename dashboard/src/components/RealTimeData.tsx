'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  Zap, 
  Users, 
  MessageCircle, 
  Music,
  Gamepad2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react'

interface RealTimeEvent {
  id: string
  type: 'command' | 'ai' | 'music' | 'gaming' | 'achievement' | 'system'
  title: string
  description: string
  user?: string
  guild?: string
  timestamp: Date
  color: string
  icon: string
}

interface StreamingData {
  commands_per_minute: number
  active_users: number
  ai_responses_generated: number
  music_streams: number
  games_active: number
  system_load: number
  memory_usage: number
  uptime: number
}

export default function RealTimeData({ realTimeData, isConnected }: any) {
  const [events, setEvents] = useState<RealTimeEvent[]>([])
  const [streamingData, setStreamingData] = useState<StreamingData>({
    commands_per_minute: 0,
    active_users: 0,
    ai_responses_generated: 0,
    music_streams: 0,
    games_active: 0,
    system_load: 0,
    memory_usage: 0,
    uptime: 0
  })

  // Simulate real-time events
  useEffect(() => {
    if (!isConnected) return

    const eventTypes = [
      {
        type: 'command' as const,
        titles: ['Quick AI Chat', 'Music Queue', 'Server Stats', 'Gaming Hub', 'Economy Check'],
        color: '#5865f2',
        icon: 'zap'
      },
      {
        type: 'ai' as const,
        titles: ['AI Response Generated', 'Personality Switch', 'Memory Updated', 'Context Analyzed'],
        color: '#9d4edd',
        icon: 'brain'
      },
      {
        type: 'music' as const,
        titles: ['Song Added to Queue', 'Playlist Started', 'Audio Stream Connected', 'Volume Adjusted'],
        color: '#ff006e',
        icon: 'music'
      },
      {
        type: 'gaming' as const,
        titles: ['Game Session Started', 'Achievement Unlocked', 'Leaderboard Updated', 'Tournament Match'],
        color: '#00ffff',
        icon: 'gamepad'
      },
      {
        type: 'achievement' as const,
        titles: ['New Achievement!', 'Milestone Reached', 'Badge Earned', 'Level Up!'],
        color: '#39ff14',
        icon: 'trophy'
      },
      {
        type: 'system' as const,
        titles: ['System Update', 'Performance Optimized', 'Cache Cleared', 'Backup Completed'],
        color: '#ff6b35',
        icon: 'activity'
      }
    ]

    const interval = setInterval(() => {
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      const randomTitle = randomType.titles[Math.floor(Math.random() * randomType.titles.length)]
      
      const newEvent: RealTimeEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: randomType.type,
        title: randomTitle,
        description: `User action in Guild #${Math.floor(Math.random() * 5) + 1}`,
        user: `User#${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        guild: `Guild ${Math.floor(Math.random() * 10) + 1}`,
        timestamp: new Date(),
        color: randomType.color,
        icon: randomType.icon
      }

      setEvents(prev => [newEvent, ...prev.slice(0, 49)]) // Keep last 50 events
    }, 2000 + Math.random() * 3000) // Random interval between 2-5 seconds

    return () => clearInterval(interval)
  }, [isConnected])

  // Update streaming data
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      setStreamingData(prev => ({
        commands_per_minute: Math.floor(Math.random() * 100) + 20,
        active_users: Math.floor(Math.random() * 50) + 30,
        ai_responses_generated: prev.ai_responses_generated + Math.floor(Math.random() * 5) + 1,
        music_streams: Math.floor(Math.random() * 15) + 5,
        games_active: Math.floor(Math.random() * 8) + 3,
        system_load: Math.random() * 100,
        memory_usage: Math.random() * 100,
        uptime: prev.uptime + 5
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [isConnected])

  // Update from props
  useEffect(() => {
    if (realTimeData) {
      setStreamingData(prev => ({
        ...prev,
        ...realTimeData.streaming
      }))
    }
  }, [realTimeData])

  const getEventIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      zap: Zap,
      brain: Activity,
      music: Music,
      gamepad: Gamepad2,
      trophy: CheckCircle,
      activity: Activity
    }
    return icons[iconName] || Activity
  }

  const StreamingMetric = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    color, 
    change 
  }: {
    title: string
    value: number | string
    unit?: string
    icon: any
    color: string
    change?: number
  }) => (
    <motion.div
      className="glass-panel p-4 hover:scale-105 transition-all duration-300"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg border-2`} style={{ borderColor: color, backgroundColor: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
        {change !== undefined && (
          <div className={`text-xs font-mono ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        )}
      </div>
      
      <div className="mb-1">
        <span className="text-2xl font-mono font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
      </div>
      
      <p className="text-xs text-gray-400 font-mono">{title}</p>
    </motion.div>
  )

  return (
    <div className="space-y-6 p-4">
      {/* Connection Status Header */}
      <motion.div
        className={`glass-panel p-6 ${isConnected ? 'border-green-400/30' : 'border-red-400/30'}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border-2 ${
              isConnected ? 'bg-green-400/20 border-green-400' : 'bg-red-400/20 border-red-400'
            }`}>
              {isConnected ? (
                <Wifi size={24} className="text-green-400" />
              ) : (
                <WifiOff size={24} className="text-red-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-mono font-bold text-cyber-neon">
                REAL-TIME DATA STREAM
              </h2>
              <p className={`font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? '🟢 Live WebSocket Connection Active' : '🔴 Disconnected from Bot'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`status-indicator ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            } animate-pulse-glow`} />
            <p className="text-sm font-mono text-white mt-1 uppercase">
              {isConnected ? 'STREAMING' : 'OFFLINE'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StreamingMetric
          title="Commands/Min"
          value={streamingData.commands_per_minute}
          icon={Zap}
          color="#5865f2"
          change={Math.random() * 20 - 10}
        />
        
        <StreamingMetric
          title="Active Users"
          value={streamingData.active_users}
          icon={Users}
          color="#00ffff"
          change={Math.random() * 10 - 5}
        />
        
        <StreamingMetric
          title="AI Responses"
          value={streamingData.ai_responses_generated}
          unit="total"
          icon={Activity}
          color="#9d4edd"
          change={Math.random() * 15 - 7.5}
        />
        
        <StreamingMetric
          title="Music Streams"
          value={streamingData.music_streams}
          icon={Music}
          color="#ff006e"
          change={Math.random() * 25 - 12.5}
        />
        
        <StreamingMetric
          title="Active Games"
          value={streamingData.games_active}
          icon={Gamepad2}
          color="#39ff14"
          change={Math.random() * 30 - 15}
        />
        
        <StreamingMetric
          title="System Load"
          value={streamingData.system_load.toFixed(1)}
          unit="%"
          icon={TrendingUp}
          color="#ff6b35"
          change={Math.random() * 5 - 2.5}
        />
        
        <StreamingMetric
          title="Memory Usage"
          value={streamingData.memory_usage.toFixed(1)}
          unit="%"
          icon={Activity}
          color="#76b900"
          change={Math.random() * 8 - 4}
        />
        
        <StreamingMetric
          title="Uptime"
          value={Math.floor(streamingData.uptime / 3600)}
          unit="hrs"
          icon={Clock}
          color="#0066cc"
        />
      </div>

      {/* Live Event Stream */}
      <motion.div
        className="glass-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyber-neon/20 rounded-xl border-2 border-cyber-neon">
            <Activity size={24} className="text-cyber-neon" />
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-cyber-neon">
              LIVE EVENT STREAM
            </h3>
            <p className="text-gray-400 font-mono text-sm">
              Real-time bot activity monitoring
            </p>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto space-y-2 cyber-grid">
          <AnimatePresence mode="popLayout">
            {events.map((event, index) => {
              const IconComponent = getEventIcon(event.icon)
              return (
                <motion.div
                  key={event.id}
                  className="glass-panel p-3 flex items-center gap-3 hover:bg-white/10 transition-all duration-200"
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.02
                  }}
                  layout
                >
                  <div 
                    className="p-2 rounded-lg border-2 flex-shrink-0"
                    style={{ 
                      borderColor: event.color, 
                      backgroundColor: `${event.color}20` 
                    }}
                  >
                    <IconComponent size={16} style={{ color: event.color }} />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-mono font-bold text-white text-sm truncate">
                        {event.title}
                      </h4>
                      <span 
                        className="px-2 py-1 rounded text-xs font-mono font-bold"
                        style={{ 
                          backgroundColor: `${event.color}20`, 
                          color: event.color,
                          border: `1px solid ${event.color}40`
                        }}
                      >
                        {event.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{event.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {event.user && (
                        <span className="text-xs text-gray-500 font-mono">{event.user}</span>
                      )}
                      {event.guild && (
                        <span className="text-xs text-gray-500 font-mono">• {event.guild}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400 font-mono">
                      {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          
          {events.length === 0 && !isConnected && (
            <div className="text-center py-12">
              <WifiOff size={48} className="text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-mono font-bold text-gray-400 mb-2">
                No Real-Time Data
              </h3>
              <p className="text-sm text-gray-500">
                Connect to WebSocket to see live events
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Connection Health */}
      <motion.div
        className="glass-panel p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-500/20 rounded-lg border-2 border-gray-500">
              <MessageCircle size={16} className="text-gray-400" />
            </div>
            <div>
              <h4 className="font-mono font-bold text-white text-sm">
                WebSocket Health
              </h4>
              <p className="text-xs text-gray-400">
                Port 8001 • Bot Connection Status
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-gray-400">
                {events.length} Events Cached
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}