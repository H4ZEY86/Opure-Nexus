import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Coins, ShoppingCart, TrendingUp, Gift, Zap, Heart, Shield, Star } from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContext'
import { generateUserData, type UserData } from '../data/mockData'

interface UserEconomyData {
  fragments: number
  level: number
  xp: number
  lives: number
  dataShards: number
  dailyStreak: number
}

interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  emoji: string
  category: 'Consumables' | 'Cosmetics' | 'Upgrades' | 'Special'
  stock?: number
  effect?: string
}

const shopItems: ShopItem[] = [
  {
    id: '1',
    name: 'Health Potion',
    description: 'Restore 1 life to continue your journey',
    price: 50,
    emoji: '❤️',
    category: 'Consumables',
    effect: '+1 Life'
  },
  {
    id: '2',
    name: 'XP Boost',
    description: 'Double XP gain for 1 hour',
    price: 100,
    emoji: '⚡',
    category: 'Consumables',
    effect: '2x XP for 1h'
  },
  {
    id: '3',
    name: 'Fragment Multiplier',
    description: 'Increase fragment drops by 50% for 24 hours',
    price: 200,
    emoji: '💎',
    category: 'Consumables',
    effect: '+50% Fragments for 24h'
  },
  {
    id: '4',
    name: 'Rangers FC Badge',
    description: 'Show your Scottish pride with this exclusive badge',
    price: 500,
    emoji: '⚽',
    category: 'Cosmetics',
    effect: 'Profile Badge'
  },
  {
    id: '5',
    name: 'Juice WRLD Theme',
    description: 'Legendary theme honoring Juice WRLD',
    price: 750,
    emoji: '🎤',
    category: 'Cosmetics',
    effect: 'UI Theme'
  },
  {
    id: '6',
    name: 'Scottish AI Voice',
    description: 'Unlock the premium Scottish AI personality',
    price: 1000,
    emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    category: 'Upgrades',
    effect: 'AI Upgrade'
  },
  {
    id: '7',
    name: 'Mystery Box',
    description: 'Contains random rewards worth 2-10x the price',
    price: 300,
    emoji: '📦',
    category: 'Special',
    effect: 'Random Reward'
  },
  {
    id: '8',
    name: 'Daily Double',
    description: 'Double your daily rewards for 7 days',
    price: 1500,
    emoji: '🎁',
    category: 'Special',
    effect: '2x Daily Rewards for 7 days'
  }
]

export default function Economy() {
  const { user } = useDiscord()
  const [economyData, setEconomyData] = useState<UserEconomyData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    const fetchEconomyData = async () => {
      try {
        if (!user) {
          setLoading(false)
          return
        }

        console.log('💰 Loading economy data locally for user:', user.id)

        // Generate consistent user data based on their Discord ID
        const userData = generateUserData(user.id)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.user) {
            console.log('✅ LIVE economy data loaded:', {
              source: data.source || 'unknown',
              fragments: data.data.user.fragments,
              level: data.data.user.level,
              achievements: data.data.achievements?.length || 0
            })
            
            setEconomyData({
              fragments: data.data.user.fragments || 0,
              level: data.data.user.level || 1,
              xp: data.data.user.xp || 0,
              lives: data.data.user.lives || 3,
              dataShards: data.data.user.data_shards || 0,
              dailyStreak: data.data.user.daily_streak || 0
            })
          } else {
            console.warn('⚠️ API returned no user data')
            setEconomyData({
              fragments: 0,
              level: 1,
              xp: 0,
              lives: 3,
              dataShards: 0,
              dailyStreak: 0
            })
          }
        } else {
          console.warn('⚠️ API request failed:', response.status)
          setEconomyData({
            fragments: 0,
            level: 1,
            xp: 0,
            lives: 3,
            dataShards: 0,
            dailyStreak: 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch economy data:', error)
        console.log('🔄 Using default values while API is unavailable')
        setEconomyData({
          fragments: 0,
          level: 1,
          xp: 0,
          lives: 3,
          dataShards: 0,
          dailyStreak: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchEconomyData()
  }, [user])

  const categories = ['all', ...Array.from(new Set(shopItems.map(item => item.category)))]
  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.category === selectedCategory)

  const handlePurchase = async (item: ShopItem) => {
    if (!economyData || economyData.fragments < item.price) {
      alert('Not enough fragments!')
      return
    }

    setPurchasing(item.id)
    
    try {
      // Instant purchase with visual feedback
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const newData = {
        ...economyData,
        fragments: economyData.fragments - item.price,
        // Add XP for purchases
        xp: economyData.xp + Math.floor(item.price / 10)
      }
      
      setEconomyData(newData)
      
      // Save to local storage immediately
      localStorage.setItem(`opure_economy_${user.id}`, JSON.stringify(newData))
      
      // Add purchased item to inventory
      const inventory = JSON.parse(localStorage.getItem(`opure_inventory_${user.id}`) || '[]')
      inventory.push({
        id: Date.now().toString(),
        itemId: item.id,
        name: item.name,
        purchaseDate: new Date().toISOString(),
        effect: item.effect
      })
      localStorage.setItem(`opure_inventory_${user.id}`, JSON.stringify(inventory))
      
      console.log(`💰 PURCHASE SUCCESS: ${item.name} for ${item.price} fragments!`)
      alert(`🎉 Successfully purchased ${item.name}! You now have ${newData.fragments} fragments remaining.`)
      
      // Background API sync (don't wait for it)
      fetch(buildApiUrl(`/api/bot/purchase`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          itemId: item.id,
          price: item.price,
          newFragments: newData.fragments
        })
      }).catch(() => console.log('📡 Background purchase sync failed, local purchase still valid'))
      
    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Purchase processing error, please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  const xpToNextLevel = economyData ? 500 * economyData.level : 500
  const xpProgress = economyData ? (economyData.xp / xpToNextLevel) * 100 : 0

  if (loading || !economyData) {
    console.log('💰 Economy loading state:', { loading, hasEconomyData: !!economyData, hasUser: !!user })
    return (
      <div className="min-h-screen flex items-center justify-center flex-col">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-white/60 text-sm">
          {!user ? 'Waiting for user authentication...' : 'Loading economy data...'}
        </p>
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
            <Coins className="w-12 h-12 text-green-400 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Economy
            </h1>
          </div>
          <p className="text-gray-300">
            Manage your fragments, level up, and purchase powerful items to enhance your Opure experience!
          </p>
        </motion.div>

        {/* Stats Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm rounded-2xl p-4 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <Coins className="w-6 h-6 text-green-400" />
              <span className="text-2xl font-bold text-white">{economyData.fragments.toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-300">Fragments</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold text-white">{economyData.level}</span>
            </div>
            <div className="text-sm text-gray-300">Level</div>
            <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-500 h-1 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm rounded-2xl p-4 border border-red-500/20">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-6 h-6 text-red-400" />
              <span className="text-2xl font-bold text-white">{economyData.lives}</span>
            </div>
            <div className="text-sm text-gray-300">Lives</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-6 h-6 text-purple-400" />
              <span className="text-2xl font-bold text-white">{economyData.dataShards}</span>
            </div>
            <div className="text-sm text-gray-300">Data Shards</div>
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </motion.div>

        {/* Shop Items */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredItems.map((item, index) => {
            const canAfford = economyData.fragments >= item.price
            const isPurchasing = purchasing === item.id

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-105 ${
                  canAfford
                    ? 'bg-gradient-to-br from-white/20 to-white/10 border-white/20 shadow-lg'
                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50'
                }`}
              >
                {/* Content */}
                <div className="text-center">
                  {/* Icon */}
                  <div className="text-5xl mb-4">{item.emoji}</div>
                  
                  {/* Name & Category */}
                  <h3 className={`font-bold text-lg mb-2 ${canAfford ? 'text-white' : 'text-gray-400'}`}>
                    {item.name}
                  </h3>
                  <div className="text-xs text-gray-400 mb-3 uppercase tracking-wide">
                    {item.category}
                  </div>
                  
                  {/* Description */}
                  <p className={`text-sm mb-4 ${canAfford ? 'text-gray-200' : 'text-gray-500'}`}>
                    {item.description}
                  </p>

                  {/* Effect */}
                  {item.effect && (
                    <div className="bg-blue-500/20 rounded-lg p-2 mb-4">
                      <div className="text-xs text-blue-300 font-medium">
                        {item.effect}
                      </div>
                    </div>
                  )}

                  {/* Price & Purchase */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Coins className="w-4 h-4 text-green-400 mr-1" />
                      <span className={`font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                        {item.price.toLocaleString()}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford || isPurchasing}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        canAfford && !isPurchasing
                          ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isPurchasing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 inline mr-1" />
                          Buy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Daily Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 bg-gradient-to-br from-yellow-500/20 to-orange-600/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Gift className="w-8 h-8 text-yellow-400 mr-3" />
              <div>
                <h3 className="text-xl font-bold text-white">Daily Rewards</h3>
                <p className="text-sm text-gray-300">Current streak: {economyData.dailyStreak} days</p>
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-yellow-400" />
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-center text-sm ${
                  i < economyData.dailyStreak
                    ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                    : i === economyData.dailyStreak
                    ? 'bg-green-500/30 text-green-300 border border-green-500/50 animate-pulse'
                    : 'bg-gray-700/50 text-gray-500'
                }`}
              >
                <div className="font-bold">Day {i + 1}</div>
                <div className="text-xs">+{(i + 1) * 25} 💎</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}