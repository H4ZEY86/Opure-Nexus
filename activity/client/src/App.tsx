import { Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Music from './pages/Music'
import Settings from './pages/Settings'
import GameHub from './pages/GameHub'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import { useDiscord } from './hooks/useDiscord'
import LoadingScreen from './components/common/LoadingScreen'

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
  const { isLoading, discordSdk, user } = useDiscord()

  if (isLoading) {
    return <LoadingScreen />
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
        {/* Glass Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">O</span>
                </div>
                <span className="text-white font-semibold text-lg">Opure</span>
              </motion.div>
              
              {user && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-3"
                >
                  <img
                    src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : '/default-avatar.png'}
                    alt={user.username}
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                  />
                  <span className="text-white/90 text-sm font-medium">{user.username}</span>
                </motion.div>
              )}
            </div>
          </div>
        </nav>

        {/* Page Content with Smooth Transitions */}
        <div className="pt-16 pb-safe">
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
                <Route path="/" element={<Home />} />
                <Route path="/games" element={<GameHub />} />
                <Route path="/music" element={<Music />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/5 border-t border-white/10 pb-safe">
          <div className="flex items-center justify-around py-2">
            {[
              { path: '/', icon: '🏠', label: 'Home' },
              { path: '/games', icon: '🎮', label: 'Games' },
              { path: '/music', icon: '🎵', label: 'Music' },
              { path: '/settings', icon: '⚙️', label: 'Settings' },
              { path: '/admin', icon: '🛡️', label: 'Admin', adminOnly: true }
            ].filter(item => !item.adminOnly || (user && user.admin)).map(({ path, icon, label }) => (
              <motion.a
                key={path}
                href={path}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-colors ${
                  location.pathname === path
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-medium">{label}</span>
              </motion.a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}