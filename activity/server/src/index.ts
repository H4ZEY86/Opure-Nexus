import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import dotenv from 'dotenv'
import { authRouter } from './routes/auth'
import { musicRouter } from './routes/music'
import { setupSocketHandlers } from './socket/handlers'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'
import { validateEnvironment } from './utils/validateEnv'

// Load environment variables
dotenv.config()

// Validate required environment variables
validateEnvironment()

const app = express()
const server = createServer(app)

// Configure Socket.IO with Discord Activity optimizations
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Fallback for mobile
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB limit for uploads
  allowEIO3: true, // Support older clients
})

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Discord Activities
}))

// CORS configuration for Discord Activities
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "https://discord.com",
    "https://ptb.discord.com", 
    "https://canary.discord.com",
    "https://www.opure.uk",
    "https://opure.uk",
    /\.discord\.com$/,
    /\.discordsays\.com$/, // Discord Activity domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// Make Socket.IO available to routes
app.use((req, res, next) => {
  req.io = io
  next()
})

// API routes
app.use('/api/auth', authRouter)
app.use('/api/music', musicRouter)

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public'))
  
  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'public' })
  })
}

// Setup Socket.IO handlers
setupSocketHandlers(io)

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  logger.info(`🚀 Opure Discord Activity server running on port ${PORT}`)
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
    process.exit(0)
  })
})

export { app, server, io }