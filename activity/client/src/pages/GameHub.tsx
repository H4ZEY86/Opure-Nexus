/**
 * GAME HUB - MAIN GAMING INTERFACE
 * Mobile-optimized UI with glass morphism design and game selection
 * Features: Game carousel, performance dashboard, social features, responsive design
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion'
import { useDiscord } from '../contexts/DiscordContextDirect'
import PuzzleGameComponent from '../components/games/PuzzleGameComponent'

interface GameInfo {
  id: string
  name: string
  description: string
  category: 'puzzle' | 'action' | 'strategy' | 'idle'
  icon: string
  gradient: string[]
  difficulty: number
  estimatedTime: string
  maxPlayers: number
  tokensPerMinute: number
  featured: boolean
}

interface PlayerStats {
  level: number
  experience: number
  tokensEarned: number
  gamesPlayed: number
  currentStreak: number
  achievements: number
}

const GAMES: GameInfo[] = [
  {
    id: 'puzzle_master',
    name: 'Puzzle Master',
    description: 'Match-3 puzzle game with endless levels and AI opponents',
    category: 'puzzle',
    icon: '🧩',
    gradient: ['#667eea', '#764ba2'],
    difficulty: 2,
    estimatedTime: '5-15 min',
    maxPlayers: 2,
    tokensPerMinute: 12,
    featured: true
  },
  {
    id: 'action_arena',
    name: 'Action Arena',
    description: 'Fast-paced action game with infinite waves and upgrades',
    category: 'action',
    icon: '⚡',
    gradient: ['#ff6b6b', '#ee5a24'],
    difficulty: 3,
    estimatedTime: '10-20 min',
    maxPlayers: 4,
    tokensPerMinute: 18,
    featured: true
  },
  {
    id: 'strategy_wars',
    name: 'Strategy Wars',
    description: 'Turn-based strategy with procedural campaigns',
    category: 'strategy',
    icon: '♟️',
    gradient: ['#2ecc71', '#27ae60'],
    difficulty: 4,
    estimatedTime: '15-30 min',
    maxPlayers: 2,
    tokensPerMinute: 15,
    featured: false
  },
  {
    id: 'idle_empire',
    name: 'Idle Empire',
    description: 'Build and manage your growing empire',
    category: 'idle',
    icon: '🏰',
    gradient: ['#f39c12', '#e67e22'],
    difficulty: 1,
    estimatedTime: 'Continuous',
    maxPlayers: 1,
    tokensPerMinute: 8,
    featured: false
  }
]

export default function GameHub() {
  const { user } = useDiscord()
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null)
  const [currentGame, setCurrentGame] = useState<GameEngine | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentGameComponent, setCurrentGameComponent] = useState<React.ReactNode | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    level: 1,
    experience: 0,
    tokensEarned: 0,
    gamesPlayed: 0,
    currentStreak: 0,
    achievements: 0
  })
  
  // Mobile responsive states
  const [isMobile, setIsMobile] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [touchSupported, setTouchSupported] = useState(false)
  
  // Game carousel
  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselX = useMotionValue(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  
  // Performance monitoring
  const [performance, setPerformance] = useState({
    fps: 60,
    latency: 0,
    memoryUsage: 0
  })
  
  // Social features
  const [onlinePlayers, setOnlinePlayers] = useState(142)
  const [friendsOnline, setFriendsOnline] = useState(3)

  useEffect(() => {
    // Detect mobile and touch support
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }
    
    setTouchSupported('ontouchstart' in window)
    checkMobile()
    
    window.addEventListener('resize', checkMobile)
    window.addEventListener('orientationchange', () => {
      setTimeout(checkMobile, 100) // Delay to ensure proper orientation detection
    })
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', checkMobile)
    }
  }, [])

  useEffect(() => {
    // Load player stats
    if (user) {
      loadPlayerStats()
    }
  }, [user])

  const loadPlayerStats = async () => {
    // In a real implementation, this would load from the rewards system and database
    setPlayerStats({
      level: 12,
      experience: 2847,
      tokensEarned: 1250,
      gamesPlayed: 38,
      currentStreak: 5,
      achievements: 12
    })
  }

  const startGame = async (gameInfo: GameInfo) => {
    if (!user) return
    
    setSelectedGame(gameInfo)
    setIsPlaying(true)
    
    // Launch actual playable games
    if (gameInfo.id === 'puzzle_master') {
      setCurrentGameComponent(<PuzzleGameComponent />)
    }
    // Add more games here as we implement them
    
    try {
      // Get game canvas
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
      if (!canvas) throw new Error('Game canvas not found')
      
      // Create game instance
      let game: GameEngine
      
      switch (gameInfo.id) {
        case 'puzzle_master':
          game = new PuzzleGame(canvas, gameInfo.difficulty)
          break
        case 'action_arena':
          game = new ActionGame(canvas, gameInfo.difficulty)
          break
        default:
          throw new Error(`Game ${gameInfo.id} not implemented yet`)
      }
      
      // Initialize and start game
      await game.initialize(user.id)
      game.start()
      
      setCurrentGame(game)
      
      // Set up game event handlers
      game.on('gameOver', (stats) => {
        handleGameOver(stats)
      })
      
      game.on('performanceUpdate', (metrics) => {
        setPerformance(metrics)
      })
      
    } catch (error) {
      console.error('Failed to start game:', error)
      setIsPlaying(false)
      setSelectedGame(null)
    }
  }

  const handleGameOver = async (gameStats: any) => {
    if (!currentGame || !selectedGame) return
    
    // Calculate rewards
    const rewardsSystem = new RewardsSystem()
    const session = {
      sessionId: gameStats.sessionId,
      gameId: selectedGame.id,
      userId: user?.id || '',
      startTime: gameStats.startTime || Date.now() - 300000,
      endTime: Date.now(),
      duration: gameStats.timeElapsed || 300000,
      score: gameStats.score || 0,
      level: gameStats.level || 1,
      difficulty: gameStats.difficulty || 1,
      completion: gameStats.completion || 0.5,
      accuracy: gameStats.accuracy || 0.8,
      consistency: gameStats.consistency || 0.7,
      timeSpentPlaying: gameStats.timeElapsed || 300000,
      timeSpentIdle: 0,
      actionsPerMinute: gameStats.actionsPerMinute || 60,
      averageReactionTime: gameStats.averageReactionTime || 300,
      multiplayerSession: false,
      playersInSession: 1,
      socialInteractions: 0,
      helpedOtherPlayers: 0,
      suspiciousActivity: false,
      validatedByPeers: false,
      achievementsUnlocked: gameStats.achievementsUnlocked || [],
      tokensEarned: 0,
      bonusTokens: 0,
      experienceGained: 0,
      qualityScore: 0.8
    }
    
    try {
      const rewards = await rewardsSystem.calculateRewards(session)
      showGameOverModal(gameStats, rewards)
    } catch (error) {
      console.error('Failed to calculate rewards:', error)
      showGameOverModal(gameStats, null)
    }
    
    // Cleanup
    currentGame.destroy()
    setCurrentGame(null)
    setIsPlaying(false)
    setSelectedGame(null)
    
    // Update player stats
    await loadPlayerStats()
  }

  const showGameOverModal = (gameStats: any, rewards: any) => {
    // This would show a modal with game results and rewards
    console.log('Game Over:', { gameStats, rewards })
  }

  const nextGame = () => {
    setCarouselIndex((prev) => (prev + 1) % GAMES.length)
  }

  const prevGame = () => {
    setCarouselIndex((prev) => (prev - 1 + GAMES.length) % GAMES.length)
  }

  const featuredGames = useMemo(() => GAMES.filter(game => game.featured), [])
  const currentFeaturedGame = featuredGames[carouselIndex % featuredGames.length]

  if (isPlaying && currentGameComponent) {
    return (
      <div className="fixed inset-0 z-50">
        {/* Game Exit Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            setIsPlaying(false)
            setSelectedGame(null)
            setCurrentGameComponent(null)
            if (currentGame) {
              currentGame.stop()
              currentGame.destroy()
              setCurrentGame(null)
            }
          }}
          className="absolute top-4 right-4 z-50 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-lg transition-all"
        >
          ← Back to Games
        </motion.button>
        
        {/* Render the actual game */}
        {currentGameComponent}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -80, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -120, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/6 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Game Hub
            </h1>
            <p className="text-white/60 text-sm mt-1">
              {onlinePlayers} players online • {friendsOnline} friends
            </p>
          </div>
          
          {/* Performance Indicator */}
          <div className="flex items-center space-x-2">
            <div className="glass-card px-3 py-1 rounded-full">
              <div className="flex items-center space-x-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${performance.fps > 45 ? 'bg-green-400' : performance.fps > 25 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span>{performance.fps} FPS</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Player Stats Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 mb-8 rounded-2xl"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300">{playerStats.level}</div>
              <div className="text-xs text-white/60">Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{playerStats.tokensEarned}</div>
              <div className="text-xs text-white/60">AI Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{playerStats.gamesPlayed}</div>
              <div className="text-xs text-white/60">Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300">{playerStats.currentStreak}</div>
              <div className="text-xs text-white/60">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-300">{playerStats.achievements}</div>
              <div className="text-xs text-white/60">Achievements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-300">{Math.floor(playerStats.experience / 100)}</div>
              <div className="text-xs text-white/60">Rank</div>
            </div>
          </div>
          
          {/* Experience Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>Level {playerStats.level}</span>
              <span>{playerStats.experience % 1000}/1000 XP</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(playerStats.experience % 1000) / 10}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Featured Game Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">Featured Games</h2>
          
          <div className="relative overflow-hidden rounded-2xl">
            <motion.div
              ref={carouselRef}
              className="flex"
              style={{ x: carouselX }}
              drag={isMobile ? "x" : false}
              dragConstraints={{ left: -300 * (featuredGames.length - 1), right: 0 }}
            >
              {featuredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  className="min-w-full relative"
                  whileHover={{ scale: isMobile ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startGame(game)}
                >
                  <div 
                    className="glass-card p-6 h-48 rounded-2xl cursor-pointer overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${game.gradient[0]}40, ${game.gradient[1]}40)`
                    }}
                  >
                    <div className="flex items-start justify-between h-full">
                      <div className="flex-1">
                        <div className="text-4xl mb-2">{game.icon}</div>
                        <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                        <p className="text-white/70 text-sm mb-4 line-clamp-2">{game.description}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-white/60">
                          <div className="flex items-center space-x-1">
                            <div className="w-1 h-1 bg-current rounded-full" />
                            <span>{game.estimatedTime}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-1 h-1 bg-current rounded-full" />
                            <span>{game.tokensPerMinute}/min</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-1 h-1 bg-current rounded-full" />
                            <span>{'★'.repeat(game.difficulty)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <motion.div
                        className="glass-button px-4 py-2 rounded-full text-sm font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Play Now
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            {/* Carousel Controls */}
            {!isMobile && featuredGames.length > 1 && (
              <>
                <button
                  onClick={prevGame}
                  className="absolute left-4 top-1/2 -translate-y-1/2 glass-button w-10 h-10 rounded-full flex items-center justify-center"
                >
                  ←
                </button>
                <button
                  onClick={nextGame}
                  className="absolute right-4 top-1/2 -translate-y-1/2 glass-button w-10 h-10 rounded-full flex items-center justify-center"
                >
                  →
                </button>
              </>
            )}
            
            {/* Carousel Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {featuredGames.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCarouselIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === carouselIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* All Games Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold mb-4">All Games</h2>
          
          <div className={`grid gap-4 ${
            isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {GAMES.map((game) => (
              <motion.div
                key={game.id}
                className="glass-card p-4 rounded-xl cursor-pointer group"
                whileHover={{ scale: isMobile ? 1 : 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startGame(game)}
                style={{
                  background: `linear-gradient(135deg, ${game.gradient[0]}20, ${game.gradient[1]}20)`
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">{game.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{game.name}</h3>
                    <p className="text-white/60 text-sm line-clamp-2 mb-2">{game.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-white/50">
                        <span>{game.category}</span>
                        <span>•</span>
                        <span>{'★'.repeat(game.difficulty)}</span>
                      </div>
                      
                      <div className="text-xs text-green-400 font-medium">
                        +{game.tokensPerMinute}/min
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Game View Component
interface GameViewProps {
  game: GameInfo
  onExit: () => void
}

function GameView({ game, onExit }: GameViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Set up canvas
    const canvas = canvasRef.current
    if (canvas) {
      canvas.id = 'game-canvas'
      
      // Resize canvas to match container
      const resizeCanvas = () => {
        const container = canvas.parentElement
        if (container) {
          canvas.width = container.clientWidth
          canvas.height = container.clientHeight
        }
      }
      
      resizeCanvas()
      window.addEventListener('resize', resizeCanvas)
      
      return () => {
        window.removeEventListener('resize', resizeCanvas)
      }
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Game Header */}
      <div className="glass-card-dark p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{game.icon}</span>
          <div>
            <h2 className="font-semibold text-white">{game.name}</h2>
            <p className="text-white/60 text-sm">Difficulty: {'★'.repeat(game.difficulty)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={toggleFullscreen}
            className="glass-button px-3 py-2 rounded-lg text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isFullscreen ? '⤓' : '⤢'}
          </motion.button>
          
          <motion.button
            onClick={onExit}
            className="glass-button px-3 py-2 rounded-lg text-sm bg-red-500/20 hover:bg-red-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Exit
          </motion.button>
        </div>
      </div>
      
      {/* Game Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-gray-900"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Mobile Controls Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Touch controls would be added here based on game type */}
        </div>
      </div>
    </div>
  )
}

// CSS Classes (would be in a separate CSS file)
const styles = `
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.glass-card-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.glass-button {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 768px) {
  .glass-card {
    backdrop-filter: blur(15px);
  }
  
  .glass-button {
    backdrop-filter: blur(8px);
  }
}

/* iOS Safari specific fixes */
@supports (-webkit-touch-callout: none) {
  .glass-card {
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
  }
  
  .glass-button {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
}
`