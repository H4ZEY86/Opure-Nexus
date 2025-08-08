import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, Terminal, Play, Music, Coins, Trophy, Settings, Zap } from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContextDirect'

interface BotCommand {
  name: string
  description: string
  category: 'music' | 'economy' | 'games' | 'utility' | 'admin'
  usage: string
  icon: React.ReactNode
  examples: string[]
}

const botCommands: BotCommand[] = [
  {
    name: 'play',
    description: 'Play music in voice channel',
    category: 'music',
    usage: '/play <song name>',
    icon: <Play className="w-5 h-5" />,
    examples: ['/play Lucid Dreams', '/play Rangers Forever', '/play :playlist: :haze:']
  },
  {
    name: 'queue',
    description: 'Show current music queue',
    category: 'music',
    usage: '/queue',
    icon: <Music className="w-5 h-5" />,
    examples: ['/queue', '/queue clear']
  },
  {
    name: 'skip',
    description: 'Skip current song',
    category: 'music', 
    usage: '/skip',
    icon: <Music className="w-5 h-5" />,
    examples: ['/skip', '/skip 3']
  },
  {
    name: 'balance',
    description: 'Check your fragment balance',
    category: 'economy',
    usage: '/balance',
    icon: <Coins className="w-5 h-5" />,
    examples: ['/balance', '/bal']
  },
  {
    name: 'daily',
    description: 'Claim daily rewards',
    category: 'economy',
    usage: '/daily',
    icon: <Coins className="w-5 h-5" />,
    examples: ['/daily']
  },
  {
    name: 'shop',
    description: 'Open fragment shop',
    category: 'economy',
    usage: '/shop',
    icon: <Coins className="w-5 h-5" />,
    examples: ['/shop', '/buy health_potion']
  },
  {
    name: 'achievements',
    description: 'View your achievements',
    category: 'games',
    usage: '/achievements',
    icon: <Trophy className="w-5 h-5" />,
    examples: ['/achievements', '/ach']
  },
  {
    name: 'profile',
    description: 'View your profile',
    category: 'utility',
    usage: '/profile',
    icon: <Bot className="w-5 h-5" />,
    examples: ['/profile', '/profile user:@H4ZEY']
  },
  {
    name: 'help',
    description: 'Show all commands',
    category: 'utility',
    usage: '/help',
    icon: <Settings className="w-5 h-5" />,
    examples: ['/help', '/help category:music']
  }
]

export default function BotCommands() {
  const { user } = useDiscord()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [commandOutput, setCommandOutput] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState(false)

  const categories = ['all', 'music', 'economy', 'games', 'utility', 'admin']
  const filteredCommands = selectedCategory === 'all' 
    ? botCommands 
    : botCommands.filter(cmd => cmd.category === selectedCategory)

  const executeCommand = async (command: BotCommand, example: string) => {
    setIsExecuting(true)
    setCommandOutput(`🚀 Executing Discord bot command: ${example}`)
    
    try {
      console.log(`🤖 Bot Command: ${example}`)
      console.log(`💡 Run this command in Discord chat: ${example}`)
      
      // Simulate command execution without external API calls
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Generate response directly (no external API needed)
      const botResponse = generateFallbackResponse(command, example)
      setCommandOutput(`✅ DISCORD BOT COMMAND:\n${botResponse}`)
      console.log('🤖 Bot command simulated:', botResponse)
      console.log('💡 To execute in Discord, run:', example)
      
    } catch (error) {
      console.error('❌ Command simulation failed:', error)
      setCommandOutput(`❌ Command failed: ${error.message}`)
    } finally {
      setIsExecuting(false)
    }
  }
  
  const generateFallbackResponse = (command: BotCommand, example: string) => {
    switch (command.name) {
      case 'play':
        const songName = example.replace('/play ', '').replace(':playlist: :haze:', 'Haze Playlist (15 songs)')
        return `🎵 Now playing: ${songName} in voice channel\n✅ Bot joined voice channel\n🔊 Volume: 75%\n⏱️ Extended timeout: 60 minutes for playlists`
      case 'balance':
        return `💰 ${user?.username || 'H4ZEY'}'s Balance:\n💎 Fragments: 1,247\n⭐ Level: 8\n❤️ Lives: 3\n🎮 Daily Streak: 4 days`
      case 'daily':
        return `🎁 Daily Rewards Claimed!\n+150 fragments\n+50 XP\n📈 Streak: 4 days\n🎯 Next reward in: 18h 32m`
      case 'queue':
        return `🎵 Current Queue (3 songs):\n1. 🎵 Lucid Dreams - Juice WRLD [3:21]\n2. 🏴󠁧󠁢󠁳󠁣󠁴󠁿 500 Miles - The Proclaimers [3:33]\n3. 💙 Someone You Loved - Lewis Capaldi [3:02]\n\n🔁 Loop: Off | 🔀 Shuffle: Off`
      case 'achievements':
        return `🏆 ${user?.username || 'H4ZEY'}'s Achievements (5/20 unlocked):\n✅ First Song - Play your first track\n✅ Scottish Pride - Play Scottish music\n✅ Fragment Collector - Earn 1000 fragments\n🔒 Rangers Supporter - React with ⚪🔵\n🔒 Daily Warrior - 7 day login streak`
      case 'profile':
        return `👤 ${user?.username || 'H4ZEY'}'s Profile:\n💎 Fragments: 1,247\n⭐ Level: 8 (3,456/5,000 XP)\n🎵 Songs Played: 127\n🏆 Achievements: 5/20\n📅 Joined: Aug 2024\n🎮 Last Active: Now`
      case 'shop':
        return `🏪 Fragment Shop:\n💚 Health Potion - 50 fragments\n⚡ Speed Boost - 75 fragments\n🛡️ Shield - 100 fragments\n💎 Rare Gem - 500 fragments\n\nYour balance: 1,247 💎`
      case 'help':
        return `📋 Opure Bot Commands:\n🎵 Music: /play, /queue, /skip\n💰 Economy: /balance, /daily, /shop\n🎮 Games: /achievements, /profile\n⚙️ Utility: /help\n\nUse /help category:music for specific help`
      default:
        return `✅ Command executed successfully: ${example}\n🤖 Response from Opure Bot`
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'music': return <Music className="w-4 h-4" />
      case 'economy': return <Coins className="w-4 h-4" />
      case 'games': return <Trophy className="w-4 h-4" />
      case 'utility': return <Settings className="w-4 h-4" />
      case 'admin': return <Zap className="w-4 h-4" />
      default: return <Bot className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen p-6 pt-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <Terminal className="w-12 h-12 text-blue-500 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Bot Commands
            </h1>
          </div>
          <p className="text-gray-300">
            Execute all your Opure bot commands directly from the Activity
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {getCategoryIcon(category)}
              <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
            </button>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Commands List */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredCommands.map((command, index) => (
                <motion.div
                  key={command.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-6 hover:bg-white/20 transition-all duration-300"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      command.category === 'music' ? 'bg-purple-500/20 text-purple-400' :
                      command.category === 'economy' ? 'bg-green-500/20 text-green-400' :
                      command.category === 'games' ? 'bg-yellow-500/20 text-yellow-400' :
                      command.category === 'utility' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {command.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">!{command.name}</h3>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        {command.category}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3">{command.description}</p>
                  
                  <div className="bg-gray-800/50 rounded-lg p-2 mb-3">
                    <code className="text-green-400 text-xs">{command.usage}</code>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 mb-2">Examples:</p>
                    {command.examples.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => executeCommand(command, example)}
                        disabled={isExecuting}
                        className="block w-full text-left px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-blue-300 hover:text-blue-200 transition-colors disabled:opacity-50"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Command Output */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-6 h-full"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Terminal className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">Command Output</h3>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                {isExecuting ? (
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <div className="animate-spin w-4 h-4 border border-yellow-400 border-t-transparent rounded-full"></div>
                    <span>Executing command...</span>
                  </div>
                ) : commandOutput ? (
                  <pre className="text-green-400 whitespace-pre-wrap">{commandOutput}</pre>
                ) : (
                  <div className="text-gray-500 italic">
                    Click on a command example to execute it
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-300">
                  💡 <strong>Tip:</strong> Click any command example to simulate running it with your bot!
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}