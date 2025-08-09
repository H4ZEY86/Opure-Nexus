// Bot Data Types
export interface BotData {
  id: string
  username: string
  discriminator: string
  avatar: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  uptime: number
  guilds: number
  users: number
  channels: number
  commands_executed: number
  memory_usage: number
  cpu_usage: number
  version: string
  last_restart: string
}

// Server Statistics
export interface ServerStats {
  guild_id: string
  name: string
  member_count: number
  online_members: number
  channels: number
  roles: number
  boost_level: number
  boost_count: number
}

// Music Data
export interface MusicData {
  is_playing: boolean
  current_track?: {
    title: string
    artist: string
    duration: number
    position: number
    thumbnail: string
    url: string
  }
  queue_length: number
  volume: number
  loop_mode: 'off' | 'track' | 'queue'
  connected_channel?: string
  listeners: number
}

// AI System Data
export interface AIData {
  model: string
  requests_today: number
  average_response_time: number
  memory_entries: number
  personality_mode: string
  temperature: number
  success_rate: number
}

// Gaming Data
export interface GamingData {
  activity_status: 'online' | 'offline' | 'maintenance'
  active_players: number
  total_games_played: number
  daily_games: number
  popular_games: Array<{
    name: string
    players: number
    sessions: number
  }>
}

// Economy Data
export interface EconomyData {
  total_fragments: number
  daily_transactions: number
  active_traders: number
  shop_items: number
  average_balance: number
}

// Real-time Updates
export interface RealTimeData {
  timestamp: number
  bot: Partial<BotData>
  music: Partial<MusicData>
  ai: Partial<AIData>
  gaming: Partial<GamingData>
  economy: Partial<EconomyData>
  performance: PerformanceData
}

// Performance Monitoring
export interface PerformanceData {
  cpu_usage: number
  memory_usage: number
  gpu_usage: number
  gpu_memory: number
  fps: number
  response_time: number
  active_connections: number
}

// 3D Scene Data
export interface Scene3DNode {
  id: string
  type: 'bot' | 'guild' | 'user' | 'music' | 'ai' | 'gaming'
  position: [number, number, number]
  scale: number
  color: string
  connections: string[]
  data: any
  activity_level: number
}

// WebSocket Events
export interface WebSocketEvent {
  type: 'bot_update' | 'music_update' | 'ai_update' | 'gaming_update' | 'economy_update' | 'performance_update'
  data: any
  timestamp: number
}

// Dashboard Settings
export interface DashboardSettings {
  theme: 'dark' | 'light' | 'auto'
  show_fps: boolean
  enable_3d: boolean
  auto_refresh: boolean
  refresh_interval: number
  show_debug: boolean
  performance_mode: 'high' | 'balanced' | 'performance'
}