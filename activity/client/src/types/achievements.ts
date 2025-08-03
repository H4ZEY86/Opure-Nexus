/**
 * ACHIEVEMENT SYSTEM TYPE DEFINITIONS
 * Comprehensive TypeScript types for the viral gamification system
 */

// Core Achievement Types
export interface Achievement {
  id: string
  name: string
  description: string
  long_description?: string
  category: string
  tier: AchievementTier
  rarity: AchievementRarity
  requirements: AchievementRequirement[]
  rewards: AchievementReward
  parent_id?: string
  dependencies?: string[]
  is_secret: boolean
  is_repeatable: boolean
  reset_period?: 'daily' | 'weekly' | 'monthly'
  time_limit?: number // Hours
  quality_threshold: number
  social_features: AchievementSocialFeatures
  ai_personalized: boolean
  created_at: string
  available_from?: string
  available_until?: string
  is_active: boolean
  is_limited_time: boolean
}

export interface AchievementRequirement {
  key: string // What to track (e.g., 'games_played', 'tokens_earned')
  target: number // Target value
  operator: '>=' | '>' | '<=' | '<' | '==' // Comparison operator
  context?: Record<string, any> // Additional context
  weight: number // Weight for completion calculation
}

export interface AchievementReward {
  tokens: number
  items?: string[]
  unlocks?: string[] // Features, content, etc.
  multiplier: number
  special_effects?: string[]
}

export interface AchievementSocialFeatures {
  shareable: boolean
  leaderboard_eligible: boolean
  share_template?: string
}

export type AchievementTier = 'basic' | 'advanced' | 'expert' | 'master' | 'legendary'
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

// User Progress Types
export interface UserAchievementProgress {
  user_id: string
  achievement_id: string
  progress_data: Record<string, any>
  current_values: Record<string, number>
  target_values: Record<string, number>
  completion_percentage: number
  status: AchievementStatus
  quality_score: number
  unlocked_at?: string
  times_completed: number
  first_attempt_at: string
  last_updated: string
  unlock_context?: Record<string, any>
  validation_status: 'pending' | 'validated' | 'disputed'
  shared_count: number
  celebration_viewed: boolean
}

export type AchievementStatus = 'locked' | 'active' | 'completed' | 'failed'

// Category Types
export interface AchievementCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  sort_order: number
  unlock_requirements?: Record<string, any>
  rewards?: Record<string, any>
  is_active: boolean
}

// Leaderboard Types
export interface AchievementLeaderboardEntry {
  user_id: string
  username: string
  total_achievements: number
  legendary_count: number
  mythic_count: number
  achievement_tokens: number
  trust_score: number
  rank: number
}

// Social Types
export interface AchievementShare {
  share_id: string
  user_id: string
  achievement_id: string
  platform: 'discord' | 'twitter' | 'facebook' | 'reddit'
  share_text: string
  media_url?: string
  views: number
  likes: number
  comments: number
  click_throughs: number
  referrals_generated: number
  viral_coefficient: number
  created_at: string
}

// Mentorship Types
export interface Mentorship {
  mentorship_id: string
  mentor_id: string
  mentee_id: string
  focus_areas: string[]
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  sessions_completed: number
  achievements_guided: number
  bounties_collaborated: number
  mentor_token_rewards: number
  mentee_progress_bonus: number
  started_at: string
  ended_at?: string
}

// Achievement Racing Types
export interface AchievementRace {
  race_id: string
  achievement_id: string
  name: string
  description: string
  max_participants: number
  entry_fee: number
  starts_at: string
  ends_at: string
  winner_rewards: Record<string, any>
  participation_rewards: Record<string, any>
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  current_participants: number
  created_at: string
}

export interface RaceParticipant {
  race_id: string
  user_id: string
  joined_at: string
  completed_at?: string
  final_rank?: number
  completion_time?: number // Seconds
  quality_score: number
  status: 'active' | 'completed' | 'disqualified'
}

// AI Recommendation Types
export interface AIAchievementRecommendation {
  recommendation_id: string
  user_id: string
  recommended_achievements: Array<{
    achievement_id: string
    score: number
    reasoning: string
  }>
  reasoning: string
  confidence_score: number
  user_behavior_analysis: Record<string, any>
  skill_level_assessment: Record<string, any>
  interest_mapping: Record<string, any>
  status: 'active' | 'accepted' | 'dismissed' | 'expired'
  viewed_at?: string
  acted_upon_at?: string
  conversion_rate: number
  engagement_score: number
  created_at: string
  expires_at: string
}

// Difficulty Adjustment Types
export interface DifficultyAdjustment {
  adjustment_id: string
  user_id: string
  target_type: 'achievement' | 'bounty'
  target_id: string
  original_difficulty: number
  adjusted_difficulty: number
  adjustment_reason: string
  user_skill_level: number
  historical_performance: Record<string, any>
  completion_rate: number
  ai_confidence: number
  model_version: string
  created_at: string
  applied_at?: string
}

// Quality Assessment Types
export interface QualityMetrics {
  consistency: number // 0-1, how consistent performance is
  improvement: number // 0-1, rate of skill improvement  
  engagement: number // 0-1, how engaged the player is
  authenticity: number // 0-1, likelihood of being a real human player
  social_contribution: number // 0-1, positive impact on community
}

// Fraud Detection Types
export interface SuspiciousActivity {
  activity_id: string
  user_id: string
  activity_type: 'rapid_completion' | 'impossible_score' | 'pattern_anomaly'
  target_type: 'achievement' | 'bounty'
  target_id: string
  detection_method: 'ai' | 'rule_based' | 'user_report'
  confidence_score: number
  evidence_data: Record<string, any>
  status: 'pending' | 'investigating' | 'resolved' | 'false_positive'
  investigated_by?: string
  resolution?: string
  penalties_applied: Record<string, any>
  rewards_revoked: boolean
  created_at: string
  resolved_at?: string
}

export interface UserReputation {
  user_id: string
  trust_score: number // 0.0 to 1.0
  achievement_quality_score: number
  bounty_completion_rate: number
  peer_validation_accuracy: number
  completion_consistency: number
  social_contribution: number
  mentorship_effectiveness: number
  report_accuracy: number
  fraud_incidents: number
  false_reports: number
  quality_achievements: number
  community_contributions: number
  last_calculated: string
  calculation_version: number
}

// UI State Types
export interface AchievementFilters {
  category?: string[]
  rarity?: AchievementRarity[]
  tier?: AchievementTier[]
  status?: AchievementStatus[]
  time_period?: 'day' | 'week' | 'month' | 'year' | 'all'
  search_query?: string
  sort_by?: 'newest' | 'oldest' | 'progress' | 'tokens' | 'rarity'
  sort_order?: 'asc' | 'desc'
  show_completed?: boolean
  show_locked?: boolean
  show_secret?: boolean
}

export interface AchievementUIState {
  selectedCategory: string | null
  selectedAchievement: Achievement | null
  showFilters: boolean
  viewMode: 'grid' | 'list'
  currentTab: 'overview' | 'progress' | 'leaderboard' | 'social'
  loading: boolean
  error: string | null
  filters: AchievementFilters
}

// API Response Types
export interface AchievementResponse<T> {
  success: boolean
  data: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface AchievementDashboardData {
  user_id: string
  total_achievements: number
  completed_count: number
  active_count: number
  completion_percentage: number
  category_stats: Record<string, {
    total: number
    completed: number
    percentage: number
  }>
  rarity_distribution: Record<string, number>
  recent_unlocks: Array<{
    achievement_id: string
    name: string
    unlocked_at: string
    quality_score: number
  }>
  recommendations: AIAchievementRecommendation[]
  quality_average: number
}

// Event Types
export interface AchievementEvent {
  type: AchievementEventType
  data: any
  timestamp: string
  user_id?: string
}

export type AchievementEventType = 
  | 'achievement_unlocked'
  | 'progress_updated'
  | 'achievement_shared'
  | 'race_started'
  | 'race_completed'
  | 'mentorship_started'
  | 'recommendation_generated'

// Context Types
export interface AchievementContextValue {
  // State
  achievements: Achievement[]
  userProgress: UserAchievementProgress[]
  categories: AchievementCategory[]
  leaderboard: AchievementLeaderboardEntry[]
  recommendations: AIAchievementRecommendation[]
  filters: AchievementFilters
  loading: boolean
  error: string | null
  
  // Actions
  fetchUserAchievements: (userId: string) => Promise<void>
  fetchLeaderboard: (category?: string) => Promise<void>
  fetchRecommendations: (userId: string) => Promise<void>
  updateProgress: (achievementId: string, progressData: Record<string, any>) => Promise<void>
  shareAchievement: (achievementId: string, platform: string) => Promise<void>
  setFilters: (filters: AchievementFilters) => void
  clearError: () => void
  
  // Real-time
  subscribe: (eventType: AchievementEventType, callback: (data: any) => void) => () => void
}

// Mobile-specific Types
export interface MobileAchievementState {
  isBottomSheetVisible: boolean
  currentBottomSheet: 'filters' | 'achievement_details' | 'leaderboard' | null
  swipeableIndex: number
  quickActionsVisible: boolean
  touchGestures: {
    swipeEnabled: boolean
    pullToRefresh: boolean
    longPressEnabled: boolean
  }
}

// Notification Types
export interface AchievementNotification {
  id: string
  type: 'unlock' | 'progress' | 'recommendation' | 'social'
  title: string
  message: string
  achievement?: Achievement
  progress?: UserAchievementProgress
  action?: {
    label: string
    callback: () => void
  }
  duration?: number
  persistent?: boolean
  icon?: string
  sound?: string
}

// Analytics Types
export interface AchievementAnalytics {
  user_stats: {
    total_unlocked: number
    completion_rate: number
    average_quality: number
    tokens_earned: number
    social_shares: number
    time_to_complete: Record<string, number>
  }
  engagement_metrics: {
    daily_active_users: number
    retention_rate: number
    virality_coefficient: number
    social_amplification: number
  }
  system_health: {
    fraud_detection_rate: number
    false_positive_rate: number
    user_satisfaction: number
    support_tickets: number
  }
}