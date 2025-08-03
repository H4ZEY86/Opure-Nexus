/**
 * REAL-TIME MULTIPLAYER SYNCHRONIZATION SYSTEM
 * High-performance networking for Discord Activities with lag compensation
 * Features: Client-side prediction, server reconciliation, interpolation, compression
 */

import { EventEmitter } from '../../utils/EventEmitter'
import { io, Socket } from 'socket.io-client'

export interface MultiplayerConfig {
  enabled: boolean
  maxPlayers: number
  syncFrequency: number // Hz
  interpolationBuffer: number // ms
  predictionBuffer: number // ms
  compressionEnabled: boolean
  lagCompensation: boolean
  antiCheat: boolean
}

export interface NetworkMessage {
  id: string
  type: string
  data: any
  timestamp: number
  sequenceNumber: number
  checksum?: string
}

export interface PlayerState {
  playerId: string
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  rotation: number
  animationState: string
  inputState: any
  timestamp: number
  sequenceNumber: number
}

export interface GameSnapshot {
  timestamp: number
  sequenceNumber: number
  playerStates: Map<string, PlayerState>
  gameObjects: any[]
  gameState: any
}

export interface NetworkStats {
  ping: number
  jitter: number
  packetLoss: number
  bandwidth: { in: number; out: number }
  messagesPerSecond: { in: number; out: number }
  compressionRatio: number
}

export interface RoomInfo {
  roomId: string
  gameId: string
  players: PlayerInfo[]
  maxPlayers: number
  gameState: 'waiting' | 'playing' | 'finished'
  settings: any
}

export interface PlayerInfo {
  playerId: string
  username: string
  avatar: string
  isHost: boolean
  isReady: boolean
  ping: number
  joinedAt: number
}

export class MultiplayerSync extends EventEmitter {
  private config: MultiplayerConfig
  private socket?: Socket
  private playerId = ''
  private roomId = ''
  private isHost = false
  private isConnected = false
  
  // State management
  private localPlayerState: PlayerState
  private remotePlayerStates = new Map<string, PlayerState>()
  private gameSnapshots: GameSnapshot[] = []
  private lastSnapshot?: GameSnapshot
  
  // Networking
  private sequenceNumber = 0
  private lastAckedSequence = 0
  private pendingInputs: any[] = []
  private serverSnapshots: GameSnapshot[] = []
  
  // Performance optimization
  private networkStats: NetworkStats = {
    ping: 0,
    jitter: 0,
    packetLoss: 0,
    bandwidth: { in: 0, out: 0 },
    messagesPerSecond: { in: 0, out: 0 },
    compressionRatio: 1
  }
  
  // Lag compensation
  private clockSync = new ClockSynchronizer()
  private stateBuffer = new StateBuffer()
  private predictor = new ClientPredictor()
  private interpolator = new StateInterpolator()
  
  // Anti-cheat
  private cheatDetector = new CheatDetector()
  
  // Performance tracking
  private lastSyncTime = Date.now()
  private syncInterval?: NodeJS.Timeout
  private pingInterval?: NodeJS.Timeout
  private statsUpdateInterval?: NodeJS.Timeout

  constructor(config: MultiplayerConfig) {
    super()
    this.config = config
    
    this.localPlayerState = {
      playerId: '',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      animationState: 'idle',
      inputState: {},
      timestamp: Date.now(),
      sequenceNumber: 0
    }
  }

  public async initialize(userId: string): Promise<void> {
    if (!this.config.enabled) return
    
    this.playerId = userId
    this.localPlayerState.playerId = userId
    
    try {
      await this.connect()
      this.setupEventHandlers()
      this.startSyncLoop()
      this.startPingLoop()
      this.startStatsTracking()
      
      this.emit('initialized')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        auth: {
          userId: this.playerId
        },
        query: {
          clientType: 'game'
        }
      })

      this.socket.on('connect', () => {
        this.isConnected = true
        console.log('Connected to multiplayer server')
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        console.error('Failed to connect to multiplayer server:', error)
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false
        this.emit('disconnected', reason)
        console.log('Disconnected from multiplayer server:', reason)
      })
    })
  }

  private setupEventHandlers(): void {
    if (!this.socket) return

    // Room management
    this.socket.on('room_joined', (data: RoomInfo) => {
      this.roomId = data.roomId
      this.emit('roomJoined', data)
    })

    this.socket.on('room_left', () => {
      this.roomId = ''
      this.emit('roomLeft')
    })

    this.socket.on('player_joined', (playerInfo: PlayerInfo) => {
      this.emit('playerJoined', playerInfo)
    })

    this.socket.on('player_left', (playerId: string) => {
      this.remotePlayerStates.delete(playerId)
      this.emit('playerLeft', playerId)
    })

    this.socket.on('host_changed', (newHostId: string) => {
      this.isHost = newHostId === this.playerId
      this.emit('hostChanged', newHostId)
    })

    // Game state synchronization
    this.socket.on('game_state_update', (snapshot: GameSnapshot) => {
      this.handleServerSnapshot(snapshot)
    })

    this.socket.on('player_state_update', (states: PlayerState[]) => {
      this.handlePlayerStateUpdate(states)
    })

    this.socket.on('input_acknowledged', (sequenceNumber: number) => {
      this.handleInputAcknowledgment(sequenceNumber)
    })

    // Network diagnostics
    this.socket.on('ping_response', (data: { timestamp: number; serverTime: number }) => {
      this.handlePingResponse(data)
    })

    this.socket.on('network_stats', (stats: Partial<NetworkStats>) => {
      this.updateNetworkStats(stats)
    })

    // Error handling
    this.socket.on('error', (error: any) => {
      this.emit('error', error)
    })

    this.socket.on('cheat_detected', (data: any) => {
      this.emit('cheatDetected', data)
    })
  }

  public async joinRoom(gameId: string, roomId?: string): Promise<RoomInfo> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to server')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'))
      }, 10000)

      this.socket!.once('room_joined', (roomInfo: RoomInfo) => {
        clearTimeout(timeout)
        this.roomId = roomInfo.roomId
        this.isHost = roomInfo.players.find(p => p.playerId === this.playerId)?.isHost || false
        resolve(roomInfo)
      })

      this.socket!.once('join_room_error', (error: any) => {
        clearTimeout(timeout)
        reject(new Error(error.message || 'Failed to join room'))
      })

      this.socket!.emit('join_room', {
        gameId,
        roomId,
        playerInfo: {
          playerId: this.playerId,
          username: 'Player', // Would come from user context
          avatar: ''
        }
      })
    })
  }

  public leaveRoom(): void {
    if (this.socket && this.roomId) {
      this.socket.emit('leave_room', { roomId: this.roomId })
      this.roomId = ''
      this.isHost = false
      this.remotePlayerStates.clear()
    }
  }

  public syncState(gameState: any): void {
    if (!this.config.enabled || !this.socket || !this.roomId) return

    const now = Date.now()
    
    // Update local player state
    this.localPlayerState.timestamp = now
    this.localPlayerState.sequenceNumber = ++this.sequenceNumber
    
    // Create snapshot
    const snapshot: GameSnapshot = {
      timestamp: now,
      sequenceNumber: this.sequenceNumber,
      playerStates: new Map([[this.playerId, this.localPlayerState]]),
      gameObjects: [], // Would include relevant game objects
      gameState
    }
    
    // Store locally for prediction
    this.gameSnapshots.push(snapshot)
    if (this.gameSnapshots.length > 60) { // Keep ~1 second of history at 60fps
      this.gameSnapshots.shift()
    }
    
    // Send to server
    this.sendToServer('game_state_sync', {
      snapshot: this.compressSnapshot(snapshot),
      checksum: this.config.antiCheat ? this.calculateChecksum(snapshot) : undefined
    })
  }

  public sendInput(inputData: any): void {
    if (!this.socket || !this.roomId) return

    const input = {
      playerId: this.playerId,
      inputData,
      timestamp: Date.now(),
      sequenceNumber: ++this.sequenceNumber
    }

    // Store for client-side prediction
    this.pendingInputs.push(input)
    if (this.pendingInputs.length > 120) { // Keep ~2 seconds at 60fps
      this.pendingInputs.shift()
    }

    // Send to server
    this.sendToServer('player_input', input)
    
    // Apply input locally for prediction
    if (this.config.lagCompensation) {
      this.predictor.applyInput(input, this.localPlayerState)
    }
  }

  private sendToServer(event: string, data: any): void {
    if (!this.socket || !this.isConnected) return

    const message: NetworkMessage = {
      id: `${this.playerId}_${Date.now()}_${Math.random()}`,
      type: event,
      data: this.config.compressionEnabled ? this.compressData(data) : data,
      timestamp: Date.now(),
      sequenceNumber: this.sequenceNumber
    }

    this.socket.emit(event, message)
    
    // Update bandwidth stats
    const messageSize = JSON.stringify(message).length
    this.networkStats.bandwidth.out += messageSize
  }

  private handleServerSnapshot(snapshot: GameSnapshot): void {
    // Store server snapshot
    this.serverSnapshots.push(snapshot)
    if (this.serverSnapshots.length > 30) { // Keep ~0.5 seconds at 60fps
      this.serverSnapshots.shift()
    }

    // Update remote player states
    for (const [playerId, playerState] of snapshot.playerStates) {
      if (playerId !== this.playerId) {
        this.remotePlayerStates.set(playerId, playerState)
      }
    }

    // Reconcile with local state for lag compensation
    if (this.config.lagCompensation && snapshot.playerStates.has(this.playerId)) {
      this.reconcileState(snapshot)
    }

    // Update interpolation buffer
    this.stateBuffer.addSnapshot(snapshot)

    this.emit('serverSnapshot', snapshot)
  }

  private handlePlayerStateUpdate(states: PlayerState[]): void {
    for (const state of states) {
      if (state.playerId !== this.playerId) {
        this.remotePlayerStates.set(state.playerId, state)
      }
    }

    this.emit('playerStatesUpdated', states)
  }

  private handleInputAcknowledgment(sequenceNumber: number): void {
    this.lastAckedSequence = sequenceNumber
    
    // Remove acknowledged inputs from pending list
    this.pendingInputs = this.pendingInputs.filter(input => input.sequenceNumber > sequenceNumber)
  }

  private reconcileState(serverSnapshot: GameSnapshot): void {
    const serverPlayerState = serverSnapshot.playerStates.get(this.playerId)
    if (!serverPlayerState) return

    // Find the local snapshot that corresponds to the server snapshot
    const localSnapshot = this.gameSnapshots.find(s => s.sequenceNumber === serverSnapshot.sequenceNumber)
    if (!localSnapshot) return

    const localPlayerState = localSnapshot.playerStates.get(this.playerId)
    if (!localPlayerState) return

    // Check for significant differences
    const positionDiff = Math.sqrt(
      Math.pow(serverPlayerState.position.x - localPlayerState.position.x, 2) +
      Math.pow(serverPlayerState.position.y - localPlayerState.position.y, 2)
    )

    const POSITION_THRESHOLD = 5 // pixels
    
    if (positionDiff > POSITION_THRESHOLD) {
      console.log(`Position mismatch detected: ${positionDiff.toFixed(2)}px difference`)
      
      // Correct local state
      this.localPlayerState.position = { ...serverPlayerState.position }
      
      // Re-apply unacknowledged inputs
      const unackedInputs = this.pendingInputs.filter(input => input.sequenceNumber > serverSnapshot.sequenceNumber)
      for (const input of unackedInputs) {
        this.predictor.applyInput(input, this.localPlayerState)
      }
      
      this.emit('stateReconciled', {
        difference: positionDiff,
        correctedState: this.localPlayerState
      })
    }
  }

  private handlePingResponse(data: { timestamp: number; serverTime: number }): void {
    const now = Date.now()
    const roundTripTime = now - data.timestamp
    
    // Update ping with smoothing
    this.networkStats.ping = this.networkStats.ping * 0.8 + roundTripTime * 0.2
    
    // Update clock sync
    this.clockSync.updateOffset(data.serverTime, now, roundTripTime)
    
    // Calculate jitter
    const jitter = Math.abs(roundTripTime - this.networkStats.ping)
    this.networkStats.jitter = this.networkStats.jitter * 0.9 + jitter * 0.1
  }

  private updateNetworkStats(stats: Partial<NetworkStats>): void {
    Object.assign(this.networkStats, stats)
    this.emit('networkStatsUpdated', this.networkStats)
  }

  private startSyncLoop(): void {
    const syncRate = 1000 / this.config.syncFrequency
    
    this.syncInterval = setInterval(() => {
      if (this.isConnected && this.roomId) {
        // Update interpolated remote player states
        this.updateInterpolatedStates()
        
        // Emit sync event for game loop
        this.emit('syncTick', {
          localPlayer: this.localPlayerState,
          remotePlayers: Array.from(this.remotePlayerStates.values()),
          networkStats: this.networkStats
        })
      }
    }, syncRate)
  }

  private startPingLoop(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping', { timestamp: Date.now() })
      }
    }, 1000) // Ping every second
  }

  private startStatsTracking(): void {
    this.statsUpdateInterval = setInterval(() => {
      // Reset per-second counters
      this.networkStats.messagesPerSecond = { in: 0, out: 0 }
      this.networkStats.bandwidth = { in: 0, out: 0 }
    }, 1000)
  }

  private updateInterpolatedStates(): void {
    const renderTime = Date.now() - this.config.interpolationBuffer
    
    for (const [playerId, playerState] of this.remotePlayerStates) {
      const interpolatedState = this.interpolator.interpolateState(playerId, renderTime)
      if (interpolatedState) {
        this.remotePlayerStates.set(playerId, interpolatedState)
      }
    }
  }

  private compressSnapshot(snapshot: GameSnapshot): any {
    if (!this.config.compressionEnabled) return snapshot
    
    // Simple compression - remove redundant data
    const compressed = {
      t: snapshot.timestamp,
      s: snapshot.sequenceNumber,
      p: Array.from(snapshot.playerStates.values()).map(p => ({
        id: p.playerId,
        x: Math.round(p.position.x),
        y: Math.round(p.position.y),
        vx: Math.round(p.velocity.x * 10) / 10,
        vy: Math.round(p.velocity.y * 10) / 10,
        r: Math.round(p.rotation * 100) / 100,
        a: p.animationState
      })),
      gs: snapshot.gameState
    }
    
    const originalSize = JSON.stringify(snapshot).length
    const compressedSize = JSON.stringify(compressed).length
    this.networkStats.compressionRatio = originalSize / compressedSize
    
    return compressed
  }

  private compressData(data: any): any {
    // Simple data compression for general messages
    return data // Would implement actual compression
  }

  private calculateChecksum(data: any): string {
    // Simple checksum for anti-cheat
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  // Public API methods
  public getNetworkStats(): NetworkStats {
    return { ...this.networkStats }
  }

  public getPlayerStates(): Map<string, PlayerState> {
    const allStates = new Map(this.remotePlayerStates)
    allStates.set(this.playerId, this.localPlayerState)
    return allStates
  }

  public updateLocalPlayerState(update: Partial<PlayerState>): void {
    Object.assign(this.localPlayerState, update)
    this.localPlayerState.timestamp = Date.now()
  }

  public isRoomHost(): boolean {
    return this.isHost
  }

  public getRoomId(): string {
    return this.roomId
  }

  public getPlayerId(): string {
    return this.playerId
  }

  public isMultiplayerEnabled(): boolean {
    return this.config.enabled && this.isConnected && this.roomId !== ''
  }

  public setConfig(newConfig: Partial<MultiplayerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  public kickPlayer(playerId: string): void {
    if (this.isHost && this.socket) {
      this.socket.emit('kick_player', { roomId: this.roomId, playerId })
    }
  }

  public sendChatMessage(message: string): void {
    if (this.socket && this.roomId) {
      this.socket.emit('chat_message', {
        roomId: this.roomId,
        playerId: this.playerId,
        message,
        timestamp: Date.now()
      })
    }
  }

  public destroy(): void {
    // Clear intervals
    if (this.syncInterval) clearInterval(this.syncInterval)
    if (this.pingInterval) clearInterval(this.pingInterval)
    if (this.statsUpdateInterval) clearInterval(this.statsUpdateInterval)
    
    // Leave room and disconnect
    this.leaveRoom()
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = undefined
    }
    
    // Clear state
    this.remotePlayerStates.clear()
    this.gameSnapshots = []
    this.serverSnapshots = []
    this.pendingInputs = []
    
    this.removeAllListeners()
  }
}

// Supporting classes for networking features
class ClockSynchronizer {
  private serverTimeOffset = 0
  private samples: { offset: number; rtt: number }[] = []

  updateOffset(serverTime: number, clientTime: number, roundTripTime: number): void {
    const offset = serverTime - clientTime + (roundTripTime / 2)
    
    this.samples.push({ offset, rtt: roundTripTime })
    if (this.samples.length > 10) {
      this.samples.shift()
    }
    
    // Use the sample with the lowest RTT for most accurate sync
    const bestSample = this.samples.reduce((best, current) => 
      current.rtt < best.rtt ? current : best
    )
    
    this.serverTimeOffset = bestSample.offset
  }

  getServerTime(): number {
    return Date.now() + this.serverTimeOffset
  }
}

class StateBuffer {
  private snapshots: GameSnapshot[] = []

  addSnapshot(snapshot: GameSnapshot): void {
    this.snapshots.push(snapshot)
    this.snapshots.sort((a, b) => a.timestamp - b.timestamp)
    
    // Keep only recent snapshots
    const cutoff = Date.now() - 1000 // 1 second
    this.snapshots = this.snapshots.filter(s => s.timestamp > cutoff)
  }

  getSnapshotAt(timestamp: number): GameSnapshot | undefined {
    return this.snapshots.find(s => Math.abs(s.timestamp - timestamp) < 50) // 50ms tolerance
  }

  getSnapshotsAround(timestamp: number): { before?: GameSnapshot; after?: GameSnapshot } {
    let before: GameSnapshot | undefined
    let after: GameSnapshot | undefined
    
    for (const snapshot of this.snapshots) {
      if (snapshot.timestamp <= timestamp) {
        before = snapshot
      } else if (!after) {
        after = snapshot
        break
      }
    }
    
    return { before, after }
  }
}

class ClientPredictor {
  applyInput(input: any, playerState: PlayerState): void {
    // Simple input prediction - would be game-specific
    if (input.inputData.moveX) {
      playerState.velocity.x = input.inputData.moveX * 100
    }
    if (input.inputData.moveY) {
      playerState.velocity.y = input.inputData.moveY * 100
    }
    
    // Update position based on velocity
    const deltaTime = 16.67 / 1000 // Assume 60fps
    playerState.position.x += playerState.velocity.x * deltaTime
    playerState.position.y += playerState.velocity.y * deltaTime
  }
}

class StateInterpolator {
  private playerBuffers = new Map<string, PlayerState[]>()

  interpolateState(playerId: string, renderTime: number): PlayerState | undefined {
    const buffer = this.playerBuffers.get(playerId)
    if (!buffer || buffer.length < 2) return undefined

    // Find the two states to interpolate between
    let beforeState: PlayerState | undefined
    let afterState: PlayerState | undefined

    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp > renderTime) {
        beforeState = buffer[i]
        afterState = buffer[i + 1]
        break
      }
    }

    if (!beforeState || !afterState) {
      return buffer[buffer.length - 1] // Return latest state
    }

    // Linear interpolation
    const timeDiff = afterState.timestamp - beforeState.timestamp
    const t = (renderTime - beforeState.timestamp) / timeDiff

    return {
      playerId,
      position: {
        x: beforeState.position.x + (afterState.position.x - beforeState.position.x) * t,
        y: beforeState.position.y + (afterState.position.y - beforeState.position.y) * t
      },
      velocity: {
        x: beforeState.velocity.x + (afterState.velocity.x - beforeState.velocity.x) * t,
        y: beforeState.velocity.y + (afterState.velocity.y - beforeState.velocity.y) * t
      },
      rotation: beforeState.rotation + (afterState.rotation - beforeState.rotation) * t,
      animationState: afterState.animationState,
      inputState: afterState.inputState,
      timestamp: renderTime,
      sequenceNumber: afterState.sequenceNumber
    }
  }

  addPlayerState(playerId: string, state: PlayerState): void {
    if (!this.playerBuffers.has(playerId)) {
      this.playerBuffers.set(playerId, [])
    }

    const buffer = this.playerBuffers.get(playerId)!
    buffer.push(state)
    buffer.sort((a, b) => a.timestamp - b.timestamp)

    // Keep only recent states
    const cutoff = Date.now() - 500 // 500ms
    const filtered = buffer.filter(s => s.timestamp > cutoff)
    this.playerBuffers.set(playerId, filtered)
  }
}

class CheatDetector {
  private speedLimits = { maxSpeed: 200, maxAcceleration: 500 }
  private violations = new Map<string, number>()

  validatePlayerState(playerId: string, oldState: PlayerState, newState: PlayerState): boolean {
    const deltaTime = (newState.timestamp - oldState.timestamp) / 1000
    if (deltaTime <= 0) return false

    // Check speed limits
    const speed = Math.sqrt(newState.velocity.x ** 2 + newState.velocity.y ** 2)
    if (speed > this.speedLimits.maxSpeed) {
      this.recordViolation(playerId, 'speed_limit')
      return false
    }

    // Check acceleration limits
    const accelX = (newState.velocity.x - oldState.velocity.x) / deltaTime
    const accelY = (newState.velocity.y - oldState.velocity.y) / deltaTime
    const acceleration = Math.sqrt(accelX ** 2 + accelY ** 2)
    
    if (acceleration > this.speedLimits.maxAcceleration) {
      this.recordViolation(playerId, 'acceleration_limit')
      return false
    }

    return true
  }

  private recordViolation(playerId: string, type: string): void {
    const count = this.violations.get(playerId) || 0
    this.violations.set(playerId, count + 1)
    
    console.warn(`Cheat violation detected for ${playerId}: ${type}`)
  }
}

export default MultiplayerSync