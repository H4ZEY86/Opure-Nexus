// API Configuration for Opure Activity Client
export const API_CONFIG = {
  BASE_URL: 'https://api.opure.uk',
  ENDPOINTS: {
    AUTH: '/api/auth/discord',
    BOT_COMMAND: '/api/bot/command',
    BOT_DATA: '/api/bot/data',
    AI_CHAT: '/api/ai/chat',
    ADMIN: {
      AUTH: {
        VALIDATE: '/api/admin/auth/validate',
        PROFILE: '/api/admin/auth/profile',
        LOGIN: '/api/admin/auth/login',
        LOGOUT: '/api/admin/auth/logout',
        REFRESH: '/api/admin/auth/refresh',
      },
      AUDIT: '/api/admin/audit/log',
      CLIENT_IP: '/api/admin/client-ip',
      STATS: '/api/admin/stats',
      NOTIFICATIONS: '/api/admin/notifications',
      USERS: '/api/admin/users',
      ECONOMY: {
        TOKENS: '/api/admin/economy/tokens',
        MARKETPLACE: '/api/admin/economy/marketplace',
        TRANSACTIONS: '/api/admin/economy/transactions',
      }
    },
    USER: {
      TOKENS: '/api/user/tokens',
      EARNING_OPPORTUNITIES: '/api/user/earning-opportunities',
      CLAIM_TOKENS: '/api/user/claim-tokens',
      DAILY_REWARD: '/api/user/daily-reward',
      CLAIM_DAILY_REWARD: '/api/user/claim-daily-reward',
      TRANSACTIONS: '/api/user/transactions',
    },
    MARKETPLACE: {
      PRICES: '/api/marketplace/prices',
      ANALYTICS: '/api/marketplace/analytics',
      SPENDING_OPTIONS: '/api/marketplace/spending-options',
      ECONOMY_INSIGHTS: '/api/marketplace/economy-insights',
      USERS: '/api/marketplace/users',
      LISTINGS: '/api/marketplace/listings',
    }
  }
}

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

// Discord Activity compatible API call method 
export const discordActivityFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = buildApiUrl(endpoint)
  
  try {
    console.log(`🌐 Discord Activity fetch: ${options.method || 'GET'} ${url}`)
    
    // Try different fetch approaches for Discord Activities
    const fetchOptions: RequestInit = {
      ...options,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    }
    
    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`✅ Discord Activity fetch successful:`, data)
    return data
    
  } catch (error) {
    console.error(`❌ Discord Activity fetch failed for ${endpoint}:`, error)
    
    // DO NOT USE MOCK DATA - This was causing fake user authentication
    // Let the error bubble up so we can fix the real API issues
    throw error
  }
}

// Mock responses when API is not reachable - NO FAKE USER DATA!
const getMockResponse = (endpoint: string, options: RequestInit) => {
  console.error(`❌ API endpoint ${endpoint} not reachable - returning error instead of fake data`)
  
  if (endpoint.includes('/api/auth/discord') && options.method === 'POST') {
    // DON'T return fake user data - throw error to force real authentication
    throw new Error('API authentication failed - use Discord SDK authentication instead')
  }
  
  if (endpoint.includes('/api/bot/sync/')) {
    const userId = endpoint.split('/').pop()
    return {
      success: true,
      data: {
        user: {
          id: userId,
          fragments: 250,
          level: 5,
          xp: 1200,
          lives: 3
        },
        achievements: ['first_song', 'level_5'],
        stats: {
          messages_sent: 45,
          commands_used: 12,
          music_tracks_played: 8
        }
      }
    }
  }
  
  return { success: false, error: 'Mock endpoint not implemented' }
}

// Helper function for authenticated API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = buildApiUrl(endpoint)
  
  // Add auth token if available
  const token = localStorage.getItem('auth_token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}