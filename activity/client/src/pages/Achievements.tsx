import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Award, Star, Crown, Medal, Target } from 'lucide-react'
import { useDiscord } from '../hooks/useDiscord'
import { buildApiUrl } from '../config/api'

interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
  unlocked: boolean
  progress?: number
  maxProgress?: number
  unlockedAt?: string
  category: string
}

const rarityColors = {
  COMMON: 'from-gray-400 to-gray-600',
  RARE: 'from-blue-400 to-blue-600', 
  EPIC: 'from-purple-400 to-purple-600',
  LEGENDARY: 'from-yellow-400 to-orange-600',
  MYTHIC: 'from-red-400 to-pink-600'
}

const rarityIcons = {
  COMMON: Medal,
  RARE: Award,
  EPIC: Star,
  LEGENDARY: Crown,
  MYTHIC: Trophy
}

export default function Achievements() {
  const { user } = useDiscord()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const mockAchievements: Achievement[] = [
    {
      id: '1',
      name: 'First Steps',
      description: 'Welcome to Opure! Your journey begins here.',
      emoji: '👋',
      rarity: 'COMMON',
      unlocked: true,
      category: 'General',
      unlockedAt: '2025-01-05'
    },
    {
      id: '2', 
      name: 'Music Lover',
      description: 'Play your first song through the Activity.',
      emoji: '🎵',
      rarity: 'COMMON',
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      category: 'Music'
    },
    {
      id: '3',
      name: 'Fragment Collector',
      description: 'Collect 1000 fragments through various activities.',
      emoji: '💎',
      rarity: 'RARE',
      unlocked: false,
      progress: 150,
      maxProgress: 1000,
      category: 'Economy'
    },
    {
      id: '4',
      name: 'AI Conversationalist',
      description: 'Have 10 conversations with the Scottish AI.',
      emoji: '🤖',
      rarity: 'EPIC',
      unlocked: false,
      progress: 3,
      maxProgress: 10,
      category: 'AI'
    },
    {
      id: '5',
      name: 'Rangers Legend',
      description: 'Show your true Rangers FC loyalty!',
      emoji: '⚽',
      rarity: 'LEGENDARY',
      unlocked: true,
      category: 'Special',
      unlockedAt: '2025-01-04'
    },
    {
      id: '6',
      name: 'Juice WRLD Forever',
      description: 'Play 50 Juice WRLD tracks. Legends never die.',
      emoji: '🎤',
      rarity: 'MYTHIC',
      unlocked: false,
      progress: 12,
      maxProgress: 50,
      category: 'Music'
    }
  ]

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        // For now, use mock data. Later integrate with API
        setAchievements(mockAchievements)
      } catch (error) {
        console.error('Failed to fetch achievements:', error)
        setAchievements(mockAchievements)
      } finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [user])

  const categories = ['all', ...Array.from(new Set(achievements.map(a => a.category)))]
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory)

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
        />
      </div>
    )
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
            <Trophy className="w-12 h-12 text-yellow-400 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Achievements
            </h1>
          </div>
          <p className="text-gray-300 mb-6">
            Your digital legacy awaits. Unlock achievements and show your Opure mastery!
          </p>
          
          {/* Progress Stats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
            <div className="text-2xl font-bold text-white mb-2">
              {unlockedCount} / {totalCount}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
            <div className="text-sm text-gray-300">
              {Math.round((unlockedCount / totalCount) * 100)}% Complete
            </div>
          </div>
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </motion.div>

        {/* Achievements Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAchievements.map((achievement, index) => {
            const RarityIcon = rarityIcons[achievement.rarity]
            const progress = achievement.progress || 0
            const maxProgress = achievement.maxProgress || 1
            const progressPercent = (progress / maxProgress) * 100

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-white/20 to-white/10 border border-white/20 shadow-lg'
                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50'
                }`}
              >
                {/* Rarity Glow */}
                {achievement.unlocked && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[achievement.rarity]} opacity-10 rounded-2xl`} />
                )}
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{achievement.emoji}</span>
                      <div>
                        <h3 className={`font-bold text-lg ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`}>
                          {achievement.name}
                        </h3>
                        <div className="flex items-center mt-1">
                          <RarityIcon className={`w-4 h-4 mr-1 bg-gradient-to-r ${rarityColors[achievement.rarity]} bg-clip-text text-transparent`} />
                          <span className={`text-xs font-medium bg-gradient-to-r ${rarityColors[achievement.rarity]} bg-clip-text text-transparent uppercase`}>
                            {achievement.rarity}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {achievement.unlocked && (
                      <div className="bg-green-500 rounded-full p-1">
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className={`text-sm mb-4 ${achievement.unlocked ? 'text-gray-200' : 'text-gray-500'}`}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar (for locked achievements with progress) */}
                  {!achievement.unlocked && achievement.maxProgress && achievement.maxProgress > 1 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progress} / {maxProgress}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Unlock Date */}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <div className="text-xs text-gray-400">
                      Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Empty State */}
        {filteredAchievements.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-300 mb-2">No Achievements Found</h3>
            <p className="text-gray-500">Try selecting a different category or start playing to unlock achievements!</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}