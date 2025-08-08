import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Box } from '@react-three/drei'
import * as THREE from 'three'

interface BallBouncer3DProps {
  onGameEnd: (score: number) => void
  user: any
}

function Ball({ position, velocity, onBounce }: { position: THREE.Vector3, velocity: THREE.Vector3, onBounce: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.add(velocity)
      
      // Bounce off walls
      if (meshRef.current.position.x > 4 || meshRef.current.position.x < -4) {
        velocity.x *= -1
        onBounce()
      }
      if (meshRef.current.position.z > 4 || meshRef.current.position.z < -4) {
        velocity.z *= -1
        onBounce()
      }
      
      // Apply gravity
      velocity.y -= 0.005
      
      // Bounce off platforms (simplified)
      if (meshRef.current.position.y < 0) {
        velocity.y = Math.abs(velocity.y) * 0.8
        meshRef.current.position.y = 0
        onBounce()
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.2]} />
      <meshStandardMaterial color="#FF6B6B" emissive="#441111" />
    </mesh>
  )
}

function Platform({ position }: { position: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 2 + position.x) * 0.5
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1.5, 0.1, 1.5]} />
      <meshStandardMaterial color="#4ECDC4" />
    </mesh>
  )
}

export default function BallBouncer3D({ onGameEnd, user }: BallBouncer3DProps) {
  const [score, setScore] = useState(0)
  const [ballPosition] = useState(new THREE.Vector3(0, 2, 0))
  const [ballVelocity] = useState(new THREE.Vector3(0.05, 0, 0.03))
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onGameEnd(score)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [score, onGameEnd])

  const handleBounce = () => setScore(prev => prev + 10)

  const platforms = Array.from({ length: 8 }, (_, i) => (
    <Platform
      key={i}
      position={new THREE.Vector3(
        (i % 3 - 1) * 2,
        -1 - (i * 0.5),
        (Math.floor(i / 3) - 1) * 2
      )}
    />
  ))

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black relative">
      <Canvas camera={{ position: [0, 5, 8], fov: 75 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Ball position={ballPosition} velocity={ballVelocity} onBounce={handleBounce} />
        {platforms}
      </Canvas>

      <div className="absolute top-4 left-4 text-white font-mono">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4">
          <div className="text-2xl font-bold mb-2">⚽ BALL BOUNCER</div>
          <div>Score: {score.toLocaleString()}</div>
          <div>Time: {timeLeft}s</div>
        </div>
      </div>

      {timeLeft === 0 && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-4">⏰ TIME'S UP!</div>
            <div className="text-2xl mb-2">Final Score: {score.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  )
}