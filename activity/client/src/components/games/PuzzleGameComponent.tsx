import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Zap, Target, Clock } from 'lucide-react'

interface PuzzlePiece {
  id: string
  color: string
  x: number
  y: number
  isSelected: boolean
  isMatched: boolean
}

type PuzzleGrid = (PuzzlePiece | null)[][]

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
const GRID_SIZE = 8

export default function PuzzleGameComponent() {
  const [grid, setGrid] = useState<PuzzleGrid>([])
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(30)
  const [selectedPiece, setSelectedPiece] = useState<{x: number, y: number} | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [targetScore] = useState(1000)

  // Initialize grid
  const initializeGrid = useCallback(() => {
    const newGrid: PuzzleGrid = []
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: (PuzzlePiece | null)[] = []
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push({
          id: `${x}-${y}-${Math.random()}`,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          x,
          y,
          isSelected: false,
          isMatched: false
        })
      }
      newGrid.push(row)
    }
    setGrid(newGrid)
  }, [])

  // Check for matches
  const findMatches = useCallback((grid: PuzzleGrid) => {
    const matches: PuzzlePiece[] = []
    
    // Horizontal matches
    for (let y = 0; y < GRID_SIZE; y++) {
      let consecutive = 1
      let currentColor = grid[y][0]?.color
      
      for (let x = 1; x < GRID_SIZE; x++) {
        if (grid[y][x]?.color === currentColor && currentColor) {
          consecutive++
        } else {
          if (consecutive >= 3) {
            for (let i = x - consecutive; i < x; i++) {
              if (grid[y][i]) matches.push(grid[y][i]!)
            }
          }
          consecutive = 1
          currentColor = grid[y][x]?.color
        }
      }
      
      if (consecutive >= 3) {
        for (let i = GRID_SIZE - consecutive; i < GRID_SIZE; i++) {
          if (grid[y][i]) matches.push(grid[y][i]!)
        }
      }
    }

    // Vertical matches
    for (let x = 0; x < GRID_SIZE; x++) {
      let consecutive = 1
      let currentColor = grid[0][x]?.color
      
      for (let y = 1; y < GRID_SIZE; y++) {
        if (grid[y][x]?.color === currentColor && currentColor) {
          consecutive++
        } else {
          if (consecutive >= 3) {
            for (let i = y - consecutive; i < y; i++) {
              if (grid[i][x]) matches.push(grid[i][x]!)
            }
          }
          consecutive = 1
          currentColor = grid[y][x]?.color
        }
      }
      
      if (consecutive >= 3) {
        for (let i = GRID_SIZE - consecutive; i < GRID_SIZE; i++) {
          if (grid[i][x]) matches.push(grid[i][x]!)
        }
      }
    }

    return matches
  }, [])

  // Remove matches and apply gravity
  const processMatches = useCallback(() => {
    setGrid(currentGrid => {
      const newGrid = currentGrid.map(row => [...row])
      const matches = findMatches(newGrid)
      
      if (matches.length === 0) return currentGrid
      
      // Mark matched pieces for removal
      matches.forEach(match => {
        if (newGrid[match.y][match.x]) {
          newGrid[match.y][match.x]!.isMatched = true
        }
      })
      
      // Add to score
      setScore(prev => prev + matches.length * 100)
      
      // Apply gravity and refill
      setTimeout(() => {
        setGrid(prevGrid => {
          const gravityGrid = prevGrid.map(row => [...row])
          
          // Apply gravity
          for (let x = 0; x < GRID_SIZE; x++) {
            const column = []
            for (let y = GRID_SIZE - 1; y >= 0; y--) {
              if (gravityGrid[y][x] && !gravityGrid[y][x]!.isMatched) {
                column.push(gravityGrid[y][x])
              }
            }
            
            // Fill column from bottom
            for (let y = 0; y < GRID_SIZE; y++) {
              if (y < column.length) {
                gravityGrid[GRID_SIZE - 1 - y][x] = column[y]
                if (gravityGrid[GRID_SIZE - 1 - y][x]) {
                  gravityGrid[GRID_SIZE - 1 - y][x]!.y = GRID_SIZE - 1 - y
                  gravityGrid[GRID_SIZE - 1 - y][x]!.isMatched = false
                }
              } else {
                // Create new piece at top
                gravityGrid[GRID_SIZE - 1 - y][x] = {
                  id: `${x}-${GRID_SIZE - 1 - y}-${Math.random()}`,
                  color: COLORS[Math.floor(Math.random() * COLORS.length)],
                  x,
                  y: GRID_SIZE - 1 - y,
                  isSelected: false,
                  isMatched: false
                }
              }
            }
          }
          
          return gravityGrid
        })
        
        setIsAnimating(false)
        // Check for new matches after gravity
        setTimeout(() => processMatches(), 100)
      }, 300)
      
      return newGrid
    })
  }, [findMatches])

  // Handle piece selection and swapping
  const handlePieceClick = useCallback((x: number, y: number) => {
    if (isAnimating || gameOver) return
    
    if (!selectedPiece) {
      setSelectedPiece({x, y})
      setGrid(prev => prev.map((row, rowY) => 
        row.map((piece, colX) => 
          piece ? {...piece, isSelected: colX === x && rowY === y} : null
        )
      ))
    } else {
      const { x: sx, y: sy } = selectedPiece
      
      // Check if pieces are adjacent
      const isAdjacent = (Math.abs(x - sx) === 1 && y === sy) || (Math.abs(y - sy) === 1 && x === sx)
      
      if (isAdjacent) {
        // Swap pieces
        setGrid(prev => {
          const newGrid = prev.map(row => [...row])
          const piece1 = newGrid[sy][sx]
          const piece2 = newGrid[y][x]
          
          if (piece1 && piece2) {
            newGrid[sy][sx] = {...piece2, x: sx, y: sy}
            newGrid[y][x] = {...piece1, x, y}
          }
          
          return newGrid.map(row => 
            row.map(piece => piece ? {...piece, isSelected: false} : null)
          )
        })
        
        setMoves(prev => prev - 1)
        setIsAnimating(true)
        setTimeout(() => processMatches(), 100)
      }
      
      setSelectedPiece(null)
    }
  }, [selectedPiece, isAnimating, gameOver, processMatches])

  // Game state management
  useEffect(() => {
    if (moves <= 0 && !gameWon) {
      setGameOver(true)
    }
    if (score >= targetScore && !gameOver) {
      setGameWon(true)
    }
  }, [moves, score, targetScore, gameWon, gameOver])

  // Initialize game
  useEffect(() => {
    initializeGrid()
  }, [initializeGrid])

  const resetGame = () => {
    setScore(0)
    setMoves(30)
    setSelectedPiece(null)
    setIsAnimating(false)
    setGameOver(false)
    setGameWon(false)
    initializeGrid()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Game Stats */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex space-x-6 mb-6"
      >
        <div className="glass-card p-4 flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-bold">{score}</span>
        </div>
        <div className="glass-card p-4 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-blue-400" />
          <span className="text-white font-bold">{moves}</span>
        </div>
        <div className="glass-card p-4 flex items-center space-x-2">
          <Target className="w-5 h-5 text-green-400" />
          <span className="text-white font-bold">{targetScore}</span>
        </div>
      </motion.div>

      {/* Game Grid */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="grid grid-cols-8 gap-1 p-4 bg-black/20 rounded-2xl backdrop-blur-lg border border-white/10"
        style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}
      >
        {grid.map((row, y) => 
          row.map((piece, x) => (
            <motion.button
              key={piece?.id || `empty-${x}-${y}`}
              className={`
                w-12 h-12 rounded-lg border-2 transition-all duration-200
                ${piece?.isSelected ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' : 'border-white/20'}
                ${piece?.isMatched ? 'opacity-0' : 'opacity-100'}
                hover:scale-105 active:scale-95
              `}
              style={{ 
                backgroundColor: piece?.color || '#1a1a1a',
                boxShadow: piece?.isSelected ? '0 0 20px rgba(255, 215, 0, 0.5)' : undefined
              }}
              onClick={() => handlePieceClick(x, y)}
              disabled={isAnimating}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={piece?.isMatched ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
            />
          ))
        )}
      </motion.div>

      {/* Game Over/Win Screen */}
      <AnimatePresence>
        {(gameOver || gameWon) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="glass-card p-8 text-center max-w-md"
            >
              <div className="text-6xl mb-4">
                {gameWon ? '🎉' : '😔'}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {gameWon ? 'You Won!' : 'Game Over'}
              </h2>
              <p className="text-gray-300 mb-4">
                Final Score: {score}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetGame}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Play Again
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        delay={0.5}
        className="mt-6 glass-card p-4 max-w-md text-center"
      >
        <p className="text-gray-300 text-sm">
          💡 <strong>How to play:</strong> Click two adjacent pieces to swap them. 
          Match 3 or more of the same color to score points!
        </p>
      </motion.div>
    </div>
  )
}