import React from 'react'
import { motion } from 'framer-motion'
import { Play, Users, Zap, Sparkles } from 'lucide-react'
import { useDiscord } from '../hooks/useDiscord'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { user, channel } = useDiscord()
  const navigate = useNavigate()

  const features = [
    {
      icon: Play,
      title: 'Music Player',
      description: 'AI-powered music experience with YouTube integration',
      action: () => navigate('/music'),
      gradient: 'from-pink-500 to-purple-600',
    },
    {
      icon: Users,
      title: 'Multiplayer',
      description: 'Real-time synchronized experience with friends',
      action: () => navigate('/music'),
      gradient: 'from-blue-500 to-cyan-600',
    },
    {
      icon: Zap,
      title: 'Live Visualizers',
      description: 'Reactive audio visualizations in real-time',
      action: () => navigate('/music'),
      gradient: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Sparkles,
      title: 'AI Features',
      description: 'Smart playlists and music recommendations',
      action: () => navigate('/settings'),
      gradient: 'from-green-500 to-teal-600',
    },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
          >
            Welcome to Opure
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Next-generation Discord Activity with AI-powered music experiences,
            futuristic UI, and real-time multiplayer features.
          </motion.p>

          {/* User Welcome */}
          {user && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-6 mb-8 max-w-md mx-auto"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-400/30">
                  {user.avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center text-lg font-bold text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">
                    Welcome, {user.globalName || user.username}!
                  </h3>
                  <p className="text-sm text-gray-300">
                    {channel ? `in ${channel.name}` : 'Ready to start'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Activity Info */}
        {channel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card p-6 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white font-medium">
                  Active in #{channel.name}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Users className="w-4 h-4" />
                <span>Discord Activity</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={feature.action}
              className="glass-card p-6 cursor-pointer group"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/music')}
            className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-glow"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Music Experience
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}