'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js'
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  Zap, 
  Thermometer,
  Activity,
  MemoryStick,
  Gpu,
  TrendingUp
} from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
)

interface SystemData {
  cpu: {
    usage: number
    temp: number
    cores: number
    frequency: number
  }
  gpu: {
    usage: number
    vram: number
    temp: number
    model: string
    power: number
  }
  ram: {
    used: number
    total: number
    usage: number
  }
  storage: {
    used: number
    total: number
    usage: number
  }
  network: {
    upload: number
    download: number
  }
}

export default function SystemMonitor({ realTimeData }: { realTimeData: any }) {
  const [systemData, setSystemData] = useState<SystemData>({
    cpu: { usage: 25, temp: 45, cores: 8, frequency: 3.2 },
    gpu: { usage: 15, vram: 2.1, temp: 42, model: "RTX 5070 Ti", power: 85 },
    ram: { used: 12.4, total: 32, usage: 38 },
    storage: { used: 450, total: 1000, usage: 45 },
    network: { upload: 2.5, download: 15.3 }
  })

  const [history, setHistory] = useState({
    cpu: Array(20).fill(0),
    gpu: Array(20).fill(0),
    ram: Array(20).fill(0)
  })

  useEffect(() => {
    // Update system data from realTimeData
    if (realTimeData?.system) {
      setSystemData(prev => ({
        ...prev,
        cpu: { ...prev.cpu, ...realTimeData.system.cpu },
        gpu: { ...prev.gpu, ...realTimeData.system.gpu },
        ram: { ...prev.ram, ...realTimeData.system.ram }
      }))
    }

    // Update history for charts
    setHistory(prev => ({
      cpu: [...prev.cpu.slice(1), systemData.cpu.usage],
      gpu: [...prev.gpu.slice(1), systemData.gpu.usage],
      ram: [...prev.ram.slice(1), systemData.ram.usage]
    }))
  }, [realTimeData, systemData.cpu.usage, systemData.gpu.usage, systemData.ram.usage])

  // Chart configurations
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#00ffff',
        bodyColor: '#ffffff',
        borderColor: '#00ffff',
        borderWidth: 1
      }
    },
    scales: {
      x: { display: false },
      y: { 
        display: false,
        min: 0,
        max: 100
      }
    },
    elements: {
      point: { radius: 0 }
    }
  }

  const cpuLineData = {
    labels: Array(20).fill(''),
    datasets: [{
      data: history.cpu,
      borderColor: '#ff006e',
      backgroundColor: 'rgba(255, 0, 110, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  const gpuLineData = {
    labels: Array(20).fill(''),
    datasets: [{
      data: history.gpu,
      borderColor: '#9acd32',
      backgroundColor: 'rgba(154, 205, 50, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  const ramLineData = {
    labels: Array(20).fill(''),
    datasets: [{
      data: history.ram,
      borderColor: '#00ffff',
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  const gpuDoughnutData = {
    datasets: [{
      data: [systemData.gpu.usage, 100 - systemData.gpu.usage],
      backgroundColor: ['#76b900', 'rgba(118, 185, 0, 0.1)'],
      borderColor: ['#9acd32', 'rgba(154, 205, 50, 0.3)'],
      borderWidth: 2
    }]
  }

  const SystemCard = ({ 
    title, 
    icon: Icon, 
    value, 
    unit, 
    percentage, 
    chart, 
    color,
    subtitle 
  }: any) => (
    <motion.div
      className="system-monitor p-6 hover:scale-105 transition-all duration-300"
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
          <p className="text-2xl font-mono font-bold text-white">{value}{unit}</p>
          <p className="text-sm text-gray-400">{percentage}%</p>
        </div>
      </div>
      
      {chart && (
        <div className="h-16 mt-4">
          <Line data={chart} options={lineChartOptions} />
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              percentage > 80 ? 'bg-red-500' : 
              percentage > 60 ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <motion.div
        className="glass-panel-dark p-6 rangers-border"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gpu-green/20 rounded-xl border-2 border-gpu-green">
              <Monitor size={24} className="text-gpu-green" />
            </div>
            <div>
              <h2 className="text-2xl font-mono font-bold text-gpu">
                SYSTEM MONITOR
              </h2>
              <p className="text-rangers-blue font-mono">
                🏴󠁧󠁢󠁳󠁣󠁴󠁿 RTX 5070 Ti Performance Dashboard
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="status-indicator bg-gpu-green animate-pulse-glow" />
            <p className="text-sm font-mono text-gpu-bright mt-1">ACTIVE</p>
          </div>
        </div>
      </motion.div>

      {/* System Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <SystemCard
          title="CPU"
          icon={Cpu}
          value={systemData.cpu.usage}
          unit="%"
          percentage={systemData.cpu.usage}
          chart={cpuLineData}
          color="bg-cyber-pink/20 border-cyber-pink"
          subtitle={`${systemData.cpu.cores} cores @ ${systemData.cpu.frequency}GHz`}
        />
        
        <SystemCard
          title="RTX 5070 Ti"
          icon={Gpu}
          value={systemData.gpu.usage}
          unit="%"
          percentage={systemData.gpu.usage}
          chart={gpuLineData}
          color="bg-gpu-green/20 border-gpu-green"
          subtitle={`${systemData.gpu.vram}GB VRAM | ${systemData.gpu.temp}°C`}
        />
        
        <SystemCard
          title="RAM"
          icon={MemoryStick}
          value={systemData.ram.used}
          unit="GB"
          percentage={systemData.ram.usage}
          chart={ramLineData}
          color="bg-cyber-neon/20 border-cyber-neon"
          subtitle={`${systemData.ram.total}GB Total`}
        />
        
        <SystemCard
          title="Storage"
          icon={HardDrive}
          value={systemData.storage.used}
          unit="GB"
          percentage={systemData.storage.usage}
          color="bg-cyber-orange/20 border-cyber-orange"
          subtitle={`${systemData.storage.total}GB Total`}
        />
      </div>

      {/* RTX 5070 Ti Detailed View */}
      <motion.div
        className="glass-panel p-6 gpu-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gpu-green/20 rounded-xl border-2 border-gpu-green">
              <Gpu size={24} className="text-gpu-green" />
            </div>
            <div>
              <h3 className="text-xl font-mono font-bold text-gpu">
                RTX 5070 Ti SUPER DETAILS
              </h3>
              <p className="text-gpu-bright font-mono text-sm">
                NVIDIA Ada Lovelace Architecture
              </p>
            </div>
          </div>
          <div className="w-32 h-32">
            <Doughnut data={gpuDoughnutData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <Zap size={20} className="text-gpu-green mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-gpu-bright">
              {systemData.gpu.power}W
            </p>
            <p className="text-sm text-gray-400">Power Draw</p>
          </div>
          
          <div className="text-center">
            <Thermometer size={20} className="text-cyber-orange mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-cyber-orange">
              {systemData.gpu.temp}°C
            </p>
            <p className="text-sm text-gray-400">Temperature</p>
          </div>
          
          <div className="text-center">
            <MemoryStick size={20} className="text-cyber-neon mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-cyber-neon">
              {systemData.gpu.vram}GB
            </p>
            <p className="text-sm text-gray-400">VRAM Used</p>
          </div>
          
          <div className="text-center">
            <TrendingUp size={20} className="text-cyber-pink mx-auto mb-2" />
            <p className="text-2xl font-mono font-bold text-cyber-pink">
              {(systemData.gpu.usage * 0.01 * 8448).toFixed(0)}
            </p>
            <p className="text-sm text-gray-400">CUDA Cores Active</p>
          </div>
        </div>
      </motion.div>

      {/* Network Activity */}
      <motion.div
        className="glass-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rangers-blue/20 rounded-xl border-2 border-rangers-blue">
            <Activity size={20} className="text-rangers-blue" />
          </div>
          <h3 className="text-xl font-mono font-bold text-rangers">
            NETWORK ACTIVITY
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-2xl font-mono font-bold text-green-400">
              ↓ {systemData.network.download} MB/s
            </p>
            <p className="text-sm text-gray-400">Download</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-mono font-bold text-blue-400">
              ↑ {systemData.network.upload} MB/s
            </p>
            <p className="text-sm text-gray-400">Upload</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}