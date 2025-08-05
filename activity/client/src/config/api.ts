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