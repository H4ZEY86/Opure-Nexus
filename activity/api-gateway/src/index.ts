// ============================================================================
// OPURE MARKETPLACE API GATEWAY
// ============================================================================
// External API Gateway for Discord Activity Marketplace
// Features: Railway/Vercel deployment, WebSocket support, IONOS compatibility
// Serves as the backend for IONOS static hosting frontend
// ============================================================================

import express, { Request, Response, NextFunction } from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { config } from 'dotenv'
import { logger } from './utils/logger.js'
import { DatabaseManager } from './database/DatabaseManager.js'
import { RedisManager } from './cache/RedisManager.js'
import { WebSocketManager } from './websocket/WebSocketManager.js'
import { AuthMiddleware } from './middleware/AuthMiddleware.js'
import { ValidationMiddleware } from './middleware/ValidationMiddleware.js'
import { ErrorHandler } from './middleware/ErrorHandler.js'

// Import route handlers
import { marketplaceRoutes } from './routes/marketplace.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/user.js'
import { analyticsRoutes } from './routes/analytics.js'
import { healthRoutes } from './routes/health.js'

// Load environment variables
config()

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://www.opure.uk',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})

// Configuration
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'
const IS_PRODUCTION = NODE_ENV === 'production'

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://discord.com", "https://*.discord.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      mediaSrc: ["'self'", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "wss:", "https:", "ws:"],
      frameSrc: ["'self'", "https://discord.com", "https://*.discord.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}))

// CORS configuration for IONOS hosting
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from IONOS domain and development
    const allowedOrigins = [
      'https://opure.uk',
      'https://www.opure.uk',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://discord.com',
      'https://*.api.opure.uk/*',
      'https://api.opure.uk'
    ]
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Compression and parsing
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 100 : 1000, // 100 requests per window in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: IS_PRODUCTION ? 30 : 100, // 30 requests per minute in production
  message: {
    error: 'Too many API requests, please slow down.',
    retryAfter: 60 // 1 minute
  }
})

app.use(generalLimiter)
app.use('/api', apiLimiter)

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer')
  })
  next()
})

// ============================================================================
// DATABASE AND CACHE INITIALIZATION
// ============================================================================

let db: DatabaseManager
let redis: RedisManager
let wsManager: WebSocketManager

async function initializeServices() {
  try {
    // Initialize database
    logger.info('Initializing database connection...')
    db = new DatabaseManager({
      connectionString: process.env.DATABASE_URL!,
      ssl: IS_PRODUCTION ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000')
    })
    await db.initialize()
    logger.info('✅ Database connected successfully')

    // Initialize Redis cache
    if (process.env.REDIS_URL) {
      logger.info('Initializing Redis cache...')
      redis = new RedisManager({
        url: process.env.REDIS_URL,
        retryDelayOnFailover: 1000,
        maxRetriesPerRequest: 3
      })
      await redis.initialize()
      logger.info('✅ Redis cache connected successfully')
    }

    // Initialize WebSocket manager
    logger.info('Initializing WebSocket manager...')
    wsManager = new WebSocketManager(io, db, redis)
    await wsManager.initialize()
    logger.info('✅ WebSocket manager initialized')

    // Make services available to routes
    app.locals.db = db
    app.locals.redis = redis
    app.locals.wsManager = wsManager

  } catch (error) {
    logger.error('❌ Failed to initialize services:', error)
    process.exit(1)
  }
}

// ============================================================================
// ROUTES SETUP
// ============================================================================

// Health check endpoint (no authentication required)
app.use('/health', healthRoutes)

// API routes with authentication
app.use('/api/auth', authRoutes)
app.use('/api/user', AuthMiddleware.authenticate, userRoutes)
app.use('/api/marketplace', AuthMiddleware.authenticate, marketplaceRoutes)
app.use('/api/analytics', AuthMiddleware.authenticate, analyticsRoutes)

// Static information endpoint for IONOS frontend
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'Opure Marketplace API Gateway',
      version: '1.0.0',
      environment: NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      features: {
        websocket: true,
        redis: !!process.env.REDIS_URL,
        database: true,
        authentication: true,
        rateLimit: true
      },
      endpoints: {
        marketplace: '/api/marketplace',
        auth: '/api/auth',
        user: '/api/user',
        analytics: '/api/analytics',
        websocket: '/socket.io'
      }
    }
  })
})

// Fallback for IONOS frontend routing
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      availableEndpoints: [
        '/api/marketplace',
        '/api/auth',
        '/api/user',
        '/api/analytics',
        '/health'
      ]
    })
  } else {
    res.json({
      success: true,
      message: 'Opure Marketplace API Gateway',
      documentation: 'https://api.opure.uk/api/docs',
      frontend: 'https://www.opure.uk'
    })
  }
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
app.use(ErrorHandler.handle)

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error)
  process.exit(1)
})

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

async function gracefulShutdown(signal: string) {
  logger.info(`📴 Received ${signal}. Starting graceful shutdown...`)
  
  // Close server
  server.close(() => {
    logger.info('🔌 HTTP server closed')
  })

  // Close WebSocket connections
  if (wsManager) {
    await wsManager.shutdown()
    logger.info('🔌 WebSocket manager closed')
  }

  // Close database connections
  if (db) {
    await db.close()
    logger.info('🔌 Database connections closed')
  }

  // Close Redis connections
  if (redis) {
    await redis.close()
    logger.info('🔌 Redis connections closed')
  }

  logger.info('✅ Graceful shutdown completed')
  process.exit(0)
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize all services
    await initializeServices()

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Opure Marketplace API Gateway started`)
      logger.info(`📡 Server running on port ${PORT}`)
      logger.info(`🌍 Environment: ${NODE_ENV}`)
      logger.info(`📊 WebSocket enabled: ${!!wsManager}`)
      logger.info(`💾 Redis cache: ${redis ? 'enabled' : 'disabled'}`)
      logger.info(`🔒 Authentication: enabled`)
      logger.info(`⚡ Rate limiting: enabled`)
      logger.info(`🌐 CORS origin: ${process.env.CLIENT_URL || 'https://www.opure.uk'}`)
      
      if (!IS_PRODUCTION) {
        logger.info(`📝 API Documentation: http://localhost:${PORT}/api/info`)
        logger.info(`🏥 Health Check: http://localhost:${PORT}/health`)
      }
    })

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`❌ Port ${PORT} requires elevated privileges`)
          process.exit(1)
          break
        case 'EADDRINUSE':
          logger.error(`❌ Port ${PORT} is already in use`)
          process.exit(1)
          break
        default:
          throw error
      }
    })

  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

// Export for testing and serverless functions
export { app, server, io }
export default app