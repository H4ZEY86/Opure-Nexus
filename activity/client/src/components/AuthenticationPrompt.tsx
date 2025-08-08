import React from 'react'
import { motion } from 'framer-motion'

export default function AuthenticationPrompt() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-8"
      >
        <div className="text-6xl mb-6">🔐</div>
        <h2 className="text-3xl font-bold text-white mb-4">Authentication Required</h2>
        <p className="text-white/70 mb-6">
          Please make sure you're running this in Discord Activity
        </p>
        <div className="text-sm text-white/50">
          Waiting for Discord authentication...
        </div>
      </motion.div>
    </div>
  )
}