/**
 * BOUNTY SYSTEM TYPE DEFINITIONS
 * Comprehensive TypeScript types for the dynamic bounty platform
 */

// Core Bounty Types
export interface Bounty {
  bounty_id: string
  title: string
  description: string
  category_id: string
  creator_id?: string
  creator_type: 'user' | 'system' | 'ai' | 'admin'
  
  // Configuration
  bounty_type: BountyType
  difficulty_level: number // 1-10 scale
  estimated_time: number // Minutes
  max_participants?: number
  
  // Objectives and requirements
  objectives: BountyObjective[]
  requirements: BountyRequirement[]
  completion_criteria: Record<string, any>
  validation_method: ValidationMethod
  
  // Rewards
  token_pool: number
  reward_distribution: RewardDistribution
  individual_rewards: BountyReward
  bonus_multipliers: Record<string, number>
  item_rewards: string[]
  
  // Timing
  starts_at: string
  ends_at?: string
  duration_hours?: number
  auto_extend: boolean
  
  // Status
  status: BountyStatus
  current_participants: number
  completion_count: number
  
  // Social features
  is_featured: boolean
  is_trending: boolean
  view_count: number
  like_count: number
  share_count: number
  
  // AI features
  ai_generated: boolean
  ai_difficulty_adjusted: boolean
  personalization_data: Record<string, any>
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface BountyObjective {
  objective_id: string
  title: string
  description: string
  type: string // 'complete_games', 'earn_tokens', 'social_interaction', etc.
  target_value: number
  current_value?: number
  weight: number
  is_optional: boolean
  validation_criteria: Record<string, any>
}

export interface BountyRequirement {
  req_type: string // 'min_level', 'min_tokens', 'achievement_required', etc.
  value: any
  description: string
}

export interface BountyReward {
  token_amount: number
  item_rewards: string[]
  achievement_rewards: string[]
  unlock_rewards: string[]
  special_effects: string[]
  multipliers: Record<string, number>
}

export type BountyType = 
  | 'daily' 
  | 'weekly' 
  | 'community' 
  | 'skill' 
  | 'collaborative' 
  | 'event' 
  | 'seasonal'
  | 'competitive'

export type BountyStatus = 
  | 'draft' 
  | 'active' 
  | 'completed' 
  | 'cancelled' 
  | 'expired'
  | 'paused'

export type ValidationMethod = 
  | 'automatic' 
  | 'peer' 
  | 'admin' 
  | 'ai' 
  | 'hybrid'

export type RewardDistribution = 
  | 'winner_takes_all' 
  | 'proportional' 
  | 'fixed'
  | 'tiered'

// User Participation Types
export interface BountyParticipation {
  participation_id: string
  user_id: string
  bounty_id: string
  
  // Progress tracking
  joined_at: string
  status: ParticipationStatus
  progress_data: Record<string, any>
  completion_percentage: number
  
  // Submission
  submitted_at?: string
  validated_at?: string
  submission_data: Record<string, any>
  evidence_urls: string[]
  
  // Results
  final_score: number
  quality_rating: number
  time_taken?: number // Minutes
  tokens_earned: number
  placement?: number
  
  // Social features
  teammates: string[]
  mentor_id?: string
  peer_validations: number
}

export type ParticipationStatus = 
  | 'active' 
  | 'completed' 
  | 'failed' 
  | 'abandoned'
  | 'submitted'
  | 'pending_review'

// Bounty Categories
export interface BountyCategory {
  category_id: string
  name: string
  description: string
  icon: string
  color_hex: string
  admin_only: boolean
  min_user_level: number
  creation_cost: number
  is_active: boolean
  created_at: string
}

// Validation and Review Types
export interface BountyValidation {
  validation_id: string
  participation_id: string
  validator_id?: string
  validator_type: 'user' | 'admin' | 'ai' | 'system'
  status: 'pending' | 'approved' | 'rejected' | 'disputed'
  score: number
  feedback: string
  validation_data: Record<string, any>
  confidence_score: number
  disputes_count: number
  created_at: string
  resolved_at?: string
}

// Guild/Community Bounties
export interface GuildBounty {
  bounty_id: string
  guild_id: string
  title: string
  description: string
  min_participants: number
  max_participants?: number
  coordination_required: boolean
  guild_token_pool: number
  individual_rewards: Record<string, any>
  guild_rewards: Record<string, any>
  current_participants: number
  completion_percentage: number
  status: BountyStatus
  starts_at: string
  ends_at?: string
  created_at: string
}

// AI Integration Types
export interface AIBountyRecommendation {
  recommendation_id: string
  user_id: string
  recommended_bounties: Array<{
    bounty_id: string
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

export interface BountyDifficultyAdjustment {
  adjustment_id: string
  user_id: string
  bounty_id: string
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

// Leaderboard Types
export interface BountyLeaderboardEntry {
  rank: number
  user_id: string
  username: string
  completion_percentage: number
  quality_rating: number
  status: ParticipationStatus
  tokens_earned: number
  time_taken?: number
}

export interface GlobalBountyLeaderboard {
  user_id: string
  username: string
  total_bounties_joined: number
  bounties_completed: number
  total_tokens_earned: number
  average_quality_score: number
  completion_rate: number
  rank: number
}

// Social and Viral Features
export interface BountyShare {
  share_id: string
  user_id: string
  bounty_id: string
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

export interface BountyMentorship {
  mentorship_id: string
  mentor_id: string
  mentee_id: string
  bounty_id: string
  focus_areas: string[]
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  sessions_completed: number
  guidance_provided: string[]
  mentor_token_rewards: number
  mentee_progress_bonus: number
  started_at: string
  ended_at?: string
}

// Seasonal Events
export interface SeasonalEvent {
  event_id: string
  name: string
  description: string
  theme: string // 'halloween', 'christmas', 'summer', etc.
  starts_at: string
  ends_at: string
  special_bounties: string[]
  exclusive_rewards: string[]
  point_multiplier: number
  special_currency?: string
  leaderboard_enabled: boolean
  is_active: boolean
  participant_count: number
  created_at: string
}

export interface UserEventProgress {
  user_id: string
  event_id: string
  points: number
  bounties_completed: number
  special_currency: number
  joined_at: string
  last_activity: string
  final_rank?: number
}

// Filtering and Search Types
export interface BountyFilters {
  category?: string[]
  bounty_type?: BountyType[]
  difficulty_min?: number
  difficulty_max?: number
  tokens_min?: number
  tokens_max?: number
  status?: BountyStatus[]
  creator_type?: string[]
  ending_soon?: boolean
  featured_only?: boolean
  trending_only?: boolean
  search_query?: string
  sort_by?: BountySortOption
  sort_order?: 'asc' | 'desc'
}

export type BountySortOption = 
  | 'newest' 
  | 'ending_soon' 
  | 'popular' 
  | 'tokens'
  | 'difficulty'
  | 'participants'

// UI State Types
export interface BountyUIState {
  currentView: BountyView
  selectedBounty: Bounty | null
  selectedCategory: string | null
  showFilters: boolean
  filters: BountyFilters
  loading: boolean
  error: string | null
  lastUpdate: string
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
}

export type BountyView = 
  | 'browse' 
  | 'my_bounties' 
  | 'create' 
  | 'trending'
  | 'stats'
  | 'leaderboard'

// API Response Types
export interface BountyResponse<T> {
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

export interface BountiesResponse extends BountyResponse<Bounty[]> {
  filters_applied: BountyFilters
  total_results: number
}

// Statistics Types
export interface UserBountyStats {
  user_id: string
  total_bounties_joined: number
  bounties_completed: number
  active_bounties: number
  completion_rate: number
  total_tokens_earned: number
  average_completion_time: number
  average_quality_score: number
  recent_activity: Array<{
    bounty_id: string
    status: ParticipationStatus
    completion_percentage: number
    joined_at: string
  }>
}

export interface BountySystemStats {
  total_bounties: number
  active_bounties: number
  total_participants: number
  completion_rate: number
  average_tokens_per_bounty: number
  popular_categories: Array<{
    category_id: string
    bounty_count: number
    participation_rate: number
  }>
  trending_bounties: Bounty[]
  recent_completions: Array<{
    bounty_id: string
    user_id: string
    completed_at: string
    tokens_earned: number
  }>
}

// Event Types
export interface BountyEvent {
  type: BountyEventType
  data: any
  timestamp: string
  user_id?: string
}

export type BountyEventType = 
  | 'bounty_created'
  | 'bounty_joined'
  | 'bounty_completed'
  | 'bounty_submitted'
  | 'bounty_validated'
  | 'progress_updated'
  | 'bounty_shared'
  | 'mentorship_started'

// WebSocket Types
export interface BountyWebSocketEvent {
  type: BountyEventType
  data: any
  timestamp: string
  user_id?: string
}

// Context Types
export interface BountyContextValue {
  // State
  bounties: Bounty[]
  userParticipations: BountyParticipation[]
  trending: Bounty[]
  categories: BountyCategory[]
  filters: BountyFilters
  loading: boolean
  error: string | null
  
  // Actions
  fetchBounties: (filters?: BountyFilters) => Promise<void>
  fetchUserParticipations: (userId: string) => Promise<void>
  fetchTrending: () => Promise<void>
  createBounty: (bountyData: any) => Promise<string>
  joinBounty: (bountyId: string) => Promise<string>
  submitBounty: (bountyId: string, submissionData: any) => Promise<void>
  updateProgress: (bountyId: string, progressData: Record<string, any>) => Promise<void>
  setFilters: (filters: BountyFilters) => void
  clearError: () => void
  
  // Real-time
  subscribe: (eventType: BountyEventType, callback: (data: any) => void) => () => void
}

// Mobile-specific Types
export interface MobileBountyState {
  isBottomSheetVisible: boolean
  currentBottomSheet: 'filters' | 'bounty_details' | 'create' | 'leaderboard' | null
  swipeableIndex: number
  quickActionsVisible: boolean
  touchGestures: {
    swipeEnabled: boolean
    pullToRefresh: boolean
    longPressEnabled: boolean
  }
}

// Notification Types
export interface BountyNotification {
  id: string
  type: 'joined' | 'completed' | 'reminder' | 'social' | 'validation'
  title: string
  message: string
  bounty?: Bounty
  participation?: BountyParticipation
  action?: {
    label: string
    callback: () => void
  }
  duration?: number
  persistent?: boolean
  icon?: string
  sound?: string
}

// Quality Assessment Types
export interface BountyQualityMetrics {
  originality: number // 0-1
  effort_level: number // 0-1
  completion_quality: number // 0-1
  time_efficiency: number // 0-1
  social_contribution: number // 0-1
  overall_score: number // 0-1
}

// Fraud Prevention Types
export interface BountySuspiciousActivity {
  activity_id: string
  user_id: string
  bounty_id: string
  activity_type: 'rapid_completion' | 'impossible_submission' | 'collusion' | 'fake_evidence'
  detection_method: 'ai' | 'rule_based' | 'user_report' | 'peer_review'
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

// Analytics Types
export interface BountyAnalytics {
  engagement_metrics: {
    daily_active_participants: number
    retention_rate: number
    completion_rate: number
    average_session_time: number
  }
  quality_metrics: {
    average_submission_quality: number
    fraud_detection_rate: number
    peer_validation_accuracy: number
    ai_validation_accuracy: number
  }
  economic_metrics: {
    total_tokens_distributed: number
    average_reward_per_completion: number
    roi_per_bounty: number
    user_lifetime_value: number
  }
  viral_metrics: {
    share_rate: number
    referral_rate: number
    viral_coefficient: number
    social_amplification_factor: number
  }
}