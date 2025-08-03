/**
 * INTELLIGENT AI OPPONENT SYSTEM
 * Advanced AI that adapts to player skill and provides engaging competition
 * Features: Behavioral trees, learning algorithms, personality systems, strategic planning
 */

import { GameState } from '../GameEngine'
import { Vector2 } from '../physics/PhysicsWorld'

export interface AIConfig {
  difficulty: number // 0.1 to 10.0
  personality: AIPersonality
  learningEnabled: boolean
  adaptiveStrategies: boolean
  humanLikeErrors: boolean
  responseTime: { min: number; max: number } // Milliseconds
  strategyUpdateInterval: number
}

export interface AIPersonality {
  aggressiveness: number // 0-1, how aggressive in attacks/competition
  patience: number // 0-1, willingness to wait for opportunities
  riskTaking: number // 0-1, likelihood of taking risks
  adaptability: number // 0-1, how quickly to change strategies
  consistency: number // 0-1, how consistent performance is
  creativity: number // 0-1, likelihood of trying unusual strategies
  cooperation: number // 0-1, willingness to cooperate in team games
  competitiveness: number // 0-1, drive to win vs having fun
}

export interface AIMemory {
  playerActions: PlayerAction[]
  successfulStrategies: Strategy[]
  failedStrategies: Strategy[]
  playerPatterns: PlayerPattern[]
  gameStateHistory: GameStateSnapshot[]
  winLossRecord: GameResult[]
}

export interface PlayerAction {
  action: string
  context: any
  timestamp: number
  success: boolean
  playerState: any
}

export interface Strategy {
  id: string
  name: string
  description: string
  conditions: any[]
  actions: any[]
  successRate: number
  usageCount: number
  lastUsed: number
  effectiveness: number
}

export interface PlayerPattern {
  patternType: string
  frequency: number
  predictability: number
  contexts: any[]
  counters: string[]
}

export interface GameStateSnapshot {
  timestamp: number
  gameState: any
  aiState: any
  playerState: any
  decision: string
  outcome: string
}

export interface GameResult {
  gameId: string
  result: 'win' | 'loss' | 'draw'
  score: { ai: number; player: number }
  duration: number
  strategiesUsed: string[]
  difficulty: number
  timestamp: number
}

export interface AIDecision {
  action: string
  confidence: number
  reasoning: string
  alternativeActions: string[]
  expectedOutcome: any
  timestamp: number
}

export class AIOpponent {
  private config: AIConfig
  private memory: AIMemory
  private currentStrategy?: Strategy
  private behaviorTree: BehaviorTree
  private strategyManager: StrategyManager
  private patternRecognizer: PatternRecognizer
  private learningSystem: LearningSystem
  private decisionMaker: DecisionMaker
  
  // Current state
  private lastDecisionTime = 0
  private currentGoal?: any
  private emotionalState = {
    confidence: 0.5,
    frustration: 0.0,
    excitement: 0.5,
    focus: 1.0
  }
  
  // Performance tracking
  private recentPerformance: number[] = []
  private adaptationTrigger = 0

  constructor(difficulty: number, personality?: Partial<AIPersonality>) {
    this.config = {
      difficulty: Math.max(0.1, Math.min(10.0, difficulty)),
      personality: {
        aggressiveness: 0.5,
        patience: 0.5,
        riskTaking: 0.5,
        adaptability: 0.5,
        consistency: 0.5,
        creativity: 0.5,
        cooperation: 0.5,
        competitiveness: 0.7,
        ...personality
      },
      learningEnabled: true,
      adaptiveStrategies: true,
      humanLikeErrors: true,
      responseTime: { min: 200, max: 1500 },
      strategyUpdateInterval: 10000 // 10 seconds
    }

    this.memory = {
      playerActions: [],
      successfulStrategies: [],
      failedStrategies: [],
      playerPatterns: [],
      gameStateHistory: [],
      winLossRecord: []
    }

    this.behaviorTree = new BehaviorTree(this.config.personality)
    this.strategyManager = new StrategyManager(this.config)
    this.patternRecognizer = new PatternRecognizer()
    this.learningSystem = new LearningSystem(this.config)
    this.decisionMaker = new DecisionMaker(this.config, this.memory)

    this.initializeStrategies()
  }

  public update(deltaTime: number, gameState: GameState): void {
    const currentTime = Date.now()
    
    // Update emotional state based on recent performance
    this.updateEmotionalState(gameState)
    
    // Record current game state for learning
    this.recordGameState(gameState)
    
    // Analyze player patterns
    if (this.config.learningEnabled) {
      this.analyzePlayerBehavior(gameState)
    }
    
    // Update current strategy if needed
    if (currentTime - this.lastDecisionTime > this.config.strategyUpdateInterval) {
      this.updateStrategy(gameState)
      this.lastDecisionTime = currentTime
    }
    
    // Execute current strategy
    if (this.currentStrategy) {
      this.executeStrategy(deltaTime, gameState)
    }
    
    // Make tactical decisions
    const decision = this.makeDecision(gameState)
    if (decision) {
      this.executeDecision(decision, gameState)
    }
    
    // Learn from outcomes
    if (this.config.learningEnabled) {
      this.learningSystem.processExperience(gameState, this.memory)
    }
  }

  private updateEmotionalState(gameState: GameState): void {
    // Update confidence based on recent performance
    const currentScore = this.getCurrentAIScore(gameState)
    const playerScore = gameState.score || 0
    
    if (currentScore > playerScore) {
      this.emotionalState.confidence = Math.min(1, this.emotionalState.confidence + 0.01)
      this.emotionalState.excitement = Math.min(1, this.emotionalState.excitement + 0.02)
      this.emotionalState.frustration = Math.max(0, this.emotionalState.frustration - 0.01)
    } else if (currentScore < playerScore * 0.7) {
      this.emotionalState.confidence = Math.max(0, this.emotionalState.confidence - 0.02)
      this.emotionalState.frustration = Math.min(1, this.emotionalState.frustration + 0.01)
    }
    
    // Focus decreases with frustration
    this.emotionalState.focus = Math.max(0.3, 1 - (this.emotionalState.frustration * 0.5))
    
    // Track performance trend
    this.recentPerformance.push(currentScore / Math.max(1, playerScore))
    if (this.recentPerformance.length > 10) {
      this.recentPerformance.shift()
    }
  }

  private recordGameState(gameState: GameState): void {
    const snapshot: GameStateSnapshot = {
      timestamp: Date.now(),
      gameState: {
        score: gameState.score,
        level: gameState.currentLevel,
        difficulty: gameState.difficulty,
        timeElapsed: gameState.timeElapsed
      },
      aiState: {
        emotionalState: { ...this.emotionalState },
        currentStrategy: this.currentStrategy?.name || 'none',
        confidence: this.emotionalState.confidence
      },
      playerState: {
        score: gameState.score,
        performance: this.calculatePlayerPerformance(gameState)
      },
      decision: this.currentStrategy?.name || 'observe',
      outcome: 'pending'
    }
    
    this.memory.gameStateHistory.push(snapshot)
    
    // Keep only recent history
    if (this.memory.gameStateHistory.length > 100) {
      this.memory.gameStateHistory.shift()
    }
  }

  private analyzePlayerBehavior(gameState: GameState): void {
    // Analyze recent player actions for patterns
    const patterns = this.patternRecognizer.analyzePatterns(this.memory.playerActions)
    
    // Update player patterns in memory
    for (const pattern of patterns) {
      const existingPattern = this.memory.playerPatterns.find(p => p.patternType === pattern.type)
      if (existingPattern) {
        existingPattern.frequency = (existingPattern.frequency + pattern.frequency) / 2
        existingPattern.predictability = pattern.predictability
      } else {
        this.memory.playerPatterns.push({
          patternType: pattern.type,
          frequency: pattern.frequency,
          predictability: pattern.predictability,
          contexts: pattern.contexts,
          counters: pattern.suggestedCounters
        })
      }
    }
    
    // Trigger adaptation if player patterns change significantly
    if (patterns.length > 0) {
      this.adaptationTrigger++
      if (this.adaptationTrigger > 5) {
        this.adaptToPlayerBehavior()
        this.adaptationTrigger = 0
      }
    }
  }

  private updateStrategy(gameState: GameState): void {
    const currentPerformance = this.calculateCurrentPerformance(gameState)
    const availableStrategies = this.strategyManager.getAvailableStrategies(gameState, this.emotionalState)
    
    // Select new strategy based on current situation
    let bestStrategy = this.currentStrategy
    let bestScore = -1
    
    for (const strategy of availableStrategies) {
      const score = this.evaluateStrategy(strategy, gameState)
      if (score > bestScore || !bestStrategy) {
        bestScore = score
        bestStrategy = strategy
      }
    }
    
    // Switch strategy if a significantly better one is found
    if (bestStrategy !== this.currentStrategy && bestScore > this.getCurrentStrategyScore() + 0.2) {
      this.switchStrategy(bestStrategy, gameState)
    }
  }

  private evaluateStrategy(strategy: Strategy, gameState: GameState): number {
    let score = strategy.successRate * 0.4
    
    // Adjust for current emotional state
    if (this.emotionalState.frustration > 0.5 && strategy.name.includes('aggressive')) {
      score += 0.2 // Frustrated AI prefers aggressive strategies
    }
    
    if (this.emotionalState.confidence > 0.7 && strategy.name.includes('risky')) {
      score += 0.1 // Confident AI more likely to take risks
    }
    
    // Adjust for player patterns
    for (const pattern of this.memory.playerPatterns) {
      if (strategy.actions.some(action => pattern.counters.includes(action))) {
        score += pattern.predictability * 0.3
      }
    }
    
    // Personality adjustments
    if (strategy.name.includes('aggressive')) {
      score += (this.config.personality.aggressiveness - 0.5) * 0.2
    }
    
    if (strategy.name.includes('creative')) {
      score += (this.config.personality.creativity - 0.5) * 0.2
    }
    
    // Difficulty scaling
    score *= (0.5 + this.config.difficulty * 0.1)
    
    return Math.max(0, Math.min(1, score))
  }

  private switchStrategy(newStrategy: Strategy, gameState: GameState): void {
    if (this.currentStrategy) {
      // Record outcome of previous strategy
      const outcome = this.calculateStrategyOutcome(gameState)
      this.recordStrategyOutcome(this.currentStrategy, outcome)
    }
    
    this.currentStrategy = newStrategy
    this.currentStrategy.usageCount++
    this.currentStrategy.lastUsed = Date.now()
    
    console.log(`AI switched to strategy: ${newStrategy.name}`)
  }

  private executeStrategy(deltaTime: number, gameState: GameState): void {
    if (!this.currentStrategy) return
    
    const strategyContext = {
      gameState,
      aiState: this.emotionalState,
      playerPatterns: this.memory.playerPatterns,
      difficulty: this.config.difficulty
    }
    
    // Execute strategy actions based on behavior tree
    const treeResult = this.behaviorTree.execute(strategyContext, this.currentStrategy)
    
    if (treeResult.success) {
      this.applyStrategyActions(treeResult.actions, gameState)
    }
  }

  private makeDecision(gameState: GameState): AIDecision | null {
    const shouldMakeDecision = this.shouldMakeDecision()
    if (!shouldMakeDecision) return null
    
    return this.decisionMaker.makeDecision(gameState, this.emotionalState, this.memory)
  }

  private shouldMakeDecision(): boolean {
    const currentTime = Date.now()
    const timeSinceLastDecision = currentTime - this.lastDecisionTime
    
    // Random response time based on AI configuration and emotional state
    const responseTime = this.calculateResponseTime()
    
    return timeSinceLastDecision >= responseTime
  }

  private calculateResponseTime(): number {
    const baseTime = this.config.responseTime
    const randomTime = baseTime.min + Math.random() * (baseTime.max - baseTime.min)
    
    // Adjust for emotional state
    let modifier = 1
    modifier *= (1 - this.emotionalState.focus * 0.3) // Lower focus = slower response
    modifier *= (1 + this.emotionalState.excitement * 0.2) // Higher excitement = faster response
    modifier *= (1 + this.emotionalState.frustration * 0.1) // Frustration = slightly faster (hasty)
    
    // Adjust for difficulty
    modifier *= (1.5 - this.config.difficulty * 0.1)
    
    return randomTime * modifier
  }

  private executeDecision(decision: AIDecision, gameState: GameState): void {
    // Apply human-like errors based on emotional state and configuration
    if (this.config.humanLikeErrors) {
      const errorProbability = this.calculateErrorProbability()
      if (Math.random() < errorProbability) {
        decision = this.applyHumanError(decision)
      }
    }
    
    // Execute the decision
    this.performAction(decision.action, gameState)
    
    // Record the decision for learning
    this.recordDecision(decision, gameState)
    
    this.lastDecisionTime = Date.now()
  }

  private calculateErrorProbability(): number {
    let errorRate = (10 - this.config.difficulty) / 100 // Higher difficulty = fewer errors
    
    // Emotional state affects error rate
    errorRate += this.emotionalState.frustration * 0.05
    errorRate += (1 - this.emotionalState.focus) * 0.03
    errorRate -= this.emotionalState.confidence * 0.02
    
    // Personality affects error rate
    errorRate += (1 - this.config.personality.consistency) * 0.03
    
    return Math.max(0, Math.min(0.2, errorRate))
  }

  private applyHumanError(decision: AIDecision): AIDecision {
    // Types of human-like errors
    const errorTypes = ['timing', 'precision', 'strategy', 'attention']
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)]
    
    switch (errorType) {
      case 'timing':
        // Slightly delay or rush the action
        decision.action = `delayed_${decision.action}`
        break
      
      case 'precision':
        // Less precise action
        decision.confidence *= 0.8
        break
      
      case 'strategy':
        // Choose suboptimal alternative
        if (decision.alternativeActions.length > 0) {
          decision.action = decision.alternativeActions[Math.floor(Math.random() * decision.alternativeActions.length)]
        }
        break
      
      case 'attention':
        // Miss obvious opportunities
        if (Math.random() < 0.5) {
          decision.action = 'observe' // Do nothing
        }
        break
    }
    
    return decision
  }

  private performAction(action: string, gameState: GameState): void {
    // This would be implemented based on the specific game type
    // For now, we'll just log the action
    console.log(`AI performs action: ${action}`)
    
    // Record the action for pattern analysis
    this.recordAction(action, gameState, true) // Assume success for now
  }

  private recordAction(action: string, gameState: GameState, success: boolean): void {
    const playerAction: PlayerAction = {
      action,
      context: {
        gameState: gameState.score,
        aiScore: this.getCurrentAIScore(gameState),
        timeElapsed: gameState.timeElapsed
      },
      timestamp: Date.now(),
      success,
      playerState: {
        score: gameState.score,
        level: gameState.currentLevel
      }
    }
    
    this.memory.playerActions.push(playerAction)
    
    // Keep only recent actions
    if (this.memory.playerActions.length > 200) {
      this.memory.playerActions.shift()
    }
  }

  private recordDecision(decision: AIDecision, gameState: GameState): void {
    // This would integrate with a more comprehensive decision tracking system
    console.log(`AI Decision: ${decision.action} (confidence: ${decision.confidence.toFixed(2)})`)
  }

  private adaptToPlayerBehavior(): void {
    if (!this.config.adaptiveStrategies) return
    
    // Analyze which strategies work best against detected player patterns
    const patternCounters = this.analyzePatternCounters()
    
    // Update strategy effectiveness based on recent outcomes
    this.updateStrategyEffectiveness()
    
    // Adjust AI personality slightly based on what's working
    this.adjustPersonality(patternCounters)
  }

  private analyzePatternCounters(): Map<string, number> {
    const counters = new Map<string, number>()
    
    for (const pattern of this.memory.playerPatterns) {
      for (const counter of pattern.counters) {
        counters.set(counter, (counters.get(counter) || 0) + pattern.frequency * pattern.predictability)
      }
    }
    
    return counters
  }

  private updateStrategyEffectiveness(): void {
    // This would analyze recent game outcomes and update strategy success rates
    for (const strategy of this.memory.successfulStrategies) {
      if (strategy.usageCount > 0) {
        // Decay old effectiveness and incorporate new data
        strategy.effectiveness = strategy.effectiveness * 0.9 + strategy.successRate * 0.1
      }
    }
  }

  private adjustPersonality(counters: Map<string, number>): void {
    // Slightly adjust personality traits based on what's working
    const maxAdjustment = 0.02 // Small adjustments to maintain coherent personality
    
    if (counters.get('aggressive') || 0 > 0.7) {
      this.config.personality.aggressiveness = Math.min(1, this.config.personality.aggressiveness + maxAdjustment)
    }
    
    if (counters.get('patient') || 0 > 0.7) {
      this.config.personality.patience = Math.min(1, this.config.personality.patience + maxAdjustment)
    }
    
    // Ensure personality traits stay within reasonable bounds
    for (const [key, value] of Object.entries(this.config.personality)) {
      this.config.personality[key] = Math.max(0.1, Math.min(0.9, value))
    }
  }

  private initializeStrategies(): void {
    // Initialize with basic strategies - these would be expanded based on game type
    const basicStrategies: Strategy[] = [
      {
        id: 'aggressive_rush',
        name: 'Aggressive Rush',
        description: 'Focus on quick, aggressive actions to pressure the player',
        conditions: [{ type: 'confidence', operator: '>', value: 0.6 }],
        actions: ['attack', 'advance', 'pressure'],
        successRate: 0.5,
        usageCount: 0,
        lastUsed: 0,
        effectiveness: 0.5
      },
      {
        id: 'defensive_patient',
        name: 'Patient Defense',
        description: 'Wait for player mistakes and capitalize on them',
        conditions: [{ type: 'patience', operator: '>', value: 0.6 }],
        actions: ['defend', 'observe', 'counter'],
        successRate: 0.6,
        usageCount: 0,
        lastUsed: 0,
        effectiveness: 0.6
      },
      {
        id: 'adaptive_mixed',
        name: 'Adaptive Strategy',
        description: 'Mix of strategies based on current situation',
        conditions: [{ type: 'adaptability', operator: '>', value: 0.5 }],
        actions: ['analyze', 'adapt', 'respond'],
        successRate: 0.7,
        usageCount: 0,
        lastUsed: 0,
        effectiveness: 0.7
      }
    ]
    
    this.memory.successfulStrategies = basicStrategies
  }

  // Helper methods
  private getCurrentAIScore(gameState: GameState): number {
    // This would be implemented based on how AI score is tracked in the specific game
    return 0 // Placeholder
  }

  private calculatePlayerPerformance(gameState: GameState): number {
    // Calculate normalized player performance
    const timeRatio = Math.min(1, gameState.timeElapsed / 300000) // 5 minutes max
    const scoreRatio = Math.min(1, (gameState.score || 0) / 1000) // 1000 max score
    const levelRatio = Math.min(1, gameState.currentLevel / 10) // 10 levels max
    
    return (scoreRatio * 0.5 + levelRatio * 0.3 + (1 - timeRatio) * 0.2)
  }

  private calculateCurrentPerformance(gameState: GameState): number {
    if (this.recentPerformance.length === 0) return 0.5
    
    return this.recentPerformance.reduce((a, b) => a + b, 0) / this.recentPerformance.length
  }

  private getCurrentStrategyScore(): number {
    return this.currentStrategy?.effectiveness || 0.5
  }

  private calculateStrategyOutcome(gameState: GameState): number {
    // Calculate how well the current strategy performed
    const currentPerformance = this.calculateCurrentPerformance(gameState)
    const playerPerformance = this.calculatePlayerPerformance(gameState)
    
    return currentPerformance - playerPerformance + 0.5 // Normalize to 0-1
  }

  private recordStrategyOutcome(strategy: Strategy, outcome: number): void {
    // Update strategy success rate with new outcome
    strategy.successRate = (strategy.successRate * strategy.usageCount + outcome) / (strategy.usageCount + 1)
    
    // Move strategy to appropriate list based on outcome
    if (outcome > 0.6) {
      if (!this.memory.successfulStrategies.includes(strategy)) {
        this.memory.successfulStrategies.push(strategy)
      }
    } else if (outcome < 0.4) {
      if (!this.memory.failedStrategies.includes(strategy)) {
        this.memory.failedStrategies.push(strategy)
      }
    }
  }

  private applyStrategyActions(actions: string[], gameState: GameState): void {
    for (const action of actions) {
      this.performAction(action, gameState)
    }
  }

  // Public API methods
  public getDifficulty(): number {
    return this.config.difficulty
  }

  public setDifficulty(difficulty: number): void {
    this.config.difficulty = Math.max(0.1, Math.min(10.0, difficulty))
  }

  public getPersonality(): AIPersonality {
    return { ...this.config.personality }
  }

  public setPersonality(personality: Partial<AIPersonality>): void {
    this.config.personality = { ...this.config.personality, ...personality }
  }

  public getEmotionalState(): any {
    return { ...this.emotionalState }
  }

  public getCurrentStrategy(): Strategy | undefined {
    return this.currentStrategy
  }

  public getMemory(): AIMemory {
    return this.memory
  }

  public getPerformanceStats(): any {
    return {
      recentPerformance: [...this.recentPerformance],
      strategiesUsed: this.memory.successfulStrategies.length,
      patternsDetected: this.memory.playerPatterns.length,
      gamesPlayed: this.memory.winLossRecord.length,
      currentConfidence: this.emotionalState.confidence
    }
  }

  public resetMemory(): void {
    this.memory = {
      playerActions: [],
      successfulStrategies: [...this.memory.successfulStrategies], // Keep strategies
      failedStrategies: [],
      playerPatterns: [],
      gameStateHistory: [],
      winLossRecord: []
    }
  }

  public exportAI(): any {
    return {
      config: this.config,
      memory: this.memory,
      emotionalState: this.emotionalState,
      recentPerformance: this.recentPerformance
    }
  }

  public importAI(data: any): void {
    if (data.config) this.config = { ...this.config, ...data.config }
    if (data.memory) this.memory = { ...this.memory, ...data.memory }
    if (data.emotionalState) this.emotionalState = { ...data.emotionalState }
    if (data.recentPerformance) this.recentPerformance = [...data.recentPerformance]
  }
}

// Supporting classes (simplified implementations)
class BehaviorTree {
  constructor(private personality: AIPersonality) {}
  
  execute(context: any, strategy: Strategy): { success: boolean; actions: string[] } {
    // Simplified behavior tree execution
    const actions: string[] = []
    
    // Select actions based on strategy and personality
    for (const action of strategy.actions) {
      if (this.shouldExecuteAction(action, context)) {
        actions.push(action)
      }
    }
    
    return { success: actions.length > 0, actions }
  }
  
  private shouldExecuteAction(action: string, context: any): boolean {
    // Simple probability-based action selection
    let probability = 0.7 // Base probability
    
    // Adjust based on personality
    if (action.includes('aggressive') && this.personality.aggressiveness > 0.6) {
      probability += 0.2
    }
    
    if (action.includes('patient') && this.personality.patience > 0.6) {
      probability += 0.2
    }
    
    return Math.random() < probability
  }
}

class StrategyManager {
  constructor(private config: AIConfig) {}
  
  getAvailableStrategies(gameState: GameState, emotionalState: any): Strategy[] {
    // Return strategies based on current conditions
    // This is a simplified implementation
    return [] // Would return actual strategies
  }
}

class PatternRecognizer {
  analyzePatterns(actions: PlayerAction[]): any[] {
    // Simplified pattern recognition
    return [] // Would return detected patterns
  }
}

class LearningSystem {
  constructor(private config: AIConfig) {}
  
  processExperience(gameState: GameState, memory: AIMemory): void {
    // Process recent experiences for learning
    // This would implement reinforcement learning or similar
  }
}

class DecisionMaker {
  constructor(private config: AIConfig, private memory: AIMemory) {}
  
  makeDecision(gameState: GameState, emotionalState: any, memory: AIMemory): AIDecision | null {
    // Simple decision making - would be more sophisticated in real implementation
    return {
      action: 'observe',
      confidence: 0.5,
      reasoning: 'Gathering information',
      alternativeActions: ['attack', 'defend'],
      expectedOutcome: { success: 0.5 },
      timestamp: Date.now()
    }
  }
}

export default AIOpponent