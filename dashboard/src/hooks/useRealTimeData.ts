'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { RealTimeData, WebSocketEvent } from '@/types'
import { useBotWebSocket } from './useWebSocket'

const MOCK_REAL_TIME_DATA: RealTimeData = {
  timestamp: Date.now(),
  bot: {
    cpu_usage: 15,
    memory_usage: 256,
    commands_executed: 1250
  },
  music: {
    is_playing: false,
    queue_length: 0,
    volume: 75,
    listeners: 0
  },
  ai: {
    requests_today: 85,
    average_response_time: 1200,
    memory_entries: 150,
    success_rate: 98.5
  },
  gaming: {
    activity_status: 'online',
    active_players: 12,
    total_games_played: 450,
    daily_games: 35
  },
  economy: {
    total_fragments: 125000,
    daily_transactions: 45,
    active_traders: 28,
    shop_items: 50
  },
  performance: {
    cpu_usage: 15,
    memory_usage: 256,
    gpu_usage: 12, // RTX 5070 Ti low usage for Discord bot
    gpu_memory: 2048,
    fps: 60,
    response_time: 150,
    active_connections: 3
  }
}

export function useRealTimeData() {
  const [realTimeData, setRealTimeData] = useState<RealTimeData>(MOCK_REAL_TIME_DATA)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  
  // Use the new WebSocket hook
  const websocket = useBotWebSocket()

  useEffect(() => {
    let mockDataInterval: NodeJS.Timeout | null = null
    
    // Update connection state from WebSocket hook
    setIsConnected(websocket.isConnected)
    
    // Update real-time data from WebSocket
    if (websocket.realTimeData && Object.keys(websocket.realTimeData).length > 0) {
      setRealTimeData(prev => ({
        ...prev,
        ...websocket.realTimeData,
        timestamp: Date.now()
      }))
    }

    const startMockData = () => {
      if (mockDataInterval || websocket.isConnected) return

      console.log('🔄 Using enhanced mock real-time data')
      mockDataInterval = setInterval(() => {
        setRealTimeData(prev => ({
          ...prev,
          timestamp: Date.now(),
          bot: {
            ...prev.bot,
            cpu_usage: 10 + Math.random() * 15,
            memory_usage: 200 + Math.random() * 100,
            commands_executed: (prev.bot.commands_executed || 0) + Math.floor(Math.random() * 3)
          },
          music: {
            ...prev.music,
            listeners: Math.floor(Math.random() * 20)
          },
          ai: {
            ...prev.ai,
            requests_today: (prev.ai.requests_today || 0) + Math.floor(Math.random() * 2),
            average_response_time: 800 + Math.random() * 800
          },
          gaming: {
            ...prev.gaming,
            active_players: 8 + Math.floor(Math.random() * 15)
          },
          economy: {
            ...prev.economy,
            total_fragments: (prev.economy.total_fragments || 125000) + Math.floor(Math.random() * 100),
            daily_transactions: (prev.economy.daily_transactions || 45) + Math.floor(Math.random() * 5)
          },
          performance: {
            ...prev.performance,
            cpu_usage: 10 + Math.random() * 15,
            memory_usage: 200 + Math.random() * 100,
            gpu_usage: 5 + Math.random() * 15, // RTX 5070 Ti usage
            response_time: 100 + Math.random() * 100,
            fps: 58 + Math.random() * 4 // 58-62 FPS
          }
        }))
      }, 2000) // Update every 2 seconds
    }

    // Start mock data if WebSocket is not connected
    if (!websocket.isConnected) {
      const timeout = setTimeout(startMockData, 1000)
      return () => clearTimeout(timeout)
    } else {
      // Clear mock data when WebSocket connects
      if (mockDataInterval) {
        clearInterval(mockDataInterval)
        mockDataInterval = null
      }
    }

    return () => {
      if (mockDataInterval) {
        clearInterval(mockDataInterval)
      }
    }
  }, [websocket.isConnected, websocket.realTimeData])

  return { 
    realTimeData: {
      ...realTimeData,
      // Merge with WebSocket data if available
      ...(websocket.realTimeData || {})
    }, 
    isConnected: websocket.isConnected 
  }
}