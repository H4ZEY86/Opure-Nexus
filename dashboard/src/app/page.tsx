'use client'

import { Suspense, useState } from 'react'
import dynamic from 'next/dynamic'
import LoadingScreen from '@/components/LoadingScreen'
import Header from '@/components/Header'
import SidePanel from '@/components/SidePanel'
import { useBotData } from '@/hooks/useBotData'
import { useRealTimeData } from '@/hooks/useRealTimeData'

// Dynamic imports for Three.js components (RTX 5070 Ti optimization)
const Dashboard3D = dynamic(() => import('@/components/Dashboard3D'), {
  ssr: false,
  loading: () => <LoadingScreen message="Initializing 3D Dashboard..." />
})

const SystemMonitor = dynamic(() => import('@/components/SystemMonitor'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg p-4" />
})

const DiscordStatus = dynamic(() => import('@/components/DiscordStatus'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg p-4" />
})

const AIAnalytics = dynamic(() => import('@/components/AIAnalytics'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg p-4" />
})

const RealTimeData = dynamic(() => import('@/components/RealTimeData'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg p-4" />
})

const EconomyGamingAnalytics = dynamic(() => import('@/components/EconomyGamingAnalytics'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white/5 rounded-lg p-4" />
})

export default function DashboardPage() {
  const { botData, isLoading: botLoading, isConnected } = useBotData()
  const { realTimeData } = useRealTimeData()
  const [activeView, setActiveView] = useState<'3d' | 'system' | 'discord' | 'ai' | 'realtime' | 'economy'>('3d')

  if (botLoading) {
    return <LoadingScreen message="Connecting to Opure.exe..." />
  }

  const renderActiveView = () => {
    switch (activeView) {
      case '3d':
        return (
          <Suspense fallback={<LoadingScreen message="Loading 3D Dashboard..." />}>
            <Dashboard3D botData={botData} realTimeData={realTimeData} />
          </Suspense>
        )
      case 'system':
        return (
          <Suspense fallback={<LoadingScreen message="Loading System Monitor..." />}>
            <SystemMonitor realTimeData={realTimeData} />
          </Suspense>
        )
      case 'discord':
        return (
          <Suspense fallback={<LoadingScreen message="Loading Discord Analytics..." />}>
            <DiscordStatus botData={botData} realTimeData={realTimeData} />
          </Suspense>
        )
      case 'ai':
        return (
          <Suspense fallback={<LoadingScreen message="Loading AI Analytics..." />}>
            <AIAnalytics realTimeData={realTimeData} />
          </Suspense>
        )
      case 'realtime':
        return (
          <Suspense fallback={<LoadingScreen message="Loading Real-time Data..." />}>
            <RealTimeData realTimeData={realTimeData} isConnected={isConnected} />
          </Suspense>
        )
      case 'economy':
        return (
          <Suspense fallback={<LoadingScreen message="Loading Economy Analytics..." />}>
            <EconomyGamingAnalytics realTimeData={realTimeData} />
          </Suspense>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden matrix-rain">
      {/* Header */}
      <Header botData={botData} isConnected={isConnected} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Panel */}
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-4">
          <div className="space-y-3">
            <h3 className="text-rangers font-mono font-bold text-lg mb-4">
              🏴󠁧󠁢󠁳󠁣󠁴󠁿 DASHBOARD VIEWS
            </h3>
            
            {[
              { id: '3d', label: '🎮 3D Command Center', color: 'cyber-neon' },
              { id: 'system', label: '🖥️ RTX 5070 Ti Monitor', color: 'gpu-green' },
              { id: 'discord', label: '💬 Discord Analytics', color: 'discord-blurple' },
              { id: 'ai', label: '🧠 AI Intelligence Hub', color: 'cyber-purple' },
              { id: 'realtime', label: '⚡ Live Data Stream', color: 'cyber-pink' },
              { id: 'economy', label: '💰 Economy & Gaming', color: 'cyber-orange' }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-300 font-mono text-sm ${
                  activeView === view.id
                    ? `bg-${view.color}/20 border-${view.color} text-${view.color} scale-105`
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
          
          {/* Bot Status */}
          <div className="mt-8 p-4 glass-panel-dark">
            <h4 className="font-mono font-bold text-rangers-blue mb-3">BOT STATUS</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Guilds:</span>
                <span className="font-mono text-white">{botData?.guilds || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Users:</span>
                <span className="font-mono text-white">{botData?.users || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Commands:</span>
                <span className="font-mono text-white">{botData?.commands_executed?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {renderActiveView()}
        </div>
      </div>
      
      {/* Connection Status */}
      <div className="absolute top-4 left-4 z-30">
        <div className="glass-panel px-3 py-2 flex items-center gap-2">
          <div className={`status-indicator ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`} />
          <span className="text-xs font-mono text-white">
            {isConnected ? 'WEBSOCKET ACTIVE' : 'WEBSOCKET DISCONNECTED'}
          </span>
        </div>
      </div>
      
      {/* Scottish/Rangers Branding */}
      <div className="absolute top-4 right-4 z-30">
        <div className="glass-panel-dark px-3 py-2 rangers-border">
          <span className="text-xs font-mono text-rangers-blue font-bold">
            🏴󠁧󠁢󠁳󠁣󠁴󠁿 MADE IN SCOTLAND • RANGERS FC 💙
          </span>
        </div>
      </div>
    </div>
  )
}