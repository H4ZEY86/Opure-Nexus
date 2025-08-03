import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Music, Settings, Users } from 'lucide-react'
import { useDiscord } from '@/hooks/useDiscord'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/music', icon: Music, label: 'Music' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Navigation() {
  const { user, participants } = useDiscord()

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-nav sticky top-0 z-50 safe-top"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full opacity-90" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Opure
            </span>
          </motion.div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-blue-400 bg-blue-400/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-2">
                      <item.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-blue-400/10 rounded-lg border border-blue-400/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* User Info & Participants */}
          <div className="flex items-center space-x-3">
            {/* Participants Count */}
            {participants.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center space-x-1 text-sm text-gray-300"
              >
                <Users className="w-4 h-4" />
                <span>{participants.length}</span>
              </motion.div>
            )}

            {/* User Avatar */}
            {user && (
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-400/30"
              >
                {user.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}