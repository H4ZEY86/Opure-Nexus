export interface Room {
  id: string
  name: string
  type: 'game' | 'music' | 'chat'
  users: User[]
  settings: RoomSettings
  created_at: Date
}

export interface User {
  id: string
  username: string
  avatar?: string
  globalName?: string
  roles?: string[]
  socketId?: string
  joinedAt?: Date
}

export interface RoomSettings {
  max_users: number
  private: boolean
  password?: string
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map()

  createRoom(name: string, type: Room['type'], creator: User, settings?: Partial<RoomSettings>): Room {
    const room: Room = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      users: [creator],
      settings: {
        max_users: 20,
        private: false,
        ...settings
      },
      created_at: new Date()
    }

    this.rooms.set(room.id, room)
    console.log(`Room created: ${room.id} by ${creator.username}`)
    
    return room
  }

  joinRoom(roomId: string, user: User): boolean {
    const room = this.rooms.get(roomId)
    
    if (!room) {
      return false
    }

    if (room.users.length >= room.settings.max_users) {
      return false
    }

    if (room.users.find(u => u.id === user.id)) {
      return true // Already in room
    }

    room.users.push(user)
    console.log(`User ${user.username} joined room ${roomId}`)
    
    return true
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    
    if (!room) {
      return false
    }

    const userIndex = room.users.findIndex(u => u.id === userId)
    
    if (userIndex === -1) {
      return false
    }

    room.users.splice(userIndex, 1)
    console.log(`User ${userId} left room ${roomId}`)

    // Delete room if empty
    if (room.users.length === 0) {
      this.rooms.delete(roomId)
      console.log(`Room ${roomId} deleted (empty)`)
    }

    return true
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  getRoomsByType(type: Room['type']): Room[] {
    return Array.from(this.rooms.values()).filter(room => room.type === type)
  }

  getUserRooms(userId: string): Room[] {
    return Array.from(this.rooms.values()).filter(room => 
      room.users.some(user => user.id === userId)
    )
  }

  addUser(roomId: string, user: User): Room {
    let room = this.rooms.get(roomId)
    
    if (!room) {
      // Auto-create room if it doesn't exist
      room = {
        id: roomId,
        name: `Room ${roomId}`,
        type: 'chat',
        users: [],
        settings: {
          max_users: 50,
          private: false
        },
        created_at: new Date()
      }
      this.rooms.set(roomId, room)
    }

    // Check if user already in room
    if (!room.users.find(u => u.id === user.id)) {
      room.users.push(user)
      console.log(`User ${user.username} added to room ${roomId}`)
    }

    return room
  }

  removeUser(roomId: string, userId: string): Room | null {
    const room = this.rooms.get(roomId)
    
    if (!room) {
      return null
    }

    const userIndex = room.users.findIndex(u => u.id === userId)
    
    if (userIndex !== -1) {
      room.users.splice(userIndex, 1)
      console.log(`User ${userId} removed from room ${roomId}`)
    }

    return room
  }

  removeRoom(roomId: string): boolean {
    const deleted = this.rooms.delete(roomId)
    if (deleted) {
      console.log(`Room ${roomId} removed`)
    }
    return deleted
  }

  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys()).filter(roomId => {
      const room = this.rooms.get(roomId)
      return room && room.users.length > 0
    })
  }
}