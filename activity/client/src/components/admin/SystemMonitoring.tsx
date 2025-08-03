import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe, Server, Database, Zap, RefreshCw } from 'lucide-react'

interface SystemMonitoringProps {
  user: any
  permissions: string[]
  realTimeData: any
  onNotification: (notification: any) => void
}

const SystemMonitoring: React.FC<SystemMonitoringProps> = ({ onNotification }) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-white font-medium">Loading system monitoring...</span>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <Globe className="w-16 h-16 text-green-400 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-white mb-2">System Monitoring</h3>
      <p className="text-white/60 mb-6">Real-time system health and performance monitoring</p>
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <Server className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-white font-medium">Server Health</p>
            <p className="text-green-400 text-sm">Optimal</p>
          </div>
          <div className="text-center">
            <Database className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white font-medium">Database</p>
            <p className="text-green-400 text-sm">Connected</p>
          </div>
          <div className="text-center">
            <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-white font-medium">Performance</p>
            <p className="text-white/80 text-sm">95.2%</p>
          </div>
        </div>
        <p className="text-white/60 text-sm">
          Comprehensive system monitoring dashboard with real-time metrics, alerts, 
          performance graphs, and infrastructure management tools coming soon.
        </p>
      </div>
    </div>
  )
}

export default SystemMonitoring