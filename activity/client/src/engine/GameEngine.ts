/**
 * OPURE INFINITE GAMES ENGINE
 * Advanced game engine for Discord Activities with infinite replayability
 * Features: Physics simulation, procedural generation, AI opponents, real-time multiplayer
 */

import { EventEmitter } from '../utils/EventEmitter'
import { Vector2, PhysicsWorld } from './physics/PhysicsWorld'
import { ProceduralGenerator } from './procedural/ProceduralGenerator'
import { AIOpponent } from './ai/AIOpponent'
import { DifficultyAdjuster } from './ai/DifficultyAdjuster'
import { MultiplayerSync } from './multiplayer/MultiplayerSync'
import { PerformanceMonitor } from './core/PerformanceMonitor'
import { GameRenderer } from './rendering/GameRenderer'
import { InputManager } from './input/InputManager'
import { AudioEngine } from './audio/AudioEngine'

export interface GameConfig {
  gameId: string
  name: string
  category: 'puzzle' | 'action' | 'strategy' | 'idle' | 'multiplayer'
  targetFPS: number
  physics: {
    enabled: boolean
    gravity: Vector2
    worldBounds: { width: number; height: number }
  }
  ai: {
    enabled: boolean
    difficulty: number
    adaptiveAdjustment: boolean
  }
  multiplayer: {
    enabled: boolean
    maxPlayers: number
    syncFrequency: number
  }
  procedural: {
    enabled: boolean
    seed?: number
    complexity: number
  }
  rewards: {
    baseTokens: number
    scalingFactor: number
    qualityBonus: boolean
  }
}

export interface GameState {
  sessionId: string
  gameId: string
  userId: string
  currentLevel: number
  score: number
  difficulty: number
  timeElapsed: number
  isRunning: boolean
  isPaused: boolean
  isCompleted: boolean
  gameData: Record<string, any>
  performanceMetrics: {
    fps: number
    memoryUsage: number
    networkLatency: number
  }
}

export interface GameObject {
  id: string
  type: string
  position: Vector2
  velocity: Vector2
  rotation: number
  scale: Vector2
  properties: Record<string, any>
  components: GameComponent[]
}

export interface GameComponent {
  type: string
  enabled: boolean
  update(deltaTime: number, gameObject: GameObject): void
  render?(renderer: GameRenderer, gameObject: GameObject): void
}

export class GameEngine extends EventEmitter {
  private config: GameConfig
  private state: GameState
  private gameObjects: Map<string, GameObject> = new Map()
  private components: Map<string, GameComponent[]> = new Map()

  // Core systems
  private physicsWorld: PhysicsWorld
  private proceduralGenerator: ProceduralGenerator
  private aiOpponent?: AIOpponent
  private difficultyAdjuster: DifficultyAdjuster
  private multiplayerSync?: MultiplayerSync
  private performanceMonitor: PerformanceMonitor
  private renderer: GameRenderer
  private inputManager: InputManager
  private audioEngine: AudioEngine

  // Game loop
  private isRunning = false
  private lastFrameTime = 0
  private targetFrameTime: number
  private animationFrameId?: number

  // Performance tracking
  private frameCount = 0
  private lastFPSUpdate = 0
  private currentFPS = 0

  constructor(config: GameConfig, canvas: HTMLCanvasElement) {
    super()
    this.config = config
    this.targetFrameTime = 1000 / config.targetFPS

    // Initialize game state
    this.state = {
      sessionId: this.generateSessionId(),
      gameId: config.gameId,
      userId: '', // Will be set when user connects
      currentLevel: 1,
      score: 0,
      difficulty: config.ai.difficulty || 1.0,
      timeElapsed: 0,
      isRunning: false,
      isPaused: false,
      isCompleted: false,
      gameData: {},
      performanceMetrics: {
        fps: 0,
        memoryUsage: 0,
        networkLatency: 0
      }
    }

    // Initialize core systems
    this.physicsWorld = new PhysicsWorld(config.physics)
    this.proceduralGenerator = new ProceduralGenerator(config.procedural)
    this.difficultyAdjuster = new DifficultyAdjuster()
    this.performanceMonitor = new PerformanceMonitor()
    this.renderer = new GameRenderer(canvas)
    this.inputManager = new InputManager(canvas)
    this.audioEngine = new AudioEngine()

    // Initialize AI opponent if enabled
    if (config.ai.enabled) {
      this.aiOpponent = new AIOpponent(config.ai.difficulty)
    }

    // Initialize multiplayer sync if enabled
    if (config.multiplayer.enabled) {
      this.multiplayerSync = new MultiplayerSync(config.multiplayer)
    }

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Input events
    this.inputManager.on('input', (inputEvent) => {
      this.handleInput(inputEvent)
    })

    // Physics events
    this.physicsWorld.on('collision', (collision) => {
      this.handleCollision(collision)
    })

    // Multiplayer events
    if (this.multiplayerSync) {
      this.multiplayerSync.on('playerJoined', (player) => {
        this.emit('playerJoined', player)
      })

      this.multiplayerSync.on('gameStateUpdate', (update) => {
        this.handleMultiplayerUpdate(update)
      })
    }

    // Performance monitoring
    this.performanceMonitor.on('performanceUpdate', (metrics) => {
      this.state.performanceMetrics = metrics
      this.emit('performanceUpdate', metrics)
    })
  }

  public async initialize(userId: string): Promise<void> {
    this.state.userId = userId

    try {
      // Initialize all systems
      await this.renderer.initialize()
      await this.audioEngine.initialize()
      
      if (this.multiplayerSync) {
        await this.multiplayerSync.initialize(userId)
      }

      // Generate initial game content
      const initialContent = await this.proceduralGenerator.generateLevel(1)
      this.loadGameContent(initialContent)

      // Start performance monitoring
      this.performanceMonitor.start()

      this.emit('initialized')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  public start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.state.isRunning = true
    this.lastFrameTime = performance.now()
    
    this.gameLoop()
    this.emit('gameStarted', this.state)
  }

  public pause(): void {
    this.state.isPaused = true
    this.emit('gamePaused', this.state)
  }

  public resume(): void {
    this.state.isPaused = false
    this.lastFrameTime = performance.now()
    this.emit('gameResumed', this.state)
  }

  public stop(): void {
    this.isRunning = false
    this.state.isRunning = false
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }

    this.emit('gameStopped', this.state)
  }

  private gameLoop(): void {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastFrameTime

    // Skip frame if we're too early (frame rate limiting)
    if (deltaTime < this.targetFrameTime) {
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop())
      return
    }

    this.lastFrameTime = currentTime

    // Skip update if paused
    if (!this.state.isPaused) {
      this.update(deltaTime)
    }

    this.render()
    this.updateFPS(currentTime)

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop())
  }

  private update(deltaTime: number): void {
    this.state.timeElapsed += deltaTime

    // Update physics world
    if (this.config.physics.enabled) {
      this.physicsWorld.update(deltaTime)
    }

    // Update all game objects
    for (const [id, gameObject] of this.gameObjects) {
      this.updateGameObject(gameObject, deltaTime)
    }

    // Update AI opponent
    if (this.aiOpponent) {
      this.aiOpponent.update(deltaTime, this.state)
    }

    // Update difficulty adjustment
    if (this.config.ai.adaptiveAdjustment) {
      const newDifficulty = this.difficultyAdjuster.update(this.state)
      if (newDifficulty !== this.state.difficulty) {
        this.state.difficulty = newDifficulty
        this.emit('difficultyAdjusted', newDifficulty)
      }
    }

    // Sync multiplayer state
    if (this.multiplayerSync && this.frameCount % this.config.multiplayer.syncFrequency === 0) {
      this.multiplayerSync.syncState(this.state)
    }

    // Check win/lose conditions
    this.checkGameConditions()

    this.emit('gameUpdate', this.state)
  }

  private render(): void {
    this.renderer.clear()

    // Render all game objects
    for (const [id, gameObject] of this.gameObjects) {
      this.renderer.renderGameObject(gameObject)
    }

    // Render UI elements
    this.renderUI()

    this.renderer.present()
  }

  private renderUI(): void {
    const uiData = {
      score: this.state.score,
      level: this.state.currentLevel,
      difficulty: this.state.difficulty,
      timeElapsed: this.state.timeElapsed,
      fps: this.currentFPS
    }

    this.renderer.renderUI(uiData)
  }

  private updateGameObject(gameObject: GameObject, deltaTime: number): void {
    // Update all components
    const components = this.components.get(gameObject.id) || []
    for (const component of components) {
      if (component.enabled) {
        component.update(deltaTime, gameObject)
      }
    }

    // Update physics if enabled
    if (this.config.physics.enabled) {
      gameObject.position.x += gameObject.velocity.x * deltaTime
      gameObject.position.y += gameObject.velocity.y * deltaTime
    }
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++
    
    if (currentTime - this.lastFPSUpdate >= 1000) {
      this.currentFPS = this.frameCount
      this.frameCount = 0
      this.lastFPSUpdate = currentTime
      this.state.performanceMetrics.fps = this.currentFPS
    }
  }

  private checkGameConditions(): void {
    // Check for level completion
    if (this.isLevelComplete()) {
      this.completeLevel()
    }

    // Check for game over
    if (this.isGameOver()) {
      this.gameOver()
    }
  }

  private isLevelComplete(): boolean {
    // Implementation depends on game type
    // This is a placeholder that can be overridden
    return false
  }

  private isGameOver(): boolean {
    // Implementation depends on game type
    // This is a placeholder that can be overridden
    return false
  }

  private async completeLevel(): Promise<void> {
    this.state.currentLevel++
    
    // Generate next level content
    try {
      const nextLevelContent = await this.proceduralGenerator.generateLevel(this.state.currentLevel)
      this.loadGameContent(nextLevelContent)
      
      this.emit('levelCompleted', {
        level: this.state.currentLevel - 1,
        score: this.state.score,
        tokens: this.calculateTokenReward()
      })
    } catch (error) {
      this.emit('error', error)
    }
  }

  private gameOver(): void {
    this.state.isCompleted = true
    this.stop()

    const finalStats = {
      sessionId: this.state.sessionId,
      score: this.state.score,
      level: this.state.currentLevel,
      timeElapsed: this.state.timeElapsed,
      tokensEarned: this.calculateTokenReward(),
      performanceMetrics: this.state.performanceMetrics
    }

    this.emit('gameOver', finalStats)
  }

  private calculateTokenReward(): number {
    const baseReward = this.config.rewards.baseTokens
    const difficultyMultiplier = this.state.difficulty
    const levelMultiplier = Math.pow(this.config.rewards.scalingFactor, this.state.currentLevel - 1)
    const qualityBonus = this.config.rewards.qualityBonus ? this.calculateQualityBonus() : 1

    return Math.floor(baseReward * difficultyMultiplier * levelMultiplier * qualityBonus)
  }

  private calculateQualityBonus(): number {
    // Quality bonus based on performance metrics
    const fpsRatio = Math.min(this.currentFPS / this.config.targetFPS, 1)
    const timeBonus = Math.max(0, 1 - (this.state.timeElapsed / 300000)) // Bonus for completing quickly
    
    return 1 + (fpsRatio * 0.2) + (timeBonus * 0.3)
  }

  private handleInput(inputEvent: any): void {
    // Broadcast input to all game objects that can handle it
    for (const [id, gameObject] of this.gameObjects) {
      if (gameObject.properties.acceptsInput) {
        this.emit('gameObjectInput', { gameObject, inputEvent })
      }
    }

    this.emit('gameInput', inputEvent)
  }

  private handleCollision(collision: any): void {
    this.emit('collision', collision)
  }

  private handleMultiplayerUpdate(update: any): void {
    // Merge multiplayer state updates
    Object.assign(this.state.gameData, update.gameData || {})
    this.emit('multiplayerUpdate', update)
  }

  private loadGameContent(content: any): void {
    // Clear existing game objects
    this.gameObjects.clear()
    this.components.clear()

    // Load new content
    if (content.gameObjects) {
      for (const obj of content.gameObjects) {
        this.addGameObject(obj)
      }
    }

    if (content.environment) {
      this.applyEnvironmentSettings(content.environment)
    }
  }

  // Public API methods
  public addGameObject(gameObject: GameObject): void {
    this.gameObjects.set(gameObject.id, gameObject)
    
    if (gameObject.components) {
      this.components.set(gameObject.id, gameObject.components)
    }

    // Add to physics world if it has physics
    if (this.config.physics.enabled && gameObject.properties.hasPhysics) {
      this.physicsWorld.addBody(gameObject)
    }
  }

  public removeGameObject(id: string): void {
    const gameObject = this.gameObjects.get(id)
    if (gameObject) {
      this.gameObjects.delete(id)
      this.components.delete(id)
      
      if (this.config.physics.enabled && gameObject.properties.hasPhysics) {
        this.physicsWorld.removeBody(gameObject)
      }
    }
  }

  public getGameObject(id: string): GameObject | undefined {
    return this.gameObjects.get(id)
  }

  public getGameState(): GameState {
    return { ...this.state }
  }

  public updateScore(points: number): void {
    this.state.score += points
    this.emit('scoreUpdate', this.state.score)
  }

  public setDifficulty(difficulty: number): void {
    this.state.difficulty = Math.max(0.1, Math.min(10, difficulty))
    this.emit('difficultyChanged', this.state.difficulty)
  }

  private applyEnvironmentSettings(environment: any): void {
    if (environment.physics) {
      this.physicsWorld.updateSettings(environment.physics)
    }

    if (environment.audio) {
      this.audioEngine.loadEnvironmentAudio(environment.audio)
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  public async saveGameState(): Promise<void> {
    const saveData = {
      sessionId: this.state.sessionId,
      gameId: this.state.gameId,
      userId: this.state.userId,
      state: this.state,
      gameObjects: Array.from(this.gameObjects.entries()),
      timestamp: Date.now()
    }

    this.emit('saveGame', saveData)
  }

  public async loadGameState(saveData: any): Promise<void> {
    this.state = { ...saveData.state }
    
    // Restore game objects
    this.gameObjects.clear()
    this.components.clear()
    
    for (const [id, gameObject] of saveData.gameObjects) {
      this.addGameObject(gameObject)
    }

    this.emit('gameLoaded', this.state)
  }

  public destroy(): void {
    this.stop()
    
    // Cleanup all systems
    this.physicsWorld.destroy()
    this.renderer.destroy()
    this.inputManager.destroy()
    this.audioEngine.destroy()
    this.performanceMonitor.stop()
    
    if (this.multiplayerSync) {
      this.multiplayerSync.destroy()
    }

    // Clear all data
    this.gameObjects.clear()
    this.components.clear()
    this.removeAllListeners()
  }
}

export default GameEngine