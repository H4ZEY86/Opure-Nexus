import React from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipForward, SkipBack, Volume2 } from 'lucide-react'

export default function Music() {
  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Music Player</h1>
        <p className="text-gray-300">AI-powered music experience</p>
      </motion.div>

      {/* Player */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-8 max-w-2xl mx-auto w-full"
      >
        {/* Album Art Placeholder */}
        <div className="w-64 h-64 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <div className="text-6xl text-white/30">♪</div>
        </div>

        {/* Track Info */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">No track loaded</h2>
          <p className="text-gray-400">Select a track to begin</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-0 transition-all duration-300" />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>0:00</span>
            <span>0:00</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button className="btn-icon">
            <SkipBack className="w-5 h-5" />
          </button>
          <button className="btn-icon w-16 h-16 bg-blue-500 hover:bg-blue-600">
            <Play className="w-8 h-8" />
          </button>
          <button className="btn-icon">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center space-x-3">
          <Volume2 className="w-5 h-5 text-gray-400" />
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-full" />
          </div>
        </div>
      </motion.div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center mt-8"
      >
        <p className="text-gray-400">🚧 Full music features coming soon!</p>
      </motion.div>
    </div>
  )
}