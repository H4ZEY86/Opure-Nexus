'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Line, Bar, Pie } from 'react-chartjs-2'
import {
  Users,
  Server,
  MessageCircle,
  Gamepad2,
  Music,
  Zap,
  Crown,
  Shield,
  Activity,
  Globe,
  Hash,
  UserCheck
} from 'lucide-react'

interface DiscordData {
  bot: {
    status: string
    username: string
    guilds: number
    users: number
    latency: number
    uptime: number
    commands_executed: number
  }
  activities: {
    total_players: number
    active_sessions: number
    games_played: number
    top_games: Array<{ name: string, players: number }>
  }
  context_menus: {
    total_uses: number
    recent_commands: Array<{ command: string, uses: number, timestamp: string }>
    top_commands: Array<{ name: string, count: number }>
  }
  music: {
    active_queues: number
    songs_played: number
    total_listeners: number
  }
  real_time: {
    online_users: number
    active_channels: number
    messages_per_minute: number
  }
}

export default function DiscordStatus({ botData, realTimeData }: any) {
  const [discordData, setDiscordData] = useState<DiscordData>({
    bot: {
      status: 'online',
      username: 'Opure.exe',
      guilds: 5,
      users: 1250,
      latency: 45,
      uptime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
      commands_executed: 15420
    },
    activities: {
      total_players: 89,
      active_sessions: 12,
      games_played: 156,
      top_games: [
        { name: 'Space Race 3D', players: 25 },
        { name: 'Ball Bouncer 3D', players: 18 },
        { name: 'Cube Dash 3D', players: 15 },
        { name: 'Color Matcher 3D', players: 12 }
      ]
    },
    context_menus: {
      total_uses: 2340,
      recent_commands: [
        { command: 'Quick AI Chat', uses: 45, timestamp: '2 min ago' },
        { command: 'Music Queue', uses: 32, timestamp: '5 min ago' },
        { command: 'Server Stats', uses: 28, timestamp: '8 min ago' },
        { command: 'User Profile', uses: 19, timestamp: '12 min ago' }
      ],
      top_commands: [
        { name: 'Quick AI Chat', count: 890 },
        { name: 'Music Queue', count: 654 },
        { name: 'Server Stats', count: 432 },
        { name: 'User Profile', count: 364 },
        { name: 'Gaming Hub', count: 298 }
      ]
    },
    music: {
      active_queues: 8,
      songs_played: 1248,
      total_listeners: 156
    },
    real_time: {
      online_users: 89,
      active_channels: 23,
      messages_per_minute: 12
    }
  })

  const [commandHistory, setCommandHistory] = useState(
    Array(20).fill(0).map(() => Math.floor(Math.random() * 50))
  )

  useEffect(() => {
    // Update data from props
    if (botData) {
      setDiscordData(prev => ({
        ...prev,
        bot: { ...prev.bot, ...botData }
      }))
    }

    if (realTimeData?.discord) {
      setDiscordData(prev => ({
        ...prev,
        activities: { ...prev.activities, ...realTimeData.discord.activities },
        context_menus: { ...prev.context_menus, ...realTimeData.discord.context_menus },
        real_time: { ...prev.real_time, ...realTimeData.discord.real_time }
      }))
    }

    // Update command history
    const interval = setInterval(() => {
      setCommandHistory(prev => [
        ...prev.slice(1),
        Math.floor(Math.random() * 50)
      ])
    }, 5000)

    return () => clearInterval(interval)
  }, [botData, realTimeData])

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#5865f2',
        bodyColor: '#ffffff',
        borderColor: '#5865f2',
        borderWidth: 1
      }
    },
    scales: {
      x: { display: false },
      y: { display: false, min: 0 }
    }
  }

  const commandsLineData = {
    labels: Array(20).fill(''),
    datasets: [{
      data: commandHistory,
      borderColor: '#5865f2',
      backgroundColor: 'rgba(88, 101, 242, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  const topGamesData = {
    labels: discordData.activities.top_games.map(game => game.name),
    datasets: [{
      data: discordData.activities.top_games.map(game => game.players),
      backgroundColor: [
        '#5865f2',
        '#0066cc',
        '#00ffff',
        '#9d4edd'
      ],
      borderColor: [
        '#5865f2',
        '#0066cc',
        '#00ffff',
        '#9d4edd'
      ],
      borderWidth: 2
    }]
  }

  const contextMenuData = {
    labels: discordData.context_menus.top_commands.map(cmd => cmd.name),
    datasets: [{
      data: discordData.context_menus.top_commands.map(cmd => cmd.count),
      backgroundColor: 'rgba(0, 102, 204, 0.8)',
      borderColor: '#0066cc',
      borderWidth: 2
    }]
  }

  const StatusCard = ({ title, icon: Icon, value, unit, status, color, subtitle }: any) => (
    <motion.div
      className="discord-panel p-6 hover:scale-105 transition-all duration-300"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${color} border-2`}>
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-400 font-mono">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-discord-blurple">{value}{unit}</p>
          {status && (
            <div className="flex items-center gap-2 justify-end mt-1">
              <div className={`status-indicator ${
                status === 'online' ? 'bg-green-400' : 
                status === 'idle' ? 'bg-yellow-400' : 
                'bg-red-400'
              }`} />
              <p className="text-xs text-gray-400 uppercase">{status}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <motion.div
        className="discord-panel p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-discord-blurple/20 rounded-xl border-2 border-discord-blurple">
              <MessageCircle size={24} className="text-discord-blurple" />
            </div>
            <div>
              <h2 className="text-2xl font-mono font-bold text-discord-blurple">
                DISCORD STATUS
              </h2>
              <p className="text-rangers-blue font-mono">
                🎮 Discord Activities @ opure.uk
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`status-indicator ${
              discordData.bot.status === 'online' ? 'bg-green-400' : 'bg-red-400'
            } animate-pulse-glow`} />
            <p className="text-sm font-mono text-discord-green mt-1 uppercase">
              {discordData.bot.status}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bot Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="Guilds"
          icon={Server}
          value={discordData.bot.guilds}
          unit=""
          color="bg-discord-blurple/20 border-discord-blurple"
          subtitle={`${discordData.bot.users.toLocaleString()} Total Users`}
        />
        
        <StatusCard
          title="Latency"
          icon={Activity}
          value={discordData.bot.latency}
          unit="ms"
          status={discordData.bot.latency < 100 ? 'online' : 'idle'}
          color="bg-cyber-green/20 border-cyber-green"
          subtitle="WebSocket Ping"
        />
        
        <StatusCard
          title="Commands"
          icon={Zap}
          value={discordData.bot.commands_executed.toLocaleString()}
          unit=""
          color="bg-cyber-neon/20 border-cyber-neon"
          subtitle="Total Executed"
        />
        
        <StatusCard
          title="Uptime"
          icon={Crown}
          value={Math.floor((Date.now() - discordData.bot.uptime) / (1000 * 60 * 60))}
          unit="h"
          color="bg-cyber-orange/20 border-cyber-orange"
          subtitle="Continuous Operation"
        />
      </div>

      {/* Discord Activities Dashboard */}
      <motion.div
        className="discord-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-discord-blurple/20 rounded-xl border-2 border-discord-blurple">
            <Gamepad2 size={24} className="text-discord-blurple" />
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-discord-blurple">
              DISCORD ACTIVITIES
            </h3>
            <p className="text-rangers-blue font-mono text-sm">
              Live Gaming Statistics from opure.uk
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="text-center p-4 glass-panel">
              <Users size={24} className="text-discord-blurple mx-auto mb-2" />
              <p className="text-3xl font-mono font-bold text-discord-blurple">
                {discordData.activities.total_players}
              </p>
              <p className="text-sm text-gray-400">Active Players</p>
            </div>
            
            <div className="text-center p-4 glass-panel">
              <Shield size={24} className="text-cyber-green mx-auto mb-2" />
              <p className="text-3xl font-mono font-bold text-cyber-green">
                {discordData.activities.active_sessions}
              </p>
              <p className="text-sm text-gray-400">Game Sessions</p>
            </div>
            
            <div className="text-center p-4 glass-panel">
              <Globe size={24} className="text-cyber-neon mx-auto mb-2" />
              <p className="text-3xl font-mono font-bold text-cyber-neon">
                {discordData.activities.games_played}
              </p>
              <p className="text-sm text-gray-400">Games Completed</p>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="glass-panel p-4 h-64">
              <h4 className="font-mono font-bold text-white mb-4">Popular Games</h4>
              <Pie data={topGamesData} options={chartOptions} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Context Menu Analytics */}
      <motion.div
        className="discord-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-rangers-blue/20 rounded-xl border-2 border-rangers-blue">
            <Hash size={24} className="text-rangers-blue" />
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-rangers">
              CONTEXT MENU ANALYTICS
            </h3>
            <p className="text-scottish-blue font-mono text-sm">
              Right-click Command Usage Statistics
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-mono font-bold text-white mb-4">Recent Activity</h4>
            <div className="space-y-3">
              {discordData.context_menus.recent_commands.map((cmd, i) => (
                <motion.div
                  key={i}
                  className="glass-panel p-3 flex items-center justify-between"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-rangers-blue" />
                    <span className="font-mono text-sm text-white">{cmd.command}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-rangers-blue font-mono font-bold">{cmd.uses}</p>
                    <p className="text-xs text-gray-400">{cmd.timestamp}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-mono font-bold text-white mb-4">Top Commands</h4>
            <div className="h-64">
              <Bar data={contextMenuData} options={chartOptions} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Music & Real-time Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="glass-panel p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyber-purple/20 rounded-xl border-2 border-cyber-purple">
              <Music size={20} className="text-cyber-purple" />
            </div>
            <h3 className="text-xl font-mono font-bold text-cyber-purple">
              MUSIC HUB
            </h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-cyber-purple">
                {discordData.music.active_queues}
              </p>
              <p className="text-sm text-gray-400">Active Queues</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-cyber-purple">
                {discordData.music.songs_played}
              </p>
              <p className="text-sm text-gray-400">Songs Played</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-cyber-purple">
                {discordData.music.total_listeners}
              </p>
              <p className="text-sm text-gray-400">Listeners</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          className="glass-panel p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyber-green/20 rounded-xl border-2 border-cyber-green">
              <Activity size={20} className="text-cyber-green" />
            </div>
            <h3 className="text-xl font-mono font-bold text-cyber-green">
              REAL-TIME ACTIVITY
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Online Users:</span>
              <span className="text-cyber-green font-mono font-bold">
                {discordData.real_time.online_users}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Active Channels:</span>
              <span className="text-cyber-green font-mono font-bold">
                {discordData.real_time.active_channels}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Messages/Min:</span>
              <span className="text-cyber-green font-mono font-bold">
                {discordData.real_time.messages_per_minute}
              </span>
            </div>
            
            <div className="h-16 mt-4">
              <Line data={commandsLineData} options={chartOptions} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}