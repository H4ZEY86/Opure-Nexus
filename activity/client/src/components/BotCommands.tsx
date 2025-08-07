import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Zap, Music, User, Trophy, DollarSign, MessageCircle } from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContext'
import { buildApiUrl } from '../config/api'

interface BotCommand {
  id: string
  name: string
  description: string
  category: string
  usage: string
  icon: string
}

interface CommandResult {
  success: boolean
  message: string
  data?: any
}

export default function BotCommands() {
  const { user } = useDiscord()
  const [commands, setCommands] = useState<BotCommand[]>([])
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, CommandResult>>({})

  useEffect(() => {
    loadCommands()
  }, [])

  const loadCommands = async () => {
    try {
      setLoading(true)
      console.log('⚡ Loading bot commands...')
      
      const response = await fetch(buildApiUrl('/api/bot/commands'))
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCommands(data.commands)
          console.log(`✅ Loaded ${data.commands.length} bot commands`)
        }
      }
    } catch (error) {
      console.error('❌ Error loading commands:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeCommand = async (command: BotCommand) => {
    if (!user) return
    
    try {
      setExecuting(command.id)
      console.log(`⚡ Executing command: ${command.id}`)
      
      const response = await fetch(buildApiUrl('/api/bot/execute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command.id,
          params: {},
          userId: user.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setResults(prev => ({
          ...prev,
          [command.id]: result
        }))
        console.log(`✅ Command ${command.id} executed:`, result.message)
      }
    } catch (error) {
      console.error(`❌ Command execution error:`, error)
      setResults(prev => ({
        ...prev,
        [command.id]: {
          success: false,
          message: 'Command execution failed'
        }
      }))
    } finally {
      setExecuting(null)
    }
  }

  const getIconForCommand = (icon: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      '🎵': <Music className="w-5 h-5" />,
      '🤖': <Bot className="w-5 h-5" />,
      '💰': <DollarSign className="w-5 h-5" />,
      '👤': <User className="w-5 h-5" />,
      '🏆': <Trophy className="w-5 h-5" />
    }
    return iconMap[icon] || <Zap className="w-5 h-5" />
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Music': 'from-purple-500 to-pink-500',
      'AI': 'from-blue-500 to-cyan-500',
      'Economy': 'from-green-500 to-emerald-500',
      'User': 'from-orange-500 to-red-500',
      'Progress': 'from-yellow-500 to-amber-500'
    }
    return colors[category] || 'from-gray-500 to-gray-600'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center space-x-3 mb-2">
          <Bot className="w-8 h-8 text-blue-500" />
          <h2 className="text-3xl font-bold text-white">Bot Commands</h2>
        </div>
        <p className="text-gray-300">
          Access all Opure.exe bot functions directly in the Activity
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-300">Loading commands...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {commands.map((command, index) => (
              <motion.div
                key={command.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-4 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => executeCommand(command)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getCategoryColor(command.category)} flex items-center justify-center`}>
                    {getIconForCommand(command.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-1">{command.name}</h3>
                    <p className="text-sm text-gray-400 mb-2">{command.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-400 font-mono">{command.usage}</span>
                      <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-gray-300">
                        {command.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Execution Status */}
                {executing === command.id && (
                  <div className="mt-3 flex items-center space-x-2 text-yellow-400">
                    <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Executing...</span>
                  </div>
                )}

                {/* Command Result */}
                {results[command.id] && executing !== command.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className={`flex items-center space-x-2 ${results[command.id].success ? 'text-green-400' : 'text-red-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${results[command.id].success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-sm font-medium">
                        {results[command.id].success ? 'Success' : 'Error'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{results[command.id].message}</p>
                    
                    {/* Display command data if available */}
                    {results[command.id].data && (
                      <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                        <pre className="text-gray-400 whitespace-pre-wrap">
                          {JSON.stringify(results[command.id].data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20"
      >
        <div className="flex items-center space-x-2 mb-2">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-blue-300">Real Bot Integration</span>
        </div>
        <p className="text-sm text-gray-300">
          These commands connect directly to your Opure.exe bot system. 
          Data is synchronized with your bot's SQLite database in real-time.
        </p>
      </motion.div>
    </div>
  )
}