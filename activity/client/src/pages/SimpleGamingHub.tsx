import React, { useState } from 'react'
import { useDiscord } from '../contexts/DiscordContextDirect'
import { GameDatabase } from '../lib/supabase'
import CubeRunner3D from '../components/games/CubeRunner3D'
import SpaceShooter3D from '../components/games/SpaceShooter3D'
import AIDungeonQuest from '../components/games/AIDungeonQuest'
import AIMystery from '../components/games/AIMystery'

// Enhanced games collection with 2D, 3D, and AI adventures
const GAMES = [
  {
    id: 'clicker',
    name: '🖱️ Power Clicker',
    description: 'Click as fast as you can!',
    color: '#FF6B6B',
    type: '2d'
  },
  {
    id: 'memory',
    name: '🧠 Memory Test', 
    description: 'Remember the sequence!',
    color: '#4ECDC4',
    type: '2d'
  },
  {
    id: 'reaction',
    name: '⚡ Reaction Time',
    description: 'How fast are your reflexes?',
    color: '#45B7D1',
    type: '2d'
  },
  {
    id: 'typing',
    name: '⌨️ Speed Typing',
    description: 'Type the words quickly!',
    color: '#96CEB4',
    type: '2d'
  },
  {
    id: 'cube-runner',
    name: '🎯 3D Cube Runner',
    description: 'Navigate through 3D obstacles!',
    color: '#9B59B6',
    type: '3d'
  },
  {
    id: 'space-shooter',
    name: '🚀 Space Shooter 3D',
    description: 'Blast enemies in space!',
    color: '#E74C3C',
    type: '3d'
  },
  {
    id: 'ai-dungeon',
    name: '🏰 AI Dungeon Quest',
    description: 'Text adventure with AI storytelling',
    color: '#2ECC71',
    type: 'ai'
  },
  {
    id: 'ai-mystery',
    name: '🕵️ AI Mystery Solver',
    description: 'Solve mysteries with AI guidance',
    color: '#F39C12',
    type: 'ai'
  }
]

// Simple Clicker Game Component
function ClickerGame({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [gameActive, setGameActive] = useState(true)

  React.useEffect(() => {
    if (timeLeft <= 0) {
      setGameActive(false)
      onGameEnd(score)
      return
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, score, onGameEnd])

  const handleClick = () => {
    if (gameActive) {
      setScore(score + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h2 className="text-4xl font-bold mb-4">🖱️ POWER CLICKER</h2>
        <div className="text-6xl font-bold mb-4">{score}</div>
        <div className="text-2xl mb-8">Time: {timeLeft}s</div>
        
        {gameActive ? (
          <button
            onClick={handleClick}
            className="bg-white text-red-500 px-12 py-6 rounded-full text-3xl font-bold hover:scale-110 active:scale-95 transition-transform"
          >
            CLICK ME!
          </button>
        ) : (
          <div>
            <div className="text-3xl mb-4">🎉 GAME OVER!</div>
            <div className="text-xl">Final Score: {score} clicks</div>
          </div>
        )}
      </div>
    </div>
  )
}

// Simple Reaction Time Game
function ReactionGame({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [waiting, setWaiting] = useState(true)
  const [ready, setReady] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [reactionTime, setReactionTime] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [round, setRound] = useState(1)
  const [totalTime, setTotalTime] = useState(0)

  const startRound = () => {
    setWaiting(true)
    setReady(false)
    const delay = 2000 + Math.random() * 3000 // 2-5 second delay
    setTimeout(() => {
      setReady(true)
      setStartTime(Date.now())
    }, delay)
  }

  React.useEffect(() => {
    if (round <= 5) {
      startRound()
    } else {
      setGameOver(true)
      onGameEnd(Math.round(totalTime / 5))
    }
  }, [round])

  const handleClick = () => {
    if (!ready) {
      // Clicked too early
      setGameOver(true)
      onGameEnd(999) // Penalty score
      return
    }

    const time = Date.now() - startTime
    setReactionTime(time)
    setTotalTime(prev => prev + time)
    setRound(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h2 className="text-4xl font-bold mb-4">⚡ REACTION TIME</h2>
        
        {gameOver ? (
          <div>
            <div className="text-3xl mb-4">⚡ COMPLETE!</div>
            <div className="text-xl">Average: {Math.round(totalTime / (round - 1))}ms</div>
          </div>
        ) : (
          <div>
            <div className="text-2xl mb-8">Round {round}/5</div>
            
            {waiting && !ready && (
              <div className="text-xl mb-8">Wait for it...</div>
            )}
            
            {ready && (
              <div className="text-2xl mb-8 text-green-300">NOW!</div>
            )}
            
            <button
              onClick={handleClick}
              className={`px-12 py-6 rounded-full text-2xl font-bold transition-all ${
                ready ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500'
              }`}
            >
              {ready ? 'CLICK!' : 'WAIT...'}
            </button>
            
            {reactionTime > 0 && (
              <div className="mt-4 text-xl">Last: {reactionTime}ms</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Speed Typing Game
function TypingGame({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const words = ['react', 'typescript', 'discord', 'gaming', 'opure', 'coding', 'javascript', 'developer', 'awesome', 'challenge']
  const [currentWord, setCurrentWord] = useState('')
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [gameActive, setGameActive] = useState(true)

  React.useEffect(() => {
    setCurrentWord(words[Math.floor(Math.random() * words.length)])
  }, [])

  React.useEffect(() => {
    if (timeLeft <= 0) {
      setGameActive(false)
      onGameEnd(score)
      return
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, score, onGameEnd])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.toLowerCase() === currentWord.toLowerCase()) {
      setScore(score + 1)
      setCurrentWord(words[Math.floor(Math.random() * words.length)])
    }
    setInput('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h2 className="text-4xl font-bold mb-4">⌨️ SPEED TYPING</h2>
        <div className="text-2xl mb-4">Score: {score}</div>
        <div className="text-xl mb-8">Time: {timeLeft}s</div>
        
        {gameActive ? (
          <div>
            <div className="text-4xl font-mono mb-8 bg-black/30 p-4 rounded">
              {currentWord}
            </div>
            
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="text-2xl p-4 rounded text-black text-center mb-4 w-64"
                placeholder="Type here..."
                autoFocus
              />
              <br />
              <button
                type="submit"
                className="bg-white text-green-500 px-6 py-3 rounded font-bold hover:scale-105"
              >
                Submit
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-3xl mb-4">⌨️ GAME OVER!</div>
            <div className="text-xl">Words typed: {score}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// Simple Memory Game Component  
function MemoryGame({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([])
  const [userSequence, setUserSequence] = useState<number[]>([])
  const [displaying, setDisplaying] = useState(false)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500']

  React.useEffect(() => {
    startNewRound()
  }, [])

  const startNewRound = () => {
    const newSequence = [...sequence, Math.floor(Math.random() * 4)]
    setSequence(newSequence)
    setUserSequence([])
    showSequence(newSequence)
  }

  const showSequence = (seq: number[]) => {
    setDisplaying(true)
    seq.forEach((color, index) => {
      setTimeout(() => {
        // Flash effect would go here
        if (index === seq.length - 1) {
          setTimeout(() => setDisplaying(false), 500)
        }
      }, index * 600)
    })
  }

  const handleColorClick = (colorIndex: number) => {
    if (displaying) return

    const newUserSequence = [...userSequence, colorIndex]
    setUserSequence(newUserSequence)

    if (newUserSequence[newUserSequence.length - 1] !== sequence[newUserSequence.length - 1]) {
      setGameOver(true)
      onGameEnd(score)
      return
    }

    if (newUserSequence.length === sequence.length) {
      setScore(score + 1)
      setTimeout(startNewRound, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h2 className="text-4xl font-bold mb-4">🧠 MEMORY TEST</h2>
        <div className="text-2xl mb-8">Score: {score}</div>
        
        {gameOver ? (
          <div>
            <div className="text-3xl mb-4">🧠 GAME OVER!</div>
            <div className="text-xl">Final Score: {score} rounds</div>
          </div>
        ) : (
          <div>
            <div className="text-lg mb-4">
              {displaying ? 'Watch the sequence!' : 'Repeat the sequence!'}
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-64 mx-auto">
              {colors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleColorClick(index)}
                  className={`${color} w-24 h-24 rounded-lg hover:opacity-80 active:scale-95 transition-all`}
                  disabled={displaying}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Main Gaming Hub Component
export default function SimpleGamingHub() {
  const { user, isLoading, error } = useDiscord()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [recentScores, setRecentScores] = useState<Array<{game: string, score: number}>>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  console.log('🎮 SimpleGamingHub loaded', { user, isLoading, error })

  const handleGameEnd = async (score: number) => {
    console.log('🏆 Game ended with score:', score)
    
    if (selectedGame && user) {
      const gameData = GAMES.find(g => g.id === selectedGame)
      
      // Save to local recent scores
      setRecentScores(prev => [...prev, { 
        game: gameData?.name || 'Game', 
        score 
      }].slice(-5)) // Keep last 5 scores
      
      // Save to Supabase database
      try {
        const gameIdMap = {
          'clicker': 'power_clicker',
          'memory': 'memory_test',
          'reaction': 'reaction_time', 
          'typing': 'speed_typing'
        }
        
        await GameDatabase.saveScore({
          user_id: user.id,
          username: user.username || user.global_name || 'Player',
          game_id: gameIdMap[selectedGame as keyof typeof gameIdMap] || selectedGame,
          game_name: gameData?.name || 'Game',
          score,
          discord_avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined
        })
        
        console.log('✅ Score saved to database!')
      } catch (error) {
        console.error('❌ Failed to save score:', error)
      }
    }
    
    setSelectedGame(null)
  }

  const loadLeaderboard = async () => {
    console.log('📊 Loading leaderboard...')
    try {
      const result = await GameDatabase.getLeaderboard(undefined, 10)
      if (result.success) {
        setLeaderboard(result.data)
        console.log('✅ Leaderboard loaded:', result.data.length, 'entries')
      }
    } catch (error) {
      console.error('❌ Failed to load leaderboard:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">🎮</div>
          <div className="text-xl">Loading Gaming Hub...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl">Error: {error}</div>
        </div>
      </div>
    )
  }

  // Render specific game
  if (selectedGame === 'clicker') {
    return <ClickerGame onGameEnd={handleGameEnd} />
  }
  
  if (selectedGame === 'memory') {
    return <MemoryGame onGameEnd={handleGameEnd} />
  }

  if (selectedGame === 'reaction') {
    return <ReactionGame onGameEnd={handleGameEnd} />
  }
  
  if (selectedGame === 'typing') {
    return <TypingGame onGameEnd={handleGameEnd} />
  }

  // 3D Games
  if (selectedGame === 'cube-runner') {
    return <CubeRunner3D onGameEnd={handleGameEnd} />
  }
  
  if (selectedGame === 'space-shooter') {
    return <SpaceShooter3D onGameEnd={handleGameEnd} />
  }

  // AI Text Adventures
  if (selectedGame === 'ai-dungeon') {
    return <AIDungeonQuest onGameEnd={handleGameEnd} />
  }
  
  if (selectedGame === 'ai-mystery') {
    return <AIMystery onGameEnd={handleGameEnd} />
  }

  // Show leaderboard view
  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">🏆 LEADERBOARD</h1>
            <button 
              onClick={() => setShowLeaderboard(false)}
              className="bg-white text-purple-900 px-6 py-3 rounded-lg font-bold hover:scale-105"
            >
              ← Back to Games
            </button>
          </div>

          <div className="max-w-2xl mx-auto bg-black/30 rounded-xl p-6">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
                return (
                  <div key={entry.id} className="flex justify-between items-center py-3 text-white border-b border-white/20 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl w-12">{medal}</span>
                      <div>
                        <div className="font-bold">{entry.username}</div>
                        <div className="text-sm text-white/70">{entry.game_name}</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-yellow-400">{entry.score.toLocaleString()}</div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-white/70 py-8">
                <div className="text-4xl mb-4">🎮</div>
                <div>No scores yet! Be the first to play!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main hub
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎮 OPURE GAMING
          </h1>
          <p className="text-white/80 text-lg mb-4">
            Welcome {user?.username || user?.global_name || 'Gamer'}!
          </p>
          <button 
            onClick={() => {
              loadLeaderboard()
              setShowLeaderboard(true)
            }}
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            🏆 View Leaderboard
          </button>
        </div>

        {/* Games Grid - Organized by Type */}
        <div className="space-y-8">
          {/* 2D Games */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">🎮 2D Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {GAMES.filter(game => game.type === '2d').map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game.id)}
                  className="p-6 rounded-2xl text-white text-left hover:scale-105 active:scale-95 transition-transform"
                  style={{ backgroundColor: game.color }}
                >
                  <h3 className="text-2xl font-bold mb-2">{game.name}</h3>
                  <p className="text-white/90">{game.description}</p>
                  <div className="mt-4 text-sm text-white/80">
                    ✅ Ready to play →
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3D Games */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">🎯 3D Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {GAMES.filter(game => game.type === '3d').map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game.id)}
                  className="p-6 rounded-2xl text-white text-left hover:scale-105 active:scale-95 transition-transform"
                  style={{ backgroundColor: game.color }}
                >
                  <h3 className="text-2xl font-bold mb-2">{game.name}</h3>
                  <p className="text-white/90">{game.description}</p>
                  <div className="mt-4 text-sm text-white/80">
                    ✅ Ready to play →
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Games */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">🧠 AI Adventures</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {GAMES.filter(game => game.type === 'ai').map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game.id)}
                  className="p-6 rounded-2xl text-white text-left hover:scale-105 active:scale-95 transition-transform"
                  style={{ backgroundColor: game.color }}
                >
                  <h3 className="text-2xl font-bold mb-2">{game.name}</h3>
                  <p className="text-white/90">{game.description}</p>
                  <div className="mt-4 text-sm text-white/80">
                    ✅ AI-powered →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Scores */}
        {recentScores.length > 0 && (
          <div className="mt-12 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              🏆 Your Recent Scores
            </h2>
            <div className="bg-black/30 rounded-xl p-4">
              {recentScores.map((score, index) => (
                <div key={index} className="flex justify-between items-center py-2 text-white">
                  <span>{score.game}</span>
                  <span className="font-bold">{score.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-8 text-center text-white/60 text-sm">
          User ID: {user?.id || 'Not loaded'} | 
          Status: {isLoading ? 'Loading' : 'Ready'}
        </div>
      </div>
    </div>
  )
}