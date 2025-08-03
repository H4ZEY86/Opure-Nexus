/**
 * INFINITE PUZZLE GAME
 * Match-3 style puzzle game with procedural generation and AI opponents
 * Features: Cascading matches, special pieces, infinite levels, adaptive difficulty
 */

import GameEngine, { GameConfig, GameState, GameObject } from '../engine/GameEngine'
import { Vector2 } from '../engine/physics/PhysicsWorld'

export interface PuzzlePiece {
  id: string
  type: 'normal' | 'bomb' | 'line' | 'star' | 'rainbow'
  color: string
  gridX: number
  gridY: number
  isMatched: boolean
  isFalling: boolean
}

export interface PuzzleGrid {
  width: number
  height: number
  pieces: (PuzzlePiece | null)[][]
}

export interface PuzzleMatch {
  pieces: PuzzlePiece[]
  type: 'horizontal' | 'vertical' | 'l_shape' | 't_shape' | 'square'
  score: number
  chain: number
}

export interface PuzzleState {
  grid: PuzzleGrid
  selectedPiece?: PuzzlePiece
  score: number
  moves: number
  targetScore: number
  timeRemaining: number
  chain: number
  specialPiecesCreated: number
  level: number
}

export class PuzzleGame extends GameEngine {
  private puzzleState: PuzzleState
  private gridSize = { width: 8, height: 8 }
  private pieceSize = 64
  private colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
  private animationSpeed = 300
  private matchThreshold = 3
  private aiOpponentEnabled = false
  private aiGrid?: PuzzleGrid

  constructor(canvas: HTMLCanvasElement, difficulty: number = 1) {
    const config: GameConfig = {
      gameId: 'infinite_puzzle',
      name: 'Infinite Puzzle Master',
      category: 'puzzle',
      targetFPS: 60,
      physics: {
        enabled: false,
        gravity: { x: 0, y: 0 },
        worldBounds: { width: 800, height: 600 }
      },
      ai: {
        enabled: true,
        difficulty,
        adaptiveAdjustment: true
      },
      multiplayer: {
        enabled: true,
        maxPlayers: 2,
        syncFrequency: 10
      },
      procedural: {
        enabled: true,
        complexity: difficulty
      },
      rewards: {
        baseTokens: 10,
        scalingFactor: 1.2,
        qualityBonus: true
      }
    }

    super(config, canvas)
    
    this.puzzleState = this.initializePuzzleState()
    this.setupGameEvents()
  }

  private initializePuzzleState(): PuzzleState {
    const grid = this.createEmptyGrid()
    this.fillGrid(grid)
    
    return {
      grid,
      score: 0,
      moves: 0,
      targetScore: 1000,
      timeRemaining: 180000, // 3 minutes
      chain: 0,
      specialPiecesCreated: 0,
      level: 1
    }
  }

  private createEmptyGrid(): PuzzleGrid {
    const pieces: (PuzzlePiece | null)[][] = []
    
    for (let y = 0; y < this.gridSize.height; y++) {
      pieces[y] = []
      for (let x = 0; x < this.gridSize.width; x++) {
        pieces[y][x] = null
      }
    }
    
    return {
      width: this.gridSize.width,
      height: this.gridSize.height,
      pieces
    }
  }

  private fillGrid(grid: PuzzleGrid): void {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (!grid.pieces[y][x]) {
          grid.pieces[y][x] = this.createRandomPiece(x, y)
        }
      }
    }
    
    // Ensure no initial matches
    this.removeInitialMatches(grid)
  }

  private createRandomPiece(gridX: number, gridY: number): PuzzlePiece {
    const availableColors = [...this.colors]
    
    // Reduce available colors to prevent matches
    if (gridX > 1) {
      const leftPiece1 = this.puzzleState.grid.pieces[gridY][gridX - 1]
      const leftPiece2 = this.puzzleState.grid.pieces[gridY][gridX - 2]
      if (leftPiece1 && leftPiece2 && leftPiece1.color === leftPiece2.color) {
        const index = availableColors.indexOf(leftPiece1.color)
        if (index > -1) availableColors.splice(index, 1)
      }
    }
    
    if (gridY > 1) {
      const upPiece1 = this.puzzleState.grid.pieces[gridY - 1][gridX]
      const upPiece2 = this.puzzleState.grid.pieces[gridY - 2][gridX]
      if (upPiece1 && upPiece2 && upPiece1.color === upPiece2.color) {
        const index = availableColors.indexOf(upPiece1.color)
        if (index > -1) availableColors.splice(index, 1)
      }
    }
    
    const color = availableColors[Math.floor(Math.random() * availableColors.length)]
    
    return {
      id: `piece_${gridX}_${gridY}_${Date.now()}`,
      type: 'normal',
      color,
      gridX,
      gridY,
      isMatched: false,
      isFalling: false
    }
  }

  private removeInitialMatches(grid: PuzzleGrid): void {
    let hasMatches = true
    let iterations = 0
    const maxIterations = 10
    
    while (hasMatches && iterations < maxIterations) {
      hasMatches = false
      iterations++
      
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const piece = grid.pieces[y][x]
          if (!piece) continue
          
          // Check horizontal matches
          if (x <= grid.width - 3) {
            const p1 = grid.pieces[y][x]
            const p2 = grid.pieces[y][x + 1]
            const p3 = grid.pieces[y][x + 2]
            
            if (p1 && p2 && p3 && p1.color === p2.color && p2.color === p3.color) {
              // Replace the middle piece with a different color
              p2.color = this.getDifferentColor(p1.color)
              hasMatches = true
            }
          }
          
          // Check vertical matches
          if (y <= grid.height - 3) {
            const p1 = grid.pieces[y][x]
            const p2 = grid.pieces[y + 1][x]
            const p3 = grid.pieces[y + 2][x]
            
            if (p1 && p2 && p3 && p1.color === p2.color && p2.color === p3.color) {
              p2.color = this.getDifferentColor(p1.color)
              hasMatches = true
            }
          }
        }
      }
    }
  }

  private getDifferentColor(excludeColor: string): string {
    const availableColors = this.colors.filter(c => c !== excludeColor)
    return availableColors[Math.floor(Math.random() * availableColors.length)]
  }

  private setupGameEvents(): void {
    this.on('gameInput', (inputEvent) => {
      this.handlePuzzleInput(inputEvent)
    })
    
    this.on('levelCompleted', () => {
      this.generateNextLevel()
    })
    
    this.on('difficultyAdjusted', (newDifficulty) => {
      this.adjustPuzzleDifficulty(newDifficulty)
    })
  }

  private handlePuzzleInput(inputEvent: any): void {
    if (inputEvent.type === 'click' || inputEvent.type === 'touch') {
      const gridPos = this.screenToGrid(inputEvent.x, inputEvent.y)
      if (gridPos) {
        this.handlePieceSelection(gridPos.x, gridPos.y)
      }
    }
  }

  private screenToGrid(screenX: number, screenY: number): { x: number; y: number } | null {
    const startX = 100 // Grid offset
    const startY = 100
    
    const gridX = Math.floor((screenX - startX) / this.pieceSize)
    const gridY = Math.floor((screenY - startY) / this.pieceSize)
    
    if (gridX >= 0 && gridX < this.gridSize.width && gridY >= 0 && gridY < this.gridSize.height) {
      return { x: gridX, y: gridY }
    }
    
    return null
  }

  private handlePieceSelection(gridX: number, gridY: number): void {
    const piece = this.puzzleState.grid.pieces[gridY][gridX]
    if (!piece || piece.isFalling) return
    
    if (!this.puzzleState.selectedPiece) {
      // First selection
      this.puzzleState.selectedPiece = piece
      this.highlightPiece(piece)
    } else {
      // Second selection - attempt swap
      const selectedPiece = this.puzzleState.selectedPiece
      
      if (this.areAdjacent(selectedPiece, piece)) {
        this.attemptSwap(selectedPiece, piece)
      } else {
        // Select new piece
        this.unhighlightPiece(selectedPiece)
        this.puzzleState.selectedPiece = piece
        this.highlightPiece(piece)
      }
    }
  }

  private areAdjacent(piece1: PuzzlePiece, piece2: PuzzlePiece): boolean {
    const dx = Math.abs(piece1.gridX - piece2.gridX)
    const dy = Math.abs(piece1.gridY - piece2.gridY)
    
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
  }

  private async attemptSwap(piece1: PuzzlePiece, piece2: PuzzlePiece): Promise<void> {
    // Temporarily swap pieces
    this.swapPieces(piece1, piece2)
    
    // Check for matches
    const matches = this.findAllMatches()
    
    if (matches.length > 0) {
      // Valid move
      this.puzzleState.moves++
      this.unhighlightPiece(piece1)
      this.puzzleState.selectedPiece = undefined
      
      await this.animateSwap(piece1, piece2)
      await this.processMatches(matches)
    } else {
      // Invalid move - swap back
      this.swapPieces(piece1, piece2)
      await this.animateInvalidSwap(piece1, piece2)
      this.unhighlightPiece(piece1)
      this.puzzleState.selectedPiece = undefined
    }
  }

  private swapPieces(piece1: PuzzlePiece, piece2: PuzzlePiece): void {
    const grid = this.puzzleState.grid
    
    // Swap positions in grid
    grid.pieces[piece1.gridY][piece1.gridX] = piece2
    grid.pieces[piece2.gridY][piece2.gridX] = piece1
    
    // Update piece coordinates
    const tempX = piece1.gridX
    const tempY = piece1.gridY
    
    piece1.gridX = piece2.gridX
    piece1.gridY = piece2.gridY
    piece2.gridX = tempX
    piece2.gridY = tempY
  }

  private findAllMatches(): PuzzleMatch[] {
    const matches: PuzzleMatch[] = []
    const grid = this.puzzleState.grid
    const checked = new Set<string>()
    
    // Find horizontal matches
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width - 2; x++) {
        const match = this.findHorizontalMatch(x, y)
        if (match && match.pieces.length >= this.matchThreshold) {
          const matchKey = match.pieces.map(p => p.id).sort().join(',')
          if (!checked.has(matchKey)) {
            matches.push(match)
            checked.add(matchKey)
          }
        }
      }
    }
    
    // Find vertical matches
    for (let y = 0; y < grid.height - 2; y++) {
      for (let x = 0; x < grid.width; x++) {
        const match = this.findVerticalMatch(x, y)
        if (match && match.pieces.length >= this.matchThreshold) {
          const matchKey = match.pieces.map(p => p.id).sort().join(',')
          if (!checked.has(matchKey)) {
            matches.push(match)
            checked.add(matchKey)
          }
        }
      }
    }
    
    return matches
  }

  private findHorizontalMatch(startX: number, y: number): PuzzleMatch | null {
    const grid = this.puzzleState.grid
    const startPiece = grid.pieces[y][startX]
    if (!startPiece) return null
    
    const matchedPieces: PuzzlePiece[] = [startPiece]
    
    // Check pieces to the right
    for (let x = startX + 1; x < grid.width; x++) {
      const piece = grid.pieces[y][x]
      if (piece && piece.color === startPiece.color && piece.type === startPiece.type) {
        matchedPieces.push(piece)
      } else {
        break
      }
    }
    
    if (matchedPieces.length >= this.matchThreshold) {
      return {
        pieces: matchedPieces,
        type: 'horizontal',
        score: this.calculateMatchScore(matchedPieces),
        chain: this.puzzleState.chain
      }
    }
    
    return null
  }

  private findVerticalMatch(x: number, startY: number): PuzzleMatch | null {
    const grid = this.puzzleState.grid
    const startPiece = grid.pieces[startY][x]
    if (!startPiece) return null
    
    const matchedPieces: PuzzlePiece[] = [startPiece]
    
    // Check pieces below
    for (let y = startY + 1; y < grid.height; y++) {
      const piece = grid.pieces[y][x]
      if (piece && piece.color === startPiece.color && piece.type === startPiece.type) {
        matchedPieces.push(piece)
      } else {
        break
      }
    }
    
    if (matchedPieces.length >= this.matchThreshold) {
      return {
        pieces: matchedPieces,
        type: 'vertical',
        score: this.calculateMatchScore(matchedPieces),
        chain: this.puzzleState.chain
      }
    }
    
    return null
  }

  private calculateMatchScore(pieces: PuzzlePiece[]): number {
    let baseScore = pieces.length * 10
    
    // Bonus for chain reactions
    const chainMultiplier = 1 + (this.puzzleState.chain * 0.2)
    baseScore *= chainMultiplier
    
    // Bonus for special pieces
    const specialPieces = pieces.filter(p => p.type !== 'normal').length
    baseScore += specialPieces * 50
    
    // Bonus for longer matches
    if (pieces.length >= 5) {
      baseScore *= 2
    } else if (pieces.length >= 4) {
      baseScore *= 1.5
    }
    
    return Math.floor(baseScore)
  }

  private async processMatches(matches: PuzzleMatch[]): Promise<void> {
    if (matches.length === 0) return
    
    // Mark pieces as matched
    const matchedPieces = new Set<PuzzlePiece>()
    let totalScore = 0
    
    for (const match of matches) {
      for (const piece of match.pieces) {
        piece.isMatched = true
        matchedPieces.add(piece)
      }
      totalScore += match.score
    }
    
    // Update score
    this.puzzleState.score += totalScore
    this.updateScore(totalScore)
    
    // Create special pieces for large matches
    this.createSpecialPieces(matches)
    
    // Animate match removal
    await this.animateMatchRemoval(Array.from(matchedPieces))
    
    // Remove matched pieces
    this.removeMatchedPieces(Array.from(matchedPieces))
    
    // Apply gravity
    await this.applyGravity()
    
    // Fill empty spaces
    await this.fillEmptySpaces()
    
    // Check for chain reactions
    this.puzzleState.chain++
    const newMatches = this.findAllMatches()
    
    if (newMatches.length > 0) {
      await this.processMatches(newMatches)
    } else {
      this.puzzleState.chain = 0
      this.checkWinCondition()
    }
  }

  private createSpecialPieces(matches: PuzzleMatch[]): void {
    for (const match of matches) {
      if (match.pieces.length >= 5) {
        // Create rainbow piece
        const centerPiece = match.pieces[Math.floor(match.pieces.length / 2)]
        if (!centerPiece.isMatched) {
          centerPiece.type = 'rainbow'
          centerPiece.isMatched = false
          this.puzzleState.specialPiecesCreated++
        }
      } else if (match.pieces.length === 4) {
        // Create line piece
        const centerPiece = match.pieces[Math.floor(match.pieces.length / 2)]
        if (!centerPiece.isMatched) {
          centerPiece.type = match.type === 'horizontal' ? 'line' : 'line'
          centerPiece.isMatched = false
          this.puzzleState.specialPiecesCreated++
        }
      }
    }
  }

  private removeMatchedPieces(pieces: PuzzlePiece[]): void {
    const grid = this.puzzleState.grid
    
    for (const piece of pieces) {
      if (piece.isMatched) {
        grid.pieces[piece.gridY][piece.gridX] = null
      }
    }
  }

  private async applyGravity(): Promise<void> {
    const grid = this.puzzleState.grid
    let piecesMoved = false
    
    do {
      piecesMoved = false
      
      for (let x = 0; x < grid.width; x++) {
        for (let y = grid.height - 2; y >= 0; y--) {
          const piece = grid.pieces[y][x]
          if (piece && !grid.pieces[y + 1][x]) {
            // Move piece down
            grid.pieces[y + 1][x] = piece
            grid.pieces[y][x] = null
            piece.gridY = y + 1
            piece.isFalling = true
            piecesMoved = true
          }
        }
      }
      
      if (piecesMoved) {
        await this.animateGravity()
      }
    } while (piecesMoved)
    
    // Clear falling flags
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const piece = grid.pieces[y][x]
        if (piece) {
          piece.isFalling = false
        }
      }
    }
  }

  private async fillEmptySpaces(): Promise<void> {
    const grid = this.puzzleState.grid
    
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        if (!grid.pieces[y][x]) {
          grid.pieces[y][x] = this.createRandomPiece(x, y)
        }
      }
    }
    
    await this.animateNewPieces()
  }

  private checkWinCondition(): void {
    if (this.puzzleState.score >= this.puzzleState.targetScore) {
      this.completeLevel()
    } else if (this.puzzleState.timeRemaining <= 0) {
      this.gameOver()
    }
  }

  private generateNextLevel(): void {
    this.puzzleState.level++
    this.puzzleState.targetScore = Math.floor(this.puzzleState.targetScore * 1.5)
    this.puzzleState.timeRemaining = 180000 // Reset time
    this.puzzleState.moves = 0
    this.puzzleState.chain = 0
    
    // Increase difficulty
    if (this.puzzleState.level % 5 === 0) {
      this.colors.push(`color_${this.colors.length}`) // Add new color
    }
    
    // Generate new grid
    this.puzzleState.grid = this.createEmptyGrid()
    this.fillGrid(this.puzzleState.grid)
    
    this.emit('levelGenerated', {
      level: this.puzzleState.level,
      targetScore: this.puzzleState.targetScore,
      colors: this.colors.length
    })
  }

  private adjustPuzzleDifficulty(difficulty: number): void {
    // Adjust various game parameters based on difficulty
    this.matchThreshold = Math.max(3, Math.floor(3 + (difficulty - 1) * 0.5))
    
    if (difficulty > 5) {
      // Add more complex match requirements
      this.colors = this.colors.concat(['teal', 'magenta', 'lime'])
    }
    
    // Adjust AI opponent if enabled
    if (this.aiOpponentEnabled && this.aiOpponent) {
      this.aiOpponent.setDifficulty(difficulty)
    }
  }

  // Animation methods (simplified - would use actual animation system)
  private async animateSwap(piece1: PuzzlePiece, piece2: PuzzlePiece): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.animationSpeed)
    })
  }

  private async animateInvalidSwap(piece1: PuzzlePiece, piece2: PuzzlePiece): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.animationSpeed / 2)
    })
  }

  private async animateMatchRemoval(pieces: PuzzlePiece[]): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.animationSpeed)
    })
  }

  private async animateGravity(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.animationSpeed / 2)
    })
  }

  private async animateNewPieces(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.animationSpeed)
    })
  }

  private highlightPiece(piece: PuzzlePiece): void {
    // Visual highlighting logic
  }

  private unhighlightPiece(piece: PuzzlePiece): void {
    // Remove visual highlighting
  }

  // Public API methods
  public getPuzzleState(): PuzzleState {
    return { ...this.puzzleState }
  }

  public getGrid(): PuzzleGrid {
    return {
      ...this.puzzleState.grid,
      pieces: this.puzzleState.grid.pieces.map(row => [...row])
    }
  }

  public enableAIOpponent(enabled: boolean): void {
    this.aiOpponentEnabled = enabled
    
    if (enabled && !this.aiGrid) {
      this.aiGrid = this.createEmptyGrid()
      this.fillGrid(this.aiGrid)
    }
  }

  public getAvailableMoves(): Array<{from: {x: number, y: number}, to: {x: number, y: number}}> {
    const moves: Array<{from: {x: number, y: number}, to: {x: number, y: number}}> = []
    const grid = this.puzzleState.grid
    
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const piece = grid.pieces[y][x]
        if (!piece) continue
        
        // Check right
        if (x < grid.width - 1) {
          const rightPiece = grid.pieces[y][x + 1]
          if (rightPiece && this.wouldCreateMatch(piece, rightPiece)) {
            moves.push({from: {x, y}, to: {x: x + 1, y}})
          }
        }
        
        // Check down
        if (y < grid.height - 1) {
          const downPiece = grid.pieces[y + 1][x]
          if (downPiece && this.wouldCreateMatch(piece, downPiece)) {
            moves.push({from: {x, y}, to: {x, y: y + 1}})
          }
        }
      }
    }
    
    return moves
  }

  private wouldCreateMatch(piece1: PuzzlePiece, piece2: PuzzlePiece): boolean {
    // Temporarily swap and check for matches
    this.swapPieces(piece1, piece2)
    const matches = this.findAllMatches()
    this.swapPieces(piece1, piece2) // Swap back
    
    return matches.length > 0
  }

  public getMatchScore(): number {
    return this.puzzleState.score
  }

  public getRemainingTime(): number {
    return Math.max(0, this.puzzleState.timeRemaining)
  }

  public getMovesCount(): number {
    return this.puzzleState.moves
  }

  public getCurrentLevel(): number {
    return this.puzzleState.level
  }

  public getSpecialPiecesCreated(): number {
    return this.puzzleState.specialPiecesCreated
  }

  // Override update method to handle puzzle-specific logic
  public update(deltaTime: number): void {
    super.update?.(deltaTime)
    
    // Update timer
    if (this.puzzleState.timeRemaining > 0) {
      this.puzzleState.timeRemaining -= deltaTime
      
      if (this.puzzleState.timeRemaining <= 0) {
        this.gameOver()
      }
    }
    
    // Update AI opponent
    if (this.aiOpponentEnabled && this.aiGrid) {
      this.updateAIOpponent(deltaTime)
    }
  }

  private updateAIOpponent(deltaTime: number): void {
    // AI makes moves based on difficulty and available options
    // This would be implemented with the AI opponent system
  }
}

export default PuzzleGame