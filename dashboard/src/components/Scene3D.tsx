'use client'

import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Text, Sphere, Box } from '@react-three/drei'
import { BotData, RealTimeData } from '@/types'
import * as THREE from 'three'

interface Scene3DProps {
  botData: BotData
  realTimeData: RealTimeData
}

// Central Bot Node
function BotNode({ botData, realTimeData }: { botData: BotData, realTimeData: RealTimeData }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1
    }
  })

  const status = botData.status
  const statusColor = {
    online: '#00ff00',
    idle: '#ffff00', 
    dnd: '#ff0000',
    offline: '#808080'
  }[status] || '#808080'

  return (
    <group position={[0, 0, 0]}>
      {/* Main Bot Sphere */}
      <Sphere ref={meshRef} args={[1.5, 32, 32]} position={[0, 0, 0]}>
        <meshPhongMaterial 
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={0.2}
          transparent
          opacity={0.8}
        />
      </Sphere>
      
      {/* Activity Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.1, 8, 100]} />
        <meshPhongMaterial 
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Status Text */}
      <Text
        position={[0, -2.5, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font="/fonts/JetBrainsMono-Bold.woff"
      >
        {botData.username}
      </Text>
      
      <Text
        position={[0, -3.2, 0]}
        fontSize={0.3}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        font="/fonts/JetBrainsMono-Regular.woff"
      >
        {status.toUpperCase()} • {botData.guilds} Guilds • {botData.users} Users
      </Text>
    </group>
  )
}

// System Nodes
function SystemNode({ 
  position, 
  type, 
  color, 
  label, 
  value, 
  activity 
}: { 
  position: [number, number, number]
  type: string
  color: string
  label: string
  value: string | number
  activity: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
      
      // Pulse based on activity level
      const scale = 1 + Math.sin(state.clock.elapsedTime * activity) * 0.2
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={position}>
      {/* Node Shape */}
      {type === 'music' ? (
        <Sphere ref={meshRef} args={[0.8, 16, 16]}>
          <meshPhongMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.7}
          />
        </Sphere>
      ) : (
        <Box ref={meshRef} args={[1.2, 1.2, 1.2]}>
          <meshPhongMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.7}
          />
        </Box>
      )}
      
      {/* Connection Line to Center */}
      <mesh>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              position[0], position[1], position[2],
              0, 0, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      
      {/* Label */}
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      <Text
        position={[0, -1.9, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {value}
      </Text>
    </group>
  )
}

// Data Streams
function DataStreams() {
  const particlesRef = useRef<THREE.Points>(null)
  
  const particles = useMemo(() => {
    const particleCount = 200
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      // Random position in sphere
      const radius = Math.random() * 10
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)
      
      // Random colors
      colors[i3] = Math.random() * 0.5 + 0.5
      colors[i3 + 1] = Math.random() * 0.5 + 0.5
      colors[i3 + 2] = 1
    }
    
    return { positions, colors }
  }, [])
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

// Main 3D Scene Component
export default function Scene3D({ botData, realTimeData }: Scene3DProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 75 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance" // RTX 5070 Ti optimization
        }}
        dpr={[1, 2]} // Adaptive pixel ratio for performance
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
        <pointLight position={[-10, -10, 5]} intensity={0.5} color="#9d4edd" />
        
        {/* Background Stars */}
        <Stars 
          radius={100} 
          depth={50} 
          count={1000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={0.5}
        />
        
        {/* Data Stream Particles */}
        <DataStreams />
        
        {/* Central Bot Node */}
        <Suspense fallback={null}>
          <BotNode botData={botData} realTimeData={realTimeData} />
        </Suspense>
        
        {/* System Nodes */}
        <SystemNode
          position={[4, 2, 0]}
          type="music"
          color="#ff6b9d"
          label="Music"
          value={`${realTimeData.music?.queue_length || 0} queued`}
          activity={realTimeData.music?.is_playing ? 3 : 1}
        />
        
        <SystemNode
          position={[-4, 2, 0]}
          type="ai"
          color="#9d4edd"
          label="AI Brain"
          value={`${realTimeData.ai?.requests_today || 0} requests`}
          activity={2}
        />
        
        <SystemNode
          position={[0, 4, 0]}
          type="gaming"
          color="#ff006e"
          label="Gaming"
          value={`${realTimeData.gaming?.active_players || 0} players`}
          activity={realTimeData.gaming?.active_players ? 4 : 1}
        />
        
        <SystemNode
          position={[4, -2, 0]}
          type="economy"
          color="#ff9500"
          label="Economy"
          value={`${realTimeData.economy?.daily_transactions || 0} trades`}
          activity={1.5}
        />
        
        <SystemNode
          position={[-4, -2, 0]}
          type="performance"
          color="#39ff14"
          label="Performance"
          value={`${realTimeData.performance?.cpu_usage?.toFixed(1) || 0}% CPU`}
          activity={realTimeData.performance?.cpu_usage ? realTimeData.performance.cpu_usage / 20 : 1}
        />
        
        {/* GPU Performance Node (RTX 5070 Ti) */}
        <SystemNode
          position={[0, -4, 0]}
          type="gpu"
          color="#00ffff"
          label="RTX 5070 Ti"
          value={`${realTimeData.performance?.gpu_usage?.toFixed(1) || 0}% GPU`}
          activity={realTimeData.performance?.gpu_usage ? realTimeData.performance.gpu_usage / 15 : 1}
        />
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.4}
          maxDistance={20}
          minDistance={5}
        />
      </Canvas>
      
      {/* 3D Scene Info Overlay */}
      <div className="absolute bottom-4 left-4 glass-panel p-3 text-xs font-mono text-white">
        <div className="space-y-1">
          <div>3D Engine: Three.js (WebGL)</div>
          <div>GPU: RTX 5070 Ti ({realTimeData.performance?.gpu_usage?.toFixed(1) || 0}%)</div>
          <div>FPS: {realTimeData.performance?.fps || 60}</div>
          <div>Particles: 200</div>
        </div>
      </div>
    </div>
  )
}