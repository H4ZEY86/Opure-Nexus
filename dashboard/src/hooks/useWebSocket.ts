'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

interface UseWebSocketOptions {
  url?: string
  reconnectAttempts?: number
  reconnectDelay?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: any) => void
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastMessage: WebSocketMessage | null
  connectionAttempts: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8001',
    reconnectAttempts = 5,
    reconnectDelay = 5000,
    onConnect,
    onDisconnect,
    onMessage,
    onError
  } = options

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionAttempts: 0
  })

  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return
    }

    setState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null,
      connectionAttempts: reconnectAttemptsRef.current
    }))

    try {
      // Create Socket.IO client connection
      socketRef.current = io(url.replace('ws:', 'http:'), {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: false, // We'll handle reconnection manually
        forceNew: true
      })

      socketRef.current.on('connect', () => {
        console.log('✅ WebSocket connected to dashboard')
        reconnectAttemptsRef.current = 0
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionAttempts: 0
        }))
        
        onConnect?.()
      })

      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason)
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: `Disconnected: ${reason}`
        }))
        
        onDisconnect?.()
        
        // Auto-reconnect if not manually disconnected
        if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < reconnectAttempts) {
          scheduleReconnect()
        }
      })

      socketRef.current.on('bot_update', (data) => {
        const message: WebSocketMessage = {
          type: 'bot_update',
          data,
          timestamp: Date.now()
        }
        
        setState(prev => ({ ...prev, lastMessage: message }))
        onMessage?.(message)
      })

      socketRef.current.on('command_executed', (data) => {
        const message: WebSocketMessage = {
          type: 'command_executed',
          data,
          timestamp: Date.now()
        }
        
        setState(prev => ({ ...prev, lastMessage: message }))
        onMessage?.(message)
      })

      socketRef.current.on('music_update', (data) => {
        const message: WebSocketMessage = {
          type: 'music_update',
          data,
          timestamp: Date.now()
        }
        
        setState(prev => ({ ...prev, lastMessage: message }))
        onMessage?.(message)
      })

      socketRef.current.on('ai_update', (data) => {
        const message: WebSocketMessage = {
          type: 'ai_update',
          data,
          timestamp: Date.now()
        }
        
        setState(prev => ({ ...prev, lastMessage: message }))
        onMessage?.(message)
      })

      socketRef.current.on('gaming_update', (data) => {
        const message: WebSocketMessage = {
          type: 'gaming_update',
          data,
          timestamp: Date.now()
        }
        
        setState(prev => ({ ...prev, lastMessage: message }))
        onMessage?.(message)
      })

      socketRef.current.on('economy_update', (data) => {
        const message: WebSocketMessage = {
          type: 'economy_update',
          data,
          timestamp: Date.now()
        }
        
        setState(prev => ({ ...prev, lastMessage: message }))
        onMessage?.(message)
      })

      socketRef.current.on('achievement_unlocked', (data) => {
        const message: WebSocketMessage = {
          type: 'achievement_unlocked',
          data,
          timestamp: Date.now()
        }
        
        setState(prev => ({ ...prev, lastMessage: message }))
        onMessage?.(message)
      })

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error)
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: `Connection failed: ${error.message}`
        }))
        
        onError?.(error)
        
        if (reconnectAttemptsRef.current < reconnectAttempts) {
          scheduleReconnect()
        }
      })

    } catch (error: any) {
      console.error('❌ WebSocket setup error:', error)
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: `Setup failed: ${error.message}`
      }))
      
      onError?.(error)
    }
  }, [url, reconnectAttempts, onConnect, onDisconnect, onMessage, onError])

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectAttemptsRef.current += 1
    
    setState(prev => ({ 
      ...prev, 
      connectionAttempts: reconnectAttemptsRef.current 
    }))

    console.log(`🔄 Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${reconnectAttempts} in ${reconnectDelay}ms`)

    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, reconnectDelay)
  }, [connect, reconnectDelay, reconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      error: null
    }))

    reconnectAttemptsRef.current = 0
  }, [])

  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, data)
      return true
    }
    return false
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    sendMessage
  }
}

// Specialized hook for bot data
export function useBotWebSocket() {
  const [botData, setBotData] = useState<any>(null)
  const [realTimeData, setRealTimeData] = useState<any>({
    system: {},
    discord: {},
    ai: {},
    music: {},
    gaming: {},
    economy: {}
  })

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'bot_update':
        setBotData(message.data)
        break
      
      case 'command_executed':
        setRealTimeData((prev: any) => ({
          ...prev,
          commands: [
            ...(prev.commands || []).slice(0, 99),
            message.data
          ]
        }))
        break
      
      case 'music_update':
        setRealTimeData((prev: any) => ({
          ...prev,
          music: { ...prev.music, ...message.data }
        }))
        break
      
      case 'ai_update':
        setRealTimeData((prev: any) => ({
          ...prev,
          ai: { ...prev.ai, ...message.data }
        }))
        break
      
      case 'gaming_update':
        setRealTimeData((prev: any) => ({
          ...prev,
          gaming: { ...prev.gaming, ...message.data }
        }))
        break
      
      case 'economy_update':
        setRealTimeData((prev: any) => ({
          ...prev,
          economy: { ...prev.economy, ...message.data }
        }))
        break
      
      case 'achievement_unlocked':
        setRealTimeData((prev: any) => ({
          ...prev,
          achievements: [
            ...(prev.achievements || []).slice(0, 19),
            message.data
          ]
        }))
        break
    }
  }, [])

  const websocket = useWebSocket({
    onMessage: handleMessage,
    onConnect: () => console.log('🤖 Bot WebSocket connected'),
    onDisconnect: () => console.log('🤖 Bot WebSocket disconnected'),
    onError: (error) => console.error('🤖 Bot WebSocket error:', error)
  })

  return {
    ...websocket,
    botData,
    realTimeData
  }
}