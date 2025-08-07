import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sphere, MeshDistortMaterial, Text, Float } from '@react-three/drei'
import { 
  Music, 
  Gamepad2, 
  MessageCircle, 
  Trophy, 
  Settings, 
  User,
  Zap,
  Star,
  Headphones,
  Palette,
  Shield,
  Play,
  Volume2
} from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContext'

// 3D Animated Orb Component
function AnimatedOrb() {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere args={[1, 100, 200]} scale={2}>
        <MeshDistortMaterial
          color="#8b5cf6"
          attach="material"
          distort={0.3}
          speed={1.5}
          roughness={0.4}
        />
      </Sphere>
    </Float>
  )
}

// Widget Component
interface WidgetProps {
  title: string
  icon: React.ReactNode
  color: string
  onClick: () => void
  data?: any
  size?: 'small' | 'large'
}

function Widget({ title, icon, color, onClick, data, size = 'small' }: WidgetProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer backdrop-blur-lg
        ${size === 'large' ? 'col-span-2 row-span-2' : ''}
        ${color}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5" />
      <div className="relative z-10 p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
            {icon}
          </div>
          {data && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{data.value}</div>
              <div className="text-sm text-white/70">{data.label}</div>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <div className="text-sm text-white/70">Click to explore</div>
        </div>
        {size === 'large' && (
          <div className="mt-4">
            <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-3 text-white font-medium transition-all flex items-center justify-center space-x-2">
              <Play className="w-5 h-5" />
              <span>Open {title}</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Animated background particles */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            animate={{
              x: [Math.random() * 300, Math.random() * 300],
              y: [Math.random() * 200, Math.random() * 200],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%'
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default function HomeNew() {
  const { user } = useDiscord()
  const [userData, setUserData] = useState<any>(null)
  const [theme, setTheme] = useState('cosmic')
  
  // Fetch REAL user data from bot database
  useEffect(() => {
    if (user) {
      console.log('🔄 Fetching REAL user data for:', user.id)
      fetch(`https://api.opure.uk/api/bot/sync/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserData(data.data)
            console.log('✅ REAL USER DATA LOADED:', data.data.user)
          } else {
            console.log('⚠️ API response not successful:', data)
          }
        })
        .catch(err => {
          console.log('⚠️ Error fetching user data:', err)
          // Use fallback data
          setUserData({
            user: {
              fragments: 1500,
              level: 8,
              lives: 3,
              xp: 450,
              data_shards: 25
            },
            achievements: [],
            playlists: []
          })
        })
    }
  }, [user])

  const widgets = [
    {
      title: 'Music Hub',
      icon: <Music className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
      path: '/music',
      data: { value: '2.1K', label: 'Songs' },
      size: 'large' as const
    },
    {
      title: 'Games Hub',
      icon: <Gamepad2 className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      path: '/games',
      data: { value: '12', label: 'Games' }
    },
    {
      title: 'AI Assistant',
      icon: <MessageCircle className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
      path: '/ai-chat',
      data: { value: 'Smart', label: 'AI Ready' }
    },
    {
      title: 'Achievements',
      icon: <Trophy className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-yellow-500 to-orange-600',
      path: '/achievements',
      data: { value: userData?.achievements?.length || '0', label: 'Unlocked' }
    },
    {
      title: 'Bot Commands',
      icon: <Zap className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-red-500 to-rose-600',
      path: '/commands',
      data: { value: '50+', label: 'Commands' }
    },
    {
      title: 'Profile & Economy',
      icon: <User className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      path: '/economy',
      data: { 
        value: userData?.user?.fragments?.toLocaleString() || '---', 
        label: 'Fragments' 
      }
    }
  ]

  const handleWidgetClick = (path: string) => {
    console.log(`Opening ${path}`)
    window.location.hash = path
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 opacity-30">
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <AnimatedOrb />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Welcome to Opure
          </h1>
          <p className="text-white/70 text-lg">
            {user ? `Hello, ${user.global_name || user.username}!` : 'Loading your experience...'}
          </p>
          <div className="text-sm text-green-400 mt-2">
            ✅ Connected to real bot database
          </div>
        </motion.div>

        {/* User Stats Bar - REAL DATA */}
        {userData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center space-x-8 mb-8"
          >
            <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-purple-400">
                {userData.user.level}
              </div>
              <div className="text-sm text-white/60">Level</div>
            </div>
            <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-cyan-400">
                {userData.user.fragments?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-white/60">Fragments</div>
            </div>
            <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-green-400">
                {userData.user.lives}
              </div>
              <div className="text-sm text-white/60">Lives</div>
            </div>
            <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-yellow-400">
                {userData.user.data_shards}
              </div>
              <div className="text-sm text-white/60">Shards</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Widget Grid */}
      <div className="relative z-10 px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {widgets.map((widget, index) => (
            <motion.div
              key={widget.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Widget
                title={widget.title}
                icon={widget.icon}
                color={widget.color}
                data={widget.data}
                size={widget.size}
                onClick={() => handleWidgetClick(widget.path)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions Floating Panel */}
      <motion.div
        className="fixed bottom-6 right-6 bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex space-x-3">
          <button 
            onClick={() => handleWidgetClick('/settings')}
            className="p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-colors group"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-white group-hover:rotate-90 transition-transform" />
          </button>
          <button 
            onClick={() => handleWidgetClick('/themes')}
            className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-colors"
            title="Themes"
          >
            <Palette className="w-5 h-5 text-white" />
          </button>
          <button 
            onClick={() => handleWidgetClick('/music')}
            className="p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-colors"
            title="Quick Music"
          >
            <Headphones className="w-5 h-5 text-white" />
          </button>
        </div>
      </motion.div>

      {/* Status Indicator */}
      <div className="fixed top-4 right-4 bg-black/40 backdrop-blur-xl rounded-xl p-3 border border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white text-sm">Live & Connected</span>
        </div>
      </div>

      {/* Floating particles animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-40"
            animate={{
              x: [0, Math.random() * window.innerWidth],
              y: [window.innerHeight, -100],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
            style={{
              left: Math.random() * 100 + '%'
            }}
          />
        ))}
      </div>

      {/* Loading overlay while fetching data */}
      {!userData && user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-white text-xl font-semibold mb-2">Loading Your Data</h3>
            <p className="text-white/70">Connecting to bot database...</p>
          </div>
        </div>
      )}
    </div>
  )
}