'use client'

import { useState, useEffect } from 'react'
import { BotData } from '@/types'
import { useBotWebSocket } from './useWebSocket'

const MOCK_BOT_DATA: BotData = {
  id: '1388207626944249856',
  username: 'Opure.exe',
  discriminator: '0000',
  avatar: 'https://cdn.discordapp.com/avatars/1388207626944249856/avatar.png',
  status: 'online',
  uptime: 86400, // 24 hours in seconds
  guilds: 1,
  users: 150,
  channels: 25,
  commands_executed: 1250,
  memory_usage: 256, // MB
  cpu_usage: 15, // Percentage
  version: '2.1.0',
  last_restart: new Date().toISOString()
}

export function useBotData() {
  const [botData, setBotData] = useState<BotData>(MOCK_BOT_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Use WebSocket for real-time data
  const websocket = useBotWebSocket()

  useEffect(() => {
    const fetchBotData = async () => {
      try {
        setIsLoading(true)
        
        // Try WebSocket data first
        if (websocket.botData) {
          setBotData({
            ...MOCK_BOT_DATA,
            ...websocket.botData
          })
          setError(null)
          setIsLoading(false)
          return
        }
        
        // Try to fetch from local bot API
        try {
          const response = await fetch('http://localhost:8000/api/bot/status', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
          })
          
          if (response.ok) {
            const data = await response.json()
            setBotData({
              ...MOCK_BOT_DATA,
              ...data,
              uptime: data.uptime || MOCK_BOT_DATA.uptime
            })
            setError(null)
            return
          }
        } catch (fetchError) {
          console.warn('Local bot API unavailable, using WebSocket or mock data')
        }
        
        // Fallback to enhanced mock data
        const enhancedMockData = {
          ...MOCK_BOT_DATA,
          uptime: Math.floor(Date.now() / 1000) - 86400,
          commands_executed: MOCK_BOT_DATA.commands_executed + Math.floor(Math.random() * 100),
          cpu_usage: 10 + Math.random() * 10,
          memory_usage: 200 + Math.random() * 100,
        }
        
        setBotData(enhancedMockData)
        setError(websocket.error)
        
      } catch (err) {
        console.error('Failed to fetch bot data:', err)
        setError('Failed to connect to bot')
        setBotData(MOCK_BOT_DATA)
      } finally {
        setIsLoading(false)
      }
    }

    // Update when WebSocket data changes
    if (websocket.botData) {
      setBotData({
        ...MOCK_BOT_DATA,
        ...websocket.botData
      })
      setError(null)
      setIsLoading(false)
    } else {
      // Initial fetch
      fetchBotData()
    }

    // Refresh every 30 seconds as fallback
    const interval = setInterval(() => {
      if (!websocket.isConnected) {
        fetchBotData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [websocket.botData, websocket.isConnected, websocket.error])

  return { 
    botData, 
    isLoading, 
    error: error || websocket.error,
    isConnected: websocket.isConnected,
    realTimeData: websocket.realTimeData
  }
}