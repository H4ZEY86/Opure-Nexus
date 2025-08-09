'use client'

import { motion } from 'framer-motion'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated Logo */}
        <motion.div
          className="mb-8"
          animate={{ 
            rotateY: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotateY: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-cyber-neon to-cyber-purple rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
            O
          </div>
        </motion.div>

        {/* Loading Text */}
        <motion.h1
          className="text-4xl font-bold bg-gradient-to-r from-cyber-neon via-cyber-purple to-cyber-pink bg-clip-text text-transparent mb-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Opure.exe Dashboard
        </motion.h1>

        <motion.p
          className="text-xl text-gray-300 mb-8 font-mono"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          {message}
        </motion.p>

        {/* Loading Animation */}
        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-cyber-neon rounded-full"
              animate={{
                y: [-10, 10, -10],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-white/10 rounded-full mx-auto mt-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyber-neon to-cyber-purple"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* System Status */}
        <div className="mt-8 text-xs font-mono text-gray-400 space-y-1">
          <motion.div
            animate={{ opacity: [0, 1] }}
            transition={{ delay: 0.5 }}
          >
            ✅ Initializing 3D Engine (RTX 5070 Ti)
          </motion.div>
          <motion.div
            animate={{ opacity: [0, 1] }}
            transition={{ delay: 1 }}
          >
            ✅ Connecting to Discord Bot
          </motion.div>
          <motion.div
            animate={{ opacity: [0, 1] }}
            transition={{ delay: 1.5 }}
          >
            🔄 Establishing WebSocket Connection
          </motion.div>
        </div>
      </div>
    </div>
  )
}