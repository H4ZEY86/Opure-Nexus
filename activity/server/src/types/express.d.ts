import { Server as SocketIOServer } from 'socket.io'

declare global {
  namespace Express {
    interface Request {
      io?: SocketIOServer
      admin?: {
        user_id: string
        username: string
        roles: string[]
      }
    }
  }
}