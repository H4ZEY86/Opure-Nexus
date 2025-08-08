import React, { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Float, Text, Sphere, Box, Plane } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiscord } from '../contexts/DiscordContextDirect'
import { GameDatabase, LeaderboardEntry } from '../lib/supabase'
import * as THREE from 'three'

// 3D Minigames Components
import SpaceRace3D from '../components/games/SpaceRace3D'
import CubeDash3D from '../components/games/CubeDash3D'
import BallBouncer3D from '../components/games/BallBouncer3D'
import ColorMatcher3D from '../components/games/ColorMatcher3D'

interface MiniGame {
  id: string
  name: string
  description: string
  icon: string
  color: string
  component: React.ComponentType<any>
  maxScore: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: 'Action' | 'Puzzle' | 'Racing' | 'Arcade'
}

const MINIGAMES: MiniGame[] = [
  {
    id: 'space_race',
    name: 'Space Race 3D',
    description: 'Navigate through asteroids in 3D space',
    icon: '🚀',
    color: '#4A90E2',
    component: SpaceRace3D,
    maxScore: 10000,
    difficulty: 'Medium',
    category: 'Racing'
  },
  {
    id: 'cube_dash',
    name: 'Cube Dash',
    description: 'Jump over obstacles as a 3D cube',
    icon: '🎲',
    color: '#7B68EE',
    component: CubeDash3D,
    maxScore: 5000,
    difficulty: 'Easy',
    category: 'Action'
  },
  {
    id: 'ball_bouncer',
    name: 'Ball Bouncer',
    description: 'Keep the 3D ball bouncing on platforms',
    icon: '⚽',
    color: '#FF6B6B',
    component: BallBouncer3D,
    maxScore: 8000,
    difficulty: 'Hard',
    category: 'Arcade'
  },
  {
    id: 'color_matcher',
    name: 'Color Matcher 3D',
    description: 'Match colors in 3D space puzzle',
    icon: '🎨',
    color: '#50E3C2',
    component: ColorMatcher3D,
    maxScore: 15000,
    difficulty: 'Medium',
    category: 'Puzzle'
  }
]

// Animated 3D Background Component
function Animated3DBackground() {
  return (
    <group>
      {/* Floating Orbs */}
      {[...Array(20)].map((_, i) => (
        <Float key={i} speed={1 + Math.random()} rotationIntensity={0.5} floatIntensity={0.5}>
          <Sphere 
            args={[0.1 + Math.random() * 0.3]} 
            position={[
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 20
            ]}
          >
            <meshStandardMaterial 
              color={new THREE.Color().setHSL(Math.random(), 0.8, 0.6)}
              emissive={new THREE.Color().setHSL(Math.random(), 0.5, 0.3)}
            />
          </Sphere>
        </Float>
      ))}
      
      {/* Rotating Cubes */}
      {[...Array(15)].map((_, i) => (
        <group key={`cube-${i}`} rotation={[0, 0, 0]} position={[
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 25
        ]}>
          <Box args={[0.5, 0.5, 0.5]}>
            <meshStandardMaterial 
              color={new THREE.Color().setHSL(Math.random(), 0.6, 0.7)}
              wireframe={Math.random() > 0.5}
            />
          </Box>
        </group>
      ))}
      
      {/* Grid Floor */}
      <Plane args={[50, 50]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <meshStandardMaterial 
          color="#1a1a2e" 
          wireframe={true} 
          transparent={true} 
          opacity={0.3}
        />
      </Plane>
    </group>
  )
}

// User Avatar 3D Component
function UserAvatar3D({ user, position }: { user: any, position: [number, number, number] }) {
  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
        <Sphere args={[0.5]}>
          <meshStandardMaterial 
            color="#4A90E2"
            emissive="#1a1a3e"
            roughness={0.3}
            metalness={0.7}
          />
        </Sphere>
        <Text
          position={[0, -1, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {user?.username || 'Player'}
        </Text>
      </Float>
    </group>
  )
}

// Main Gaming Hub Component
export default function Gaming3DHub() {
  const { user } = useDiscord()
  const [selectedGame, setSelectedGame] = useState<MiniGame | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerScore, setPlayerScore] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // Load leaderboard from Supabase
  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      const result = await GameDatabase.getLeaderboard(undefined, 10)
      if (result.success) {
        setLeaderboard(result.data)
        console.log('✅ Leaderboard loaded:', result.data)
      }
    } catch (error) {
      console.error('❌ Failed to load leaderboard:', error)
    }
  }

  const startGame = (game: MiniGame) => {
    console.log('🎮 Starting 3D game:', game.name)
    setSelectedGame(game)
    setIsPlaying(true)
  }

  const endGame = async (score: number) => {
    console.log('🏆 Game ended with score:', score)
    setPlayerScore(score)
    setIsPlaying(false)
    
    // Save score to Supabase and trigger bot update
    if (selectedGame && user) {
      await saveScoreToDatabase(score)
      await loadLeaderboard()
    }
  }

  const saveScoreToDatabase = async (score: number) => {
    if (!selectedGame || !user) return
    
    try {
      const entry = {
        user_id: user.id,
        username: user.username || 'Player',
        game_id: selectedGame.id,
        game_name: selectedGame.name,
        score: score,
        discord_avatar: user.avatar
      }
      
      const result = await GameDatabase.saveScore(entry)
      
      if (result.success) {
        console.log('💾 Score saved successfully!')
        // Bot will automatically post updated leaderboard to Discord
      }
    } catch (error) {
      console.error('❌ Failed to save score:', error)
    }
  }

  if (isPlaying && selectedGame) {
    const GameComponent = selectedGame.component
    return (
      <div className="min-h-screen bg-black">
        <motion.button
          onClick={() => setIsPlaying(false)}
          className="absolute top-4 left-4 z-50 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-lg transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Back to Hub
        </motion.button>
        <GameComponent onGameEnd={endGame} user={user} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black overflow-hidden">
      {/* 3D Background Scene */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 2, 10], fov: 75 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <pointLight position={[-10, -10, -10]} color="#4A90E2" intensity={0.6} />
            
            <Animated3DBackground />
            <UserAvatar3D user={user} position={[0, 1, 0]} />
            
            <Environment preset="night" />
            <OrbitControls 
              enableZoom={true} 
              enablePan={true}
              autoRotate={true}
              autoRotateSpeed={0.5}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 text-center"
        >
          <h1 className="text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🎮 OPURE GAMING HUB
          </h1>
          <p className="text-white/80 text-lg">
            Welcome {user?.username || 'Player'}! Choose your 3D adventure
          </p>
        </motion.div>

        {/* Game Selection Grid */}
        <div className="flex-1 px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {MINIGAMES.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startGame(game)}
                className="relative group cursor-pointer"
              >
                <div 
                  className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 h-48 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${game.color}20, ${game.color}40)`
                  }}
                >
                  {/* Game Icon */}
                  <div className="text-6xl mb-4 text-center">{game.icon}</div>
                  
                  {/* Game Info */}
                  <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
                  <p className="text-white/70 text-sm mb-3">{game.description}</p>
                  
                  {/* Game Stats */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">{game.category}</span>
                    <span className="text-white/60">{game.difficulty}</span>
                    <span className="text-yellow-400">Max: {game.maxScore.toLocaleString()}</span>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 flex justify-center space-x-4"
        >
          <motion.button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg"
          >
            🏆 Leaderboard
          </motion.button>
        </motion.div>
      </div>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-4 text-center">🏆 Top Players</h2>
              <div className="space-y-3">
                {leaderboard.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <div>
                        <p className="text-white font-semibold">{player.username}</p>
                        <p className="text-white/60 text-sm">{player.game_name}</p>
                      </div>
                    </div>
                    <span className="text-yellow-400 font-bold">{player.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}