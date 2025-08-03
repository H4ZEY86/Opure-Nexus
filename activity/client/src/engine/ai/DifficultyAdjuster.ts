/**
 * AI-DRIVEN DYNAMIC DIFFICULTY ADJUSTMENT SYSTEM
 * Advanced difficulty scaling based on player performance and behavior patterns
 * Features: Real-time adaptation, performance prediction, engagement optimization
 */

import { GameState } from '../GameEngine'

export interface DifficultyConfig {
  targetSuccessRate: number // Ideal success rate (0.6-0.8)
  targetEngagementTime: number // Target session length in minutes
  adaptationRate: number // How quickly to adjust (0.1-0.5)
  minDifficulty: number // Minimum difficulty (0.1-1.0)
  maxDifficulty: number // Maximum difficulty (2.0-10.0)
  smoothingFactor: number // Smoothing for changes (0.1-0.9)
  emergencyAdjustment: boolean // Enable emergency difficulty changes
  personalizedAdjustment: boolean // Use player-specific patterns
}

export interface PlayerMetrics {
  userId: string
  sessionId: string
  
  // Performance metrics
  averageScore: number
  completionRate: number
  averageTime: number
  mistakeRate: number
  quitRate: number
  
  // Engagement metrics
  totalPlayTime: number
  sessionCount: number
  lastPlayed: number
  streakDays: number
  
  // Skill indicators
  learningCurve: number[] // Score progression over time
  consistencyRating: number // Variance in performance
  improvementRate: number // Rate of skill development
  plateauDetection: boolean // Whether player has plateaued
  
  // Behavioral patterns
  preferredDifficulty: number
  preferredGameModes: string[]
  playTimePatterns: number[] // Hour of day preferences
  frustrationTolerance: number
  challengeSeekingBehavior: number
  
  // Current session data
  currentStreak: number
  currentMistakes: number
  currentScore: number
  sessionStartTime: number
  lastActionTime: number
  
  // Emotional state indicators
  estimatedFrustration: number // 0-1 scale
  estimatedEngagement: number // 0-1 scale
  estimatedConfidence: number // 0-1 scale
}

export interface DifficultyAdjustment {
  previousDifficulty: number
  newDifficulty: number
  adjustment: number
  reason: string
  confidence: number
  timestamp: number
  metrics: {
    successRate: number
    avgTime: number
    engagementScore: number
    frustrationLevel: number
  }
}

export class DifficultyAdjuster {
  private config: DifficultyConfig
  private playerMetrics: Map<string, PlayerMetrics> = new Map()
  private adjustmentHistory: Map<string, DifficultyAdjustment[]> = new Map()
  
  // ML-like components (simplified implementations)
  private performancePredictor = new PerformancePredictor()
  private engagementAnalyzer = new EngagementAnalyzer()
  private skillAssessment = new SkillAssessment()
  
  // Difficulty curves for different player types
  private difficultyCurves = new Map([
    ['beginner', { base: 0.3, growth: 0.05, max: 2.0 }],
    ['casual', { base: 0.5, growth: 0.08, max: 3.0 }],
    ['regular', { base: 0.8, growth: 0.12, max: 5.0 }],
    ['hardcore', { base: 1.2, growth: 0.18, max: 8.0 }],
    ['expert', { base: 2.0, growth: 0.15, max: 10.0 }]
  ])

  constructor(config?: Partial<DifficultyConfig>) {
    this.config = {
      targetSuccessRate: 0.7,
      targetEngagementTime: 5, // 5 minutes
      adaptationRate: 0.3,
      minDifficulty: 0.2,
      maxDifficulty: 8.0,
      smoothingFactor: 0.7,
      emergencyAdjustment: true,
      personalizedAdjustment: true,
      ...config
    }
  }

  public update(gameState: GameState): number {
    const userId = gameState.userId
    let metrics = this.playerMetrics.get(userId)
    
    if (!metrics) {
      metrics = this.initializePlayerMetrics(userId, gameState.sessionId)
      this.playerMetrics.set(userId, metrics)
    }
    
    // Update current session metrics
    this.updateSessionMetrics(metrics, gameState)
    
    // Calculate new difficulty
    const adjustment = this.calculateDifficultyAdjustment(metrics, gameState)
    
    // Apply adjustment with smoothing
    const newDifficulty = this.applyAdjustment(gameState.difficulty, adjustment, metrics)
    
    // Store adjustment history
    this.recordAdjustment(userId, gameState.difficulty, newDifficulty, adjustment)
    
    return newDifficulty
  }

  private initializePlayerMetrics(userId: string, sessionId: string): PlayerMetrics {
    return {
      userId,
      sessionId,
      
      // Performance metrics
      averageScore: 0,
      completionRate: 0,
      averageTime: 0,
      mistakeRate: 0,
      quitRate: 0,
      
      // Engagement metrics
      totalPlayTime: 0,
      sessionCount: 0,
      lastPlayed: Date.now(),
      streakDays: 0,
      
      // Skill indicators
      learningCurve: [],
      consistencyRating: 0,
      improvementRate: 0,
      plateauDetection: false,
      
      // Behavioral patterns
      preferredDifficulty: 1.0,
      preferredGameModes: [],
      playTimePatterns: new Array(24).fill(0),
      frustrationTolerance: 0.5,
      challengeSeekingBehavior: 0.5,
      
      // Current session data
      currentStreak: 0,
      currentMistakes: 0,
      currentScore: gameState.score || 0,
      sessionStartTime: Date.now(),
      lastActionTime: Date.now(),
      
      // Emotional state indicators
      estimatedFrustration: 0,
      estimatedEngagement: 0.5,
      estimatedConfidence: 0.5
    }
  }

  private updateSessionMetrics(metrics: PlayerMetrics, gameState: GameState): void {
    const currentTime = Date.now()
    const sessionTime = currentTime - metrics.sessionStartTime
    
    // Update current session data
    metrics.currentScore = gameState.score || 0
    metrics.lastActionTime = currentTime
    
    // Update learning curve
    if (sessionTime > 30000) { // After 30 seconds
      metrics.learningCurve.push(gameState.score || 0)
      if (metrics.learningCurve.length > 20) {
        metrics.learningCurve.shift() // Keep only recent data
      }
    }
    
    // Calculate emotional state indicators
    this.updateEmotionalState(metrics, gameState)
    
    // Update behavioral patterns
    this.updateBehavioralPatterns(metrics, gameState)
  }

  private updateEmotionalState(metrics: PlayerMetrics, gameState: GameState): void {
    const timeSinceLastAction = Date.now() - metrics.lastActionTime
    const currentPerformance = this.calculateCurrentPerformance(metrics, gameState)
    
    // Estimate frustration based on performance and time patterns
    let frustration = metrics.estimatedFrustration
    
    if (currentPerformance < 0.3) {
      frustration = Math.min(1, frustration + 0.1) // Poor performance increases frustration
    } else if (currentPerformance > 0.8) {
      frustration = Math.max(0, frustration - 0.05) // Good performance reduces frustration
    }
    
    // Long pauses might indicate frustration
    if (timeSinceLastAction > 10000) { // 10 seconds
      frustration = Math.min(1, frustration + 0.05)
    }
    
    metrics.estimatedFrustration = frustration
    
    // Estimate engagement based on activity and performance
    let engagement = metrics.estimatedEngagement
    
    if (timeSinceLastAction < 2000 && currentPerformance > 0.4) {
      engagement = Math.min(1, engagement + 0.1) // Active play with decent performance
    } else if (timeSinceLastAction > 15000) {
      engagement = Math.max(0, engagement - 0.2) // Long inactivity
    }
    
    metrics.estimatedEngagement = engagement
    
    // Estimate confidence based on recent performance
    const recentPerformance = metrics.learningCurve.slice(-5)
    if (recentPerformance.length > 2) {
      const avgRecent = recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length
      const trend = recentPerformance[recentPerformance.length - 1] - recentPerformance[0]
      
      if (avgRecent > metrics.averageScore && trend > 0) {
        metrics.estimatedConfidence = Math.min(1, metrics.estimatedConfidence + 0.05)
      } else if (avgRecent < metrics.averageScore * 0.7) {
        metrics.estimatedConfidence = Math.max(0, metrics.estimatedConfidence - 0.1)
      }
    }
  }

  private updateBehavioralPatterns(metrics: PlayerMetrics, gameState: GameState): void {
    const currentHour = new Date().getHours()
    metrics.playTimePatterns[currentHour]++
    
    // Update preferred difficulty based on current choice and performance
    const currentPerformance = this.calculateCurrentPerformance(metrics, gameState)
    if (currentPerformance > 0.6) {
      // Good performance at current difficulty suggests they might handle more
      metrics.preferredDifficulty = Math.min(
        this.config.maxDifficulty,
        metrics.preferredDifficulty + 0.02
      )
    } else if (currentPerformance < 0.3) {
      // Poor performance suggests difficulty might be too high
      metrics.preferredDifficulty = Math.max(
        this.config.minDifficulty,
        metrics.preferredDifficulty - 0.05
      )
    }
    
    // Update frustration tolerance based on quit patterns
    if (metrics.estimatedFrustration > 0.8 && gameState.isRunning) {
      metrics.frustrationTolerance = Math.min(1, metrics.frustrationTolerance + 0.01)
    }
  }

  private calculateCurrentPerformance(metrics: PlayerMetrics, gameState: GameState): number {
    if (!gameState.timeElapsed || gameState.timeElapsed < 10000) return 0.5 // Default for new sessions
    
    // Combine multiple performance indicators
    const scoreRatio = metrics.averageScore > 0 ? 
      (gameState.score || 0) / metrics.averageScore : 1
    
    const timeRatio = metrics.averageTime > 0 ?
      metrics.averageTime / gameState.timeElapsed : 1
    
    const levelProgress = gameState.currentLevel / (gameState.currentLevel + 1)
    
    // Weighted combination
    return Math.min(1, Math.max(0, 
      (scoreRatio * 0.4) + 
      (timeRatio * 0.3) + 
      (levelProgress * 0.3)
    ))
  }

  private calculateDifficultyAdjustment(metrics: PlayerMetrics, gameState: GameState): DifficultyAdjustment {
    const currentPerformance = this.calculateCurrentPerformance(metrics, gameState)
    const targetPerformance = this.config.targetSuccessRate
    
    // Base adjustment calculation
    let adjustment = 0
    let reason = 'No adjustment needed'
    let confidence = 0.5
    
    // Performance-based adjustment
    const performanceDelta = currentPerformance - targetPerformance
    if (Math.abs(performanceDelta) > 0.1) {
      adjustment = -performanceDelta * this.config.adaptationRate
      reason = performanceDelta > 0 ? 'Performance too high' : 'Performance too low'
      confidence = Math.min(0.9, 0.3 + Math.abs(performanceDelta))
    }
    
    // Engagement-based adjustment
    if (metrics.estimatedEngagement < 0.3) {
      adjustment -= 0.1 // Reduce difficulty to re-engage
      reason = 'Low engagement detected'
      confidence = Math.max(confidence, 0.6)
    } else if (metrics.estimatedEngagement > 0.8 && currentPerformance > 0.7) {
      adjustment += 0.05 // Slightly increase for highly engaged players
      reason = 'High engagement, good performance'
      confidence = Math.max(confidence, 0.7)
    }
    
    // Frustration-based emergency adjustment
    if (this.config.emergencyAdjustment && metrics.estimatedFrustration > 0.8) {
      adjustment -= 0.2 // Emergency difficulty reduction
      reason = 'High frustration - emergency adjustment'
      confidence = 0.9
    }
    
    // Personalized adjustment based on player type
    if (this.config.personalizedAdjustment) {
      const playerType = this.classifyPlayer(metrics)
      const personalizedAdjustment = this.getPersonalizedAdjustment(playerType, metrics, gameState)
      adjustment += personalizedAdjustment
      
      if (Math.abs(personalizedAdjustment) > 0.05) {
        reason += ` (${playerType} profile)`
        confidence = Math.max(confidence, 0.8)
      }
    }
    
    // Skill progression adjustment
    const skillTrend = this.analyzeSkillTrend(metrics)
    if (skillTrend > 0.1) {
      adjustment += 0.05 // Player is improving rapidly
      reason += ' (skill improvement detected)'
    } else if (skillTrend < -0.1) {
      adjustment -= 0.03 // Player might be struggling
      reason += ' (skill decline detected)'
    }
    
    return {
      previousDifficulty: gameState.difficulty,
      newDifficulty: 0, // Will be calculated in applyAdjustment
      adjustment,
      reason,
      confidence,
      timestamp: Date.now(),
      metrics: {
        successRate: currentPerformance,
        avgTime: gameState.timeElapsed,
        engagementScore: metrics.estimatedEngagement,
        frustrationLevel: metrics.estimatedFrustration
      }
    }
  }

  private classifyPlayer(metrics: PlayerMetrics): string {
    const avgScore = metrics.averageScore
    const completionRate = metrics.completionRate
    const sessionCount = metrics.sessionCount
    const improvementRate = metrics.improvementRate
    
    // Expert: High scores, high completion rate, many sessions
    if (avgScore > 1000 && completionRate > 0.8 && sessionCount > 50) {
      return 'expert'
    }
    
    // Hardcore: Good scores, good completion, regular play, high challenge seeking
    if (avgScore > 600 && completionRate > 0.6 && sessionCount > 20 && metrics.challengeSeekingBehavior > 0.7) {
      return 'hardcore'
    }
    
    // Regular: Decent performance, regular play
    if (avgScore > 300 && sessionCount > 10 && metrics.totalPlayTime > 3600000) { // 1 hour
      return 'regular'
    }
    
    // Casual: Some play time but lower performance expectations
    if (sessionCount > 5 && metrics.frustrationTolerance < 0.5) {
      return 'casual'
    }
    
    // Beginner: New or low-performing players
    return 'beginner'
  }

  private getPersonalizedAdjustment(playerType: string, metrics: PlayerMetrics, gameState: GameState): number {
    const curve = this.difficultyCurves.get(playerType)
    if (!curve) return 0
    
    const targetDifficulty = Math.min(curve.max, curve.base + (gameState.currentLevel * curve.growth))
    const currentDifficulty = gameState.difficulty
    
    // Gradual adjustment towards ideal difficulty for player type
    return (targetDifficulty - currentDifficulty) * 0.1
  }

  private analyzeSkillTrend(metrics: PlayerMetrics): number {
    if (metrics.learningCurve.length < 5) return 0
    
    const recentScores = metrics.learningCurve.slice(-5)
    const olderScores = metrics.learningCurve.slice(-10, -5)
    
    if (olderScores.length === 0) return 0
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length
    
    return (recentAvg - olderAvg) / (olderAvg || 1)
  }

  private applyAdjustment(currentDifficulty: number, adjustmentData: DifficultyAdjustment, metrics: PlayerMetrics): number {
    let newDifficulty = currentDifficulty + adjustmentData.adjustment
    
    // Apply smoothing to prevent jarring changes
    const smoothedAdjustment = adjustmentData.adjustment * (1 - this.config.smoothingFactor) +
                               (newDifficulty - currentDifficulty) * this.config.smoothingFactor
    
    newDifficulty = currentDifficulty + smoothedAdjustment
    
    // Clamp to configured bounds
    newDifficulty = Math.max(this.config.minDifficulty, Math.min(this.config.maxDifficulty, newDifficulty))
    
    // Ensure minimum change threshold to avoid micro-adjustments
    if (Math.abs(newDifficulty - currentDifficulty) < 0.01) {
      newDifficulty = currentDifficulty
    }
    
    adjustmentData.newDifficulty = newDifficulty
    return newDifficulty
  }

  private recordAdjustment(userId: string, oldDifficulty: number, newDifficulty: number, adjustmentData: DifficultyAdjustment): void {
    if (!this.adjustmentHistory.has(userId)) {
      this.adjustmentHistory.set(userId, [])
    }
    
    const history = this.adjustmentHistory.get(userId)!
    history.push({
      ...adjustmentData,
      previousDifficulty: oldDifficulty,
      newDifficulty: newDifficulty
    })
    
    // Keep only recent history (last 50 adjustments)
    if (history.length > 50) {
      history.shift()
    }
  }

  // Public API methods
  public getPlayerMetrics(userId: string): PlayerMetrics | undefined {
    return this.playerMetrics.get(userId)
  }

  public getAdjustmentHistory(userId: string): DifficultyAdjustment[] {
    return this.adjustmentHistory.get(userId) || []
  }

  public setPlayerMetrics(userId: string, metrics: Partial<PlayerMetrics>): void {
    const existing = this.playerMetrics.get(userId)
    if (existing) {
      Object.assign(existing, metrics)
    }
  }

  public updateConfig(newConfig: Partial<DifficultyConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  public getRecommendedDifficulty(userId: string): number {
    const metrics = this.playerMetrics.get(userId)
    if (!metrics) return 1.0
    
    const playerType = this.classifyPlayer(metrics)
    const curve = this.difficultyCurves.get(playerType)
    
    if (!curve) return metrics.preferredDifficulty
    
    // Calculate ideal difficulty based on player progression
    const sessionBasedLevel = Math.min(50, metrics.sessionCount)
    return Math.min(curve.max, curve.base + (sessionBasedLevel * curve.growth))
  }

  public predictPerformance(userId: string, difficulty: number): number {
    const metrics = this.playerMetrics.get(userId)
    if (!metrics) return 0.5
    
    return this.performancePredictor.predict(metrics, difficulty)
  }

  public getEngagementForecast(userId: string): number {
    const metrics = this.playerMetrics.get(userId)
    if (!metrics) return 0.5
    
    return this.engagementAnalyzer.forecastEngagement(metrics)
  }

  public analyzePlayerSkill(userId: string): any {
    const metrics = this.playerMetrics.get(userId)
    if (!metrics) return null
    
    return this.skillAssessment.analyzeSkill(metrics)
  }

  public exportPlayerData(userId: string): any {
    return {
      metrics: this.playerMetrics.get(userId),
      adjustmentHistory: this.adjustmentHistory.get(userId) || [],
      playerType: this.playerMetrics.has(userId) ? this.classifyPlayer(this.playerMetrics.get(userId)!) : 'unknown',
      recommendations: {
        difficulty: this.getRecommendedDifficulty(userId),
        predictedPerformance: this.predictPerformance(userId, this.getRecommendedDifficulty(userId)),
        engagementForecast: this.getEngagementForecast(userId)
      }
    }
  }

  public importPlayerData(userId: string, data: any): void {
    if (data.metrics) {
      this.playerMetrics.set(userId, data.metrics)
    }
    if (data.adjustmentHistory) {
      this.adjustmentHistory.set(userId, data.adjustmentHistory)
    }
  }

  public reset(userId?: string): void {
    if (userId) {
      this.playerMetrics.delete(userId)
      this.adjustmentHistory.delete(userId)
    } else {
      this.playerMetrics.clear()
      this.adjustmentHistory.clear()
    }
  }
}

// Simplified ML-like components for performance prediction
class PerformancePredictor {
  public predict(metrics: PlayerMetrics, difficulty: number): number {
    // Simple linear model based on historical performance and difficulty
    const basePerformance = metrics.completionRate || 0.5
    const difficultyImpact = Math.max(0, 1 - (difficulty - 1) * 0.2)
    const skillFactor = metrics.improvementRate * 0.1 + 1
    const confidenceFactor = metrics.estimatedConfidence * 0.3 + 0.7
    
    return Math.min(1, Math.max(0, basePerformance * difficultyImpact * skillFactor * confidenceFactor))
  }
}

class EngagementAnalyzer {
  public forecastEngagement(metrics: PlayerMetrics): number {
    const recentEngagement = metrics.estimatedEngagement
    const frustrationImpact = 1 - (metrics.estimatedFrustration * 0.5)
    const varietyBonus = metrics.preferredGameModes.length * 0.05
    const streakBonus = Math.min(0.2, metrics.streakDays * 0.02)
    
    return Math.min(1, Math.max(0, recentEngagement * frustrationImpact + varietyBonus + streakBonus))
  }
}

class SkillAssessment {
  public analyzeSkill(metrics: PlayerMetrics): any {
    const skillLevel = this.calculateSkillLevel(metrics)
    const consistency = this.calculateConsistency(metrics)
    const potential = this.calculatePotential(metrics)
    
    return {
      skillLevel,
      consistency,
      potential,
      category: this.categorizeSkill(skillLevel, consistency),
      recommendations: this.generateSkillRecommendations(skillLevel, consistency, potential)
    }
  }
  
  private calculateSkillLevel(metrics: PlayerMetrics): number {
    const scoreWeight = 0.4
    const completionWeight = 0.3
    const consistencyWeight = 0.3
    
    const normalizedScore = Math.min(1, (metrics.averageScore || 0) / 1000)
    const completionScore = metrics.completionRate || 0
    const consistencyScore = 1 - (metrics.consistencyRating || 0.5)
    
    return scoreWeight * normalizedScore + 
           completionWeight * completionScore + 
           consistencyWeight * consistencyScore
  }
  
  private calculateConsistency(metrics: PlayerMetrics): number {
    if (metrics.learningCurve.length < 3) return 0.5
    
    const mean = metrics.learningCurve.reduce((a, b) => a + b, 0) / metrics.learningCurve.length
    const variance = metrics.learningCurve.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / metrics.learningCurve.length
    const standardDeviation = Math.sqrt(variance)
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - (standardDeviation / (mean || 1)))
  }
  
  private calculatePotential(metrics: PlayerMetrics): number {
    const improvementRate = metrics.improvementRate || 0
    const engagementLevel = metrics.estimatedEngagement || 0.5
    const frustrationTolerance = metrics.frustrationTolerance || 0.5
    const challengeSeeking = metrics.challengeSeekingBehavior || 0.5
    
    return (improvementRate * 0.3 + engagementLevel * 0.3 + frustrationTolerance * 0.2 + challengeSeeking * 0.2)
  }
  
  private categorizeSkill(skillLevel: number, consistency: number): string {
    if (skillLevel > 0.8 && consistency > 0.7) return 'expert'
    if (skillLevel > 0.6 && consistency > 0.5) return 'advanced'
    if (skillLevel > 0.4) return 'intermediate'
    if (skillLevel > 0.2) return 'novice'
    return 'beginner'
  }
  
  private generateSkillRecommendations(skillLevel: number, consistency: number, potential: number): string[] {
    const recommendations: string[] = []
    
    if (skillLevel < 0.3) {
      recommendations.push('Focus on basic mechanics and fundamentals')
      recommendations.push('Practice regularly in lower difficulty settings')
    }
    
    if (consistency < 0.4) {
      recommendations.push('Work on maintaining consistent performance')
      recommendations.push('Try shorter, more focused practice sessions')
    }
    
    if (potential > 0.7) {
      recommendations.push('Consider increasing difficulty for faster improvement')
      recommendations.push('Try more challenging game modes')
    }
    
    if (skillLevel > 0.7) {
      recommendations.push('Focus on advanced techniques and optimization')
      recommendations.push('Consider competitive play or leaderboard challenges')
    }
    
    return recommendations
  }
}

export default DifficultyAdjuster