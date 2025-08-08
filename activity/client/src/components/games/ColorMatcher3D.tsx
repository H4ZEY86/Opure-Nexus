import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'

interface ColorMatcher3DProps {
  onGameEnd: (score: number) => void
  user: any
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']

function ColorOrb({ position, color, targetColor, onClick }: { 
  position: THREE.Vector3, 
  color: string, 
  targetColor: string,
  onClick: (correct: boolean) => void 
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + position.x) * 0.01
    }
  })

  const handleClick = () => {
    onClick(color === targetColor)
  }

  return (
    <mesh ref={meshRef} position={position} onClick={handleClick}>
      <sphereGeometry args={[0.4]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color === targetColor ? '#444444' : '#000000'}
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  )
}

export default function ColorMatcher3D({ onGameEnd, user }: ColorMatcher3DProps) {
  const [score, setScore] = useState(0)
  const [targetColor, setTargetColor] = useState(COLORS[0])
  const [orbs, setOrbs] = useState<Array<{color: string, position: THREE.Vector3}>>([])
  const [timeLeft, setTimeLeft] = useState(45)

  useEffect(() => {
    generateOrbs()
  }, [])

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

  const generateOrbs = () => {
    const newOrbs = Array.from({ length: 8 }, (_, i) => ({
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      position: new THREE.Vector3(
        (i % 4 - 1.5) * 2,
        Math.floor(i / 4) * 2 - 1,
        0
      )
    }))
    
    setOrbs(newOrbs)
    setTargetColor(COLORS[Math.floor(Math.random() * COLORS.length)])
  }

  const handleOrbClick = (correct: boolean) => {
    if (correct) {
      setScore(prev => prev + 100)
    } else {
      setScore(prev => Math.max(0, prev - 50))
    }
    
    setTimeout(generateOrbs, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black relative">
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {orbs.map((orb, i) => (
          <ColorOrb
            key={i}
            position={orb.position}
            color={orb.color}
            targetColor={targetColor}
            onClick={handleOrbClick}
          />
        ))}
        
        <Text
          position={[0, 3, 0]}
          fontSize={0.8}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          Click: {targetColor}
        </Text>
      </Canvas>

      <div className="absolute top-4 left-4 text-white font-mono">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4">
          <div className="text-2xl font-bold mb-2">🎨 COLOR MATCHER</div>
          <div>Score: {score.toLocaleString()}</div>
          <div>Time: {timeLeft}s</div>
          <div className="mt-2 p-2 rounded" style={{backgroundColor: targetColor}}>
            Target Color
          </div>
        </div>
      </div>

      {timeLeft === 0 && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-4xl mb-4">🎨 GAME OVER!</div>
            <div className="text-2xl mb-2">Final Score: {score.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  )
}