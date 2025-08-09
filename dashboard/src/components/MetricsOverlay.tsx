'use client'

import { motion } from 'framer-motion'
import { BotData, RealTimeData } from '@/types'
import { formatNumber, formatBytes, getHealthColor } from '@/lib/utils'
import { 
  Activity, Cpu, HardDrive, Zap, Clock, 
  TrendingUp, TrendingDown, Minus 
} from 'lucide-react'

interface MetricsOverlayProps {
  botData: BotData
  realTimeData: RealTimeData
}

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  color: string
  icon: React.ComponentType<any>
  subtitle?: string
}

function MetricCard({ title, value, unit, trend, color, icon: Icon, subtitle }: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'

  return (
    <motion.div
      className="metric-card min-w-[140px]"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <TrendIcon className={`w-3 h-3 ${trendColor}`} />
      </div>
      
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-bold ${color}`}>
            {typeof value === 'number' ? formatNumber(value) : value}
          </span>
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
        </div>
        
        <div className="text-xs text-gray-300 font-medium">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
    </motion.div>
  )
}

export default function MetricsOverlay({ botData, realTimeData }: MetricsOverlayProps) {
  // Calculate trends (mock for now)
  const cpuTrend = (realTimeData.performance?.cpu_usage || 0) > 20 ? 'up' : 'stable'
  const memoryTrend = (realTimeData.performance?.memory_usage || 0) > 300 ? 'up' : 'stable'
  const responseTrend = (realTimeData.performance?.response_time || 0) > 200 ? 'down' : 'up'

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyber-neon" />
          Performance
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="CPU Usage"
            value={realTimeData.performance?.cpu_usage?.toFixed(1) || 0}
            unit="%"
            trend={cpuTrend}
            color={getHealthColor(100 - (realTimeData.performance?.cpu_usage || 0))}
            icon={Cpu}
          />
          
          <MetricCard
            title="Memory"
            value={formatBytes((realTimeData.performance?.memory_usage || 0) * 1024 * 1024)}
            trend={memoryTrend}
            color={getHealthColor(100 - ((realTimeData.performance?.memory_usage || 0) / 10))}
            icon={HardDrive}
          />
          
          <MetricCard
            title="Response Time"
            value={realTimeData.performance?.response_time?.toFixed(0) || 0}
            unit="ms"
            trend={responseTrend}
            color={getHealthColor(500 - (realTimeData.performance?.response_time || 0), { good: 400, warning: 300 })}
            icon={Clock}
          />
          
          <MetricCard
            title="Commands"
            value={botData.commands_executed}
            trend="up"
            color="text-cyber-purple"
            icon={Zap}
            subtitle="Total executed"
          />
        </div>
      </div>

      {/* RTX 5070 Ti GPU Metrics */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded-sm" />
          RTX 5070 Ti
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">GPU Usage</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-white/10 rounded-full h-1.5">
                <div 
                  className="bg-green-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${realTimeData.performance?.gpu_usage || 0}%` }}
                />
              </div>
              <span className="text-xs text-green-400 font-mono w-8">
                {(realTimeData.performance?.gpu_usage || 0).toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">VRAM Usage</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-white/10 rounded-full h-1.5">
                <div 
                  className="bg-blue-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${((realTimeData.performance?.gpu_memory || 0) / 12288) * 100}%` }}
                />
              </div>
              <span className="text-xs text-blue-400 font-mono w-12">
                {formatBytes((realTimeData.performance?.gpu_memory || 0) * 1024 * 1024)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">FPS</span>
            <span className="text-xs text-cyan-400 font-mono">
              {realTimeData.performance?.fps || 60} FPS
            </span>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="glass-panel p-4 max-h-32 overflow-y-auto">
        <h3 className="text-sm font-semibold text-white mb-3">Live Activity</h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Music: {realTimeData.music?.listeners || 0} listeners
          </div>
          
          <div className="flex items-center gap-2 text-purple-400">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
            AI: {realTimeData.ai?.requests_today || 0} requests today
          </div>
          
          <div className="flex items-center gap-2 text-pink-400">
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" />
            Gaming: {realTimeData.gaming?.active_players || 0} active players
          </div>
          
          <div className="flex items-center gap-2 text-orange-400">
            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
            Economy: {realTimeData.economy?.daily_transactions || 0} trades today
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="glass-panel p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">WebSocket</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-mono">CONNECTED</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">Latency</span>
          <span className="text-xs text-cyan-400 font-mono">
            {realTimeData.performance?.response_time?.toFixed(0) || 0}ms
          </span>
        </div>
      </div>
    </div>
  )
}