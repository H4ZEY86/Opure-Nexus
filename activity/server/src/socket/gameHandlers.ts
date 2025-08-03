/**
 * MULTIPLAYER GAME SESSION HANDLERS
 * Server-side handlers for real-time multiplayer gaming
 * Features: Room management, state synchronization, anti-cheat, performance optimization
 */

import { Socket } from 'socket.io'
import { Server as SocketIOServer } from 'socket.io'

interface GameRoom {
  id: string
  gameId: string
  hostId: string
  players: Map<string, GamePlayer>
  gameState: any
  settings: GameRoomSettings
  status: 'waiting' | 'playing' | 'finished'
  createdAt: number
  lastActivity: number
}

interface GamePlayer {
  id: string
  username: string
  avatar: string
  isHost: boolean
  isReady: boolean
  isConnected: boolean
  joinedAt: number
  lastPing: number
  performance: {
    fps: number
    latency: number
    packetLoss: number
  }
  gameState: any
}

interface GameRoomSettings {
  maxPlayers: number
  difficulty: number
  gameMode: string
  isPrivate: boolean
  allowSpectators: boolean
  antiCheatEnabled: boolean
}

interface GameStateUpdate {
  playerId: string
  timestamp: number
  sequenceNumber: number
  gameState: any
  checksum?: string
}

class GameSessionManager {
  private rooms = new Map<string, GameRoom>()
  private playerRooms = new Map<string, string>() // playerId -> roomId
  private io: SocketIOServer
  
  constructor(io: SocketIOServer) {
    this.io = io
    this.startCleanupInterval()
  }

  public createRoom(hostId: string, gameId: string, settings: Partial<GameRoomSettings>): GameRoom {
    const roomId = this.generateRoomId()
    
    const room: GameRoom = {
      id: roomId,
      gameId,
      hostId,
      players: new Map(),
      gameState: {},
      settings: {
        maxPlayers: 4,
        difficulty: 1,
        gameMode: 'standard',
        isPrivate: false,
        allowSpectators: true,
        antiCheatEnabled: true,
        ...settings
      },
      status: 'waiting',
      createdAt: Date.now(),
      lastActivity: Date.now()
    }
    
    this.rooms.set(roomId, room)
    return room
  }

  public joinRoom(roomId: string, player: GamePlayer): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    
    if (room.players.size >= room.settings.maxPlayers) return false
    if (room.status === 'playing' && !room.settings.allowSpectators) return false
    
    // Remove player from any existing room
    this.leaveRoom(player.id)
    
    // Add player to room
    room.players.set(player.id, player)
    this.playerRooms.set(player.id, roomId)
    room.lastActivity = Date.now()
    
    // Notify other players
    this.io.to(roomId).emit('player_joined', {
      roomId,
      player: this.sanitizePlayer(player)
    })
    
    return true
  }

  public leaveRoom(playerId: string): boolean {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) return false
    
    const room = this.rooms.get(roomId)
    if (!room) return false
    
    room.players.delete(playerId)
    this.playerRooms.delete(playerId)
    room.lastActivity = Date.now()
    
    // If host left, assign new host
    if (room.hostId === playerId && room.players.size > 0) {
      const newHost = Array.from(room.players.values())[0]
      room.hostId = newHost.id
      newHost.isHost = true
      
      this.io.to(roomId).emit('host_changed', {
        roomId,
        newHostId: newHost.id
      })
    }
    
    // Delete room if empty
    if (room.players.size === 0) {
      this.rooms.delete(roomId)
    } else {
      this.io.to(roomId).emit('player_left', {
        roomId,
        playerId
      })
    }
    
    return true
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  public getPlayerRoom(playerId: string): GameRoom | undefined {
    const roomId = this.playerRooms.get(playerId)
    return roomId ? this.rooms.get(roomId) : undefined
  }

  public updateGameState(playerId: string, update: GameStateUpdate): boolean {
    const room = this.getPlayerRoom(playerId)
    if (!room) return false
    
    const player = room.players.get(playerId)
    if (!player) return false
    
    // Validate update
    if (room.settings.antiCheatEnabled && !this.validateGameState(update, player)) {
      console.warn(`Invalid game state from player ${playerId}`)
      return false
    }
    
    // Update player state
    player.gameState = update.gameState
    player.lastPing = Date.now()
    room.lastActivity = Date.now()
    
    // Broadcast to other players
    this.io.to(room.id).except(playerId).emit('game_state_update', {
      playerId,
      gameState: update.gameState,
      timestamp: update.timestamp
    })
    
    return true
  }

  public startGame(roomId: string, hostId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room || room.hostId !== hostId) return false
    
    // Check if all players are ready
    const allReady = Array.from(room.players.values()).every(p => p.isReady)
    if (!allReady) return false
    
    room.status = 'playing'
    room.lastActivity = Date.now()
    
    this.io.to(roomId).emit('game_started', {
      roomId,
      gameState: room.gameState,
      settings: room.settings
    })
    
    return true
  }

  public endGame(roomId: string, results: any): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    
    room.status = 'finished'
    room.lastActivity = Date.now()
    
    this.io.to(roomId).emit('game_ended', {
      roomId,
      results
    })
    
    // Clean up room after 5 minutes
    setTimeout(() => {
      this.rooms.delete(roomId)
      for (const [playerId, currentRoomId] of this.playerRooms) {
        if (currentRoomId === roomId) {
          this.playerRooms.delete(playerId)
        }
      }
    }, 5 * 60 * 1000)
    
    return true
  }

  private validateGameState(update: GameStateUpdate, player: GamePlayer): boolean {
    // Basic validation - in a real implementation, this would be more sophisticated
    if (!update.timestamp || !update.sequenceNumber) return false
    
    // Check timestamp reasonableness
    const now = Date.now()
    if (Math.abs(update.timestamp - now) > 10000) return false // 10 second tolerance
    
    // Check for impossible values
    if (update.gameState?.score < 0) return false
    if (update.gameState?.health > 1000) return false
    
    return true
  }

  private sanitizePlayer(player: GamePlayer): any {
    return {
      id: player.id,
      username: player.username,
      avatar: player.avatar,
      isHost: player.isHost,
      isReady: player.isReady,
      isConnected: player.isConnected,
      joinedAt: player.joinedAt,
      performance: player.performance
    }
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      const maxIdleTime = 10 * 60 * 1000 // 10 minutes
      
      for (const [roomId, room] of this.rooms) {
        if (now - room.lastActivity > maxIdleTime) {
          console.log(`Cleaning up idle room: ${roomId}`)
          
          // Notify players
          this.io.to(roomId).emit('room_closed', {
            roomId,
            reason: 'Room idle for too long'
          })
          
          // Clean up
          this.rooms.delete(roomId)
          for (const [playerId, currentRoomId] of this.playerRooms) {
            if (currentRoomId === roomId) {
              this.playerRooms.delete(playerId)
            }
          }
        }
      }
    }, 60 * 1000) // Check every minute
  }

  public getRoomList(gameId?: string): any[] {
    const publicRooms = Array.from(this.rooms.values())
      .filter(room => !room.settings.isPrivate && room.status === 'waiting')
      .filter(room => !gameId || room.gameId === gameId)
      .map(room => ({
        id: room.id,
        gameId: room.gameId,
        players: room.players.size,
        maxPlayers: room.settings.maxPlayers,
        settings: room.settings,
        createdAt: room.createdAt
      }))
    
    return publicRooms.slice(0, 20) // Limit to 20 rooms
  }

  public getStats(): any {
    return {
      totalRooms: this.rooms.size,
      totalPlayers: this.playerRooms.size,
      roomsByGame: this.getRoomsByGame(),
      roomsByStatus: this.getRoomsByStatus()
    }
  }

  private getRoomsByGame(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const room of this.rooms.values()) {
      stats[room.gameId] = (stats[room.gameId] || 0) + 1
    }
    return stats
  }

  private getRoomsByStatus(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const room of this.rooms.values()) {
      stats[room.status] = (stats[room.status] || 0) + 1
    }
    return stats
  }
}

// Global game session manager (singleton)
let gameManager: GameSessionManager

// Socket.IO event handlers
export function setupGameHandlers(io: SocketIOServer, socket: Socket) {
  // Initialize singleton game manager
  if (!gameManager) {
    gameManager = new GameSessionManager(io)
  }
  
  const userId = socket.data?.userId || socket.handshake.auth.userId

  // Create or join room
  socket.on('create_room', (data: { gameId: string; settings: Partial<GameRoomSettings> }) => {
    try {
      const player: GamePlayer = {
        id: userId,
        username: socket.data?.username || 'Player',
        avatar: socket.data?.avatar || '',
        isHost: true,
        isReady: false,
        isConnected: true,
        joinedAt: Date.now(),
        lastPing: Date.now(),
        performance: { fps: 60, latency: 0, packetLoss: 0 },
        gameState: {}
      }
      
      const room = gameManager.createRoom(userId, data.gameId, data.settings)
      gameManager.joinRoom(room.id, player)
      
      socket.join(room.id)
      
      socket.emit('room_created', {
        roomId: room.id,
        room: {
          id: room.id,
          gameId: room.gameId,
          players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            username: p.username,
            avatar: p.avatar,
            isHost: p.isHost,
            isReady: p.isReady,
            isConnected: p.isConnected,
            joinedAt: p.joinedAt,
            performance: p.performance
          })),
          settings: room.settings,
          status: room.status
        }
      })
    } catch (error) {
      socket.emit('room_error', { message: 'Failed to create room' })
    }
  })

  socket.on('join_room', (data: { roomId: string; playerInfo: any }) => {
    try {
      const player: GamePlayer = {
        id: userId,
        username: data.playerInfo?.username || socket.data?.username || 'Player',
        avatar: data.playerInfo?.avatar || socket.data?.avatar || '',
        isHost: false,
        isReady: false,
        isConnected: true,
        joinedAt: Date.now(),
        lastPing: Date.now(),
        performance: { fps: 60, latency: 0, packetLoss: 0 },
        gameState: {}
      }
      
      const success = gameManager.joinRoom(data.roomId, player)
      
      if (success) {
        socket.join(data.roomId)
        
        const room = gameManager.getRoom(data.roomId)
        if (room) {
          socket.emit('room_joined', {
            roomId: room.id,
            room: {
              id: room.id,
              gameId: room.gameId,
              players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            username: p.username,
            avatar: p.avatar,
            isHost: p.isHost,
            isReady: p.isReady,
            isConnected: p.isConnected,
            joinedAt: p.joinedAt,
            performance: p.performance
          })),
              settings: room.settings,
              status: room.status
            }
          })
        }
      } else {
        socket.emit('join_room_error', { message: 'Failed to join room' })
      }
    } catch (error) {
      socket.emit('join_room_error', { message: 'Failed to join room' })
    }
  })

  socket.on('leave_room', () => {
    const room = gameManager.getPlayerRoom(userId)
    if (room) {
      socket.leave(room.id)
      gameManager.leaveRoom(userId)
    }
  })

  socket.on('player_ready', (data: { ready: boolean }) => {
    const room = gameManager.getPlayerRoom(userId)
    if (room) {
      const player = room.players.get(userId)
      if (player) {
        player.isReady = data.ready
        
        io.to(room.id).emit('player_ready_changed', {
          playerId: userId,
          ready: data.ready
        })
      }
    }
  })

  socket.on('start_game', () => {
    const room = gameManager.getPlayerRoom(userId)
    if (room && room.hostId === userId) {
      gameManager.startGame(room.id, userId)
    }
  })

  socket.on('game_state_sync', (data: GameStateUpdate) => {
    gameManager.updateGameState(userId, data)
  })

  socket.on('player_input', (data: any) => {
    const room = gameManager.getPlayerRoom(userId)
    if (room) {
      // Broadcast input to other players
      socket.to(room.id).emit('player_input', {
        playerId: userId,
        input: data,
        timestamp: Date.now()
      })
    }
  })

  socket.on('game_end', (data: { results: any }) => {
    const room = gameManager.getPlayerRoom(userId)
    if (room && room.hostId === userId) {
      gameManager.endGame(room.id, data.results)
    }
  })

  socket.on('get_room_list', (data: { gameId?: string }) => {
    const rooms = gameManager.getRoomList(data.gameId)
    socket.emit('room_list', rooms)
  })

  socket.on('ping', (data: { timestamp: number }) => {
    socket.emit('ping_response', {
      timestamp: data.timestamp,
      serverTime: Date.now()
    })
    
    // Update player performance metrics
    const room = gameManager.getPlayerRoom(userId)
    if (room) {
      const player = room.players.get(userId)
      if (player) {
        const latency = Date.now() - data.timestamp
        player.performance.latency = latency
        player.lastPing = Date.now()
      }
    }
  })

  socket.on('performance_update', (data: { fps: number; memoryUsage: number }) => {
    const room = gameManager.getPlayerRoom(userId)
    if (room) {
      const player = room.players.get(userId)
      if (player) {
        player.performance.fps = data.fps
        // Memory usage could be stored if needed
      }
    }
  })

  socket.on('chat_message', (data: { message: string }) => {
    const room = gameManager.getPlayerRoom(userId)
    if (room) {
      // Basic message validation
      if (data.message && data.message.length <= 200) {
        io.to(room.id).emit('chat_message', {
          playerId: userId,
          username: room.players.get(userId)?.username || 'Player',
          message: data.message,
          timestamp: Date.now()
        })
      }
    }
  })

  socket.on('kick_player', (data: { playerId: string }) => {
    const room = gameManager.getPlayerRoom(userId)
    if (room && room.hostId === userId) {
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.handshake.auth.userId === data.playerId)
      
      if (targetSocket) {
        targetSocket.leave(room.id)
        gameManager.leaveRoom(data.playerId)
        
        targetSocket.emit('kicked_from_room', {
          roomId: room.id,
          reason: 'Kicked by host'
        })
      }
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    const room = gameManager.getPlayerRoom(userId)
    if (room) {
      const player = room.players.get(userId)
      if (player) {
        player.isConnected = false
        
        // Give player 30 seconds to reconnect
        setTimeout(() => {
          const currentRoom = gameManager.getPlayerRoom(userId)
          if (currentRoom) {
            const currentPlayer = currentRoom.players.get(userId)
            if (currentPlayer && !currentPlayer.isConnected) {
              gameManager.leaveRoom(userId)
            }
          }
        }, 30000)
      }
    }
  })

  // Handle reconnection
  socket.on('reconnect_to_room', (data: { roomId: string }) => {
    const room = gameManager.getRoom(data.roomId)
    if (room && room.players.has(userId)) {
      const player = room.players.get(userId)!
      player.isConnected = true
      player.lastPing = Date.now()
      
      socket.join(room.id)
      
      socket.emit('reconnected_to_room', {
        roomId: room.id,
        gameState: room.gameState
      })
      
      socket.to(room.id).emit('player_reconnected', {
        playerId: userId
      })
    }
  })
}

export default setupGameHandlers