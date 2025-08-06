import React from 'react'
import { motion } from 'framer-motion'
import { Shield, ArrowRight, Zap } from 'lucide-react'
import { useDiscord } from '../../hooks/useDiscord'

export default function AuthenticationPrompt() {
  const { authenticate, isLoading, error } = useDiscord()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md w-full"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              🏴󠁧󠁢󠁳󠁣󠁴󠁿 Opure.exe Authentication
            </h1>
            <p className="text-gray-300 text-sm">
              Revolutionary Scottish AI Experience
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3 mb-8"
          >
            <div className="flex items-center text-sm text-gray-300">
              <Zap className="w-4 h-4 text-yellow-400 mr-3" />
              Sub-100ms AI responses
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <Zap className="w-4 h-4 text-green-400 mr-3" />
              Scottish AI with Rangers FC knowledge
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <Zap className="w-4 h-4 text-blue-400 mr-3" />
              Music & gaming integration
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <Zap className="w-4 h-4 text-purple-400 mr-3" />
              Cyberpunk visual experience
            </div>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6"
            >
              <p className="text-red-200 text-sm text-center">{error}</p>
            </motion.div>
          )}

          {/* Authentication Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={authenticate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Authenticate with Discord</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-6"
          >
            <p className="text-xs text-gray-400">
              Secure OAuth2 authentication with Discord
            </p>
            <p className="text-xs text-gray-500 mt-1">
              🤖 Powered by Scottish AI • Rangers Forever
            </p>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg opacity-20"
        />
        
        <motion.div
          animate={{ 
            y: [0, 15, 0],
            rotate: [0, -8, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute -bottom-6 -left-6 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-30"
        />
      </motion.div>

    </div>
  )
}