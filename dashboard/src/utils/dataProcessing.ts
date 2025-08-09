// Data processing utilities for bot database and Discord API integration

interface BotDatabaseRecord {
  user_id: string
  guild_id?: string
  fragments: number
  commands_used: number
  achievements: string[]
  last_active: string
}

interface DiscordAPIData {
  guilds: Array<{
    id: string
    name: string
    member_count: number
    owner_id: string
  }>
  user: {
    id: string
    username: string
    discriminator: string
    avatar?: string
  }
  application: {
    id: string
    name: string
    description: string
    bot_public: boolean
  }
}

interface ProcessedBotData {
  status: 'online' | 'idle' | 'dnd' | 'offline'
  username: string
  guilds: number
  users: number
  commands_executed: number
  latency: number
  uptime: number
  memory_usage: number
  cpu_usage: number
}

// Database interaction utilities
export class DatabaseProcessor {
  private static instance: DatabaseProcessor
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()

  static getInstance(): DatabaseProcessor {
    if (!DatabaseProcessor.instance) {
      DatabaseProcessor.instance = new DatabaseProcessor()
    }
    return DatabaseProcessor.instance
  }

  // Process user statistics from bot database
  async processUserStats(): Promise<{
    total_users: number
    active_users: number
    top_fragment_holders: Array<{ user: string, fragments: number }>
    command_usage: Array<{ command: string, uses: number }>
  }> {
    const cacheKey = 'user_stats'
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Mock database query - replace with actual SQLite integration
      const mockData = {
        total_users: 1250,
        active_users: 89,
        top_fragment_holders: [
          { user: 'GamerPro#1337', fragments: 15420 },
          { user: 'CryptoKing#9999', fragments: 12890 },
          { user: 'RangersFan#2024', fragments: 9876 },
          { user: 'AIEnthusiast#5555', fragments: 7654 },
          { user: 'MusicLover#3333', fragments: 6543 }
        ],
        command_usage: [
          { command: 'ai', uses: 2340 },
          { command: 'music', uses: 1890 },
          { command: 'gaming', uses: 1456 },
          { command: 'economy', uses: 1234 },
          { command: 'info', uses: 987 }
        ]
      }

      this.setCache(cacheKey, mockData, 30000) // Cache for 30 seconds
      return mockData
    } catch (error) {
      console.error('Error processing user stats:', error)
      return {
        total_users: 0,
        active_users: 0,
        top_fragment_holders: [],
        command_usage: []
      }
    }
  }

  // Process economy data
  async processEconomyData(): Promise<{
    total_fragments: number
    circulating_supply: number
    daily_transactions: number
    transaction_volume: number
    top_traders: Array<{ user: string, volume: number }>
  }> {
    const cacheKey = 'economy_data'
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Mock economy processing - integrate with actual database
      const mockData = {
        total_fragments: 1000000,
        circulating_supply: 456789,
        daily_transactions: 1245,
        transaction_volume: 89456,
        top_traders: [
          { user: 'ActiveTrader#1111', volume: 25000 },
          { user: 'Merchant#2222', volume: 18000 },
          { user: 'Investor#3333', volume: 15000 },
          { user: 'Collector#4444', volume: 12000 },
          { user: 'Spender#5555', volume: 10000 }
        ]
      }

      this.setCache(cacheKey, mockData, 60000) // Cache for 60 seconds
      return mockData
    } catch (error) {
      console.error('Error processing economy data:', error)
      return {
        total_fragments: 0,
        circulating_supply: 0,
        daily_transactions: 0,
        transaction_volume: 0,
        top_traders: []
      }
    }
  }

  // Process gaming statistics
  async processGamingData(): Promise<{
    active_players: number
    games_played_today: number
    tournament_data: Array<{ name: string, players: number, prize_pool: number }>
    achievement_stats: { total_unlocked: number, rare_count: number }
  }> {
    const cacheKey = 'gaming_data'
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const mockData = {
        active_players: 145,
        games_played_today: 234,
        tournament_data: [
          { name: 'Space Race Championship', players: 45, prize_pool: 15000 },
          { name: 'Ball Bouncer League', players: 32, prize_pool: 10000 },
          { name: 'Cube Dash Tournament', players: 28, prize_pool: 8000 }
        ],
        achievement_stats: {
          total_unlocked: 1567,
          rare_count: 89
        }
      }

      this.setCache(cacheKey, mockData, 45000) // Cache for 45 seconds
      return mockData
    } catch (error) {
      console.error('Error processing gaming data:', error)
      return {
        active_players: 0,
        games_played_today: 0,
        tournament_data: [],
        achievement_stats: { total_unlocked: 0, rare_count: 0 }
      }
    }
  }

  // Cache management
  private getFromCache(key: string): any {
    const expiry = this.cacheExpiry.get(key)
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key)
      this.cacheExpiry.delete(key)
      return null
    }
    return this.cache.get(key)
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, data)
    this.cacheExpiry.set(key, Date.now() + ttl)
  }
}

// Discord API data processing
export class DiscordDataProcessor {
  private static readonly API_BASE = 'https://discord.com/api/v10'

  // Process bot application data
  static async processBotApplication(botToken?: string): Promise<ProcessedBotData | null> {
    if (!botToken) {
      console.warn('No bot token provided for Discord API')
      return null
    }

    try {
      const response = await fetch(`${this.API_BASE}/applications/@me`, {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`)
      }

      const data: DiscordAPIData['application'] = await response.json()
      
      return {
        status: 'online',
        username: data.name,
        guilds: 0, // Will be filled by guild data
        users: 0, // Will be calculated from guild members
        commands_executed: 0, // From database
        latency: 0, // From WebSocket
        uptime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours default
        memory_usage: 256,
        cpu_usage: 15
      }
    } catch (error) {
      console.error('Error processing Discord application data:', error)
      return null
    }
  }

  // Process guild statistics
  static async processGuildStats(botToken?: string): Promise<{
    guild_count: number
    total_members: number
    active_guilds: number
  }> {
    if (!botToken) {
      return { guild_count: 0, total_members: 0, active_guilds: 0 }
    }

    try {
      const response = await fetch(`${this.API_BASE}/users/@me/guilds`, {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`)
      }

      const guilds: DiscordAPIData['guilds'] = await response.json()
      
      const totalMembers = guilds.reduce((sum, guild) => sum + guild.member_count, 0)
      
      return {
        guild_count: guilds.length,
        total_members: totalMembers,
        active_guilds: guilds.filter(g => g.member_count > 10).length
      }
    } catch (error) {
      console.error('Error processing guild statistics:', error)
      return { guild_count: 0, total_members: 0, active_guilds: 0 }
    }
  }
}

// System performance monitoring
export class SystemMonitor {
  private static performanceHistory: Array<{
    timestamp: number
    cpu: number
    memory: number
    gpu: number
  }> = []

  // Process system performance data
  static processPerformanceData(data: {
    cpu_usage?: number
    memory_usage?: number
    gpu_usage?: number
    gpu_temperature?: number
    gpu_memory?: number
  }) {
    const timestamp = Date.now()
    
    // Add to history
    this.performanceHistory.push({
      timestamp,
      cpu: data.cpu_usage || 0,
      memory: data.memory_usage || 0,
      gpu: data.gpu_usage || 0
    })

    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift()
    }

    return {
      current: {
        cpu: data.cpu_usage || 0,
        memory: data.memory_usage || 0,
        gpu: data.gpu_usage || 0,
        gpu_temp: data.gpu_temperature || 0,
        gpu_memory: data.gpu_memory || 0
      },
      history: this.performanceHistory,
      averages: {
        cpu: this.calculateAverage('cpu'),
        memory: this.calculateAverage('memory'),
        gpu: this.calculateAverage('gpu')
      }
    }
  }

  private static calculateAverage(metric: 'cpu' | 'memory' | 'gpu'): number {
    if (this.performanceHistory.length === 0) return 0
    
    const sum = this.performanceHistory.reduce((acc, entry) => acc + entry[metric], 0)
    return Math.round(sum / this.performanceHistory.length * 100) / 100
  }

  // RTX 5070 Ti specific monitoring
  static processRTXData(data: {
    usage?: number
    temperature?: number
    memory_used?: number
    power_draw?: number
    fan_speed?: number
  }) {
    return {
      model: 'RTX 5070 Ti',
      usage: data.usage || 15,
      temperature: data.temperature || 45,
      memory_used: data.memory_used || 2.1,
      memory_total: 16, // 16GB VRAM
      power_draw: data.power_draw || 85,
      fan_speed: data.fan_speed || 1200,
      cuda_cores: 8448,
      rt_cores: 76,
      tensor_cores: 304,
      base_clock: 2475,
      boost_clock: 2625
    }
  }
}

// AI system monitoring
export class AIMonitor {
  private static conversationHistory: Array<{
    timestamp: number
    response_time: number
    tokens_generated: number
    model_used: string
  }> = []

  // Process AI analytics
  static processAIData(data: {
    response_time?: number
    tokens_generated?: number
    memory_usage?: number
    requests_processed?: number
    model_name?: string
  }) {
    const timestamp = Date.now()
    
    if (data.response_time && data.tokens_generated) {
      this.conversationHistory.push({
        timestamp,
        response_time: data.response_time,
        tokens_generated: data.tokens_generated,
        model_used: data.model_name || 'gpt-oss:20b'
      })

      // Keep only last 1000 entries
      if (this.conversationHistory.length > 1000) {
        this.conversationHistory.shift()
      }
    }

    return {
      current: {
        response_time: data.response_time || 2.3,
        tokens_generated: data.tokens_generated || 150,
        memory_usage: data.memory_usage || 12.4,
        requests_processed: data.requests_processed || 45672
      },
      model: {
        name: 'gpt-oss:20b',
        parameters: '20 Billion',
        context_length: 4096,
        architecture: 'Transformer'
      },
      history: this.conversationHistory,
      statistics: {
        avg_response_time: this.calculateAverageResponseTime(),
        total_tokens: this.calculateTotalTokens(),
        conversations_today: this.getConversationsToday()
      }
    }
  }

  // ChromaDB vector database monitoring
  static processChromaDBData(data: {
    collections?: number
    documents?: number
    embeddings?: number
    query_latency?: number
    memory_used?: number
  }) {
    return {
      status: 'healthy',
      collections: data.collections || 8,
      documents: data.documents || 25847,
      embeddings: data.embeddings || 186432,
      vector_dimensions: 1536,
      query_latency: data.query_latency || 45,
      memory_used: data.memory_used || 2.8,
      index_type: 'HNSW',
      distance_metric: 'cosine'
    }
  }

  private static calculateAverageResponseTime(): number {
    if (this.conversationHistory.length === 0) return 0
    const sum = this.conversationHistory.reduce((acc, entry) => acc + entry.response_time, 0)
    return Math.round(sum / this.conversationHistory.length * 100) / 100
  }

  private static calculateTotalTokens(): number {
    return this.conversationHistory.reduce((acc, entry) => acc + entry.tokens_generated, 0)
  }

  private static getConversationsToday(): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return this.conversationHistory.filter(entry => entry.timestamp >= today.getTime()).length
  }
}

// Utility functions for data formatting
export const formatters = {
  // Format numbers with appropriate suffixes
  formatNumber: (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toString()
  },

  // Format bytes to human readable
  formatBytes: (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  },

  // Format duration to human readable
  formatDuration: (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  },

  // Format percentage with color coding
  formatPercentage: (value: number): { text: string, color: string } => {
    const text = `${value.toFixed(1)}%`
    let color = 'text-green-400'
    
    if (value > 80) color = 'text-red-400'
    else if (value > 60) color = 'text-yellow-400'
    
    return { text, color }
  },

  // Format currency (fragments)
  formatFragments: (amount: number): string => {
    return `⚡ ${amount.toLocaleString()}`
  }
}

// Export main processor instance
export const dataProcessor = DatabaseProcessor.getInstance()