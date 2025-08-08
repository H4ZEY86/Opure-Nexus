import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box, Plane, Text } from '@react-three/drei'
import * as THREE from 'three'

interface CubeDash3DProps {
  onGameEnd: (score: number) => void
  user: any
}

// Player Cube Component
function PlayerCube({ position, isJumping }: { position: THREE.Vector3, isJumping: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.02
      meshRef.current.rotation.z += 0.01
      
      // Pulsating effect when jumping
      if (isJumping) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1
        meshRef.current.scale.set(scale, scale, scale)
      } else {
        meshRef.current.scale.set(1, 1, 1)
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial 
        color="#00FFFF" 
        emissive="#004444"
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  )
}

// Obstacle Component
function Obstacle({ position, onCollision }: { position: THREE.Vector3, onCollision: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.15
      meshRef.current.rotation.y += 0.03
      
      // Reset when past player
      if (meshRef.current.position.z > 3) {
        meshRef.current.position.z = -15
      }
      
      // Collision detection
      const distance = meshRef.current.position.distanceTo(new THREE.Vector3(0, 0.25, 0))
      if (distance < 0.6) {
        onCollision()
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.8, 1.2, 0.8]} />
      <meshStandardMaterial color="#FF4444" emissive="#441111" />
    </mesh>
  )
}

// Collectible Gem Component
function Gem({ position, onCollect }: { position: THREE.Vector3, onCollect: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.12
      meshRef.current.rotation.y += 0.05
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.01
      
      if (meshRef.current.position.z > 3) {
        meshRef.current.position.z = -18
        meshRef.current.position.x = (Math.random() - 0.5) * 4
        meshRef.current.position.y = 0.5 + Math.random() * 2
      }
      
      // Collection detection
      const distance = meshRef.current.position.distanceTo(new THREE.Vector3(0, 0.25, 0))
      if (distance < 0.5) {
        onCollect()
        meshRef.current.position.z = -18 // Reset
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.2]} />
      <meshBasicMaterial color="#FFD700" />
    </mesh>
  )
}

// Ground/Platform Component
function Ground() {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.map?.offset.setZ(meshRef.current.material.map.offset.z + 0.01)
    }
  })

  return (
    <mesh ref={meshRef} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 50]} />
      <meshStandardMaterial 
        color="#2a2a2a"
        roughness={0.8}
        wireframe={false}
      />
    </mesh>
  )
}

// Game Scene Component
function GameScene({ 
  playerPosition,
  isJumping,
  onScore,
  onCollision
}: {
  playerPosition: THREE.Vector3
  isJumping: boolean
  onScore: () => void
  onCollision: () => void
}) {
  // Generate obstacles
  const obstacles = Array.from({ length: 6 }, (_, i) => (
    <Obstacle
      key={i}
      position={new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        0,
        -3 - i * 3
      )}
      onCollision={onCollision}
    />
  ))

  // Generate gems
  const gems = Array.from({ length: 8 }, (_, i) => (
    <Gem
      key={i}
      position={new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        0.5 + Math.random() * 2,
        -2 - i * 2.5
      )}
      onCollect={onScore}
    />
  ))

  return (
    <>
      <Ground />
      <PlayerCube position={playerPosition} isJumping={isJumping} />
      {obstacles}
      {gems}
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[0, 3, 0]} color="#00FFFF" intensity={0.5} />
      
      {/* Fog for depth */}
      <fog attach="fog" args={['#000033', 5, 20]} />
    </>
  )
}

export default function CubeDash3D({ onGameEnd, user }: CubeDash3DProps) {
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameRunning, setGameRunning] = useState(true)
  const [playerY, setPlayerY] = useState(0)
  const [isJumping, setIsJumping] = useState(false)
  const [jumpVelocity, setJumpVelocity] = useState(0)

  // Jump mechanics
  useEffect(() => {
    if (isJumping) {
      const interval = setInterval(() => {
        setPlayerY(prevY => {
          const newY = prevY + jumpVelocity
          setJumpVelocity(prev => prev - 0.02) // Gravity
          
          if (newY <= 0) {
            setPlayerY(0)
            setIsJumping(false)
            setJumpVelocity(0)
            return 0
          }
          
          return newY
        })
      }, 16)
      
      return () => clearInterval(interval)
    }
  }, [isJumping, jumpVelocity])

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && !isJumping) {
        setIsJumping(true)
        setJumpVelocity(0.25)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isJumping])

  const handleScore = () => {
    setScore(prev => prev + 50)
  }

  const handleCollision = () => {
    setLives(prev => {
      const newLives = prev - 1
      if (newLives <= 0) {
        setGameRunning(false)
        setTimeout(() => onGameEnd(score), 1000)
      }
      return newLives
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black relative">
      {/* Game Canvas */}
      <Canvas camera={{ position: [0, 2, 4], fov: 75 }}>
        <GameScene
          playerPosition={new THREE.Vector3(0, playerY, 0)}
          isJumping={isJumping}
          onScore={handleScore}
          onCollision={handleCollision}
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 text-white font-mono">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4">
          <div className="text-2xl font-bold mb-2">🎲 CUBE DASH</div>
          <div>Score: {score.toLocaleString()}</div>
          <div>Lives: {Array.from({ length: lives }, (_, i) => '💎').join('')}</div>
          <div className="text-sm mt-2 text-white/70">
            SPACE / W / ↑ to jump
          </div>
        </div>
      </div>

      {/* Jump indicator */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
        <div className="text-white text-center">
          {isJumping && (
            <div className="text-2xl animate-bounce">🚀</div>
          )}
        </div>
      </div>

      {/* Game Over */}
      {!gameRunning && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-4">🎮 CUBE CRASHED!</div>
            <div className="text-2xl mb-2">Final Score: {score.toLocaleString()}</div>
            <div className="text-lg text-white/70">Nice jumping, {user?.username || 'Player'}!</div>
          </div>
        </div>
      )}
    </div>
  )
}