import React from 'react'
import { motion } from 'framer-motion'

interface LoadingScreenProps {
  message?: string
  progress?: number
}

function LoadingScreen({ message = 'Loading Opure...', progress }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 to-blue-900/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-8 text-center max-w-sm w-full"
      >
        {/* Logo/Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center"
        >
          <div className="w-8 h-8 bg-white rounded-full opacity-80" />
        </motion.div>

        {/* Loading Text */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-semibold mb-4 text-white"
        >
          {message}
        </motion.h2>

        {/* Progress Bar */}
        {typeof progress === 'number' && (
          <div className="mb-4">
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-blue-400 to-purple-600 rounded-full"
              />
            </div>
            <p className="text-sm text-white/70 mt-2">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Loading Dots */}
        <div className="flex justify-center space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 bg-blue-400 rounded-full"
            />
          ))}
        </div>

        {/* Additional Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-white/60 mt-4"
        >
          Connecting to Discord...
        </motion.p>
      </motion.div>
    </div>
  )
}

export default LoadingScreen
export { LoadingScreen }