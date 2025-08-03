/**
 * INFINITE ACTION GAME
 * Fast-paced action game with procedural enemies and power-ups
 * Features: Real-time combat, weapon upgrades, endless waves, physics-based gameplay
 */

import GameEngine, { GameConfig, GameState, GameObject } from '../engine/GameEngine'
import { Vector2 } from '../engine/physics/PhysicsWorld'

export interface Player {
  id: string
  position: Vector2
  velocity: Vector2
  health: number
  maxHealth: number
  energy: number
  maxEnergy: number
  score: number
  level: number
  experience: number
  weapons: Weapon[]
  activeWeapon: Weapon
  abilities: Ability[]
  buffs: Buff[]
}

export interface Enemy {
  id: string
  type: 'grunt' | 'heavy' | 'fast' | 'boss' | 'elite'
  position: Vector2
  velocity: Vector2
  health: number
  maxHealth: number
  damage: number
  speed: number
  reward: number
  aiState: EnemyAIState
  attackCooldown: number
  lastAttack: number
}

export interface Weapon {
  id: string
  name: string
  type: 'pistol' | 'rifle' | 'shotgun' | 'laser' | 'plasma' | 'rocket'
  damage: number
  fireRate: number // shots per second
  range: number
  ammo: number
  maxAmmo: number
  reloadTime: number
  accuracy: number
  level: number
  upgrades: WeaponUpgrade[]
}

export interface WeaponUpgrade {
  id: string
  name: string
  description: string
  cost: number
  effect: string
  value: number
}

export interface Ability {
  id: string
  name: string
  description: string
  cooldown: number
  lastUsed: number
  energyCost: number
  level: number
  effect: AbilityEffect
}

export interface AbilityEffect {
  type: 'damage' | 'heal' | 'shield' | 'speed' | 'slow' | 'stun'
  value: number
  duration: number
  area: number
}

export interface Buff {
  id: string
  name: string
  type: 'damage' | 'speed' | 'health' | 'energy' | 'defense'
  value: number
  duration: number
  remaining: number
}

export interface Projectile {
  id: string
  position: Vector2
  velocity: Vector2
  damage: number
  range: number
  distanceTraveled: number
  ownerId: string
  type: 'bullet' | 'laser' | 'plasma' | 'rocket' | 'energy'
}

export interface PowerUp {
  id: string
  type: 'health' | 'energy' | 'weapon' | 'ammo' | 'experience' | 'buff'
  position: Vector2
  value: any
  duration: number
  lifetime: number
}

export interface EnemyAIState {
  currentTarget?: string
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'retreat' | 'dead'
  lastStateChange: number
  pathfinding: Vector2[]
  aggroRange: number
  attackRange: number
}

export interface ActionGameState {
  player: Player
  enemies: Enemy[]
  projectiles: Projectile[]
  powerUps: PowerUp[]
  wave: number
  waveProgress: number
  enemiesKilled: number
  totalEnemiesThisWave: number
  waveStartTime: number
  gameTime: number
  isPaused: boolean
  difficulty: number
  score: number
  highScore: number
}

export class ActionGame extends GameEngine {
  private actionState: ActionGameState
  private worldBounds = { width: 1200, height: 800 }
  private spawnZones: Vector2[] = []
  private weaponTemplates: Map<string, Weapon> = new Map()
  private enemyTemplates: Map<string, Partial<Enemy>> = new Map()
  private abilityTemplates: Map<string, Ability> = new Map()
  
  // Game balance parameters
  private baseEnemyHealth = 50
  private baseDamage = 25
  private experienceMultiplier = 1.0
  private difficultyScaling = 1.15 // 15% increase per wave
  
  // Input tracking
  private inputState = {
    moveX: 0,
    moveY: 0,
    aim: { x: 0, y: 0 },
    firing: false,
    abilities: [false, false, false, false]
  }

  constructor(canvas: HTMLCanvasElement, difficulty: number = 1) {
    const config: GameConfig = {
      gameId: 'infinite_action',
      name: 'Infinite Action Arena',
      category: 'action',
      targetFPS: 60,
      physics: {
        enabled: true,
        gravity: { x: 0, y: 0 }, // Top-down view
        worldBounds: { width: 1200, height: 800 }
      },
      ai: {
        enabled: true,
        difficulty,
        adaptiveAdjustment: true
      },
      multiplayer: {
        enabled: true,
        maxPlayers: 4,
        syncFrequency: 30 // Higher frequency for action game
      },
      procedural: {
        enabled: true,
        complexity: difficulty
      },
      rewards: {
        baseTokens: 15,
        scalingFactor: 1.3,
        qualityBonus: true
      }
    }

    super(config, canvas)
    
    this.worldBounds = config.physics.worldBounds
    this.actionState = this.initializeActionState()
    this.initializeTemplates()
    this.setupSpawnZones()
    this.setupGameEvents()
  }

  private initializeActionState(): ActionGameState {
    const player = this.createPlayer()
    
    return {
      player,
      enemies: [],
      projectiles: [],
      powerUps: [],
      wave: 1,
      waveProgress: 0,
      enemiesKilled: 0,
      totalEnemiesThisWave: 5,
      waveStartTime: Date.now(),
      gameTime: 0,
      isPaused: false,
      difficulty: 1,
      score: 0,
      highScore: 0
    }
  }

  private createPlayer(): Player {
    const startingWeapon = this.createWeapon('pistol')
    
    return {
      id: 'player',
      position: { x: this.worldBounds.width / 2, y: this.worldBounds.height / 2 },
      velocity: { x: 0, y: 0 },
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      score: 0,
      level: 1,
      experience: 0,
      weapons: [startingWeapon],
      activeWeapon: startingWeapon,
      abilities: [],
      buffs: []
    }
  }

  private initializeTemplates(): void {
    // Weapon templates
    this.weaponTemplates.set('pistol', {
      id: 'pistol', name: 'Pistol', type: 'pistol',
      damage: 25, fireRate: 3, range: 300, ammo: 12, maxAmmo: 12,
      reloadTime: 2000, accuracy: 0.9, level: 1, upgrades: []
    })
    
    this.weaponTemplates.set('rifle', {
      id: 'rifle', name: 'Assault Rifle', type: 'rifle',
      damage: 35, fireRate: 8, range: 400, ammo: 30, maxAmmo: 30,
      reloadTime: 2500, accuracy: 0.85, level: 1, upgrades: []
    })
    
    this.weaponTemplates.set('shotgun', {
      id: 'shotgun', name: 'Shotgun', type: 'shotgun',
      damage: 80, fireRate: 1.5, range: 150, ammo: 8, maxAmmo: 8,
      reloadTime: 3000, accuracy: 0.7, level: 1, upgrades: []
    })

    // Enemy templates
    this.enemyTemplates.set('grunt', {
      type: 'grunt', health: 50, damage: 15, speed: 60, reward: 10,
      aiState: {
        state: 'patrol', lastStateChange: 0, pathfinding: [],
        aggroRange: 200, attackRange: 50, currentTarget: undefined
      }
    })
    
    this.enemyTemplates.set('heavy', {
      type: 'heavy', health: 150, damage: 35, speed: 30, reward: 25,
      aiState: {
        state: 'patrol', lastStateChange: 0, pathfinding: [],
        aggroRange: 250, attackRange: 80, currentTarget: undefined
      }
    })
    
    this.enemyTemplates.set('fast', {
      type: 'fast', health: 30, damage: 20, speed: 120, reward: 15,
      aiState: {
        state: 'patrol', lastStateChange: 0, pathfinding: [],
        aggroRange: 300, attackRange: 40, currentTarget: undefined
      }
    })

    // Ability templates
    this.abilityTemplates.set('heal', {
      id: 'heal', name: 'Heal', description: 'Restore health',
      cooldown: 10000, lastUsed: 0, energyCost: 30, level: 1,
      effect: { type: 'heal', value: 50, duration: 0, area: 0 }
    })
    
    this.abilityTemplates.set('dash', {
      id: 'dash', name: 'Dash', description: 'Quick movement burst',
      cooldown: 5000, lastUsed: 0, energyCost: 20, level: 1,
      effect: { type: 'speed', value: 3, duration: 1000, area: 0 }
    })
  }

  private setupSpawnZones(): void {
    const margin = 100
    this.spawnZones = [
      { x: margin, y: margin }, // Top-left
      { x: this.worldBounds.width - margin, y: margin }, // Top-right
      { x: margin, y: this.worldBounds.height - margin }, // Bottom-left
      { x: this.worldBounds.width - margin, y: this.worldBounds.height - margin }, // Bottom-right
      { x: this.worldBounds.width / 2, y: margin }, // Top-center
      { x: this.worldBounds.width / 2, y: this.worldBounds.height - margin }, // Bottom-center
      { x: margin, y: this.worldBounds.height / 2 }, // Left-center
      { x: this.worldBounds.width - margin, y: this.worldBounds.height / 2 } // Right-center
    ]
  }

  private setupGameEvents(): void {
    this.on('gameInput', (inputEvent) => {
      this.handleActionInput(inputEvent)
    })
    
    this.on('collision', (collision) => {
      this.handleCollision(collision)
    })
    
    this.on('levelCompleted', () => {
      this.startNextWave()
    })
    
    this.on('difficultyAdjusted', (newDifficulty) => {
      this.adjustActionDifficulty(newDifficulty)
    })
  }

  private handleActionInput(inputEvent: any): void {
    switch (inputEvent.type) {
      case 'keydown':
        this.handleKeyDown(inputEvent.key)
        break
      case 'keyup':
        this.handleKeyUp(inputEvent.key)
        break
      case 'mousemove':
        this.updateAim(inputEvent.x, inputEvent.y)
        break
      case 'mousedown':
        if (inputEvent.button === 0) this.inputState.firing = true
        break
      case 'mouseup':
        if (inputEvent.button === 0) this.inputState.firing = false
        break
    }
  }

  private handleKeyDown(key: string): void {
    switch (key.toLowerCase()) {
      case 'w': case 'arrowup': this.inputState.moveY = -1; break
      case 's': case 'arrowdown': this.inputState.moveY = 1; break
      case 'a': case 'arrowleft': this.inputState.moveX = -1; break
      case 'd': case 'arrowright': this.inputState.moveX = 1; break
      case 'r': this.reloadWeapon(); break
      case 'q': this.useAbility(0); break
      case 'e': this.useAbility(1); break
      case 'f': this.useAbility(2); break
      case 'c': this.useAbility(3); break
      case '1': this.switchWeapon(0); break
      case '2': this.switchWeapon(1); break
      case '3': this.switchWeapon(2); break
    }
  }

  private handleKeyUp(key: string): void {
    switch (key.toLowerCase()) {
      case 'w': case 'arrowup':
      case 's': case 'arrowdown':
        this.inputState.moveY = 0; break
      case 'a': case 'arrowleft':
      case 'd': case 'arrowright':
        this.inputState.moveX = 0; break
    }
  }

  private updateAim(x: number, y: number): void {
    this.inputState.aim = { x, y }
  }

  public update(deltaTime: number): void {
    super.update?.(deltaTime)
    
    if (this.actionState.isPaused) return
    
    this.actionState.gameTime += deltaTime
    
    this.updatePlayer(deltaTime)
    this.updateEnemies(deltaTime)
    this.updateProjectiles(deltaTime)
    this.updatePowerUps(deltaTime)
    this.updateBuffs(deltaTime)
    
    this.checkWaveProgress()
    this.spawnEnemies(deltaTime)
    this.spawnPowerUps(deltaTime)
    
    this.checkCollisions()
    this.cleanupObjects()
  }

  private updatePlayer(deltaTime: number): void {
    const player = this.actionState.player
    const moveSpeed = 200 // pixels per second
    
    // Update velocity based on input
    player.velocity.x = this.inputState.moveX * moveSpeed
    player.velocity.y = this.inputState.moveY * moveSpeed
    
    // Apply speed buffs
    let speedMultiplier = 1
    for (const buff of player.buffs) {
      if (buff.type === 'speed') {
        speedMultiplier *= buff.value
      }
    }
    
    player.velocity.x *= speedMultiplier
    player.velocity.y *= speedMultiplier
    
    // Update position
    player.position.x += player.velocity.x * (deltaTime / 1000)
    player.position.y += player.velocity.y * (deltaTime / 1000)
    
    // Keep player in bounds
    player.position.x = Math.max(25, Math.min(this.worldBounds.width - 25, player.position.x))
    player.position.y = Math.max(25, Math.min(this.worldBounds.height - 25, player.position.y))
    
    // Handle firing
    if (this.inputState.firing && this.canFire()) {
      this.fireWeapon()
    }
    
    // Regenerate energy
    if (player.energy < player.maxEnergy) {
      player.energy = Math.min(player.maxEnergy, player.energy + 30 * (deltaTime / 1000))
    }
    
    // Update experience and level
    this.checkLevelUp()
  }

  private updateEnemies(deltaTime: number): void {
    for (const enemy of this.actionState.enemies) {
      this.updateEnemyAI(enemy, deltaTime)
      this.updateEnemyMovement(enemy, deltaTime)
      this.updateEnemyAttack(enemy, deltaTime)
    }
  }

  private updateEnemyAI(enemy: Enemy, deltaTime: number): void {
    const player = this.actionState.player
    const distanceToPlayer = this.getDistance(enemy.position, player.position)
    const currentTime = Date.now()
    
    switch (enemy.aiState.state) {
      case 'patrol':
        if (distanceToPlayer <= enemy.aiState.aggroRange) {
          enemy.aiState.state = 'chase'
          enemy.aiState.currentTarget = 'player'
          enemy.aiState.lastStateChange = currentTime
        }
        break
        
      case 'chase':
        if (distanceToPlayer > enemy.aiState.aggroRange * 1.5) {
          enemy.aiState.state = 'patrol'
          enemy.aiState.currentTarget = undefined
          enemy.aiState.lastStateChange = currentTime
        } else if (distanceToPlayer <= enemy.aiState.attackRange) {
          enemy.aiState.state = 'attack'
          enemy.aiState.lastStateChange = currentTime
        }
        break
        
      case 'attack':
        if (distanceToPlayer > enemy.aiState.attackRange * 1.2) {
          enemy.aiState.state = 'chase'
          enemy.aiState.lastStateChange = currentTime
        }
        break
    }
  }

  private updateEnemyMovement(enemy: Enemy, deltaTime: number): void {
    const player = this.actionState.player
    
    switch (enemy.aiState.state) {
      case 'chase':
        // Move towards player
        const direction = this.normalize({
          x: player.position.x - enemy.position.x,
          y: player.position.y - enemy.position.y
        })
        
        enemy.velocity.x = direction.x * enemy.speed
        enemy.velocity.y = direction.y * enemy.speed
        break
        
      case 'patrol':
        // Random patrol movement
        if (Math.random() < 0.02) { // 2% chance to change direction each frame
          enemy.velocity.x = (Math.random() - 0.5) * enemy.speed * 0.5
          enemy.velocity.y = (Math.random() - 0.5) * enemy.speed * 0.5
        }
        break
        
      case 'attack':
        // Stop moving when attacking
        enemy.velocity.x *= 0.9
        enemy.velocity.y *= 0.9
        break
    }
    
    // Update position
    enemy.position.x += enemy.velocity.x * (deltaTime / 1000)
    enemy.position.y += enemy.velocity.y * (deltaTime / 1000)
    
    // Keep enemy in bounds
    enemy.position.x = Math.max(15, Math.min(this.worldBounds.width - 15, enemy.position.x))
    enemy.position.y = Math.max(15, Math.min(this.worldBounds.height - 15, enemy.position.y))
  }

  private updateEnemyAttack(enemy: Enemy, deltaTime: number): void {
    if (enemy.aiState.state !== 'attack') return
    
    const currentTime = Date.now()
    const timeSinceLastAttack = currentTime - enemy.lastAttack
    
    if (timeSinceLastAttack >= enemy.attackCooldown) {
      this.enemyAttack(enemy)
      enemy.lastAttack = currentTime
    }
  }

  private enemyAttack(enemy: Enemy): void {
    const player = this.actionState.player
    const distance = this.getDistance(enemy.position, player.position)
    
    if (distance <= enemy.aiState.attackRange) {
      // Deal damage to player
      this.damagePlayer(enemy.damage)
      
      // Create visual effect
      this.createAttackEffect(enemy.position, player.position)
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (const projectile of this.actionState.projectiles) {
      // Update position
      projectile.position.x += projectile.velocity.x * (deltaTime / 1000)
      projectile.position.y += projectile.velocity.y * (deltaTime / 1000)
      
      // Update distance traveled
      const frameDistance = Math.sqrt(
        Math.pow(projectile.velocity.x * (deltaTime / 1000), 2) +
        Math.pow(projectile.velocity.y * (deltaTime / 1000), 2)
      )
      projectile.distanceTraveled += frameDistance
    }
  }

  private updatePowerUps(deltaTime: number): void {
    for (const powerUp of this.actionState.powerUps) {
      powerUp.lifetime -= deltaTime
      
      // Check if player is close enough to collect
      const distance = this.getDistance(powerUp.position, this.actionState.player.position)
      if (distance <= 30) { // Collection radius
        this.collectPowerUp(powerUp)
      }
    }
  }

  private updateBuffs(deltaTime: number): void {
    const player = this.actionState.player
    
    for (let i = player.buffs.length - 1; i >= 0; i--) {
      const buff = player.buffs[i]
      buff.remaining -= deltaTime
      
      if (buff.remaining <= 0) {
        player.buffs.splice(i, 1)
      }
    }
  }

  private canFire(): boolean {
    const weapon = this.actionState.player.activeWeapon
    const currentTime = Date.now()
    const timeBetweenShots = 1000 / weapon.fireRate
    
    return weapon.ammo > 0 && (currentTime - (weapon as any).lastFired >= timeBetweenShots)
  }

  private fireWeapon(): void {
    const player = this.actionState.player
    const weapon = player.activeWeapon
    const currentTime = Date.now()
    
    if (weapon.ammo <= 0) return
    
    weapon.ammo--
    ;(weapon as any).lastFired = currentTime
    
    // Calculate projectile direction
    const aimDirection = this.normalize({
      x: this.inputState.aim.x - player.position.x,
      y: this.inputState.aim.y - player.position.y
    })
    
    // Apply accuracy
    const accuracy = weapon.accuracy
    const spread = (1 - accuracy) * 0.2 // Max 20% spread
    const angleSpread = (Math.random() - 0.5) * spread
    
    const finalDirection = this.rotateVector(aimDirection, angleSpread)
    
    // Create projectile(s)
    if (weapon.type === 'shotgun') {
      // Create multiple projectiles for shotgun
      for (let i = 0; i < 5; i++) {
        const shotSpread = (i - 2) * 0.1
        const shotDirection = this.rotateVector(finalDirection, shotSpread)
        this.createProjectile(player.position, shotDirection, weapon)
      }
    } else {
      this.createProjectile(player.position, finalDirection, weapon)
    }
    
    // Create muzzle flash effect
    this.createMuzzleFlash(player.position, finalDirection)
  }

  private createProjectile(startPos: Vector2, direction: Vector2, weapon: Weapon): void {
    const projectileSpeed = 800 // pixels per second
    
    const projectile: Projectile = {
      id: `projectile_${Date.now()}_${Math.random()}`,
      position: { x: startPos.x, y: startPos.y },
      velocity: {
        x: direction.x * projectileSpeed,
        y: direction.y * projectileSpeed
      },
      damage: weapon.damage,
      range: weapon.range,
      distanceTraveled: 0,
      ownerId: 'player',
      type: weapon.type === 'laser' ? 'laser' : 'bullet'
    }
    
    this.actionState.projectiles.push(projectile)
  }

  private reloadWeapon(): void {
    const weapon = this.actionState.player.activeWeapon
    if (weapon.ammo < weapon.maxAmmo) {
      // Start reload animation/timer
      setTimeout(() => {
        weapon.ammo = weapon.maxAmmo
      }, weapon.reloadTime)
    }
  }

  private useAbility(index: number): void {
    const player = this.actionState.player
    if (index >= player.abilities.length) return
    
    const ability = player.abilities[index]
    const currentTime = Date.now()
    
    if (currentTime - ability.lastUsed < ability.cooldown) return
    if (player.energy < ability.energyCost) return
    
    player.energy -= ability.energyCost
    ability.lastUsed = currentTime
    
    this.activateAbility(ability)
  }

  private activateAbility(ability: Ability): void {
    const player = this.actionState.player
    
    switch (ability.effect.type) {
      case 'heal':
        player.health = Math.min(player.maxHealth, player.health + ability.effect.value)
        break
        
      case 'speed':
        player.buffs.push({
          id: `buff_${Date.now()}`,
          name: 'Speed Boost',
          type: 'speed',
          value: ability.effect.value,
          duration: ability.effect.duration,
          remaining: ability.effect.duration
        })
        break
        
      case 'damage':
        // Area damage around player
        this.createAreaDamage(player.position, ability.effect.area, ability.effect.value)
        break
    }
  }

  private switchWeapon(index: number): void {
    const player = this.actionState.player
    if (index < player.weapons.length) {
      player.activeWeapon = player.weapons[index]
    }
  }

  private spawnEnemies(deltaTime: number): void {
    const currentTime = Date.now()
    const timeSinceWaveStart = currentTime - this.actionState.waveStartTime
    const spawnRate = this.calculateSpawnRate()
    
    if (Math.random() < spawnRate * (deltaTime / 1000)) {
      this.spawnRandomEnemy()
    }
    
    // Spawn boss every 10 waves
    if (this.actionState.wave % 10 === 0 && timeSinceWaveStart > 30000 && this.actionState.enemies.length === 0) {
      this.spawnBoss()
    }
  }

  private calculateSpawnRate(): number {
    const baseRate = 0.5 // enemies per second
    const waveMultiplier = 1 + (this.actionState.wave - 1) * 0.1
    const difficultyMultiplier = Math.pow(this.difficultyScaling, this.actionState.difficulty - 1)
    
    return baseRate * waveMultiplier * difficultyMultiplier
  }

  private spawnRandomEnemy(): void {
    const enemyTypes = ['grunt', 'heavy', 'fast']
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]
    const spawnZone = this.spawnZones[Math.floor(Math.random() * this.spawnZones.length)]
    
    this.spawnEnemy(type, spawnZone)
  }

  private spawnEnemy(type: string, position: Vector2): void {
    const template = this.enemyTemplates.get(type)
    if (!template) return
    
    const waveMultiplier = Math.pow(this.difficultyScaling, this.actionState.wave - 1)
    
    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type: template.type!,
      position: { x: position.x, y: position.y },
      velocity: { x: 0, y: 0 },
      health: Math.floor((template.health || 50) * waveMultiplier),
      maxHealth: Math.floor((template.health || 50) * waveMultiplier),
      damage: Math.floor((template.damage || 15) * waveMultiplier),
      speed: template.speed || 60,
      reward: Math.floor((template.reward || 10) * waveMultiplier),
      aiState: { ...template.aiState! },
      attackCooldown: 2000, // 2 seconds
      lastAttack: 0
    }
    
    this.actionState.enemies.push(enemy)
  }

  private spawnBoss(): void {
    const centerPosition = {
      x: this.worldBounds.width / 2,
      y: this.worldBounds.height / 4
    }
    
    const waveMultiplier = Math.pow(this.difficultyScaling, this.actionState.wave - 1)
    
    const boss: Enemy = {
      id: `boss_${Date.now()}`,
      type: 'boss',
      position: centerPosition,
      velocity: { x: 0, y: 0 },
      health: Math.floor(500 * waveMultiplier),
      maxHealth: Math.floor(500 * waveMultiplier),
      damage: Math.floor(50 * waveMultiplier),
      speed: 40,
      reward: Math.floor(200 * waveMultiplier),
      aiState: {
        state: 'chase',
        lastStateChange: 0,
        pathfinding: [],
        aggroRange: 400,
        attackRange: 100,
        currentTarget: 'player'
      },
      attackCooldown: 3000,
      lastAttack: 0
    }
    
    this.actionState.enemies.push(boss)
  }

  private spawnPowerUps(deltaTime: number): void {
    if (Math.random() < 0.001 * (deltaTime / 1000)) { // Low spawn rate
      this.spawnRandomPowerUp()
    }
  }

  private spawnRandomPowerUp(): void {
    const types = ['health', 'energy', 'ammo', 'experience', 'buff']
    const type = types[Math.floor(Math.random() * types.length)]
    
    const position = {
      x: Math.random() * (this.worldBounds.width - 100) + 50,
      y: Math.random() * (this.worldBounds.height - 100) + 50
    }
    
    let value: any
    switch (type) {
      case 'health': value = 50; break
      case 'energy': value = 30; break
      case 'ammo': value = { weapon: 'all', amount: 10 }; break
      case 'experience': value = 100; break
      case 'buff': value = { type: 'damage', value: 1.5, duration: 10000 }; break
    }
    
    const powerUp: PowerUp = {
      id: `powerup_${Date.now()}`,
      type: type as any,
      position,
      value,
      duration: 0,
      lifetime: 30000 // 30 seconds
    }
    
    this.actionState.powerUps.push(powerUp)
  }

  private collectPowerUp(powerUp: PowerUp): void {
    const player = this.actionState.player
    
    switch (powerUp.type) {
      case 'health':
        player.health = Math.min(player.maxHealth, player.health + powerUp.value)
        break
        
      case 'energy':
        player.energy = Math.min(player.maxEnergy, player.energy + powerUp.value)
        break
        
      case 'ammo':
        for (const weapon of player.weapons) {
          weapon.ammo = Math.min(weapon.maxAmmo, weapon.ammo + powerUp.value.amount)
        }
        break
        
      case 'experience':
        player.experience += powerUp.value
        break
        
      case 'buff':
        player.buffs.push({
          id: `buff_${Date.now()}`,
          name: 'Power Up',
          type: powerUp.value.type,
          value: powerUp.value.value,
          duration: powerUp.value.duration,
          remaining: powerUp.value.duration
        })
        break
    }
    
    // Remove power-up
    const index = this.actionState.powerUps.indexOf(powerUp)
    if (index > -1) {
      this.actionState.powerUps.splice(index, 1)
    }
  }

  private checkCollisions(): void {
    // Projectile vs Enemy collisions
    for (const projectile of this.actionState.projectiles) {
      if (projectile.ownerId === 'player') {
        for (const enemy of this.actionState.enemies) {
          if (this.getDistance(projectile.position, enemy.position) <= 20) {
            this.damageEnemy(enemy, projectile.damage)
            this.removeProjectile(projectile)
            break
          }
        }
      }
    }
    
    // Enemy vs Player collisions
    for (const enemy of this.actionState.enemies) {
      if (this.getDistance(enemy.position, this.actionState.player.position) <= 25) {
        this.damagePlayer(enemy.damage * 0.1) // Contact damage
      }
    }
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    enemy.health -= damage
    
    if (enemy.health <= 0) {
      this.killEnemy(enemy)
    }
  }

  private killEnemy(enemy: Enemy): void {
    const player = this.actionState.player
    
    // Award experience and score
    player.experience += enemy.reward
    player.score += enemy.reward
    this.actionState.score += enemy.reward
    this.updateScore(enemy.reward)
    
    this.actionState.enemiesKilled++
    
    // Remove enemy
    const index = this.actionState.enemies.indexOf(enemy)
    if (index > -1) {
      this.actionState.enemies.splice(index, 1)
    }
    
    // Chance to drop power-up
    if (Math.random() < 0.3) {
      this.spawnPowerUpAt(enemy.position)
    }
  }

  private spawnPowerUpAt(position: Vector2): void {
    const types = ['health', 'energy', 'ammo']
    const type = types[Math.floor(Math.random() * types.length)]
    
    let value: any
    switch (type) {
      case 'health': value = 25; break
      case 'energy': value = 15; break
      case 'ammo': value = { weapon: 'all', amount: 5 }; break
    }
    
    const powerUp: PowerUp = {
      id: `powerup_${Date.now()}`,
      type: type as any,
      position: { ...position },
      value,
      duration: 0,
      lifetime: 15000
    }
    
    this.actionState.powerUps.push(powerUp)
  }

  private damagePlayer(damage: number): void {
    const player = this.actionState.player
    let actualDamage = damage
    
    // Apply defense buffs
    for (const buff of player.buffs) {
      if (buff.type === 'defense') {
        actualDamage *= (1 - buff.value)
      }
    }
    
    player.health -= actualDamage
    
    if (player.health <= 0) {
      this.gameOver()
    }
  }

  private checkWaveProgress(): void {
    const enemiesRemaining = this.actionState.enemies.length
    const waveComplete = this.actionState.enemiesKilled >= this.actionState.totalEnemiesThisWave && enemiesRemaining === 0
    
    if (waveComplete) {
      this.completeWave()
    }
  }

  private completeWave(): void {
    this.actionState.wave++
    this.actionState.enemiesKilled = 0
    this.actionState.totalEnemiesThisWave = Math.floor(5 + this.actionState.wave * 1.5)
    this.actionState.waveStartTime = Date.now()
    
    // Award wave completion bonus
    const bonus = this.actionState.wave * 50
    this.actionState.player.experience += bonus
    this.actionState.score += bonus
    this.updateScore(bonus)
    
    this.emit('waveCompleted', {
      wave: this.actionState.wave,
      bonus,
      nextWaveEnemies: this.actionState.totalEnemiesThisWave
    })
  }

  private startNextWave(): void {
    // Procedurally generate next wave content
    this.proceduralGenerator?.generateLevel(this.actionState.wave).then(content => {
      // Apply procedural modifications
      this.applyProceduralContent(content)
    })
  }

  private applyProceduralContent(content: any): void {
    // Apply procedural generation results to the game
    // This could modify enemy types, spawn patterns, power-ups, etc.
  }

  private checkLevelUp(): void {
    const player = this.actionState.player
    const experienceNeeded = player.level * 100
    
    if (player.experience >= experienceNeeded) {
      player.level++
      player.experience -= experienceNeeded
      player.maxHealth += 20
      player.health = player.maxHealth // Full heal on level up
      player.maxEnergy += 10
      player.energy = player.maxEnergy
      
      // Unlock new abilities or weapons
      this.unlockLevelRewards(player.level)
      
      this.emit('levelUp', {
        level: player.level,
        healthIncrease: 20,
        energyIncrease: 10
      })
    }
  }

  private unlockLevelRewards(level: number): void {
    const player = this.actionState.player
    
    if (level === 3 && !player.abilities.find(a => a.id === 'heal')) {
      const healAbility = { ...this.abilityTemplates.get('heal')! }
      player.abilities.push(healAbility)
    }
    
    if (level === 5 && !player.abilities.find(a => a.id === 'dash')) {
      const dashAbility = { ...this.abilityTemplates.get('dash')! }
      player.abilities.push(dashAbility)
    }
    
    if (level === 7 && !player.weapons.find(w => w.type === 'rifle')) {
      const rifle = this.createWeapon('rifle')
      player.weapons.push(rifle)
    }
  }

  private createWeapon(type: string): Weapon {
    const template = this.weaponTemplates.get(type)
    if (!template) throw new Error(`Unknown weapon type: ${type}`)
    
    return {
      ...template,
      id: `${type}_${Date.now()}`,
      upgrades: []
    }
  }

  private cleanupObjects(): void {
    // Remove expired projectiles
    this.actionState.projectiles = this.actionState.projectiles.filter(p => 
      p.distanceTraveled < p.range &&
      p.position.x >= -50 && p.position.x <= this.worldBounds.width + 50 &&
      p.position.y >= -50 && p.position.y <= this.worldBounds.height + 50
    )
    
    // Remove expired power-ups
    this.actionState.powerUps = this.actionState.powerUps.filter(p => p.lifetime > 0)
    
    // Remove dead enemies (already handled in killEnemy)
  }

  private removeProjectile(projectile: Projectile): void {
    const index = this.actionState.projectiles.indexOf(projectile)
    if (index > -1) {
      this.actionState.projectiles.splice(index, 1)
    }
  }

  private adjustActionDifficulty(difficulty: number): void {
    this.actionState.difficulty = difficulty
    this.difficultyScaling = 1.1 + (difficulty * 0.05)
    this.experienceMultiplier = 1.0 + (difficulty * 0.2)
  }

  // Utility methods
  private getDistance(pos1: Vector2, pos2: Vector2): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
  }

  private normalize(vector: Vector2): Vector2 {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    if (length === 0) return { x: 0, y: 0 }
    return { x: vector.x / length, y: vector.y / length }
  }

  private rotateVector(vector: Vector2, angle: number): Vector2 {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      x: vector.x * cos - vector.y * sin,
      y: vector.x * sin + vector.y * cos
    }
  }

  private createMuzzleFlash(position: Vector2, direction: Vector2): void {
    // Visual effect for weapon firing
  }

  private createAttackEffect(from: Vector2, to: Vector2): void {
    // Visual effect for enemy attacks
  }

  private createAreaDamage(center: Vector2, radius: number, damage: number): void {
    for (const enemy of this.actionState.enemies) {
      const distance = this.getDistance(center, enemy.position)
      if (distance <= radius) {
        this.damageEnemy(enemy, damage)
      }
    }
  }

  // Public API methods
  public getActionState(): ActionGameState {
    return { ...this.actionState }
  }

  public getPlayer(): Player {
    return { ...this.actionState.player }
  }

  public getEnemies(): Enemy[] {
    return [...this.actionState.enemies]
  }

  public getCurrentWave(): number {
    return this.actionState.wave
  }

  public getScore(): number {
    return this.actionState.score
  }

  public pauseGame(): void {
    this.actionState.isPaused = true
  }

  public resumeGame(): void {
    this.actionState.isPaused = false
  }

  public upgradeWeapon(weaponId: string, upgradeId: string): boolean {
    const weapon = this.actionState.player.weapons.find(w => w.id === weaponId)
    if (!weapon) return false
    
    // Implementation would depend on upgrade system
    return true
  }
}

export default ActionGame