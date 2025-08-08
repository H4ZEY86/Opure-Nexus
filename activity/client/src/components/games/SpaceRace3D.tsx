import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import { Sphere, Box, Text, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface SpaceRace3DProps {
  onGameEnd: (score: number) => void
  user: any
}

// Spaceship Component
function Spaceship({ position }: { position: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime) * 0.2
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <coneGeometry args={[0.3, 1.2, 8]} />
        <meshStandardMaterial color="#00FF88" emissive="#004422" />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, 0, -0.8]}>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="#FF4400" />
      </mesh>
    </group>
  )
}

// Asteroid Component
function Asteroid({ position, onCollision }: { position: THREE.Vector3, onCollision: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.1
      meshRef.current.rotation.x += 0.02
      meshRef.current.rotation.y += 0.01
      
      // Check collision (simplified)
      if (meshRef.current.position.z > 2) {
        meshRef.current.position.z = -20
        meshRef.current.position.x = (Math.random() - 0.5) * 10
        meshRef.current.position.y = (Math.random() - 0.5) * 6
      }
      
      // Collision detection with spaceship (at origin)
      const distance = meshRef.current.position.distanceTo(new THREE.Vector3(0, 0, 0))
      if (distance < 0.8) {
        onCollision()
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <dodecahedronGeometry args={[0.5]} />
      <meshStandardMaterial color="#8B4513" roughness={0.8} />
    </mesh>
  )
}

// Power-up Component
function PowerUp({ position, onCollect }: { position: THREE.Vector3, onCollect: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.08
      meshRef.current.rotation.y += 0.05
      
      if (meshRef.current.position.z > 2) {
        meshRef.current.position.z = -20
        meshRef.current.position.x = (Math.random() - 0.5) * 8
        meshRef.current.position.y = (Math.random() - 0.5) * 5
      }
      
      // Collection detection
      const distance = meshRef.current.position.distanceTo(new THREE.Vector3(0, 0, 0))
      if (distance < 0.6) {
        onCollect()
        meshRef.current.position.z = -20 // Reset position
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.3]} />
      <meshBasicMaterial color="#FFD700" />
    </mesh>
  )
}

// Star Field Background
function StarField() {
  const starsRef = useRef<THREE.Points>(null!)
  
  useEffect(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(1000 * 3)
    
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    if (starsRef.current) {
      starsRef.current.geometry = geometry
    }
  }, [])
  
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.z += 0.001
    }
  })

  return (
    <points ref={starsRef}>
      <pointsMaterial color="#FFFFFF" size={0.1} />
    </points>
  )
}

// Game Scene Component
function GameScene({ 
  onScore, 
  onCollision, 
  spaceshipPosition 
}: { 
  onScore: () => void
  onCollision: () => void
  spaceshipPosition: THREE.Vector3
}) {
  // Generate asteroids
  const asteroids = Array.from({ length: 8 }, (_, i) => (
    <Asteroid
      key={i}
      position={new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        -5 - i * 3
      )}
      onCollision={onCollision}
    />
  ))

  // Generate power-ups
  const powerUps = Array.from({ length: 3 }, (_, i) => (
    <PowerUp
      key={i}
      position={new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 5,
        -8 - i * 7
      )}
      onCollect={onScore}
    />
  ))

  return (
    <>
      <StarField />
      <Spaceship position={spaceshipPosition} />
      {asteroids}
      {powerUps}
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[0, 0, 5]} color="#0088FF" intensity={0.5} />
    </>
  )
}

export default function SpaceRace3D({ onGameEnd, user }: SpaceRace3DProps) {
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameRunning, setGameRunning] = useState(true)
  const [spaceshipPosition, setSpaceshipPosition] = useState(new THREE.Vector3(0, 0, 0))
  const [keys, setKeys] = useState<{[key: string]: boolean}>({})

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }))
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }))
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Update spaceship position based on keys
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameRunning) {
        setSpaceshipPosition(prev => {
          const newPos = prev.clone()
          const speed = 0.1
          
          if (keys['a'] || keys['arrowleft']) newPos.x -= speed
          if (keys['d'] || keys['arrowright']) newPos.x += speed
          if (keys['w'] || keys['arrowup']) newPos.y += speed
          if (keys['s'] || keys['arrowdown']) newPos.y -= speed
          
          // Clamp position to bounds
          newPos.x = Math.max(-5, Math.min(5, newPos.x))
          newPos.y = Math.max(-3, Math.min(3, newPos.y))
          
          return newPos
        })
      }
    }, 16) // ~60fps
    
    return () => clearInterval(interval)
  }, [keys, gameRunning])

  const handleScore = () => {
    setScore(prev => prev + 100)
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
    <div className="min-h-screen bg-black relative">
      {/* Game Canvas */}
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <GameScene 
          onScore={handleScore}
          onCollision={handleCollision}
          spaceshipPosition={spaceshipPosition}
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 text-white font-mono">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4">
          <div className="text-2xl font-bold mb-2">🚀 SPACE RACE</div>
          <div>Score: {score.toLocaleString()}</div>
          <div>Lives: {Array.from({ length: lives }, (_, i) => '❤️').join('')}</div>
          <div className="text-sm mt-2 text-white/70">
            WASD / Arrow Keys to move
          </div>
        </div>
      </div>

      {/* Game Over */}
      {!gameRunning && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-4">🎮 GAME OVER</div>
            <div className="text-2xl mb-2">Final Score: {score.toLocaleString()}</div>
            <div className="text-lg text-white/70">Great flying, {user?.username || 'Pilot'}!</div>
          </div>
        </div>
      )}
    </div>
  )
}