// ============================================================================
// OPURE DISCORD ACTIVITY - MARKETPLACE CONTEXT
// ============================================================================
// Comprehensive state management for AI Token Economy Marketplace
// Features: Real-time updates, Mobile optimization, Error handling
// ============================================================================

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDiscord } from '../hooks/useDiscord'
import {
  MarketplaceState,
  MarketplaceContextValue,
  MarketplaceContextProps,
  MarketplaceFilters,
  MarketplaceView,
  MarketplaceListing,
  InventoryItem,
  Trade,
  MarketplaceSummary,
  CreateListingRequest,
  PlaceBidRequest,
  InitiateTradeRequest,
  MarketplaceResponse,
  AuctionBid,
  MarketplaceWebSocketEvent,
  MarketplaceEventType,
  MarketplaceNotification,
  MarketplaceError
} from '../types/marketplace'

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MarketplaceState = {
  // Current view
  currentView: 'browse',
  selectedCategory: null,
  
  // Data
  listings: [],
  userInventory: [],
  marketPrices: [],
  userTrades: [],
  watchlist: [],
  
  // UI state
  filters: {
    sort_by: 'newest',
    sort_order: 'desc'
  },
  loading: false,
  error: null,
  
  // Real-time updates
  lastUpdate: new Date().toISOString(),
  connectionStatus: 'disconnected',
  
  // Mobile optimization
  isMobile: window.innerWidth < 768,
  bottomSheetOpen: false,
  selectedListing: null
}

// ============================================================================
// REDUCER ACTIONS
// ============================================================================

type MarketplaceAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_VIEW'; payload: MarketplaceView }
  | { type: 'SET_FILTERS'; payload: MarketplaceFilters }
  | { type: 'SET_LISTINGS'; payload: MarketplaceListing[] }
  | { type: 'ADD_LISTING'; payload: MarketplaceListing }
  | { type: 'UPDATE_LISTING'; payload: MarketplaceListing }
  | { type: 'REMOVE_LISTING'; payload: string }
  | { type: 'SET_INVENTORY'; payload: InventoryItem[] }
  | { type: 'UPDATE_INVENTORY_ITEM'; payload: InventoryItem }
  | { type: 'SET_TRADES'; payload: Trade[] }
  | { type: 'ADD_TRADE'; payload: Trade }
  | { type: 'UPDATE_TRADE'; payload: Trade }
  | { type: 'SET_MARKET_PRICES'; payload: MarketplaceSummary[] }
  | { type: 'SET_WATCHLIST'; payload: string[] }
  | { type: 'ADD_TO_WATCHLIST'; payload: string }
  | { type: 'REMOVE_FROM_WATCHLIST'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' | 'reconnecting' }
  | { type: 'SET_MOBILE'; payload: boolean }
  | { type: 'SET_BOTTOM_SHEET'; payload: { open: boolean; listing?: MarketplaceListing | null } }
  | { type: 'SET_SELECTED_CATEGORY'; payload: ItemCategory | null }
  | { type: 'UPDATE_LAST_UPDATE' }

// ============================================================================
// REDUCER
// ============================================================================

function marketplaceReducer(state: MarketplaceState, action: MarketplaceAction): MarketplaceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload }
    
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    
    case 'SET_LISTINGS':
      return { 
        ...state, 
        listings: action.payload,
        lastUpdate: new Date().toISOString(),
        loading: false,
        error: null
      }
    
    case 'ADD_LISTING':
      return {
        ...state,
        listings: [action.payload, ...state.listings],
        lastUpdate: new Date().toISOString()
      }
    
    case 'UPDATE_LISTING':
      return {
        ...state,
        listings: state.listings.map(listing => 
          listing.listing_id === action.payload.listing_id 
            ? action.payload 
            : listing
        ),
        selectedListing: state.selectedListing?.listing_id === action.payload.listing_id 
          ? action.payload 
          : state.selectedListing,
        lastUpdate: new Date().toISOString()
      }
    
    case 'REMOVE_LISTING':
      return {
        ...state,
        listings: state.listings.filter(listing => listing.listing_id !== action.payload),
        selectedListing: state.selectedListing?.listing_id === action.payload 
          ? null 
          : state.selectedListing,
        lastUpdate: new Date().toISOString()
      }
    
    case 'SET_INVENTORY':
      return { 
        ...state, 
        userInventory: action.payload,
        lastUpdate: new Date().toISOString()
      }
    
    case 'UPDATE_INVENTORY_ITEM':
      return {
        ...state,
        userInventory: state.userInventory.map(item => 
          item.inventory_id === action.payload.inventory_id 
            ? action.payload 
            : item
        ),
        lastUpdate: new Date().toISOString()
      }
    
    case 'SET_TRADES':
      return { 
        ...state, 
        userTrades: action.payload,
        lastUpdate: new Date().toISOString()
      }
    
    case 'ADD_TRADE':
      return {
        ...state,
        userTrades: [action.payload, ...state.userTrades],
        lastUpdate: new Date().toISOString()
      }
    
    case 'UPDATE_TRADE':
      return {
        ...state,
        userTrades: state.userTrades.map(trade => 
          trade.trade_id === action.payload.trade_id 
            ? action.payload 
            : trade
        ),
        lastUpdate: new Date().toISOString()
      }
    
    case 'SET_MARKET_PRICES':
      return { 
        ...state, 
        marketPrices: action.payload,
        lastUpdate: new Date().toISOString()
      }
    
    case 'SET_WATCHLIST':
      return { ...state, watchlist: action.payload }
    
    case 'ADD_TO_WATCHLIST':
      return { 
        ...state, 
        watchlist: [...state.watchlist, action.payload]
      }
    
    case 'REMOVE_FROM_WATCHLIST':
      return { 
        ...state, 
        watchlist: state.watchlist.filter(id => id !== action.payload)
      }
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload }
    
    case 'SET_MOBILE':
      return { ...state, isMobile: action.payload }
    
    case 'SET_BOTTOM_SHEET':
      return { 
        ...state, 
        bottomSheetOpen: action.payload.open,
        selectedListing: action.payload.listing || state.selectedListing
      }
    
    case 'SET_SELECTED_CATEGORY':
      return { ...state, selectedCategory: action.payload }
    
    case 'UPDATE_LAST_UPDATE':
      return { ...state, lastUpdate: new Date().toISOString() }
    
    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined)

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function MarketplaceProvider({ children }: MarketplaceContextProps) {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState)
  const { user, discordSdk } = useDiscord()
  const socketRef = useRef<Socket | null>(null)
  const notificationCallbacks = useRef<Map<string, (notification: MarketplaceNotification) => void>>(new Map())

  // ============================================================================
  // API BASE URL
  // ============================================================================
  
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://your-activity-domain.com/api'
    : 'http://localhost:3001/api'

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const makeAuthenticatedRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`, // Discord user ID as auth
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }, [user, API_BASE])

  const showNotification = useCallback((notification: MarketplaceNotification) => {
    notificationCallbacks.current.forEach(callback => callback(notification))
  }, [])

  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`Marketplace error in ${context}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    dispatch({ type: 'SET_ERROR', payload: errorMessage })
    
    showNotification({
      id: `error-${Date.now()}`,
      type: 'error',
      title: 'Marketplace Error',
      message: errorMessage,
      duration: 5000
    })
  }, [showNotification])

  // ============================================================================
  // WEBSOCKET MANAGEMENT
  // ============================================================================

  const initializeWebSocket = useCallback(() => {
    if (!user || socketRef.current) return

    try {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'reconnecting' })
      
      const socket = io(`${API_BASE.replace('/api', '')}`, {
        auth: {
          userId: user.id,
          username: user.username
        },
        transports: ['websocket', 'polling']
      })

      socket.on('connect', () => {
        console.log('Marketplace WebSocket connected')
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
        
        // Join user-specific rooms
        socket.emit('join-user-room', user.id)
        socket.emit('join-marketplace-room')
      })

      socket.on('disconnect', () => {
        console.log('Marketplace WebSocket disconnected')
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' })
      })

      // Marketplace events
      socket.on('listing-created', (listing: MarketplaceListing) => {
        dispatch({ type: 'ADD_LISTING', payload: listing })
        showNotification({
          id: `listing-${listing.listing_id}`,
          type: 'info',
          title: 'New Listing',
          message: `${listing.item.name} is now available`,
          duration: 3000
        })
      })

      socket.on('listing-updated', (listing: MarketplaceListing) => {
        dispatch({ type: 'UPDATE_LISTING', payload: listing })
      })

      socket.on('listing-sold', (data: { listing_id: string; buyer_id: string }) => {
        dispatch({ type: 'REMOVE_LISTING', payload: data.listing_id })
        
        if (data.buyer_id === user.id) {
          showNotification({
            id: `purchase-${data.listing_id}`,
            type: 'success',
            title: 'Purchase Complete',
            message: 'Your purchase was successful!',
            duration: 5000
          })
        }
      })

      socket.on('bid-placed', (data: { listing_id: string; bid: AuctionBid }) => {
        // Update the listing with new bid information
        const updatedListing = state.listings.find(l => l.listing_id === data.listing_id)
        if (updatedListing) {
          updatedListing.current_bid = data.bid.bid_amount
          updatedListing.highest_bidder_id = data.bid.bidder_id
          dispatch({ type: 'UPDATE_LISTING', payload: updatedListing })
        }

        if (data.bid.bidder_id !== user.id) {
          showNotification({
            id: `bid-${data.bid.bid_id}`,
            type: 'info',
            title: 'New Bid',
            message: `Someone bid ${data.bid.bid_amount} tokens`,
            duration: 3000
          })
        }
      })

      socket.on('trade-initiated', (trade: Trade) => {
        dispatch({ type: 'ADD_TRADE', payload: trade })
        
        if (trade.recipient_id === user.id) {
          showNotification({
            id: `trade-${trade.trade_id}`,
            type: 'info',
            title: 'Trade Request',
            message: `${trade.initiator.discord_username} wants to trade with you`,
            duration: 10000,
            action: {
              label: 'View Trade',
              callback: () => {
                dispatch({ type: 'SET_CURRENT_VIEW', payload: 'my_trades' })
              }
            }
          })
        }
      })

      socket.on('trade-completed', (trade: Trade) => {
        dispatch({ type: 'UPDATE_TRADE', payload: trade })
        
        showNotification({
          id: `trade-complete-${trade.trade_id}`,
          type: 'success',
          title: 'Trade Complete',
          message: 'Trade has been successfully completed',
          duration: 5000
        })

        // Refresh inventory after trade completion
        fetchUserInventory()
      })

      socket.on('inventory-updated', (inventoryItem: InventoryItem) => {
        dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: inventoryItem })
      })

      socket.on('price-update', (priceData: MarketplaceSummary[]) => {
        dispatch({ type: 'SET_MARKET_PRICES', payload: priceData })
      })

      socketRef.current = socket

    } catch (error) {
      handleError(error, 'WebSocket initialization')
    }
  }, [user, API_BASE, handleError, showNotification, state.listings])

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const fetchListings = useCallback(async (filters?: MarketplaceFilters) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const queryParams = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              queryParams.append(key, value.join(','))
            } else {
              queryParams.append(key, value.toString())
            }
          }
        })
      }

      const response = await makeAuthenticatedRequest(`/marketplace/listings?${queryParams}`)
      dispatch({ type: 'SET_LISTINGS', payload: response.data })
      
      if (filters) {
        dispatch({ type: 'SET_FILTERS', payload: filters })
      }

    } catch (error) {
      handleError(error, 'fetchListings')
    }
  }, [makeAuthenticatedRequest, handleError])

  const fetchUserInventory = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest('/marketplace/inventory')
      dispatch({ type: 'SET_INVENTORY', payload: response.data })
    } catch (error) {
      handleError(error, 'fetchUserInventory')
    }
  }, [makeAuthenticatedRequest, handleError])

  const fetchUserTrades = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest('/marketplace/trades')
      dispatch({ type: 'SET_TRADES', payload: response.data })
    } catch (error) {
      handleError(error, 'fetchUserTrades')
    }
  }, [makeAuthenticatedRequest, handleError])

  const fetchMarketPrices = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest('/marketplace/prices')
      dispatch({ type: 'SET_MARKET_PRICES', payload: response.data })
    } catch (error) {
      handleError(error, 'fetchMarketPrices')
    }
  }, [makeAuthenticatedRequest, handleError])

  const createListing = useCallback(async (request: CreateListingRequest): Promise<MarketplaceResponse<MarketplaceListing>> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await makeAuthenticatedRequest('/marketplace/listings', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      dispatch({ type: 'ADD_LISTING', payload: response.data })
      dispatch({ type: 'SET_LOADING', payload: false })

      showNotification({
        id: `create-listing-${response.data.listing_id}`,
        type: 'success',
        title: 'Listing Created',
        message: `${response.data.item.name} is now listed for sale`,
        duration: 5000
      })

      // Refresh inventory to reflect locked items
      fetchUserInventory()

      return response
    } catch (error) {
      handleError(error, 'createListing')
      throw error
    }
  }, [makeAuthenticatedRequest, handleError, showNotification, fetchUserInventory])

  const cancelListing = useCallback(async (listingId: string): Promise<MarketplaceResponse<void>> => {
    try {
      const response = await makeAuthenticatedRequest(`/marketplace/listings/${listingId}`, {
        method: 'DELETE'
      })

      dispatch({ type: 'REMOVE_LISTING', payload: listingId })

      showNotification({
        id: `cancel-listing-${listingId}`,
        type: 'info',
        title: 'Listing Cancelled',
        message: 'Your listing has been cancelled',
        duration: 3000
      })

      // Refresh inventory to reflect unlocked items
      fetchUserInventory()

      return response
    } catch (error) {
      handleError(error, 'cancelListing')
      throw error
    }
  }, [makeAuthenticatedRequest, handleError, showNotification, fetchUserInventory])

  const placeBid = useCallback(async (request: PlaceBidRequest): Promise<MarketplaceResponse<AuctionBid>> => {
    try {
      const response = await makeAuthenticatedRequest('/marketplace/bids', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      showNotification({
        id: `bid-placed-${response.data.bid_id}`,
        type: 'success',
        title: 'Bid Placed',
        message: `Your bid of ${request.bid_amount} tokens has been placed`,
        duration: 5000
      })

      return response
    } catch (error) {
      handleError(error, 'placeBid')
      throw error
    }
  }, [makeAuthenticatedRequest, handleError, showNotification])

  const initiateTrade = useCallback(async (request: InitiateTradeRequest): Promise<MarketplaceResponse<Trade>> => {
    try {
      const response = await makeAuthenticatedRequest('/marketplace/trades', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      dispatch({ type: 'ADD_TRADE', payload: response.data })

      showNotification({
        id: `trade-initiated-${response.data.trade_id}`,
        type: 'success',
        title: 'Trade Initiated',
        message: 'Your trade request has been sent',
        duration: 5000
      })

      return response
    } catch (error) {
      handleError(error, 'initiateTrade')
      throw error
    }
  }, [makeAuthenticatedRequest, handleError, showNotification])

  const acceptTrade = useCallback(async (tradeId: string): Promise<MarketplaceResponse<Trade>> => {
    try {
      const response = await makeAuthenticatedRequest(`/marketplace/trades/${tradeId}/accept`, {
        method: 'POST'
      })

      dispatch({ type: 'UPDATE_TRADE', payload: response.data })

      showNotification({
        id: `trade-accepted-${tradeId}`,
        type: 'success',
        title: 'Trade Accepted',
        message: 'Trade has been accepted and will be processed',
        duration: 5000
      })

      return response
    } catch (error) {
      handleError(error, 'acceptTrade')
      throw error
    }
  }, [makeAuthenticatedRequest, handleError, showNotification])

  const cancelTrade = useCallback(async (tradeId: string): Promise<MarketplaceResponse<Trade>> => {
    try {
      const response = await makeAuthenticatedRequest(`/marketplace/trades/${tradeId}/cancel`, {
        method: 'POST'
      })

      dispatch({ type: 'UPDATE_TRADE', payload: response.data })

      showNotification({
        id: `trade-cancelled-${tradeId}`,
        type: 'info',
        title: 'Trade Cancelled',
        message: 'Trade has been cancelled',
        duration: 3000
      })

      return response
    } catch (error) {
      handleError(error, 'cancelTrade')
      throw error
    }
  }, [makeAuthenticatedRequest, handleError, showNotification])

  const addToWatchlist = useCallback(async (listingId: string) => {
    try {
      await makeAuthenticatedRequest('/marketplace/watchlist', {
        method: 'POST',
        body: JSON.stringify({ listing_id: listingId })
      })

      dispatch({ type: 'ADD_TO_WATCHLIST', payload: listingId })

      showNotification({
        id: `watchlist-add-${listingId}`,
        type: 'success',
        title: 'Added to Watchlist',
        message: 'Item added to your watchlist',
        duration: 3000
      })
    } catch (error) {
      handleError(error, 'addToWatchlist')
    }
  }, [makeAuthenticatedRequest, handleError, showNotification])

  const removeFromWatchlist = useCallback(async (listingId: string) => {
    try {
      await makeAuthenticatedRequest(`/marketplace/watchlist/${listingId}`, {
        method: 'DELETE'
      })

      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: listingId })

      showNotification({
        id: `watchlist-remove-${listingId}`,
        type: 'info',
        title: 'Removed from Watchlist',
        message: 'Item removed from your watchlist',
        duration: 3000
      })
    } catch (error) {
      handleError(error, 'removeFromWatchlist')
    }
  }, [makeAuthenticatedRequest, handleError, showNotification])

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const setFilters = useCallback((filters: MarketplaceFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
    fetchListings(filters)
  }, [fetchListings])

  const setCurrentView = useCallback((view: MarketplaceView) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
    
    // Load appropriate data based on view
    switch (view) {
      case 'my_inventory':
        fetchUserInventory()
        break
      case 'my_trades':
        fetchUserTrades()
        break
      case 'analytics':
        fetchMarketPrices()
        break
      default:
        fetchListings()
    }
  }, [fetchListings, fetchUserInventory, fetchUserTrades, fetchMarketPrices])

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  const openBottomSheet = useCallback((sheet: 'filters' | 'item_details' | 'trade_details', data?: any) => {
    dispatch({ 
      type: 'SET_BOTTOM_SHEET', 
      payload: { 
        open: true, 
        listing: sheet === 'item_details' ? data : null 
      } 
    })
  }, [])

  const closeBottomSheet = useCallback(() => {
    dispatch({ type: 'SET_BOTTOM_SHEET', payload: { open: false } })
  }, [])

  const subscribe = useCallback((eventType: MarketplaceEventType, callback: (data: any) => void) => {
    const id = `${eventType}-${Date.now()}`
    notificationCallbacks.current.set(id, callback)
    
    return () => {
      notificationCallbacks.current.delete(id)
    }
  }, [])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize WebSocket connection when user is available
  useEffect(() => {
    if (user) {
      initializeWebSocket()
      
      // Initial data load
      fetchListings()
      fetchUserInventory()
      fetchMarketPrices()
    }

    return () => {
      disconnectWebSocket()
    }
  }, [user, initializeWebSocket, disconnectWebSocket, fetchListings, fetchUserInventory, fetchMarketPrices])

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      dispatch({ type: 'SET_MOBILE', payload: window.innerWidth < 768 })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.connectionStatus === 'connected') {
        // Only refresh if connected to avoid duplicate requests
        fetchMarketPrices()
      }
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [state.connectionStatus, fetchMarketPrices])

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: MarketplaceContextValue = {
    // State
    state,
    
    // Actions
    fetchListings,
    fetchUserInventory,
    fetchUserTrades,
    createListing,
    cancelListing,
    placeBid,
    initiateTrade,
    acceptTrade,
    cancelTrade,
    addToWatchlist,
    removeFromWatchlist,
    
    // Utility functions
    setFilters,
    setCurrentView,
    clearError,
    
    // Mobile-specific
    openBottomSheet,
    closeBottomSheet,
    
    // Real-time
    subscribe
  }

  return (
    <MarketplaceContext.Provider value={contextValue}>
      {children}
    </MarketplaceContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useMarketplace() {
  const context = useContext(MarketplaceContext)
  if (context === undefined) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider')
  }
  return context
}

export default MarketplaceContext