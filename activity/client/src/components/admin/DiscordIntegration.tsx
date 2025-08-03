import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Bot, Users, Activity, RefreshCw } from 'lucide-react'

interface DiscordIntegrationProps {
  user: any
  permissions: string[]
  realTimeData: any
  onNotification: (notification: any) => void
}

const DiscordIntegration: React.FC<DiscordIntegrationProps> = ({ onNotification }) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-white font-medium">Loading Discord integration...</span>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <MessageSquare className="w-16 h-16 text-blue-400 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-white mb-2">Discord Integration Controls</h3>
      <p className="text-white/60 mb-6">Manage Discord bot and activity integration</p>
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <Bot className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white font-medium">Bot Status</p>
            <p className="text-green-400 text-sm">Online</p>
          </div>
          <div className="text-center">
            <Users className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <p className="text-white font-medium">Servers</p>
            <p className="text-white/80 text-sm">5 Active</p>
          </div>
          <div className="text-center">
            <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-white font-medium">Activity</p>
            <p className="text-white/80 text-sm">Running</p>
          </div>
        </div>
        <p className="text-white/60 text-sm">
          Discord bot management, server analytics, activity controls, and OAuth integration 
          interface under development.
        </p>
      </div>
    </div>
  )
}

export default DiscordIntegration