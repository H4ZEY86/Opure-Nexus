// ============================================================================
// OPURE DISCORD ACTIVITY - MARKETPLACE WEBSOCKET SERVICE
// ============================================================================
// Real-time marketplace updates compatible with IONOS static hosting
// Features: External WebSocket connection, fallback polling, auto-reconnect
// Connects to external API gateway for real-time functionality
// ============================================================================

import { io, Socket } from 'socket.io-client'
import { 
  MarketplaceWebSocketEvent, 
  MarketplaceEventType, 
  MarketplaceListing, 
  Trade, 
  AuctionBid,
  InventoryItem,
  MarketplacePriceSummary
} from '../types/marketplace'

// ============================================================================
// WEBSOCKET SERVICE CLASS
// ============================================================================

export class MarketplaceWebSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventCallbacks = new Map<MarketplaceEventType, Array<(data: any) => void>>()
  private fallbackPollTimer: NodeJS.Timeout | null = null
  private lastUpdate = Date.now()
  
  // Configuration
  private config = {
    apiUrl: process.env.VITE_API_URL || 'https://api.opure.uk',
    wsUrl: process.env.VITE_WS_URL || 'wss://api.opure.uk',
    fallbackPollInterval: 30000, // 30 seconds
    heartbeatInterval: 25000, // 25 seconds
    connectionTimeout: 10000, // 10 seconds
    enableFallback: true
  }

  constructor(userId: string, username: string) {
    // Temporarily disable WebSocket connections for Discord Activity
    // WebSocket/Socket.IO not supported in current serverless API setup
    console.log('🔌 Marketplace WebSocket connection disabled for Discord Activity compatibility')
    return
    
    this.connect(userId, username)
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  private connect(userId: string, username: string) {
    try {
      console.log('📡 Connecting to marketplace WebSocket...', this.config.wsUrl)
      
      this.socket = io(this.config.wsUrl, {
        auth: {
          userId,
          username,
          clientType: 'marketplace'
        },
        transports: ['websocket', 'polling'],
        timeout: this.config.connectionTimeout,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        forceNew: true
      })

      this.setupEventHandlers()
      
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error)
      this.handleConnectionError()
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Marketplace WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.lastUpdate = Date.now()
      
      // Join marketplace rooms
      this.socket?.emit('join-marketplace-room')
      this.socket?.emit('join-user-room')
      
      // Stop fallback polling
      this.stopFallbackPolling()
      
      // Emit connection status
      this.emitEvent('connection_status', { status: 'connected' })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Marketplace WebSocket disconnected:', reason)
      this.isConnected = false
      this.emitEvent('connection_status', { status: 'disconnected', reason })
      
      // Start fallback polling if enabled
      if (this.config.enableFallback) {
        this.startFallbackPolling()
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Marketplace WebSocket reconnected after', attemptNumber, 'attempts')
      this.emitEvent('connection_status', { status: 'reconnected' })
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Attempting to reconnect...', attemptNumber)
      this.reconnectAttempts = attemptNumber
      this.emitEvent('connection_status', { status: 'reconnecting', attempt: attemptNumber })
    })

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to marketplace WebSocket')
      this.emitEvent('connection_status', { status: 'failed' })
      
      // Start fallback polling
      if (this.config.enableFallback) {
        this.startFallbackPolling()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error)
      this.handleConnectionError()
    })

    // Marketplace-specific events
    this.setupMarketplaceEvents()
  }

  private setupMarketplaceEvents() {
    if (!this.socket) return

    // Listing events
    this.socket.on('listing-created', (listing: MarketplaceListing) => {
      this.lastUpdate = Date.now()
      this.emitEvent('listing_created', listing)
    })

    this.socket.on('listing-updated', (listing: MarketplaceListing) => {
      this.lastUpdate = Date.now()
      this.emitEvent('listing_updated', listing)
    })

    this.socket.on('listing-sold', (data: { listing_id: string; buyer_id: string; sale_price: number }) => {
      this.lastUpdate = Date.now()
      this.emitEvent('listing_sold', data)
    })

    this.socket.on('listing-cancelled', (data: { listing_id: string }) => {
      this.lastUpdate = Date.now()
      this.emitEvent('listing_cancelled', data)
    })

    // Auction events
    this.socket.on('bid-placed', (data: { listing_id: string; bid: AuctionBid }) => {
      this.lastUpdate = Date.now()
      this.emitEvent('bid_placed', data)
    })

    this.socket.on('auction-ended', (data: { listing_id: string; winner_id?: string; final_bid?: number }) => {
      this.lastUpdate = Date.now()
      this.emitEvent('auction_ended', data)
    })

    this.socket.on('outbid-notification', (data: { listing_id: string; item_name: string; your_bid: number; new_bid: number }) => {
      this.lastUpdate = Date.now()
      this.emitEvent('outbid_notification', data)
    })

    // Trade events
    this.socket.on('trade-initiated', (trade: Trade) => {
      this.lastUpdate = Date.now()
      this.emitEvent('trade_initiated', trade)
    })

    this.socket.on('trade-accepted', (trade: Trade) => {
      this.lastUpdate = Date.now()
      this.emitEvent('trade_accepted', trade)
    })

    this.socket.on('trade-completed', (trade: Trade) => {
      this.lastUpdate = Date.now()
      this.emitEvent('trade_completed', trade)
    })

    this.socket.on('trade-cancelled', (trade: Trade) => {
      this.lastUpdate = Date.now()
      this.emitEvent('trade_cancelled', trade)
    })

    // Inventory events
    this.socket.on('inventory-updated', (inventoryItem: InventoryItem) => {
      this.lastUpdate = Date.now()
      this.emitEvent('inventory_updated', inventoryItem)
    })

    // Price events
    this.socket.on('price-update', (priceData: MarketplacePriceSummary[]) => {
      this.lastUpdate = Date.now()
      this.emitEvent('price_update', priceData)
    })

    // User events
    this.socket.on('user-online', (data: { user_id: string; username: string }) => {
      this.emitEvent('user_online', data)
    })

    this.socket.on('user-offline', (data: { user_id: string; username: string }) => {
      this.emitEvent('user_offline', data)
    })

    // System events
    this.socket.on('marketplace-maintenance', (data: { message: string; duration?: number }) => {
      this.emitEvent('marketplace_maintenance', data)
    })

    this.socket.on('server-message', (data: { type: 'info' | 'warning' | 'error'; message: string }) => {
      this.emitEvent('server_message', data)
    })
  }

  private handleConnectionError() {
    this.isConnected = false
    
    if (this.config.enableFallback) {
      console.log('🔄 Starting fallback polling due to connection issues')
      this.startFallbackPolling()
    }
  }

  // ============================================================================
  // FALLBACK POLLING SYSTEM
  // ============================================================================

  private startFallbackPolling() {
    if (this.fallbackPollTimer) return

    console.log('📡 Starting fallback polling every', this.config.fallbackPollInterval, 'ms')
    
    this.fallbackPollTimer = setInterval(async () => {
      try {
        await this.pollForUpdates()
      } catch (error) {
        console.error('❌ Fallback polling error:', error)
      }
    }, this.config.fallbackPollInterval)
  }

  private stopFallbackPolling() {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer)
      this.fallbackPollTimer = null
      console.log('⏹️ Stopped fallback polling')
    }
  }

  private async pollForUpdates() {
    try {
      const response = await fetch(`${this.config.apiUrl}/marketplace/updates?since=${this.lastUpdate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      
      if (data.success && data.updates?.length > 0) {
        console.log('📥 Received', data.updates.length, 'updates via fallback polling')
        
        // Process each update
        data.updates.forEach((update: MarketplaceWebSocketEvent) => {
          this.emitEvent(update.type, update.data)
        })
        
        this.lastUpdate = Date.now()
      }
    } catch (error) {
      console.error('❌ Polling error:', error)
    }
  }

  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================

  subscribe(eventType: MarketplaceEventType, callback: (data: any) => void): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, [])
    }
    
    this.eventCallbacks.get(eventType)!.push(callback)
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(eventType)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  private emitEvent(eventType: MarketplaceEventType, data: any) {
    const callbacks = this.eventCallbacks.get(eventType)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('❌ Error in event callback:', error)
        }
      })
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' | 'failed' {
    if (!this.socket) return 'failed'
    if (this.isConnected) return 'connected'
    if (this.reconnectAttempts > 0) return 'reconnecting'
    return 'disconnected'
  }

  isConnectionHealthy(): boolean {
    return this.isConnected && !!this.socket?.connected
  }

  getLastUpdateTime(): number {
    return this.lastUpdate
  }

  // Send events to server
  emit(eventName: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data)
    } else {
      console.warn('⚠️ Cannot emit event - not connected:', eventName)
    }
  }

  // Manual reconnection
  reconnect() {
    if (this.socket) {
      console.log('🔄 Manually reconnecting WebSocket...')
      this.socket.connect()
    }
  }

  // Disconnect
  disconnect() {
    this.stopFallbackPolling()
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    this.isConnected = false
    this.eventCallbacks.clear()
  }

  // Update configuration
  updateConfig(newConfig: Partial<typeof this.config>) {
    this.config = { ...this.config, ...newConfig }
  }

  // Force refresh data
  async forceRefresh(): Promise<void> {
    this.emitEvent('force_refresh', { timestamp: Date.now() })
  }
}

// ============================================================================
// MARKETPLACE WEBSOCKET HOOK
// ============================================================================

import { useEffect, useRef, useState } from 'react'

export interface UseMarketplaceWebSocketResult {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'failed'
  isHealthy: boolean
  lastUpdate: number
  reconnect: () => void
  forceRefresh: () => Promise<void>
  subscribe: (eventType: MarketplaceEventType, callback: (data: any) => void) => () => void
}

export function useMarketplaceWebSocket(
  userId: string | undefined, 
  username: string | undefined
): UseMarketplaceWebSocketResult {
  const serviceRef = useRef<MarketplaceWebSocketService | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'failed'>('disconnected')
  const [isHealthy, setIsHealthy] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(0)

  // Initialize service
  useEffect(() => {
    if (!userId || !username) return

    // Create service instance
    serviceRef.current = new MarketplaceWebSocketService(userId, username)
    
    // Subscribe to connection status changes
    const unsubscribe = serviceRef.current.subscribe('connection_status', (data) => {
      setConnectionStatus(data.status)
      setIsHealthy(serviceRef.current?.isConnectionHealthy() || false)
    })

    // Set up status polling
    const statusInterval = setInterval(() => {
      if (serviceRef.current) {
        setConnectionStatus(serviceRef.current.getConnectionStatus())
        setIsHealthy(serviceRef.current.isConnectionHealthy())
        setLastUpdate(serviceRef.current.getLastUpdateTime())
      }
    }, 1000)

    // Cleanup
    return () => {
      unsubscribe()
      clearInterval(statusInterval)
      serviceRef.current?.disconnect()
      serviceRef.current = null
    }
  }, [userId, username])

  // Public API
  const reconnect = () => {
    serviceRef.current?.reconnect()
  }

  const forceRefresh = async () => {
    await serviceRef.current?.forceRefresh()
  }

  const subscribe = (eventType: MarketplaceEventType, callback: (data: any) => void) => {
    return serviceRef.current?.subscribe(eventType, callback) || (() => {})
  }

  return {
    connectionStatus,
    isHealthy,
    lastUpdate,
    reconnect,
    forceRefresh,
    subscribe
  }
}

// ============================================================================
// MARKETPLACE REALTIME PROVIDER
// ============================================================================

import React, { createContext, useContext } from 'react'

interface MarketplaceRealtimeContextValue {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'failed'
  isHealthy: boolean
  lastUpdate: number
  reconnect: () => void
  forceRefresh: () => Promise<void>
  subscribe: (eventType: MarketplaceEventType, callback: (data: any) => void) => () => void
}

const MarketplaceRealtimeContext = createContext<MarketplaceRealtimeContextValue | undefined>(undefined)

interface MarketplaceRealtimeProviderProps {
  children: React.ReactNode
  userId?: string
  username?: string
}

export const MarketplaceRealtimeProvider: React.FC<MarketplaceRealtimeProviderProps> = ({
  children,
  userId,
  username
}) => {
  const websocket = useMarketplaceWebSocket(userId, username)

  return (
    <MarketplaceRealtimeContext.Provider value={websocket}>
      {children}
    </MarketplaceRealtimeContext.Provider>
  )
}

export function useMarketplaceRealtime() {
  const context = useContext(MarketplaceRealtimeContext)
  if (context === undefined) {
    throw new Error('useMarketplaceRealtime must be used within a MarketplaceRealtimeProvider')
  }
  return context
}

export default MarketplaceWebSocketService