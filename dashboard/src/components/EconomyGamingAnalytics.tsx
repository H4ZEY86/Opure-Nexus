'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Line, Doughnut, Bar, Scatter } from 'react-chartjs-2'
import {
  Coins,
  TrendingUp,
  Trophy,
  Target,
  Users,
  Gamepad2,
  Crown,
  Zap,
  Gift,
  Award,
  Star,
  DollarSign,
  BarChart3,
  Activity,
  Timer,
  Medal
} from 'lucide-react'

interface EconomyData {
  fragments: {
    total_supply: number
    circulation: number
    daily_transactions: number
    top_holders: Array<{ user: string, balance: number, rank: number }>
  }
  transactions: {
    volume_24h: number
    avg_transaction: number
    transaction_history: number[]
    fee_collected: number
  }
  leaderboards: {
    wealth: Array<{ user: string, fragments: number, rank: number }>
    activity: Array<{ user: string, transactions: number, rank: number }>
    achievements: Array<{ user: string, count: number, rank: number }>
  }
}

interface GamingData {
  tournaments: {
    active: number
    completed: number
    total_players: number
    prize_pools: number
  }
  games: {
    space_race: { plays: number, highscore: number, avg_score: number }
    ball_bouncer: { plays: number, highscore: number, avg_score: number }
    cube_dash: { plays: number, highscore: number, avg_score: number }
    color_matcher: { plays: number, highscore: number, avg_score: number }
  }
  achievements: {
    total_unlocked: number
    rare_achievements: number
    completion_rate: number
  }
  player_stats: {
    daily_active: number
    session_length: number
    retention_rate: number
  }
}

export default function EconomyGamingAnalytics({ realTimeData }: { realTimeData: any }) {
  const [economyData, setEconomyData] = useState<EconomyData>({
    fragments: {
      total_supply: 1000000,
      circulation: 456789,
      daily_transactions: 1245,
      top_holders: [
        { user: 'GamerPro#1337', balance: 15420, rank: 1 },
        { user: 'CryptoKing#9999', balance: 12890, rank: 2 },
        { user: 'RangersFan#2024', balance: 9876, rank: 3 },
        { user: 'AIEnthusiast#5555', balance: 7654, rank: 4 },
        { user: 'MusicLover#3333', balance: 6543, rank: 5 }
      ]
    },
    transactions: {
      volume_24h: 89456,
      avg_transaction: 127,
      transaction_history: Array(24).fill(0).map(() => Math.floor(Math.random() * 2000) + 500),
      fee_collected: 1234
    },
    leaderboards: {
      wealth: [
        { user: 'GamerPro#1337', fragments: 15420, rank: 1 },
        { user: 'CryptoKing#9999', fragments: 12890, rank: 2 },
        { user: 'RangersFan#2024', fragments: 9876, rank: 3 }
      ],
      activity: [
        { user: 'ActiveUser#1111', transactions: 456, rank: 1 },
        { user: 'Trader#2222', transactions: 389, rank: 2 },
        { user: 'Spender#3333', transactions: 267, rank: 3 }
      ],
      achievements: [
        { user: 'AchievementHunter#7777', count: 98, rank: 1 },
        { user: 'Completionist#8888', count: 87, rank: 2 },
        { user: 'Collector#9999', count: 76, rank: 3 }
      ]
    }
  })

  const [gamingData, setGamingData] = useState<GamingData>({
    tournaments: {
      active: 3,
      completed: 47,
      total_players: 234,
      prize_pools: 50000
    },
    games: {
      space_race: { plays: 2456, highscore: 98750, avg_score: 15420 },
      ball_bouncer: { plays: 1987, highscore: 76543, avg_score: 12890 },
      cube_dash: { plays: 1654, highscore: 54321, avg_score: 9876 },
      color_matcher: { plays: 1234, highscore: 43210, avg_score: 7654 }
    },
    achievements: {
      total_unlocked: 1567,
      rare_achievements: 89,
      completion_rate: 67.3
    },
    player_stats: {
      daily_active: 145,
      session_length: 18.5,
      retention_rate: 78.9
    }
  })

  const [fragmentFlow, setFragmentFlow] = useState(
    Array(20).fill(0).map(() => Math.floor(Math.random() * 1000) + 200)
  )

  useEffect(() => {
    // Update from realTimeData
    if (realTimeData?.economy) {
      setEconomyData(prev => ({
        ...prev,
        ...realTimeData.economy
      }))
    }

    if (realTimeData?.gaming) {
      setGamingData(prev => ({
        ...prev,
        ...realTimeData.gaming
      }))
    }

    // Update fragment flow
    const interval = setInterval(() => {
      setFragmentFlow(prev => [
        ...prev.slice(1),
        Math.floor(Math.random() * 1000) + 200
      ])
    }, 5000)

    return () => clearInterval(interval)
  }, [realTimeData])

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ff6b35',
        bodyColor: '#ffffff',
        borderColor: '#ff6b35',
        borderWidth: 1
      }
    },
    scales: {
      x: { display: false },
      y: { display: false, min: 0 }
    }
  }

  const fragmentFlowData = {
    labels: Array(20).fill(''),
    datasets: [{
      data: fragmentFlow,
      borderColor: '#ff6b35',
      backgroundColor: 'rgba(255, 107, 53, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  const gamePopularityData = {
    labels: Object.keys(gamingData.games),
    datasets: [{
      data: Object.values(gamingData.games).map(game => game.plays),
      backgroundColor: [
        '#00ffff',
        '#9d4edd',
        '#ff006e',
        '#39ff14'
      ],
      borderColor: [
        '#00ffff',
        '#9d4edd',
        '#ff006e',
        '#39ff14'
      ],
      borderWidth: 2
    }]
  }

  const transactionVolumeData = {
    labels: Array(24).fill('').map((_, i) => `${i}h`),
    datasets: [{
      data: economyData.transactions.transaction_history,
      backgroundColor: 'rgba(255, 107, 53, 0.8)',
      borderColor: '#ff6b35',
      borderWidth: 2
    }]
  }

  const StatCard = ({ 
    title, 
    icon: Icon, 
    value, 
    unit, 
    color, 
    subtitle, 
    trend,
    chart 
  }: any) => (
    <motion.div
      className="glass-panel p-6 hover:scale-105 transition-all duration-300"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${color} border-2`}>
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-400 font-mono">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-cyber-orange">
            {typeof value === 'number' ? value.toLocaleString() : value}{unit}
          </p>
          {trend && (
            <div className={`text-xs font-mono ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
      </div>
      
      {chart && (
        <div className="h-16 mt-4">
          <Line data={chart} options={chartOptions} />
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <motion.div
        className="glass-panel p-6 border-2 border-cyber-orange"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyber-orange/20 rounded-xl border-2 border-cyber-orange">
              <Coins size={24} className="text-cyber-orange" />
            </div>
            <div>
              <h2 className="text-2xl font-mono font-bold text-cyber-orange">
                ECONOMY & GAMING ANALYTICS
              </h2>
              <p className="text-rangers-blue font-mono">
                💰 Fragment Economy + 🎮 Gaming Statistics
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="status-indicator bg-cyber-orange animate-pulse-glow" />
            <p className="text-sm font-mono text-cyber-orange mt-1">ACTIVE</p>
          </div>
        </div>
      </motion.div>

      {/* Economy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Supply"
          icon={DollarSign}
          value={(economyData.fragments.total_supply / 1000).toFixed(0)}
          unit="K"
          color="bg-cyber-orange/20 border-cyber-orange"
          subtitle="Fragments in Circulation"
          trend={2.5}
        />
        
        <StatCard
          title="Daily Volume"
          icon={TrendingUp}
          value={economyData.transactions.volume_24h.toLocaleString()}
          unit=""
          color="bg-cyber-green/20 border-cyber-green"
          subtitle="24h Transaction Volume"
          trend={15.3}
          chart={fragmentFlowData}
        />
        
        <StatCard
          title="Active Players"
          icon={Users}
          value={gamingData.player_stats.daily_active}
          unit=""
          color="bg-cyber-neon/20 border-cyber-neon"
          subtitle="Daily Gaming Activity"
          trend={8.7}
        />
        
        <StatCard
          title="Prize Pools"
          icon={Trophy}
          value={(gamingData.tournaments.prize_pools / 1000).toFixed(0)}
          unit="K"
          color="bg-cyber-purple/20 border-cyber-purple"
          subtitle="Tournament Rewards"
          trend={22.1}
        />
      </div>

      {/* Fragment Economy Details */}
      <motion.div
        className="glass-panel p-6 border-2 border-cyber-orange"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyber-orange/20 rounded-xl border-2 border-cyber-orange">
            <Coins size={24} className="text-cyber-orange" />
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-cyber-orange">
              FRAGMENT ECONOMY
            </h3>
            <p className="text-gray-400 font-mono text-sm">
              Currency System & Transaction Analytics
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-mono font-bold text-white mb-4">Top Fragment Holders</h4>
            <div className="space-y-3">
              {economyData.fragments.top_holders.map((holder, i) => (
                <motion.div
                  key={i}
                  className="glass-panel p-4 flex items-center justify-between"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      i === 0 ? 'bg-yellow-400/20 border-yellow-400' :
                      i === 1 ? 'bg-gray-400/20 border-gray-400' :
                      i === 2 ? 'bg-orange-400/20 border-orange-400' :
                      'bg-blue-400/20 border-blue-400'
                    } border-2`}>
                      <Crown size={16} className={
                        i === 0 ? 'text-yellow-400' :
                        i === 1 ? 'text-gray-400' :
                        i === 2 ? 'text-orange-400' :
                        'text-blue-400'
                      } />
                    </div>
                    <div>
                      <p className="font-mono text-white font-bold">#{holder.rank}</p>
                      <p className="text-sm text-gray-400 font-mono">{holder.user}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-cyber-orange font-mono font-bold">
                      {holder.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Fragments</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-mono font-bold text-white mb-4">24h Transaction Volume</h4>
            <div className="h-64">
              <Bar data={transactionVolumeData} options={chartOptions} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 glass-panel">
                <p className="text-2xl font-mono font-bold text-cyber-orange">
                  {economyData.transactions.avg_transaction}
                </p>
                <p className="text-sm text-gray-400">Avg Transaction</p>
              </div>
              <div className="text-center p-3 glass-panel">
                <p className="text-2xl font-mono font-bold text-cyber-orange">
                  {economyData.transactions.fee_collected}
                </p>
                <p className="text-sm text-gray-400">Fees Collected</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Gaming Statistics */}
      <motion.div
        className="glass-panel p-6 border-2 border-cyber-neon"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyber-neon/20 rounded-xl border-2 border-cyber-neon">
            <Gamepad2 size={24} className="text-cyber-neon" />
          </div>
          <div>
            <h3 className="text-xl font-mono font-bold text-cyber-neon">
              GAMING ANALYTICS
            </h3>
            <p className="text-gray-400 font-mono text-sm">
              3D Games Performance & Player Statistics
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-mono font-bold text-white mb-4">Game Popularity</h4>
            <div className="h-48">
              <Doughnut data={gamePopularityData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div>
            <h4 className="font-mono font-bold text-white mb-4">Game Statistics</h4>
            <div className="space-y-3">
              {Object.entries(gamingData.games).map(([game, stats], i) => (
                <div key={i} className="glass-panel p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-mono text-sm font-bold text-cyber-neon capitalize">
                      {game.replace('_', ' ')}
                    </h5>
                    <div className="text-right">
                      <p className="text-sm font-mono text-white">{stats.plays} plays</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>High: {stats.highscore.toLocaleString()}</span>
                    <span>Avg: {stats.avg_score.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={16} className="text-yellow-400" />
                <h5 className="font-mono text-sm font-bold text-white">Tournaments</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active:</span>
                  <span className="text-cyber-neon font-mono">{gamingData.tournaments.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed:</span>
                  <span className="text-cyber-neon font-mono">{gamingData.tournaments.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Players:</span>
                  <span className="text-cyber-neon font-mono">{gamingData.tournaments.total_players}</span>
                </div>
              </div>
            </div>
            
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Medal size={16} className="text-cyber-purple" />
                <h5 className="font-mono text-sm font-bold text-white">Achievements</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Unlocked:</span>
                  <span className="text-cyber-purple font-mono">{gamingData.achievements.total_unlocked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rare:</span>
                  <span className="text-cyber-purple font-mono">{gamingData.achievements.rare_achievements}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rate:</span>
                  <span className="text-cyber-purple font-mono">{gamingData.achievements.completion_rate}%</span>
                </div>
              </div>
            </div>
            
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-cyber-green" />
                <h5 className="font-mono text-sm font-bold text-white">Player Stats</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Session:</span>
                  <span className="text-cyber-green font-mono">{gamingData.player_stats.session_length}min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Retention:</span>
                  <span className="text-cyber-green font-mono">{gamingData.player_stats.retention_rate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(economyData.leaderboards).map(([category, leaders], i) => (
          <motion.div
            key={category}
            className="glass-panel p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-cyber-orange/20 rounded-lg border-2 border-cyber-orange">
                {category === 'wealth' && <Crown size={16} className="text-cyber-orange" />}
                {category === 'activity' && <TrendingUp size={16} className="text-cyber-orange" />}
                {category === 'achievements' && <Award size={16} className="text-cyber-orange" />}
              </div>
              <h4 className="font-mono font-bold text-white capitalize">
                {category} Leaders
              </h4>
            </div>
            
            <div className="space-y-2">
              {leaders.map((leader, j) => (
                <div key={j} className="flex items-center justify-between p-2 glass-panel">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyber-orange font-bold">
                      #{leader.rank}
                    </span>
                    <span className="text-sm text-white font-mono truncate">
                      {leader.user}
                    </span>
                  </div>
                  <span className="font-mono text-cyber-orange font-bold">
                    {'fragments' in leader ? leader.fragments.toLocaleString() :
                     'transactions' in leader ? leader.transactions.toLocaleString() :
                     leader.count}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}