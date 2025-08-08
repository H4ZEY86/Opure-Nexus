import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import HomeNew from './pages/HomeNew'
import MusicAdvanced from './pages/MusicAdvanced'
import UserSetup from './pages/UserSetup'
import BotCommands from './pages/BotCommands'
import Settings from './pages/Settings'
import GameHub from './pages/GameHub'
import Achievements from './pages/Achievements'
import Economy from './pages/Economy'
import AIChat from './pages/AIChat'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import { useDiscord } from './contexts/DiscordContextDirect'
import LoadingScreen from './components/common/LoadingScreen'
import AuthenticationPrompt from './components/auth/AuthenticationPrompt'
import DebugOverlay from './components/DebugOverlay'

const pageVariants = {
  initial: { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
  in: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  out: { opacity: 0, scale: 1.05, filter: 'blur(10px)' }
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
}

export default function App() {
  const location = useLocation()
  const { isLoading, user } = useDiscord()
  const [hasSeenSetup, setHasSeenSetup] = React.useState(false)
  
  // Check if user has completed setup
  React.useEffect(() => {
    if (user) {
      const userPrefs = localStorage.getItem(`opure_user_preferences_${user.id}`)
      setHasSeenSetup(!!userPrefs)
    }
  }, [user])
  
  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <AuthenticationPrompt />
  }

  if (!hasSeenSetup) {
    return <UserSetup />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%227%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
      
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -150, 0],
            y: [0, 150, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Edge Hover Navigation */}
        {/* Top Edge - Logo and User */}
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 h-2 hover:h-16 transition-all duration-300 group cursor-pointer"
          whileHover={{ height: 64 }}
        >
          <div className="absolute inset-0 backdrop-blur-xl bg-white/5 border-b border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">O</span>
              </div>
              <span className="text-white font-semibold text-lg">Opure</span>
            </motion.div>
            
            {user && (
              <motion.div className="flex items-center space-x-3">
                <img
                  src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : '/default-avatar.png'}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border-2 border-white/20"
                />
                <span className="text-white/90 text-sm font-medium">{user.username}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Left Edge - Main Navigation */}
        <motion.div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 w-2 hover:w-64 h-96 transition-all duration-300 group cursor-pointer"
          whileHover={{ width: 256 }}
        >
          <div className="absolute inset-0 backdrop-blur-xl bg-white/5 border-r border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-r-2xl" />
          <div className="absolute inset-0 flex flex-col justify-center space-y-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {[
              { path: '/', icon: '🏠', label: 'Home' },
              { path: '/music', icon: '🎵', label: 'Music' },
              { path: '/commands', icon: '⚡', label: 'Commands' },
              { path: '/games', icon: '🎮', label: 'Games' },
              { path: '/ai-chat', icon: '💬', label: 'AI Chat' },
              { path: '/economy', icon: '💰', label: 'Economy' }
            ].map(({ path, icon, label }) => (
              <Link key={path} to={path}>
                <motion.div
                  whileHover={{ scale: 1.05, x: 10 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    location.pathname === path
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Page Content with Smooth Transitions */}
        <div className="pt-2 pb-safe">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="min-h-screen"
            >
              <Routes location={location}>
                <Route path="/" element={<HomeNew />} />
                <Route path="/home" element={<HomeNew />} />
                <Route path="/games" element={<GameHub />} />
                <Route path="/music" element={<MusicAdvanced />} />
                <Route path="/commands" element={<BotCommands />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/economy" element={<Economy />} />
                <Route path="/ai-chat" element={<AIChat />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>

        
        {/* Debug Overlay - Only in Discord Activity */}
        <DebugOverlay />
      </div>
    </div>
  )
}
