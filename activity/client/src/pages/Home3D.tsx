import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Sphere, Box, Plane, MeshDistortMaterial, OrbitControls } from '@react-three/drei'
import { useDiscord } from '../hooks/useDiscord'
import * as THREE from 'three'

// 3D Floating Interface Components
function FloatingCard({ position, rotation, children, delay = 0 }) {
  const meshRef = useRef()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime + delay) * 0.1
      meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime + delay) * 0.1
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + delay) * 0.2
    }
  })

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      <Plane args={[4, 3]} position={[0, 0, 0.01]}>
        <meshStandardMaterial 
          color="#1a1a2e" 
          transparent 
          opacity={0.9}
          roughness={0.1}
          metalness={0.2}
        />
      </Plane>
      <Plane args={[3.8, 2.8]}>
        <meshStandardMaterial 
          color="#16213e" 
          transparent 
          opacity={0.95}
        />
      </Plane>
      {children}
    </group>
  )
}

function AnimatedBackground() {
  const meshRef = useRef()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <>
      {/* Animated Background Spheres */}
      <Sphere ref={meshRef} args={[50, 32, 32]} position={[0, 0, -30]}>
        <MeshDistortMaterial
          color="#0f0f23"
          attach="material"
          distort={0.4}
          speed={1.5}
          roughness={0.4}
          transparent
          opacity={0.3}
        />
      </Sphere>
      
      {/* Floating Particles */}
      {Array.from({ length: 50 }).map((_, i) => (
        <Sphere key={i} args={[0.05]} position={[
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 50
        ]}>
          <meshStandardMaterial 
            color={`hsl(${240 + Math.random() * 60}, 80%, 70%)`}
            emissive={`hsl(${240 + Math.random() * 60}, 80%, 30%)`}
          />
        </Sphere>
      ))}
      
      {/* Dynamic Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4f46e5" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7c3aed" />
      <spotLight position={[0, 20, 0]} intensity={0.8} color="#06b6d4" />
    </>
  )
}

// 3D Stats Display
function StatsDisplay({ userStats, position }) {
  return (
    <FloatingCard position={position} delay={0}>
      <Text
        position={[0, 1, 0.1]}
        fontSize={0.3}
        color="#4ade80"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        Your Stats
      </Text>
      <Text
        position={[0, 0.3, 0.1]}
        fontSize={0.15}
        color="#e5e7eb"
        anchorX="center"
        anchorY="middle"
      >
        Level: {userStats?.level || 1}
      </Text>
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.15}
        color="#e5e7eb"
        anchorX="center"
        anchorY="middle"
      >
        Fragments: {userStats?.fragments?.toLocaleString() || '0'}
      </Text>
      <Text
        position={[0, -0.3, 0.1]}
        fontSize={0.15}
        color="#e5e7eb"
        anchorX="center"
        anchorY="middle"
      >
        XP: {userStats?.xp?.toLocaleString() || '0'}
      </Text>
      <Text
        position={[0, -0.6, 0.1]}
        fontSize={0.15}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        Achievements: {userStats?.achievements || 0}
      </Text>
    </FloatingCard>
  )
}

// 3D Daily Claim Interface
function DailyClaimInterface({ position, onClaim }) {
  const [claimed, setClaimed] = useState(false)
  
  return (
    <FloatingCard position={position} delay={1}>
      <Text
        position={[0, 1, 0.1]}
        fontSize={0.3}
        color="#f59e0b"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        Daily Rewards
      </Text>
      <Box args={[2, 0.6, 0.1]} position={[0, 0, 0.1]}>
        <meshStandardMaterial 
          color={claimed ? "#22c55e" : "#3b82f6"} 
          emissive={claimed ? "#166534" : "#1e3a8a"}
          emissiveIntensity={0.3}
        />
      </Box>
      <Text
        position={[0, 0, 0.2]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        onClick={() => {
          if (!claimed) {
            setClaimed(true)
            onClaim?.()
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        {claimed ? "Claimed!" : "Claim Daily"}
      </Text>
      <Text
        position={[0, -0.7, 0.1]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        +500 Fragments • +50 XP
      </Text>
    </FloatingCard>
  )
}

// 3D Music Interface
function MusicInterface({ position }) {
  const [isPlaying, setIsPlaying] = useState(false)
  
  return (
    <FloatingCard position={position} delay={2}>
      <Text
        position={[0, 1, 0.1]}
        fontSize={0.3}
        color="#ec4899"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        Music Hub
      </Text>
      <Sphere args={[0.8]} position={[0, 0, 0.1]}>
        <meshStandardMaterial 
          color={isPlaying ? "#f97316" : "#6366f1"}
          emissive={isPlaying ? "#ea580c" : "#4338ca"}
          emissiveIntensity={isPlaying ? 0.5 : 0.2}
        />
      </Sphere>
      <Text
        position={[0, 0, 0.9]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        onClick={() => setIsPlaying(!isPlaying)}
        style={{ cursor: 'pointer' }}
      >
        {isPlaying ? "⏸️" : "▶️"}
      </Text>
      <Text
        position={[0, -1.2, 0.1]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Queue • Playlists • Live Radio
      </Text>
    </FloatingCard>
  )
}

// 3D Gaming Interface
function GamingInterface({ position }) {
  return (
    <FloatingCard position={position} delay={3}>
      <Text
        position={[0, 1, 0.1]}
        fontSize={0.3}
        color="#10b981"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        Game Hub
      </Text>
      <Box args={[1.5, 1.5, 0.3]} position={[0, 0, 0.1]}>
        <meshStandardMaterial 
          color="#059669"
          emissive="#047857"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.1}
        />
      </Box>
      <Text
        position={[0, 0, 0.4]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        🎮
      </Text>
      <Text
        position={[0, -1.2, 0.1]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Adventures • Puzzles • Challenges
      </Text>
    </FloatingCard>
  )
}

// Main 3D Scene
function Scene3D({ userStats, onDailyClaim }) {
  return (
    <>
      <AnimatedBackground />
      <StatsDisplay userStats={userStats} position={[-6, 2, 0]} />
      <DailyClaimInterface position={[6, 2, 0]} onClaim={onDailyClaim} />
      <MusicInterface position={[-6, -2, 0]} />
      <GamingInterface position={[6, -2, 0]} />
      <OrbitControls 
        enabled={true}
        maxDistance={20}
        minDistance={5}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 3}
      />
    </>
  )
}

// 2D Overlay Interface
function UIOverlay({ user, userStats, notifications }) {
  const [activeScreen, setActiveScreen] = useState('home')
  
  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {/* Top HUD */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto"
      >
        {/* User Info Card */}
        <motion.div 
          className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center space-x-4"
          whileHover={{ scale: 1.02, backgroundColor: "rgba(0,0,0,0.3)" }}
        >
          <div className="relative">
            <img
              src={user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : '/default-avatar.png'}
              alt={user?.username}
              className="w-12 h-12 rounded-full border-2 border-blue-400/50"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{user?.username}</h3>
            <p className="text-blue-300 text-sm">Level {userStats?.level || 1}</p>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-sm">Online</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto"
      >
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-full p-2 flex space-x-2">
          {[
            { id: 'home', icon: '🏠', label: 'Home' },
            { id: 'stats', icon: '📊', label: 'Stats' },
            { id: 'music', icon: '🎵', label: 'Music' },
            { id: 'games', icon: '🎮', label: 'Games' },
            { id: 'social', icon: '👥', label: 'Social' }
          ].map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`px-4 py-2 rounded-full transition-all ${
                activeScreen === item.id 
                  ? 'bg-blue-500/30 text-blue-300' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-lg">{item.icon}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Side Panel */}
      <AnimatePresence>
        {activeScreen !== 'home' && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-4 bottom-20 w-80 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 pointer-events-auto overflow-y-auto"
          >
            <ScreenContent screen={activeScreen} userStats={userStats} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-20 right-4 space-y-3 pointer-events-auto">
        {[
          { icon: '💬', color: 'bg-blue-500', label: 'Chat' },
          { icon: '🎯', color: 'bg-green-500', label: 'Quests' },
          { icon: '⚙️', color: 'bg-gray-500', label: 'Settings' }
        ].map((fab, index) => (
          <motion.button
            key={fab.label}
            initial={{ opacity: 0, scale: 0, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`w-12 h-12 ${fab.color} rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={fab.label}
          >
            {fab.icon}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// Screen Content Component
function ScreenContent({ screen, userStats }) {
  switch (screen) {
    case 'stats':
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Your Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Level" value={userStats?.level || 1} icon="🏆" />
            <StatCard title="XP" value={userStats?.xp?.toLocaleString() || '0'} icon="⭐" />
            <StatCard title="Fragments" value={userStats?.fragments?.toLocaleString() || '0'} icon="💎" />
            <StatCard title="Achievements" value={userStats?.achievements || 0} icon="🎖️" />
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Progress</h3>
            <div className="space-y-3">
              <ProgressBar label="Level Progress" value={75} />
              <ProgressBar label="Daily Streak" value={60} />
              <ProgressBar label="Collection" value={40} />
            </div>
          </div>
        </div>
      )
    case 'music':
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Music Control</h2>
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎵</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Now Playing</h3>
                <p className="text-gray-300 text-sm">Select a track to begin</p>
              </div>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                ⏮️
              </button>
              <button className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                ▶️
              </button>
              <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                ⏭️
              </button>
            </div>
          </div>
        </div>
      )
    case 'games':
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Game Hub</h2>
          <div className="grid gap-4">
            <GameCard title="Adventure Quest" description="Epic story-driven gameplay" icon="🗡️" />
            <GameCard title="Puzzle Challenge" description="Mind-bending puzzles" icon="🧩" />
            <GameCard title="Music Rhythm" description="Beat-matching fun" icon="🎵" />
          </div>
        </div>
      )
    case 'social':
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Social Hub</h2>
          <div className="space-y-3">
            <SocialCard title="Friends Online" count="12" icon="👥" />
            <SocialCard title="Guild Members" count="156" icon="🏰" />
            <SocialCard title="Global Leaderboard" count="#47" icon="🏆" />
          </div>
        </div>
      )
    default:
      return null
  }
}

// Helper Components
function StatCard({ title, value, icon }) {
  return (
    <motion.div 
      className="bg-white/5 rounded-xl p-4 border border-white/10"
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-white text-xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </motion.div>
  )
}

function ProgressBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-sm text-gray-300 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

function GameCard({ title, description, icon }) {
  return (
    <motion.div 
      className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl p-4 border border-white/10 cursor-pointer"
      whileHover={{ scale: 1.02, backgroundColor: "rgba(79, 70, 229, 0.3)" }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="text-gray-300 text-sm">{description}</p>
        </div>
      </div>
    </motion.div>
  )
}

function SocialCard({ title, count, icon }) {
  return (
    <motion.div 
      className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between"
      whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="text-white">{title}</span>
      </div>
      <span className="text-blue-300 font-semibold">{count}</span>
    </motion.div>
  )
}

// Main Component
export default function Home3D() {
  const { user } = useDiscord()
  const [userStats, setUserStats] = useState({
    level: 1,
    xp: 0,
    fragments: 100,
    achievements: 0
  })
  const [notifications, setNotifications] = useState([])

  // Load user stats
  useEffect(() => {
    if (user) {
      // Fetch user stats from API
      // This would connect to your bot's database
      setUserStats({
        level: 5,
        xp: 2500,
        fragments: 15000,
        achievements: 12
      })
    }
  }, [user])

  const handleDailyClaim = () => {
    setUserStats(prev => ({
      ...prev,
      fragments: prev.fragments + 500,
      xp: prev.xp + 50
    }))
    setNotifications(prev => [...prev, { type: 'success', message: 'Daily reward claimed!' }])
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <Scene3D userStats={userStats} onDailyClaim={handleDailyClaim} />
      </Canvas>

      {/* 2D UI Overlay */}
      <UIOverlay user={user} userStats={userStats} notifications={notifications} />

      {/* Loading Indicator */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute inset-0 bg-black flex items-center justify-center z-50 pointer-events-none"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">Loading Opure Experience...</p>
        </div>
      </motion.div>
    </div>
  )
}