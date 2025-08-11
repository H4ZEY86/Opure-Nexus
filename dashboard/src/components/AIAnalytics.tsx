'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Line, Doughnut, Radar, Bar } from 'react-chartjs-2'
import {
  Brain,
  Database,
  Zap,
  MessageSquare,
  Clock,
  Cpu,
  TrendingUp,
  Users,
  Target,
  Sparkles,
  Bot,
  MemoryStickStick
} from 'lucide-react'

interface AIData {
  model: {
    name: string
    parameters: string
    status: string
    uptime: number
    requests_processed: number
    avg_response_time: number
    tokens_generated: number
    memory_usage: number
  }
  chromadb: {
    status: string
    collections: number
    documents: number
    embeddings: number
    memory_used: number
    query_latency: number
    vector_dimensions: number
  }
  personalities: {
    active_mode: string
    mode_usage: Array<{ mode: string, usage_count: number, percentage: number }>
    response_quality: number
    user_satisfaction: number
  }
  performance: {
    inference_speed: number
    throughput: number
    gpu_utilization: number
    memory_efficiency: number
    cache_hits: number
  }
  conversations: {
    active_sessions: number
    total_messages: number
    avg_session_length: number
    context_retention: number
  }
}

export default function AIAnalytics({ realTimeData }: { realTimeData: any }) {
  const [aiData, setAiData] = useState<AIData>({
    model: {
      name: 'gpt-oss:20b',
      parameters: '20 Billion',
      status: 'active',
      uptime: 99.8,
      requests_processed: 45672,
      avg_response_time: 2.3,
      tokens_generated: 15420890,
      memory_usage: 12.4
    },
    chromadb: {
      status: 'healthy',
      collections: 8,
      documents: 25847,
      embeddings: 186432,
      memory_used: 2.8,
      query_latency: 45,
      vector_dimensions: 1536
    },
    personalities: {
      active_mode: 'Balanced',
      mode_usage: [
        { mode: 'Balanced', usage_count: 1250, percentage: 35 },
        { mode: 'Creative', usage_count: 890, percentage: 25 },
        { mode: 'Analytical', usage_count: 745, percentage: 21 },
        { mode: 'Friendly', usage_count: 534, percentage: 15 },
        { mode: 'Professional', usage_count: 142, percentage: 4 }
      ],
      response_quality: 94.2,
      user_satisfaction: 96.8
    },
    performance: {
      inference_speed: 45.6,
      throughput: 1240,
      gpu_utilization: 78,
      memory_efficiency: 89.5,
      cache_hits: 92.3
    },
    conversations: {
      active_sessions: 23,
      total_messages: 89450,
      avg_session_length: 12.5,
      context_retention: 95.7
    }
  })

  const [responseTimeHistory, setResponseTimeHistory] = useState(
    Array(20).fill(0).map(() => Math.random() * 5 + 1)
  )

  const [tokensPerSecond, setTokensPerSecond] = useState(
    Array(20).fill(0).map(() => Math.random() * 100 + 50)
  )

  useEffect(() => {
    // Update AI data from realTimeData
    if (realTimeData?.ai) {
      setAiData(prev => ({
        ...prev,
        model: { ...prev.model, ...realTimeData.ai.model },
        chromadb: { ...prev.chromadb, ...realTimeData.ai.chromadb },
        performance: { ...prev.performance, ...realTimeData.ai.performance }
      }))
    }

    // Update real-time metrics
    const interval = setInterval(() => {
      setResponseTimeHistory(prev => [
        ...prev.slice(1),
        Math.random() * 5 + 1
      ])
      
      setTokensPerSecond(prev => [
        ...prev.slice(1),
        Math.random() * 100 + 50
      ])
    }, 3000)

    return () => clearInterval(interval)
  }, [realTimeData])

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#9d4edd',
        bodyColor: '#ffffff',
        borderColor: '#9d4edd',
        borderWidth: 1
      }
    },
    scales: {
      x: { display: false },
      y: { display: false, min: 0 }
    }
  }

  const responseTimeData = {
    labels: Array(20).fill(''),
    datasets: [{
      data: responseTimeHistory,
      borderColor: '#9d4edd',
      backgroundColor: 'rgba(157, 78, 221, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  const tokensData = {
    labels: Array(20).fill(''),
    datasets: [{
      data: tokensPerSecond,
      borderColor: '#ff006e',
      backgroundColor: 'rgba(255, 0, 110, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  const personalityData = {
    labels: aiData.personalities.mode_usage.map(mode => mode.mode),
    datasets: [{
      data: aiData.personalities.mode_usage.map(mode => mode.percentage),
      backgroundColor: [
        '#9d4edd',
        '#ff006e',
        '#00ffff',
        '#39ff14',
        '#ff6b35'
      ],
      borderColor: [
        '#9d4edd',
        '#ff006e',
        '#00ffff',
        '#39ff14',
        '#ff6b35'
      ],
      borderWidth: 2
    }]
  }

  const performanceRadarData = {
    labels: ['Speed', 'Throughput', 'GPU', 'MemoryStick', 'Cache'],
    datasets: [{
      label: 'Performance Metrics',
      data: [
        aiData.performance.inference_speed,
        aiData.performance.throughput / 20,
        aiData.performance.gpu_utilization,
        aiData.performance.memory_efficiency,
        aiData.performance.cache_hits
      ],
      backgroundColor: 'rgba(157, 78, 221, 0.2)',
      borderColor: '#9d4edd',
      borderWidth: 2,
      pointBackgroundColor: '#9d4edd',
      pointBorderColor: '#ffffff',
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: '#9d4edd'
    }]
  }

  const AIMetricCard = ({ title, icon: Icon, value, unit, status, color, subtitle, chart }: any) => (
    <motion.div
      className="ai-panel p-6 hover:scale-105 transition-all duration-300"
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
          <p className="text-2xl font-mono font-bold text-cyber-purple">{value}{unit}</p>
          {status && (
            <div className="flex items-center gap-2 justify-end mt-1">
              <div className={`status-indicator ${
                status === 'active' || status === 'healthy' ? 'bg-green-400' : 
                status === 'idle' ? 'bg-yellow-400' : 
                'bg-red-400'
              }`} />
              <p className="text-xs text-gray-400 uppercase">{status}</p>
            </div>
          )}
        </div>
      </div>
      
      {chart && (
        <div className="h-16 mt-4">
          <Line data={chart} options={chartOptions} />
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <motion.div
        className="ai-panel p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyber-purple/20 rounded-xl border-2 border-cyber-purple">
              <Brain size={24} className="text-cyber-purple" />
            </div>
            <div>
              <h2 className="text-2xl font-mono font-bold text-cyber-purple">
                AI ANALYTICS
              </h2>
              <p className="text-cyber-pink font-mono">
                🧠 gpt-oss:20b + ChromaDB Intelligence Hub
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`status-indicator ${
              aiData.model.status === 'active' ? 'bg-green-400' : 'bg-red-400'
            } animate-pulse-glow`} />
            <p className="text-sm font-mono text-cyber-green mt-1 uppercase">
              {aiData.model.status}
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI Model Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AIMetricCard
          title="Model Status"
          icon={Bot}
          value={aiData.model.uptime}
          unit="%"
          status={aiData.model.status}
          color="bg-cyber-purple/20 border-cyber-purple"
          subtitle={`${aiData.model.name} | ${aiData.model.parameters} params`}
        />
        
        <AIMetricCard
          title="Response Time"
          icon={Clock}
          value={aiData.model.avg_response_time}
          unit="s"
          color="bg-cyber-pink/20 border-cyber-pink"
          subtitle={`${aiData.model.requests_processed.toLocaleString()} requests`}
          chart={responseTimeData}
        />
        
        <AIMetricCard
          title="MemoryStick Usage"
          icon={MemoryStick}
          value={aiData.model.memory_usage}
          unit="GB"
          color="bg-cyber-neon/20 border-cyber-neon"
          subtitle="Model MemoryStick"
        />
        
        <AIMetricCard
          title="Tokens Generated"
          icon={MessageSquare}
          value={(aiData.model.tokens_generated / 1000000).toFixed(1)}
          unit="M"
          color="bg-cyber-green/20 border-cyber-green"
          subtitle="Total Output"
          chart={tokensData}
        />
      </div>

      {/* ChromaDB Vector Database */}
      <motion.div
        className="ai-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyber-neon/20 rounded-xl border-2 border-cyber-neon">
            <Database size={24} className="text-cyber-neon" />
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-cyber-neon">
              CHROMADB VECTOR DATABASE
            </h3>
            <p className="text-cyber-purple font-mono text-sm">
              Enhanced MemoryStick & Knowledge Retrieval System
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 glass-panel">
            <Database size={24} className="text-cyber-neon mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-cyber-neon">
              {aiData.chromadb.collections}
            </p>
            <p className="text-sm text-gray-400">Collections</p>
          </div>
          
          <div className="text-center p-4 glass-panel">
            <MessageSquare size={24} className="text-cyber-purple mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-cyber-purple">
              {aiData.chromadb.documents.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">Documents</p>
          </div>
          
          <div className="text-center p-4 glass-panel">
            <Sparkles size={24} className="text-cyber-pink mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-cyber-pink">
              {(aiData.chromadb.embeddings / 1000).toFixed(0)}K
            </p>
            <p className="text-sm text-gray-400">Embeddings</p>
          </div>
          
          <div className="text-center p-4 glass-panel">
            <Clock size={24} className="text-cyber-green mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-cyber-green">
              {aiData.chromadb.query_latency}ms
            </p>
            <p className="text-sm text-gray-400">Query Latency</p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-panel p-4">
            <h4 className="font-mono text-cyber-neon mb-2">Vector Dimensions</h4>
            <p className="text-3xl font-mono font-bold text-white">
              {aiData.chromadb.vector_dimensions}
            </p>
          </div>
          <div className="glass-panel p-4">
            <h4 className="font-mono text-cyber-neon mb-2">MemoryStick Usage</h4>
            <p className="text-3xl font-mono font-bold text-white">
              {aiData.chromadb.memory_used}GB
            </p>
          </div>
          <div className="glass-panel p-4">
            <h4 className="font-mono text-cyber-neon mb-2">Database Status</h4>
            <div className="flex items-center gap-2">
              <div className="status-indicator bg-green-400" />
              <p className="font-mono text-cyber-green uppercase">
                {aiData.chromadb.status}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Personality Modes */}
      <motion.div
        className="ai-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyber-pink/20 rounded-xl border-2 border-cyber-pink">
            <Users size={24} className="text-cyber-pink" />
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-cyber-pink">
              PERSONALITY ANALYTICS
            </h3>
            <p className="text-cyber-purple font-mono text-sm">
              AI Behavior Modes & User Interaction Patterns
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-mono font-bold text-white mb-4">Mode Usage Distribution</h4>
            <div className="h-64">
              <Doughnut data={personalityData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-mono font-bold text-white mb-4">Current Metrics</h4>
            
            <div className="glass-panel p-4 space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyber-pink">Active Mode:</span>
                  <span className="font-mono font-bold text-white">
                    {aiData.personalities.active_mode}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyber-purple">Response Quality:</span>
                  <span className="font-mono font-bold text-cyber-green">
                    {aiData.personalities.response_quality}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 bg-cyber-green rounded-full transition-all duration-300"
                    style={{ width: `${aiData.personalities.response_quality}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyber-neon">User Satisfaction:</span>
                  <span className="font-mono font-bold text-cyber-green">
                    {aiData.personalities.user_satisfaction}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 bg-cyber-green rounded-full transition-all duration-300"
                    style={{ width: `${aiData.personalities.user_satisfaction}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-mono text-sm text-gray-400">Mode Usage Breakdown:</h5>
              {aiData.personalities.mode_usage.map((mode, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">{mode.mode}:</span>
                  <span className="font-mono text-cyber-purple">
                    {mode.usage_count} ({mode.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="ai-panel p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-cyber-green/20 rounded-xl border-2 border-cyber-green">
              <TrendingUp size={24} className="text-cyber-green" />
            </div>
            <h3 className="text-xl font-mono font-bold text-cyber-green">
              PERFORMANCE RADAR
            </h3>
          </div>
          
          <div className="h-64">
            <Radar data={performanceRadarData} options={{ maintainAspectRatio: false }} />
          </div>
        </motion.div>
        
        <motion.div
          className="ai-panel p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-cyber-orange/20 rounded-xl border-2 border-cyber-orange">
              <MessageSquare size={24} className="text-cyber-orange" />
            </div>
            <h3 className="text-xl font-mono font-bold text-cyber-orange">
              CONVERSATION STATS
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 glass-panel">
                <p className="text-2xl font-mono font-bold text-cyber-orange">
                  {aiData.conversations.active_sessions}
                </p>
                <p className="text-sm text-gray-400">Active Sessions</p>
              </div>
              <div className="text-center p-4 glass-panel">
                <p className="text-2xl font-mono font-bold text-cyber-orange">
                  {(aiData.conversations.total_messages / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-gray-400">Total Messages</p>
              </div>
            </div>
            
            <div className="glass-panel p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Avg Session Length:</span>
                <span className="font-mono font-bold text-cyber-orange">
                  {aiData.conversations.avg_session_length} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Context Retention:</span>
                <span className="font-mono font-bold text-cyber-green">
                  {aiData.conversations.context_retention}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}