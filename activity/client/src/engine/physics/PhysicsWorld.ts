/**
 * HIGH-PERFORMANCE PHYSICS SIMULATION SYSTEM
 * Optimized for browser-based Discord Activities with 60+ FPS performance
 */

import { EventEmitter } from '../../utils/EventEmitter'

export interface Vector2 {
  x: number
  y: number
}

export interface AABB {
  min: Vector2
  max: Vector2
}

export interface PhysicsBody {
  id: string
  position: Vector2
  velocity: Vector2
  acceleration: Vector2
  mass: number
  restitution: number // Bounciness (0-1)
  friction: number // Friction coefficient (0-1)
  drag: number // Air resistance
  isStatic: boolean
  isKinematic: boolean
  isSensor: boolean // Collides but doesn't resolve
  shape: CollisionShape
  bounds: AABB
  userData?: any
}

export interface CollisionShape {
  type: 'circle' | 'rectangle' | 'polygon'
  radius?: number // For circles
  width?: number // For rectangles
  height?: number // For rectangles
  vertices?: Vector2[] // For polygons
}

export interface CollisionInfo {
  bodyA: PhysicsBody
  bodyB: PhysicsBody
  normal: Vector2
  penetration: number
  contactPoints: Vector2[]
  timestamp: number
}

export interface PhysicsConfig {
  enabled: boolean
  gravity: Vector2
  worldBounds: { width: number; height: number }
  timeStep: number
  velocityIterations: number
  positionIterations: number
  enableSleeping: boolean
  sleepThreshold: number
}

export class PhysicsWorld extends EventEmitter {
  private config: PhysicsConfig
  private bodies: Map<string, PhysicsBody> = new Map()
  private staticBodies: PhysicsBody[] = []
  private dynamicBodies: PhysicsBody[] = []
  private sleepingBodies: Set<string> = new Set()
  
  // Collision detection optimization
  private spatialGrid: SpatialGrid
  private broadPhaseEnabled = true
  
  // Performance tracking
  private lastUpdateTime = 0
  private updateCount = 0
  private collisionCount = 0

  constructor(config: PhysicsConfig) {
    super()
    this.config = {
      timeStep: 1/60, // 60 FPS
      velocityIterations: 8,
      positionIterations: 3,
      enableSleeping: true,
      sleepThreshold: 0.1,
      ...config
    }

    this.spatialGrid = new SpatialGrid(
      this.config.worldBounds.width,
      this.config.worldBounds.height,
      64 // Cell size for spatial partitioning
    )
  }

  public addBody(gameObject: any): PhysicsBody {
    const body: PhysicsBody = {
      id: gameObject.id,
      position: { ...gameObject.position },
      velocity: { ...gameObject.velocity },
      acceleration: { x: 0, y: 0 },
      mass: gameObject.properties.mass || 1,
      restitution: gameObject.properties.restitution || 0.5,
      friction: gameObject.properties.friction || 0.3,
      drag: gameObject.properties.drag || 0.01,
      isStatic: gameObject.properties.isStatic || false,
      isKinematic: gameObject.properties.isKinematic || false,
      isSensor: gameObject.properties.isSensor || false,
      shape: this.createCollisionShape(gameObject),
      bounds: this.calculateAABB(gameObject),
      userData: gameObject
    }

    this.bodies.set(body.id, body)
    
    if (body.isStatic) {
      this.staticBodies.push(body)
    } else {
      this.dynamicBodies.push(body)
    }

    this.spatialGrid.insert(body)
    return body
  }

  public removeBody(gameObject: any): void {
    const body = this.bodies.get(gameObject.id)
    if (!body) return

    this.bodies.delete(gameObject.id)
    this.sleepingBodies.delete(gameObject.id)
    
    // Remove from arrays
    if (body.isStatic) {
      const index = this.staticBodies.indexOf(body)
      if (index > -1) this.staticBodies.splice(index, 1)
    } else {
      const index = this.dynamicBodies.indexOf(body)
      if (index > -1) this.dynamicBodies.splice(index, 1)
    }

    this.spatialGrid.remove(body)
  }

  public update(deltaTime: number): void {
    if (!this.config.enabled) return

    const currentTime = performance.now()
    this.updateCount++

    // Fixed timestep physics for consistency
    const fixedDelta = this.config.timeStep * 1000 // Convert to milliseconds
    let accumulator = deltaTime

    while (accumulator >= fixedDelta) {
      this.step(fixedDelta / 1000) // Convert back to seconds
      accumulator -= fixedDelta
    }

    // Update spatial grid
    this.spatialGrid.clear()
    for (const body of this.dynamicBodies) {
      if (!this.sleepingBodies.has(body.id)) {
        this.spatialGrid.insert(body)
      }
    }
    for (const body of this.staticBodies) {
      this.spatialGrid.insert(body)
    }

    this.lastUpdateTime = currentTime
  }

  private step(deltaTime: number): void {
    // Apply forces and integrate
    this.integrate(deltaTime)
    
    // Collision detection and response
    this.detectCollisions()
    
    // Constraint solving (velocity)
    for (let i = 0; i < this.config.velocityIterations; i++) {
      this.solveVelocityConstraints()
    }
    
    // Position correction
    for (let i = 0; i < this.config.positionIterations; i++) {
      this.solvePositionConstraints()
    }
    
    // Update sleeping states
    if (this.config.enableSleeping) {
      this.updateSleepingBodies()
    }
    
    // Update game object positions
    this.syncGameObjects()
  }

  private integrate(deltaTime: number): void {
    for (const body of this.dynamicBodies) {
      if (this.sleepingBodies.has(body.id) || body.isKinematic) continue

      // Apply gravity
      body.acceleration.x += this.config.gravity.x
      body.acceleration.y += this.config.gravity.y

      // Apply drag
      const dragForceX = -body.velocity.x * body.drag
      const dragForceY = -body.velocity.y * body.drag
      body.acceleration.x += dragForceX / body.mass
      body.acceleration.y += dragForceY / body.mass

      // Integrate velocity
      body.velocity.x += body.acceleration.x * deltaTime
      body.velocity.y += body.acceleration.y * deltaTime

      // Integrate position
      body.position.x += body.velocity.x * deltaTime
      body.position.y += body.velocity.y * deltaTime

      // Reset acceleration
      body.acceleration.x = 0
      body.acceleration.y = 0

      // Update bounds
      this.updateBodyBounds(body)

      // World bounds collision
      this.checkWorldBounds(body)
    }
  }

  private detectCollisions(): void {
    this.collisionCount = 0
    const checkedPairs = new Set<string>()

    // Broad phase: Use spatial grid for optimization
    if (this.broadPhaseEnabled) {
      for (const body of this.dynamicBodies) {
        if (this.sleepingBodies.has(body.id)) continue

        const nearbyBodies = this.spatialGrid.query(body.bounds)
        
        for (const otherBody of nearbyBodies) {
          if (body.id === otherBody.id) continue
          
          const pairKey = body.id < otherBody.id ? 
            `${body.id}-${otherBody.id}` : 
            `${otherBody.id}-${body.id}`
          
          if (checkedPairs.has(pairKey)) continue
          checkedPairs.add(pairKey)

          // Narrow phase: Detailed collision detection
          const collision = this.checkCollision(body, otherBody)
          if (collision) {
            this.resolveCollision(collision)
            this.emit('collision', collision)
            this.collisionCount++
          }
        }
      }
    } else {
      // Brute force collision detection (fallback)
      for (let i = 0; i < this.dynamicBodies.length; i++) {
        const bodyA = this.dynamicBodies[i]
        if (this.sleepingBodies.has(bodyA.id)) continue

        // Check against other dynamic bodies
        for (let j = i + 1; j < this.dynamicBodies.length; j++) {
          const bodyB = this.dynamicBodies[j]
          if (this.sleepingBodies.has(bodyB.id)) continue

          const collision = this.checkCollision(bodyA, bodyB)
          if (collision) {
            this.resolveCollision(collision)
            this.emit('collision', collision)
            this.collisionCount++
          }
        }

        // Check against static bodies
        for (const bodyB of this.staticBodies) {
          const collision = this.checkCollision(bodyA, bodyB)
          if (collision) {
            this.resolveCollision(collision)
            this.emit('collision', collision)
            this.collisionCount++
          }
        }
      }
    }
  }

  private checkCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): CollisionInfo | null {
    // AABB broad phase check
    if (!this.aabbOverlap(bodyA.bounds, bodyB.bounds)) {
      return null
    }

    // Shape-specific collision detection
    if (bodyA.shape.type === 'circle' && bodyB.shape.type === 'circle') {
      return this.circleCircleCollision(bodyA, bodyB)
    } else if (bodyA.shape.type === 'rectangle' && bodyB.shape.type === 'rectangle') {
      return this.rectangleRectangleCollision(bodyA, bodyB)
    } else if (bodyA.shape.type === 'circle' && bodyB.shape.type === 'rectangle') {
      return this.circleRectangleCollision(bodyA, bodyB)
    } else if (bodyA.shape.type === 'rectangle' && bodyB.shape.type === 'circle') {
      return this.circleRectangleCollision(bodyB, bodyA)
    }

    return null
  }

  private circleCircleCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): CollisionInfo | null {
    const dx = bodyB.position.x - bodyA.position.x
    const dy = bodyB.position.y - bodyA.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const radiusSum = (bodyA.shape.radius || 0) + (bodyB.shape.radius || 0)

    if (distance < radiusSum) {
      const penetration = radiusSum - distance
      const normal = distance > 0 ? 
        { x: dx / distance, y: dy / distance } : 
        { x: 1, y: 0 }

      return {
        bodyA,
        bodyB,
        normal,
        penetration,
        contactPoints: [{
          x: bodyA.position.x + normal.x * (bodyA.shape.radius || 0),
          y: bodyA.position.y + normal.y * (bodyA.shape.radius || 0)
        }],
        timestamp: performance.now()
      }
    }

    return null
  }

  private rectangleRectangleCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): CollisionInfo | null {
    const overlapX = Math.min(bodyA.bounds.max.x, bodyB.bounds.max.x) - 
                    Math.max(bodyA.bounds.min.x, bodyB.bounds.min.x)
    const overlapY = Math.min(bodyA.bounds.max.y, bodyB.bounds.max.y) - 
                    Math.max(bodyA.bounds.min.y, bodyB.bounds.min.y)

    if (overlapX > 0 && overlapY > 0) {
      let normal: Vector2
      let penetration: number

      if (overlapX < overlapY) {
        penetration = overlapX
        normal = bodyA.position.x < bodyB.position.x ? { x: -1, y: 0 } : { x: 1, y: 0 }
      } else {
        penetration = overlapY
        normal = bodyA.position.y < bodyB.position.y ? { x: 0, y: -1 } : { x: 0, y: 1 }
      }

      return {
        bodyA,
        bodyB,
        normal,
        penetration,
        contactPoints: [{
          x: (bodyA.position.x + bodyB.position.x) / 2,
          y: (bodyA.position.y + bodyB.position.y) / 2
        }],
        timestamp: performance.now()
      }
    }

    return null
  }

  private circleRectangleCollision(circleBody: PhysicsBody, rectBody: PhysicsBody): CollisionInfo | null {
    const radius = circleBody.shape.radius || 0
    const rectWidth = rectBody.shape.width || 0
    const rectHeight = rectBody.shape.height || 0

    // Find closest point on rectangle to circle center
    const closestX = Math.max(rectBody.bounds.min.x, Math.min(circleBody.position.x, rectBody.bounds.max.x))
    const closestY = Math.max(rectBody.bounds.min.y, Math.min(circleBody.position.y, rectBody.bounds.max.y))

    const dx = circleBody.position.x - closestX
    const dy = circleBody.position.y - closestY
    const distanceSquared = dx * dx + dy * dy

    if (distanceSquared < radius * radius) {
      const distance = Math.sqrt(distanceSquared)
      const penetration = radius - distance
      
      let normal: Vector2
      if (distance > 0.001) {
        normal = { x: dx / distance, y: dy / distance }
      } else {
        // Circle center is inside rectangle
        const toEdgeX = Math.min(circleBody.position.x - rectBody.bounds.min.x, 
                                rectBody.bounds.max.x - circleBody.position.x)
        const toEdgeY = Math.min(circleBody.position.y - rectBody.bounds.min.y, 
                                rectBody.bounds.max.y - circleBody.position.y)
        
        if (toEdgeX < toEdgeY) {
          normal = circleBody.position.x < rectBody.position.x ? { x: -1, y: 0 } : { x: 1, y: 0 }
        } else {
          normal = circleBody.position.y < rectBody.position.y ? { x: 0, y: -1 } : { x: 0, y: 1 }
        }
      }

      return {
        bodyA: circleBody,
        bodyB: rectBody,
        normal,
        penetration,
        contactPoints: [{ x: closestX, y: closestY }],
        timestamp: performance.now()
      }
    }

    return null
  }

  private resolveCollision(collision: CollisionInfo): void {
    const { bodyA, bodyB, normal, penetration } = collision

    // Skip sensor collisions for physics resolution
    if (bodyA.isSensor || bodyB.isSensor) {
      return
    }

    // Position correction (separate overlapping bodies)
    if (!bodyA.isStatic && !bodyB.isStatic) {
      const totalMass = bodyA.mass + bodyB.mass
      const correctionA = (bodyB.mass / totalMass) * penetration * 0.8 // 80% correction
      const correctionB = (bodyA.mass / totalMass) * penetration * 0.8

      bodyA.position.x -= normal.x * correctionA
      bodyA.position.y -= normal.y * correctionA
      bodyB.position.x += normal.x * correctionB
      bodyB.position.y += normal.y * correctionB
    } else if (!bodyA.isStatic) {
      bodyA.position.x -= normal.x * penetration * 0.8
      bodyA.position.y -= normal.y * penetration * 0.8
    } else if (!bodyB.isStatic) {
      bodyB.position.x += normal.x * penetration * 0.8
      bodyB.position.y += normal.y * penetration * 0.8
    }

    // Velocity resolution (collision response)
    const relativeVelocityX = bodyB.velocity.x - bodyA.velocity.x
    const relativeVelocityY = bodyB.velocity.y - bodyA.velocity.y
    const velocityAlongNormal = relativeVelocityX * normal.x + relativeVelocityY * normal.y

    // Don't resolve if velocities are separating
    if (velocityAlongNormal > 0) return

    // Calculate restitution
    const restitution = Math.min(bodyA.restitution, bodyB.restitution)

    // Calculate impulse magnitude
    let impulseMagnitude = -(1 + restitution) * velocityAlongNormal
    
    if (!bodyA.isStatic && !bodyB.isStatic) {
      impulseMagnitude /= (1 / bodyA.mass + 1 / bodyB.mass)
    } else if (!bodyA.isStatic) {
      impulseMagnitude /= (1 / bodyA.mass)
    } else if (!bodyB.isStatic) {
      impulseMagnitude /= (1 / bodyB.mass)
    }

    // Apply impulse
    const impulseX = impulseMagnitude * normal.x
    const impulseY = impulseMagnitude * normal.y

    if (!bodyA.isStatic && !bodyA.isKinematic) {
      bodyA.velocity.x -= impulseX / bodyA.mass
      bodyA.velocity.y -= impulseY / bodyA.mass
      this.wakeBody(bodyA)
    }

    if (!bodyB.isStatic && !bodyB.isKinematic) {
      bodyB.velocity.x += impulseX / bodyB.mass
      bodyB.velocity.y += impulseY / bodyB.mass
      this.wakeBody(bodyB)
    }

    // Apply friction
    this.applyFriction(collision, impulseMagnitude)
  }

  private applyFriction(collision: CollisionInfo, normalImpulse: number): void {
    const { bodyA, bodyB, normal } = collision

    const relativeVelocityX = bodyB.velocity.x - bodyA.velocity.x
    const relativeVelocityY = bodyB.velocity.y - bodyA.velocity.y

    // Calculate tangent vector
    const tangentX = relativeVelocityX - (relativeVelocityX * normal.x + relativeVelocityY * normal.y) * normal.x
    const tangentY = relativeVelocityY - (relativeVelocityX * normal.x + relativeVelocityY * normal.y) * normal.y
    const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY)

    if (tangentLength < 0.001) return

    const tangentNormalizedX = tangentX / tangentLength
    const tangentNormalizedY = tangentY / tangentLength

    // Calculate friction
    const staticFriction = Math.sqrt(bodyA.friction * bodyB.friction)
    const kineticFriction = staticFriction * 0.8

    let frictionImpulse = -(relativeVelocityX * tangentNormalizedX + relativeVelocityY * tangentNormalizedY)
    
    if (!bodyA.isStatic && !bodyB.isStatic) {
      frictionImpulse /= (1 / bodyA.mass + 1 / bodyB.mass)
    } else if (!bodyA.isStatic) {
      frictionImpulse /= (1 / bodyA.mass)
    } else if (!bodyB.isStatic) {
      frictionImpulse /= (1 / bodyB.mass)
    }

    // Clamp friction
    const friction = Math.abs(frictionImpulse) < Math.abs(normalImpulse) * staticFriction ?
      frictionImpulse :
      -Math.sign(frictionImpulse) * Math.abs(normalImpulse) * kineticFriction

    const frictionX = friction * tangentNormalizedX
    const frictionY = friction * tangentNormalizedY

    // Apply friction impulse
    if (!bodyA.isStatic && !bodyA.isKinematic) {
      bodyA.velocity.x -= frictionX / bodyA.mass
      bodyA.velocity.y -= frictionY / bodyA.mass
    }

    if (!bodyB.isStatic && !bodyB.isKinematic) {
      bodyB.velocity.x += frictionX / bodyB.mass
      bodyB.velocity.y += frictionY / bodyB.mass
    }
  }

  private solveVelocityConstraints(): void {
    // Additional constraint solving can be implemented here
    // For more complex constraints like joints, springs, etc.
  }

  private solvePositionConstraints(): void {
    // Additional position constraint solving
    // This helps with stability and prevents drift
  }

  private updateSleepingBodies(): void {
    for (const body of this.dynamicBodies) {
      const velocityMagnitude = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y)
      
      if (velocityMagnitude < this.config.sleepThreshold) {
        this.sleepingBodies.add(body.id)
      } else if (velocityMagnitude > this.config.sleepThreshold * 2) {
        this.wakeBody(body)
      }
    }
  }

  private wakeBody(body: PhysicsBody): void {
    this.sleepingBodies.delete(body.id)
  }

  private syncGameObjects(): void {
    for (const body of this.bodies.values()) {
      if (body.userData) {
        body.userData.position.x = body.position.x
        body.userData.position.y = body.position.y
        body.userData.velocity.x = body.velocity.x
        body.userData.velocity.y = body.velocity.y
      }
    }
  }

  private checkWorldBounds(body: PhysicsBody): void {
    const bounds = this.config.worldBounds
    let bounced = false

    if (body.position.x < 0) {
      body.position.x = 0
      body.velocity.x = -body.velocity.x * body.restitution
      bounced = true
    } else if (body.position.x > bounds.width) {
      body.position.x = bounds.width
      body.velocity.x = -body.velocity.x * body.restitution
      bounced = true
    }

    if (body.position.y < 0) {
      body.position.y = 0
      body.velocity.y = -body.velocity.y * body.restitution
      bounced = true
    } else if (body.position.y > bounds.height) {
      body.position.y = bounds.height
      body.velocity.y = -body.velocity.y * body.restitution
      bounced = true
    }

    if (bounced) {
      this.emit('worldBoundsCollision', body)
    }
  }

  private createCollisionShape(gameObject: any): CollisionShape {
    const shape = gameObject.properties.shape || { type: 'rectangle' }
    
    switch (shape.type) {
      case 'circle':
        return {
          type: 'circle',
          radius: shape.radius || gameObject.scale.x
        }
      case 'rectangle':
        return {
          type: 'rectangle',
          width: shape.width || gameObject.scale.x,
          height: shape.height || gameObject.scale.y
        }
      case 'polygon':
        return {
          type: 'polygon',
          vertices: shape.vertices || []
        }
      default:
        return {
          type: 'rectangle',
          width: gameObject.scale.x,
          height: gameObject.scale.y
        }
    }
  }

  private calculateAABB(gameObject: any): AABB {
    const shape = this.createCollisionShape(gameObject)
    
    switch (shape.type) {
      case 'circle':
        const radius = shape.radius || 0
        return {
          min: { x: gameObject.position.x - radius, y: gameObject.position.y - radius },
          max: { x: gameObject.position.x + radius, y: gameObject.position.y + radius }
        }
      case 'rectangle':
        const halfWidth = (shape.width || 0) / 2
        const halfHeight = (shape.height || 0) / 2
        return {
          min: { x: gameObject.position.x - halfWidth, y: gameObject.position.y - halfHeight },
          max: { x: gameObject.position.x + halfWidth, y: gameObject.position.y + halfHeight }
        }
      default:
        return {
          min: { x: gameObject.position.x, y: gameObject.position.y },
          max: { x: gameObject.position.x, y: gameObject.position.y }
        }
    }
  }

  private updateBodyBounds(body: PhysicsBody): void {
    const gameObject = body.userData
    if (gameObject) {
      body.bounds = this.calculateAABB(gameObject)
    }
  }

  private aabbOverlap(a: AABB, b: AABB): boolean {
    return a.min.x < b.max.x && a.max.x > b.min.x &&
           a.min.y < b.max.y && a.max.y > b.min.y
  }

  // Public API
  public getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id)
  }

  public applyForce(bodyId: string, force: Vector2): void {
    const body = this.bodies.get(bodyId)
    if (body && !body.isStatic && !body.isKinematic) {
      body.acceleration.x += force.x / body.mass
      body.acceleration.y += force.y / body.mass
      this.wakeBody(body)
    }
  }

  public applyImpulse(bodyId: string, impulse: Vector2): void {
    const body = this.bodies.get(bodyId)
    if (body && !body.isStatic && !body.isKinematic) {
      body.velocity.x += impulse.x / body.mass
      body.velocity.y += impulse.y / body.mass
      this.wakeBody(body)
    }
  }

  public setVelocity(bodyId: string, velocity: Vector2): void {
    const body = this.bodies.get(bodyId)
    if (body && !body.isStatic) {
      body.velocity.x = velocity.x
      body.velocity.y = velocity.y
      this.wakeBody(body)
    }
  }

  public getPerformanceStats(): any {
    return {
      bodyCount: this.bodies.size,
      dynamicBodies: this.dynamicBodies.length,
      staticBodies: this.staticBodies.length,
      sleepingBodies: this.sleepingBodies.size,
      collisionCount: this.collisionCount,
      updateCount: this.updateCount,
      spatialGridCells: this.spatialGrid.getCellCount()
    }
  }

  public updateSettings(newConfig: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.worldBounds) {
      this.spatialGrid = new SpatialGrid(
        newConfig.worldBounds.width,
        newConfig.worldBounds.height,
        64
      )
    }
  }

  public destroy(): void {
    this.bodies.clear()
    this.staticBodies = []
    this.dynamicBodies = []
    this.sleepingBodies.clear()
    this.spatialGrid.clear()
    this.removeAllListeners()
  }
}

// Spatial partitioning for collision optimization
class SpatialGrid {
  private cellSize: number
  private width: number
  private height: number
  private cols: number
  private rows: number
  private cells: Map<string, PhysicsBody[]> = new Map()

  constructor(width: number, height: number, cellSize: number) {
    this.width = width
    this.height = height
    this.cellSize = cellSize
    this.cols = Math.ceil(width / cellSize)
    this.rows = Math.ceil(height / cellSize)
  }

  public insert(body: PhysicsBody): void {
    const cells = this.getCellsForAABB(body.bounds)
    for (const cellKey of cells) {
      if (!this.cells.has(cellKey)) {
        this.cells.set(cellKey, [])
      }
      this.cells.get(cellKey)!.push(body)
    }
  }

  public remove(body: PhysicsBody): void {
    const cells = this.getCellsForAABB(body.bounds)
    for (const cellKey of cells) {
      const cellBodies = this.cells.get(cellKey)
      if (cellBodies) {
        const index = cellBodies.indexOf(body)
        if (index > -1) {
          cellBodies.splice(index, 1)
        }
      }
    }
  }

  public query(bounds: AABB): PhysicsBody[] {
    const result: Set<PhysicsBody> = new Set()
    const cells = this.getCellsForAABB(bounds)
    
    for (const cellKey of cells) {
      const cellBodies = this.cells.get(cellKey)
      if (cellBodies) {
        for (const body of cellBodies) {
          result.add(body)
        }
      }
    }

    return Array.from(result)
  }

  public clear(): void {
    this.cells.clear()
  }

  public getCellCount(): number {
    return this.cells.size
  }

  private getCellsForAABB(bounds: AABB): string[] {
    const minCol = Math.max(0, Math.floor(bounds.min.x / this.cellSize))
    const maxCol = Math.min(this.cols - 1, Math.floor(bounds.max.x / this.cellSize))
    const minRow = Math.max(0, Math.floor(bounds.min.y / this.cellSize))
    const maxRow = Math.min(this.rows - 1, Math.floor(bounds.max.y / this.cellSize))

    const cells: string[] = []
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        cells.push(`${col},${row}`)
      }
    }

    return cells
  }
}