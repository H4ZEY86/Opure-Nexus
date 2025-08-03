/**
 * INFINITE PROCEDURAL GENERATION SYSTEM
 * Generates endless, balanced, and engaging content for Discord Activities
 * Features: Seeded generation, difficulty scaling, content variety, performance optimization
 */

import { Vector2 } from '../physics/PhysicsWorld'

export interface ProceduralConfig {
  enabled: boolean
  seed?: number
  complexity: number
  contentTypes: string[]
  balancingRules: BalancingRule[]
}

export interface BalancingRule {
  type: string
  condition: string
  adjustment: number
  maxAdjustment: number
}

export interface GeneratedContent {
  level: number
  seed: number
  difficulty: number
  gameObjects: any[]
  environment: {
    theme: string
    lighting: any
    physics: any
    audio: any
  }
  objectives: Objective[]
  rewards: {
    baseTokens: number
    bonusConditions: BonusCondition[]
  }
  metadata: {
    estimatedDuration: number
    difficultyRating: number
    contentVariety: number
    balanceScore: number
  }
}

export interface Objective {
  id: string
  type: 'collect' | 'destroy' | 'reach' | 'survive' | 'score' | 'time' | 'custom'
  description: string
  target: number
  current: number
  completed: boolean
  priority: number
  rewards: number
}

export interface BonusCondition {
  type: string
  condition: string
  multiplier: number
  description: string
}

// Content templates for different game types
export interface ContentTemplate {
  id: string
  category: string
  type: string
  baseComplexity: number
  scalingFactor: number
  requirements: any
  variants: ContentVariant[]
}

export interface ContentVariant {
  id: string
  weight: number
  modifiers: any
  exclusions: string[]
}

export class ProceduralGenerator {
  private config: ProceduralConfig
  private rng: SeededRandom
  private templates: Map<string, ContentTemplate> = new Map()
  private generationHistory: Map<number, GeneratedContent> = new Map()
  
  // Content pools for variety
  private themes = ['forest', 'space', 'underwater', 'desert', 'city', 'fantasy', 'neon', 'retro']
  private colors = ['blue', 'red', 'green', 'purple', 'orange', 'pink', 'yellow', 'cyan']
  private patterns = ['grid', 'spiral', 'wave', 'random', 'symmetric', 'fractal', 'cluster', 'line']
  
  // Balancing system
  private difficultyTracker = new DifficultyTracker()
  private contentBalancer = new ContentBalancer()

  constructor(config: ProceduralConfig) {
    this.config = config
    this.rng = new SeededRandom(config.seed || Date.now())
    this.initializeTemplates()
  }

  public async generateLevel(level: number, playerStats?: any): Promise<GeneratedContent> {
    const startTime = performance.now()
    
    // Calculate target difficulty based on level and player performance
    const targetDifficulty = this.calculateTargetDifficulty(level, playerStats)
    
    // Select content theme and style
    const theme = this.selectTheme(level)
    const contentStyle = this.selectContentStyle(level, theme)
    
    // Generate core content
    const gameObjects = await this.generateGameObjects(level, targetDifficulty, contentStyle)
    const objectives = this.generateObjectives(level, targetDifficulty, gameObjects)
    const environment = this.generateEnvironment(theme, level)
    
    // Calculate rewards
    const rewards = this.calculateRewards(level, targetDifficulty, objectives)
    
    // Validate and balance content
    const balancedContent = this.balanceContent({
      level,
      seed: this.rng.seed,
      difficulty: targetDifficulty,
      gameObjects,
      environment,
      objectives,
      rewards,
      metadata: {
        estimatedDuration: this.estimateDuration(gameObjects, objectives),
        difficultyRating: targetDifficulty,
        contentVariety: this.calculateVariety(gameObjects),
        balanceScore: 0 // Will be calculated by balancer
      }
    })
    
    // Store generation history
    this.generationHistory.set(level, balancedContent)
    
    const generationTime = performance.now() - startTime
    console.log(`Level ${level} generated in ${generationTime.toFixed(2)}ms`)
    
    return balancedContent
  }

  private calculateTargetDifficulty(level: number, playerStats?: any): number {
    let baseDifficulty = 1 + (level - 1) * 0.15 // 15% increase per level
    
    // Apply complexity modifier
    baseDifficulty *= this.config.complexity
    
    // Adjust based on player performance
    if (playerStats) {
      const performanceModifier = this.difficultyTracker.calculateAdjustment(playerStats)
      baseDifficulty *= performanceModifier
    }
    
    // Cap difficulty to reasonable bounds
    return Math.max(0.5, Math.min(10, baseDifficulty))
  }

  private selectTheme(level: number): string {
    // Use level to influence theme selection while maintaining variety
    const themeIndex = (level - 1) % this.themes.length
    const randomOffset = this.rng.nextInt(0, 2) // Small random offset
    const finalIndex = (themeIndex + randomOffset) % this.themes.length
    
    return this.themes[finalIndex]
  }

  private selectContentStyle(level: number, theme: string): any {
    return {
      theme,
      colorScheme: this.rng.choice(this.colors),
      pattern: this.rng.choice(this.patterns),
      density: 0.3 + (level * 0.02), // Gradually increase density
      variety: Math.min(0.8, 0.2 + (level * 0.03)) // Increase variety over time
    }
  }

  private async generateGameObjects(level: number, difficulty: number, style: any): Promise<any[]> {
    const gameObjects: any[] = []
    const objectCount = this.calculateObjectCount(level, difficulty)
    
    // Generate different types of objects based on templates
    const availableTemplates = this.getAvailableTemplates(level, difficulty)
    
    for (let i = 0; i < objectCount; i++) {
      const template = this.rng.choice(availableTemplates)
      const gameObject = await this.generateFromTemplate(template, level, difficulty, style, i)
      
      if (gameObject) {
        gameObjects.push(gameObject)
      }
    }
    
    // Ensure minimum required objects
    this.ensureMinimumObjects(gameObjects, level, difficulty)
    
    // Apply spatial distribution
    this.applyLayoutPattern(gameObjects, style.pattern)
    
    return gameObjects
  }

  private calculateObjectCount(level: number, difficulty: number): number {
    const baseCount = 10
    const levelMultiplier = 1 + (level - 1) * 0.2
    const difficultyMultiplier = 0.8 + (difficulty * 0.4)
    
    return Math.floor(baseCount * levelMultiplier * difficultyMultiplier)
  }

  private getAvailableTemplates(level: number, difficulty: number): ContentTemplate[] {
    const available: ContentTemplate[] = []
    
    for (const template of this.templates.values()) {
      // Check if template is appropriate for current level/difficulty
      if (this.isTemplateAvailable(template, level, difficulty)) {
        available.push(template)
      }
    }
    
    return available.length > 0 ? available : Array.from(this.templates.values())
  }

  private isTemplateAvailable(template: ContentTemplate, level: number, difficulty: number): boolean {
    // Complex availability logic
    const minLevel = template.requirements?.minLevel || 1
    const maxLevel = template.requirements?.maxLevel || Infinity
    const minDifficulty = template.requirements?.minDifficulty || 0
    const maxDifficulty = template.requirements?.maxDifficulty || 10
    
    return level >= minLevel && level <= maxLevel &&
           difficulty >= minDifficulty && difficulty <= maxDifficulty
  }

  private async generateFromTemplate(
    template: ContentTemplate, 
    level: number, 
    difficulty: number, 
    style: any, 
    index: number
  ): Promise<any | null> {
    try {
      // Select variant
      const variant = this.selectVariant(template, level, difficulty)
      
      // Calculate properties
      const scaledComplexity = template.baseComplexity * Math.pow(template.scalingFactor, level - 1)
      const properties = this.calculateObjectProperties(template, variant, scaledComplexity, difficulty)
      
      // Generate object
      const gameObject = {
        id: `${template.type}_${level}_${index}`,
        type: template.type,
        category: template.category,
        position: { x: 0, y: 0 }, // Will be set by layout
        velocity: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: properties.scale, y: properties.scale },
        properties: {
          ...properties,
          templateId: template.id,
          variantId: variant.id,
          generatedFor: { level, difficulty }
        },
        components: this.generateComponents(template, variant, properties)
      }
      
      return gameObject
    } catch (error) {
      console.warn(`Failed to generate object from template ${template.id}:`, error)
      return null
    }
  }

  private selectVariant(template: ContentTemplate, level: number, difficulty: number): ContentVariant {
    // Weight-based selection with level/difficulty influence
    const availableVariants = template.variants.filter(v => 
      !v.exclusions.includes(`level_${level}`) &&
      !v.exclusions.includes(`difficulty_${Math.floor(difficulty)}`)
    )
    
    if (availableVariants.length === 0) {
      return template.variants[0] // Fallback
    }
    
    return this.rng.weightedChoice(availableVariants, v => v.weight)
  }

  private calculateObjectProperties(template: ContentTemplate, variant: ContentVariant, complexity: number, difficulty: number): any {
    const baseProps = {
      health: 100,
      damage: 10,
      speed: 50,
      scale: 1,
      value: 10,
      mass: 1,
      restitution: 0.5,
      friction: 0.3
    }
    
    // Apply template modifiers
    const templateProps = { ...baseProps, ...template.requirements?.defaultProperties }
    
    // Apply variant modifiers
    const variantProps = { ...templateProps }
    if (variant.modifiers) {
      for (const [key, modifier] of Object.entries(variant.modifiers)) {
        if (typeof modifier === 'number') {
          variantProps[key] = (variantProps[key] || 1) * modifier
        } else if (typeof modifier === 'object' && modifier.type === 'add') {
          variantProps[key] = (variantProps[key] || 0) + modifier.value
        }
      }
    }
    
    // Apply complexity scaling
    const complexityScaling = {
      health: 1 + (complexity - 1) * 0.3,
      damage: 1 + (complexity - 1) * 0.2,
      speed: 1 + (complexity - 1) * 0.15,
      value: 1 + (complexity - 1) * 0.5
    }
    
    for (const [key, scale] of Object.entries(complexityScaling)) {
      if (variantProps[key]) {
        variantProps[key] *= scale
      }
    }
    
    // Apply difficulty scaling
    const difficultyScaling = {
      health: 0.7 + (difficulty * 0.6),
      damage: 0.8 + (difficulty * 0.4),
      speed: 0.9 + (difficulty * 0.2)
    }
    
    for (const [key, scale] of Object.entries(difficultyScaling)) {
      if (variantProps[key]) {
        variantProps[key] *= scale
      }
    }
    
    return variantProps
  }

  private generateComponents(template: ContentTemplate, variant: ContentVariant, properties: any): any[] {
    const components = []
    
    // Standard components based on template type
    switch (template.category) {
      case 'collectible':
        components.push({
          type: 'CollectibleComponent',
          enabled: true,
          value: properties.value,
          autoCollect: properties.autoCollect || false
        })
        break
      
      case 'enemy':
        components.push({
          type: 'EnemyComponent',
          enabled: true,
          health: properties.health,
          damage: properties.damage,
          attackRange: properties.attackRange || 50,
          movementPattern: properties.movementPattern || 'random'
        })
        break
      
      case 'obstacle':
        components.push({
          type: 'ObstacleComponent',
          enabled: true,
          destructible: properties.destructible || false,
          damage: properties.damage || 0
        })
        break
      
      case 'powerup':
        components.push({
          type: 'PowerupComponent',
          enabled: true,
          effect: properties.effect,
          duration: properties.duration || 10000,
          value: properties.value
        })
        break
    }
    
    // Add physics component if needed
    if (properties.hasPhysics !== false) {
      components.push({
        type: 'PhysicsComponent',
        enabled: true,
        mass: properties.mass,
        restitution: properties.restitution,
        friction: properties.friction,
        isStatic: properties.isStatic || false
      })
    }
    
    // Add rendering component
    components.push({
      type: 'RenderComponent',
      enabled: true,
      sprite: properties.sprite || template.type,
      color: properties.color,
      scale: properties.scale,
      opacity: properties.opacity || 1
    })
    
    return components
  }

  private ensureMinimumObjects(gameObjects: any[], level: number, difficulty: number): void {
    const requiredTypes = {
      collectible: Math.max(3, Math.floor(level * 0.5)),
      enemy: Math.max(1, Math.floor(difficulty)),
      powerup: Math.max(1, Math.floor(level * 0.3))
    }
    
    for (const [type, minCount] of Object.entries(requiredTypes)) {
      const currentCount = gameObjects.filter(obj => obj.category === type).length
      
      if (currentCount < minCount) {
        const template = this.templates.get(`basic_${type}`)
        if (template) {
          for (let i = 0; i < minCount - currentCount; i++) {
            const obj = this.generateFromTemplate(template, level, difficulty, {}, gameObjects.length + i)
            if (obj) {
              gameObjects.push(obj)
            }
          }
        }
      }
    }
  }

  private applyLayoutPattern(gameObjects: any[], pattern: string): void {
    const bounds = { width: 800, height: 600 } // TODO: Get from config
    
    switch (pattern) {
      case 'grid':
        this.applyGridLayout(gameObjects, bounds)
        break
      case 'spiral':
        this.applySpiralLayout(gameObjects, bounds)
        break
      case 'wave':
        this.applyWaveLayout(gameObjects, bounds)
        break
      case 'cluster':
        this.applyClusterLayout(gameObjects, bounds)
        break
      case 'symmetric':
        this.applySymmetricLayout(gameObjects, bounds)
        break
      default:
        this.applyRandomLayout(gameObjects, bounds)
    }
  }

  private applyGridLayout(gameObjects: any[], bounds: any): void {
    const cols = Math.ceil(Math.sqrt(gameObjects.length))
    const rows = Math.ceil(gameObjects.length / cols)
    const cellWidth = bounds.width / cols
    const cellHeight = bounds.height / rows
    
    gameObjects.forEach((obj, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      obj.position.x = col * cellWidth + cellWidth / 2
      obj.position.y = row * cellHeight + cellHeight / 2
    })
  }

  private applySpiralLayout(gameObjects: any[], bounds: any): void {
    const centerX = bounds.width / 2
    const centerY = bounds.height / 2
    const maxRadius = Math.min(bounds.width, bounds.height) / 2 * 0.8
    
    gameObjects.forEach((obj, index) => {
      const angle = index * 0.5
      const radius = (index / gameObjects.length) * maxRadius
      obj.position.x = centerX + Math.cos(angle) * radius
      obj.position.y = centerY + Math.sin(angle) * radius
    })
  }

  private applyWaveLayout(gameObjects: any[], bounds: any): void {
    const amplitude = bounds.height * 0.3
    const frequency = 2 * Math.PI / bounds.width
    const centerY = bounds.height / 2
    
    gameObjects.forEach((obj, index) => {
      const x = (index / gameObjects.length) * bounds.width
      const y = centerY + Math.sin(x * frequency) * amplitude
      obj.position.x = x
      obj.position.y = y
    })
  }

  private applyClusterLayout(gameObjects: any[], bounds: any): void {
    const clusterCount = Math.min(5, Math.max(2, Math.floor(gameObjects.length / 8)))
    const clusters: Vector2[] = []
    
    // Generate cluster centers
    for (let i = 0; i < clusterCount; i++) {
      clusters.push({
        x: this.rng.nextFloat(bounds.width * 0.2, bounds.width * 0.8),
        y: this.rng.nextFloat(bounds.height * 0.2, bounds.height * 0.8)
      })
    }
    
    // Assign objects to clusters
    gameObjects.forEach((obj, index) => {
      const clusterIndex = index % clusterCount
      const cluster = clusters[clusterIndex]
      const offset = this.rng.nextFloat(0, 50)
      const angle = this.rng.nextFloat(0, Math.PI * 2)
      
      obj.position.x = cluster.x + Math.cos(angle) * offset
      obj.position.y = cluster.y + Math.sin(angle) * offset
    })
  }

  private applySymmetricLayout(gameObjects: any[], bounds: any): void {
    const centerX = bounds.width / 2
    const centerY = bounds.height / 2
    
    for (let i = 0; i < gameObjects.length; i += 2) {
      const angle = (i / 2) * (Math.PI * 2 / Math.floor(gameObjects.length / 2))
      const radius = this.rng.nextFloat(50, Math.min(bounds.width, bounds.height) / 2 * 0.7)
      
      // Place first object
      gameObjects[i].position.x = centerX + Math.cos(angle) * radius
      gameObjects[i].position.y = centerY + Math.sin(angle) * radius
      
      // Place symmetric object if exists
      if (i + 1 < gameObjects.length) {
        gameObjects[i + 1].position.x = centerX - Math.cos(angle) * radius
        gameObjects[i + 1].position.y = centerY - Math.sin(angle) * radius
      }
    }
  }

  private applyRandomLayout(gameObjects: any[], bounds: any): void {
    const margin = 50
    
    gameObjects.forEach(obj => {
      obj.position.x = this.rng.nextFloat(margin, bounds.width - margin)
      obj.position.y = this.rng.nextFloat(margin, bounds.height - margin)
    })
  }

  private generateObjectives(level: number, difficulty: number, gameObjects: any[]): Objective[] {
    const objectives: Objective[] = []
    
    // Primary objective (always present)
    const primaryObjective = this.generatePrimaryObjective(level, difficulty, gameObjects)
    objectives.push(primaryObjective)
    
    // Secondary objectives (optional, based on level)
    if (level > 2) {
      const secondaryCount = Math.min(3, Math.floor(level / 3))
      for (let i = 0; i < secondaryCount; i++) {
        const secondary = this.generateSecondaryObjective(level, difficulty, gameObjects, i)
        if (secondary) {
          objectives.push(secondary)
        }
      }
    }
    
    return objectives
  }

  private generatePrimaryObjective(level: number, difficulty: number, gameObjects: any[]): Objective {
    const collectibles = gameObjects.filter(obj => obj.category === 'collectible')
    const enemies = gameObjects.filter(obj => obj.category === 'enemy')
    
    // Choose primary objective type based on available objects
    if (collectibles.length > 0) {
      const target = Math.max(Math.floor(collectibles.length * 0.7), 1)
      return {
        id: 'primary_collect',
        type: 'collect',
        description: `Collect ${target} items`,
        target,
        current: 0,
        completed: false,
        priority: 1,
        rewards: Math.floor(50 * difficulty)
      }
    } else if (enemies.length > 0) {
      const target = Math.max(Math.floor(enemies.length * 0.8), 1)
      return {
        id: 'primary_destroy',
        type: 'destroy',
        description: `Defeat ${target} enemies`,
        target,
        current: 0,
        completed: false,
        priority: 1,
        rewards: Math.floor(75 * difficulty)
      }
    } else {
      // Fallback to score objective
      const target = Math.floor(500 * level * difficulty)
      return {
        id: 'primary_score',
        type: 'score',
        description: `Reach ${target} points`,
        target,
        current: 0,
        completed: false,
        priority: 1,
        rewards: Math.floor(40 * difficulty)
      }
    }
  }

  private generateSecondaryObjective(level: number, difficulty: number, gameObjects: any[], index: number): Objective | null {
    const objectiveTypes = ['time', 'collect', 'destroy', 'survive']
    const type = this.rng.choice(objectiveTypes)
    
    switch (type) {
      case 'time':
        const timeLimit = Math.max(30, 180 - (level * 5)) // Faster completion for higher levels
        return {
          id: `secondary_time_${index}`,
          type: 'time',
          description: `Complete in under ${timeLimit} seconds`,
          target: timeLimit * 1000, // Convert to milliseconds
          current: 0,
          completed: false,
          priority: 2,
          rewards: Math.floor(25 * difficulty)
        }
      
      case 'survive':
        const survivalTime = Math.min(60, 15 + (level * 3))
        return {
          id: `secondary_survive_${index}`,
          type: 'survive',
          description: `Survive for ${survivalTime} seconds`,
          target: survivalTime * 1000,
          current: 0,
          completed: false,
          priority: 2,
          rewards: Math.floor(30 * difficulty)
        }
      
      default:
        return null
    }
  }

  private generateEnvironment(theme: string, level: number): any {
    return {
      theme,
      lighting: this.generateLighting(theme, level),
      physics: this.generatePhysicsSettings(theme, level),
      audio: this.generateAudioSettings(theme, level),
      effects: this.generateEffects(theme, level)
    }
  }

  private generateLighting(theme: string, level: number): any {
    const baseSettings = {
      ambient: 0.3,
      directional: 0.7,
      color: '#ffffff'
    }
    
    switch (theme) {
      case 'space':
        return { ...baseSettings, ambient: 0.1, color: '#4a90e2' }
      case 'underwater':
        return { ...baseSettings, ambient: 0.4, color: '#00b4d8' }
      case 'desert':
        return { ...baseSettings, ambient: 0.6, color: '#ffb700' }
      case 'neon':
        return { ...baseSettings, ambient: 0.2, color: '#ff00ff' }
      default:
        return baseSettings
    }
  }

  private generatePhysicsSettings(theme: string, level: number): any {
    const baseGravity = { x: 0, y: 980 } // Standard gravity
    
    switch (theme) {
      case 'space':
        return { gravity: { x: 0, y: 100 } } // Low gravity
      case 'underwater':
        return { gravity: { x: 0, y: 300 }, drag: 0.05 } // Reduced gravity, increased drag
      default:
        return { gravity: baseGravity }
    }
  }

  private generateAudioSettings(theme: string, level: number): any {
    return {
      backgroundMusic: `${theme}_ambient`,
      soundEffects: {
        collect: `${theme}_collect`,
        destroy: `${theme}_destroy`,
        powerup: `${theme}_powerup`
      },
      volume: {
        master: 0.7,
        music: 0.5,
        effects: 0.8
      }
    }
  }

  private generateEffects(theme: string, level: number): any {
    return {
      particles: theme === 'space' ? 'stars' : theme === 'underwater' ? 'bubbles' : 'none',
      backgroundAnimation: true,
      postProcessing: level > 5 // Enable advanced effects for higher levels
    }
  }

  private calculateRewards(level: number, difficulty: number, objectives: Objective[]): any {
    const baseTokens = 10 + (level * 5)
    const difficultyMultiplier = 1 + (difficulty - 1) * 0.3
    const objectiveBonus = objectives.reduce((sum, obj) => sum + obj.rewards, 0)
    
    return {
      baseTokens: Math.floor(baseTokens * difficultyMultiplier),
      bonusConditions: [
        {
          type: 'perfect_completion',
          condition: 'Complete all objectives',
          multiplier: 1.5,
          description: '50% bonus for perfect completion'
        },
        {
          type: 'speed_bonus',
          condition: 'Complete quickly',
          multiplier: 1.2,
          description: '20% bonus for fast completion'
        },
        {
          type: 'no_damage',
          condition: 'Take no damage',
          multiplier: 1.3,
          description: '30% bonus for flawless performance'
        }
      ]
    }
  }

  private balanceContent(content: GeneratedContent): GeneratedContent {
    const balanceScore = this.contentBalancer.analyzeBalance(content)
    
    if (balanceScore < 0.6) {
      // Apply balancing adjustments
      content = this.contentBalancer.applyBalancing(content, this.config.balancingRules)
    }
    
    content.metadata.balanceScore = balanceScore
    return content
  }

  private estimateDuration(gameObjects: any[], objectives: Objective[]): number {
    // Estimate based on objectives and object count
    const baseTime = 60 // 1 minute base
    const objectiveTime = objectives.reduce((sum, obj) => {
      switch (obj.type) {
        case 'collect': return sum + (obj.target * 2)
        case 'destroy': return sum + (obj.target * 5)
        case 'time': return sum + (obj.target / 1000)
        default: return sum + 30
      }
    }, 0)
    
    return baseTime + objectiveTime
  }

  private calculateVariety(gameObjects: any[]): number {
    const types = new Set(gameObjects.map(obj => obj.type))
    const categories = new Set(gameObjects.map(obj => obj.category))
    
    return (types.size + categories.size) / (gameObjects.length + 1)
  }

  private initializeTemplates(): void {
    // Initialize basic templates for all game types
    const basicTemplates: ContentTemplate[] = [
      {
        id: 'basic_collectible',
        category: 'collectible',
        type: 'coin',
        baseComplexity: 1,
        scalingFactor: 1.1,
        requirements: { minLevel: 1 },
        variants: [
          { id: 'standard', weight: 1, modifiers: {}, exclusions: [] },
          { id: 'valuable', weight: 0.3, modifiers: { value: 2 }, exclusions: [] }
        ]
      },
      {
        id: 'basic_enemy',
        category: 'enemy',
        type: 'guard',
        baseComplexity: 1.5,
        scalingFactor: 1.2,
        requirements: { minLevel: 1 },
        variants: [
          { id: 'weak', weight: 1, modifiers: { health: 0.8, damage: 0.8 }, exclusions: [] },
          { id: 'strong', weight: 0.5, modifiers: { health: 1.5, damage: 1.2 }, exclusions: [] }
        ]
      },
      {
        id: 'basic_obstacle',
        category: 'obstacle',
        type: 'wall',
        baseComplexity: 1,
        scalingFactor: 1.05,
        requirements: { minLevel: 1 },
        variants: [
          { id: 'solid', weight: 1, modifiers: { destructible: false }, exclusions: [] },
          { id: 'breakable', weight: 0.7, modifiers: { destructible: true, health: 50 }, exclusions: [] }
        ]
      },
      {
        id: 'basic_powerup',
        category: 'powerup',
        type: 'speed_boost',
        baseComplexity: 1,
        scalingFactor: 1.1,
        requirements: { minLevel: 2 },
        variants: [
          { id: 'short', weight: 1, modifiers: { duration: 5000, effect: 'speed', value: 1.5 }, exclusions: [] },
          { id: 'long', weight: 0.4, modifiers: { duration: 10000, effect: 'speed', value: 1.3 }, exclusions: [] }
        ]
      }
    ]
    
    for (const template of basicTemplates) {
      this.templates.set(template.id, template)
    }
  }

  // Public API methods
  public getSeed(): number {
    return this.rng.seed
  }

  public setSeed(seed: number): void {
    this.rng = new SeededRandom(seed)
  }

  public getGenerationHistory(): Map<number, GeneratedContent> {
    return this.generationHistory
  }

  public clearHistory(): void {
    this.generationHistory.clear()
  }

  public addTemplate(template: ContentTemplate): void {
    this.templates.set(template.id, template)
  }

  public removeTemplate(templateId: string): void {
    this.templates.delete(templateId)
  }

  public getTemplates(): ContentTemplate[] {
    return Array.from(this.templates.values())
  }

  public updateConfig(newConfig: Partial<ProceduralConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// Seeded random number generator for consistent generation
class SeededRandom {
  public seed: number
  private state: number

  constructor(seed: number) {
    this.seed = seed
    this.state = seed
  }

  public next(): number {
    this.state = (this.state * 9301 + 49297) % 233280
    return this.state / 233280
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  public nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  public choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)]
  }

  public weightedChoice<T>(items: T[], weightFn: (item: T) => number): T {
    const totalWeight = items.reduce((sum, item) => sum + weightFn(item), 0)
    let random = this.nextFloat(0, totalWeight)
    
    for (const item of items) {
      random -= weightFn(item)
      if (random <= 0) {
        return item
      }
    }
    
    return items[items.length - 1] // Fallback
  }
}

// Difficulty tracking for adaptive generation
class DifficultyTracker {
  private performanceHistory: any[] = []
  private targetSuccessRate = 0.7 // 70% success rate target

  public calculateAdjustment(playerStats: any): number {
    if (!playerStats) return 1

    this.performanceHistory.push(playerStats)
    
    // Keep only recent history
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift()
    }

    const recentPerformance = this.performanceHistory.slice(-5)
    const successRate = recentPerformance.reduce((sum, stats) => sum + (stats.completed ? 1 : 0), 0) / recentPerformance.length
    const avgCompletionTime = recentPerformance.reduce((sum, stats) => sum + stats.completionTime, 0) / recentPerformance.length
    const avgScore = recentPerformance.reduce((sum, stats) => sum + stats.score, 0) / recentPerformance.length

    let adjustment = 1

    // Adjust based on success rate
    if (successRate > this.targetSuccessRate + 0.2) {
      adjustment *= 1.2 // Increase difficulty
    } else if (successRate < this.targetSuccessRate - 0.2) {
      adjustment *= 0.8 // Decrease difficulty
    }

    // Fine-tune based on completion time and score
    if (avgCompletionTime < 30000 || avgScore > 1000) { // Very fast or high score
      adjustment *= 1.1
    } else if (avgCompletionTime > 120000 || avgScore < 200) { // Very slow or low score
      adjustment *= 0.9
    }

    return Math.max(0.3, Math.min(3, adjustment))
  }
}

// Content balancing system
class ContentBalancer {
  public analyzeBalance(content: GeneratedContent): number {
    let score = 1

    // Check objective balance
    const objectives = content.gameObjects.filter(obj => obj.category === 'collectible').length
    const enemies = content.gameObjects.filter(obj => obj.category === 'enemy').length
    const powerups = content.gameObjects.filter(obj => obj.category === 'powerup').length

    // Penalty for too few objectives
    if (objectives < 3) score *= 0.8
    
    // Penalty for too many enemies relative to objectives
    if (enemies > objectives * 1.5) score *= 0.7
    
    // Bonus for good powerup distribution
    if (powerups >= Math.max(1, Math.floor(content.level / 3))) score *= 1.1

    // Check difficulty progression
    if (content.difficulty < content.level * 0.8) score *= 0.9 // Too easy
    if (content.difficulty > content.level * 2) score *= 0.8 // Too hard

    return Math.max(0, Math.min(1, score))
  }

  public applyBalancing(content: GeneratedContent, rules: BalancingRule[]): GeneratedContent {
    // Apply balancing rules to adjust content
    for (const rule of rules) {
      content = this.applyRule(content, rule)
    }

    return content
  }

  private applyRule(content: GeneratedContent, rule: BalancingRule): GeneratedContent {
    // Implementation of specific balancing rules
    // This is a simplified version - real implementation would be more complex
    switch (rule.type) {
      case 'enemy_scaling':
        const enemies = content.gameObjects.filter(obj => obj.category === 'enemy')
        enemies.forEach(enemy => {
          enemy.properties.health *= Math.max(0.5, Math.min(2, 1 + rule.adjustment))
        })
        break
      
      case 'reward_adjustment':
        content.rewards.baseTokens *= Math.max(0.5, Math.min(2, 1 + rule.adjustment))
        break
    }

    return content
  }
}

export default ProceduralGenerator