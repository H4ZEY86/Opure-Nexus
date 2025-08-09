'use client'

import { motion } from 'framer-motion'
import { BotData } from '@/types'
import { formatUptime } from '@/lib/utils'
import { Bot, Users, MessageSquare, Zap, Cpu, HardDrive } from 'lucide-react'

interface HeaderProps {
  botData: BotData
  isConnected: boolean
}

export default function Header({ botData, isConnected }: HeaderProps) {
  const statusColor = {
    online: 'bg-green-400',
    idle: 'bg-yellow-400',
    dnd: 'bg-red-400',
    offline: 'bg-gray-400'
  }[botData.status]

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-panel m-4 p-4 flex items-center justify-between relative overflow-hidden"
    >
      {/* Background Animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyber-neon/5 via-cyber-purple/5 to-cyber-pink/5 animate-pulse" />
      
      {/* Left Section - Bot Info */}
      <div className="flex items-center space-x-6 relative z-10">
        {/* Bot Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-cyber-neon to-cyber-purple flex items-center justify-center text-2xl font-bold text-white shadow-lg">
            <Bot className="w-8 h-8" />
          </div>
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${statusColor} rounded-full border-2 border-white`} />
        </div>

        {/* Bot Details */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {botData.username}
            <span className="text-sm text-gray-400 font-mono">v{botData.version}</span>
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 ${statusColor} rounded-full`} />
              {botData.status.toUpperCase()}
            </span>
            <span>Uptime: {formatUptime(botData.uptime)}</span>
          </div>
        </div>
      </div>

      {/* Center Section - Stats */}
      <div className="flex items-center space-x-8 relative z-10">
        <div className="flex items-center gap-2 text-cyber-neon">
          <Users className="w-5 h-5" />
          <div>
            <div className="text-lg font-bold">{botData.users.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Users</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-cyber-purple">
          <MessageSquare className="w-5 h-5" />
          <div>
            <div className="text-lg font-bold">{botData.guilds}</div>
            <div className="text-xs text-gray-400">Guilds</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-cyber-pink">
          <Zap className="w-5 h-5" />
          <div>
            <div className="text-lg font-bold">{botData.commands_executed.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Commands</div>
          </div>
        </div>
      </div>

      {/* Right Section - System Stats */}
      <div className="flex items-center space-x-6 relative z-10">
        {/* CPU Usage */}
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-sm font-mono text-green-400">{botData.cpu_usage.toFixed(1)}%</div>
            <div className="text-xs text-gray-400">CPU</div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm font-mono text-blue-400">{botData.memory_usage}MB</div>
            <div className="text-xs text-gray-400">RAM</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`px-3 py-1 rounded-full text-xs font-mono ${
          isConnected 
            ? 'bg-green-400/20 text-green-400 border border-green-400/30' 
            : 'bg-red-400/20 text-red-400 border border-red-400/30'
        }`}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {/* Animated Border */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-cyber-neon/30"
        animate={{
          borderColor: ['rgba(0,255,255,0.3)', 'rgba(157,78,221,0.3)', 'rgba(255,0,110,0.3)', 'rgba(0,255,255,0.3)']
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </motion.header>
  )
}