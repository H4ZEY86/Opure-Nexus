import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'
import { RoomManager } from '../services/RoomManager'
import { MusicManager } from '../services/MusicManager'
import { setupGameHandlers } from './gameHandlers'
// import { setupMarketplaceHandlers } from './marketplaceHandlers'

interface AuthenticatedSocket extends Socket {
  userId?: string
  username?: string
  roomId?: string
}

interface SocketData {
  userId: string
  username: string
  avatar?: string
  globalName?: string
}

const roomManager = new RoomManager()
const musicManager = new MusicManager()

export function setupSocketHandlers(io: SocketIOServer) {
  // Setup marketplace handlers
  // setupMarketplaceHandlers(io)

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      socket.userId = decoded.userId
      socket.username = decoded.username
      socket.data = {
        userId: decoded.userId,
        username: decoded.username,
        avatar: decoded.avatar,
        globalName: decoded.globalName,
      }

      next()
    } catch (error) {
      logger.error('Socket authentication failed:', error)
      next(new Error('Invalid authentication token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.username} (${socket.userId})`)

    // Setup game-specific handlers for this socket
    setupGameHandlers(io, socket)

    // Join Discord Activity instance room
    socket.on('join_room', async (data: { instanceId: string; channelId?: string }) => {
      try {
        const { instanceId, channelId } = data
        const roomId = `instance_${instanceId}`

        // Leave previous room if any
        if (socket.roomId) {
          await socket.leave(socket.roomId)
          roomManager.removeUser(socket.roomId, socket.userId!)
        }

        // Join new room
        await socket.join(roomId)
        socket.roomId = roomId

        // Add user to room
        const room = roomManager.addUser(roomId, {
          id: socket.userId!,
          username: socket.username!,
          avatar: socket.data.avatar,
          globalName: socket.data.globalName,
          socketId: socket.id,
          joinedAt: new Date(),
        })

        // Notify room of new user
        socket.to(roomId).emit('user_joined', {
          user: room.users.find(u => u.id === socket.userId),
          userCount: room.users.length,
        })

        // Send room state to joining user
        socket.emit('room_joined', {
          roomId,
          users: room.users,
          musicState: musicManager.getRoomState(roomId),
        })

        logger.info(`User ${socket.username} joined room ${roomId}`)
      } catch (error) {
        logger.error('Failed to join room:', error)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    // Music controls
    socket.on('music_play', async (data: { url: string; title?: string; duration?: number }): Promise<void> => {
      try {
        if (!socket.roomId) {
          socket.emit('error', { message: 'Not in a room' })
          return
        }

        const musicState = await musicManager.playTrack(socket.roomId, data, socket.userId!)
        
        // Broadcast to all users in room
        io.to(socket.roomId).emit('music_state_update', musicState)
        
        logger.info(`Music played in room ${socket.roomId}: ${data.title || data.url}`)
      } catch (error) {
        logger.error('Failed to play music:', error)
        socket.emit('error', { message: 'Failed to play music' })
      }
    })

    socket.on('music_pause', async (): Promise<void> => {
      try {
        if (!socket.roomId) {
          socket.emit('error', { message: 'Not in a room' })
          return
        }

        const musicState = await musicManager.pauseTrack(socket.roomId, socket.userId!)
        io.to(socket.roomId).emit('music_state_update', musicState)
      } catch (error) {
        logger.error('Failed to pause music:', error)
        socket.emit('error', { message: 'Failed to pause music' })
      }
    })

    socket.on('music_resume', async (): Promise<void> => {
      try {
        if (!socket.roomId) {
          socket.emit('error', { message: 'Not in a room' })
          return
        }

        const musicState = await musicManager.resumeTrack(socket.roomId, socket.userId!)
        io.to(socket.roomId).emit('music_state_update', musicState)
      } catch (error) {
        logger.error('Failed to resume music:', error)
        socket.emit('error', { message: 'Failed to resume music' })
      }
    })

    socket.on('music_seek', async (data: { position: number }): Promise<void> => {
      try {
        if (!socket.roomId) {
          socket.emit('error', { message: 'Not in a room' })
          return
        }

        const musicState = await musicManager.seekTrack(socket.roomId, data.position, socket.userId!)
        io.to(socket.roomId).emit('music_state_update', musicState)
      } catch (error) {
        logger.error('Failed to seek music:', error)
        socket.emit('error', { message: 'Failed to seek music' })
      }
    })

    socket.on('music_volume', async (data: { volume: number }): Promise<void> => {
      try {
        if (!socket.roomId) {
          socket.emit('error', { message: 'Not in a room' })
          return
        }

        const musicState = await musicManager.setVolume(socket.roomId, data.volume, socket.userId!)
        io.to(socket.roomId).emit('music_state_update', musicState)
      } catch (error) {
        logger.error('Failed to set volume:', error)
        socket.emit('error', { message: 'Failed to set volume' })
      }
    })

    // Playlist management
    socket.on('playlist_add', async (data: { url: string; title?: string; duration?: number }): Promise<void> => {
      try {
        if (!socket.roomId) {
          socket.emit('error', { message: 'Not in a room' })
          return
        }

        const playlist = await musicManager.addToPlaylist(socket.roomId, data, socket.userId!)
        io.to(socket.roomId).emit('playlist_update', playlist)
      } catch (error) {
        logger.error('Failed to add to playlist:', error)
        socket.emit('error', { message: 'Failed to add to playlist' })
      }
    })

    socket.on('playlist_remove', async (data: { index: number }): Promise<void> => {
      try {
        if (!socket.roomId) {
          socket.emit('error', { message: 'Not in a room' })
          return
        }

        const playlist = await musicManager.removeFromPlaylist(socket.roomId, data.index, socket.userId!)
        io.to(socket.roomId).emit('playlist_update', playlist)
      } catch (error) {
        logger.error('Failed to remove from playlist:', error)
        socket.emit('error', { message: 'Failed to remove from playlist' })
      }
    })

    // Real-time sync for visualizers
    socket.on('sync_request', () => {
      if (socket.roomId) {
        const musicState = musicManager.getRoomState(socket.roomId)
        socket.emit('sync_response', {
          ...musicState,
          serverTime: Date.now(),
        })
      }
    })

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.username} (${socket.userId}) - ${reason}`)

      if (socket.roomId && socket.userId) {
        const room = roomManager.removeUser(socket.roomId, socket.userId)
        
        if (room) {
          // Notify remaining users
          socket.to(socket.roomId).emit('user_left', {
            userId: socket.userId,
            userCount: room.users.length,
          })

          // Clean up empty rooms
          if (room.users.length === 0) {
            roomManager.removeRoom(socket.roomId)
            musicManager.stopRoom(socket.roomId)
          }
        }
      }
    })

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.username}:`, error)
    })
  })

  // Periodic sync for all rooms
  setInterval(() => {
    const activeRooms = roomManager.getActiveRooms()
    
    activeRooms.forEach(roomId => {
      const musicState = musicManager.getRoomState(roomId)
      if (musicState.isPlaying) {
        io.to(roomId).emit('music_sync', {
          ...musicState,
          serverTime: Date.now(),
        })
      }
    })
  }, 5000) // Sync every 5 seconds

  logger.info('Socket.IO handlers initialized')
}