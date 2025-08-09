'use client'

import React, { Suspense, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  Stars, 
  Text3D, 
  Center, 
  Float,
  Sparkles,
  Effects,
  PerformanceMonitor
} from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'
import { motion } from 'framer-motion'

// 3D Data Visualization Components
function DataCube({ position, scale = 1, color = '#00ffff', intensity = 1, data }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.2
    }
    
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = intensity + Math.sin(state.clock.elapsedTime * 2) * 0.2
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={intensity}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  )
}

function SystemMonitorSphere({ position, data }: any) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state, delta) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += delta * 0.5
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  const cpuUsage = data?.cpu || 0
  const ramUsage = data?.ram || 0
  const gpuUsage = data?.gpu || 0

  return (
    <group ref={groupRef} position={position}>
      {/* Main system sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          color="#76b900"
          emissive="#76b900"
          emissiveIntensity={0.3}
          wireframe
        />
      </mesh>
      
      {/* CPU Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[2, 0.1, 8, 32, (cpuUsage / 100) * Math.PI * 2]} />
        <meshStandardMaterial
          color="#ff006e"
          emissive="#ff006e"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* RAM Ring */}
      <mesh rotation={[0, 0, Math.PI / 3]} position={[0, 0, 0]}>
        <torusGeometry args={[2.5, 0.08, 8, 32, (ramUsage / 100) * Math.PI * 2]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* GPU Ring */}
      <mesh rotation={[Math.PI / 3, Math.PI / 3, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[3, 0.12, 8, 32, (gpuUsage / 100) * Math.PI * 2]} />
        <meshStandardMaterial
          color="#9acd32"
          emissive="#9acd32"
          emissiveIntensity={0.6}
        />
      </mesh>
      
      {/* Data points for active processes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <DataCube
          key={i}
          position={[
            Math.cos((i / 8) * Math.PI * 2) * 4,
            Math.sin(i * 0.5) * 2,
            Math.sin((i / 8) * Math.PI * 2) * 4
          ]}
          scale={0.3}
          color="#9d4edd"
          intensity={0.8}
        />
      ))}
    </group>
  )
}

function AIVisualization({ position, data }: any) {
  const neuralRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  
  const particlesGeometry = useMemo(() => {
    const positions = new Float32Array(1000 * 3)
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return positions
  }, [])
  
  useFrame((state, delta) => {
    if (neuralRef.current) {
      neuralRef.current.rotation.y += delta * 0.2
      neuralRef.current.rotation.x += delta * 0.1
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <group position={position}>
      {/* Neural Network Visualization */}
      <group ref={neuralRef}>
        {/* Central AI Core */}
        <mesh>
          <icosahedronGeometry args={[0.8, 2]} />
          <meshStandardMaterial
            color="#9d4edd"
            emissive="#9d4edd"
            emissiveIntensity={0.5}
            wireframe
          />
        </mesh>
        
        {/* Neural Connections */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2
          return (
            <group key={i} rotation={[0, angle, 0]}>
              <mesh position={[2, 0, 0]}>
                <sphereGeometry args={[0.2, 8, 8]} />
                <meshStandardMaterial
                  color="#ff006e"
                  emissive="#ff006e"
                  emissiveIntensity={0.8}
                />
              </mesh>
              {/* Connection Lines */}
              <mesh position={[1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
                <meshStandardMaterial
                  color="#39ff14"
                  emissive="#39ff14"
                  emissiveIntensity={0.3}
                />
              </mesh>
            </group>
          )
        })}
      </group>
      
      {/* AI Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={1000}
            array={particlesGeometry}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#9d4edd"
          transparent
          opacity={0.6}
        />
      </points>
      
      <Text3D 
        font="/fonts/JetBrains_Mono_Bold.json" 
        position={[0, -3, 0]} 
        size={0.3}
        height={0.05}
        curveSegments={12}
        bevelEnabled
        bevelThickness={0.02}
        bevelSize={0.01}
        bevelOffset={0}
        bevelSegments={5}
      >
        gpt-oss:20b
        <meshStandardMaterial
          color="#9d4edd"
          emissive="#9d4edd"
          emissiveIntensity={0.3}
        />
      </Text3D>
    </group>
  )
}

function DiscordActivityVisualization({ position, data }: any) {
  const activityRef = useRef<THREE.Group>(null)
  
  useFrame((state, delta) => {
    if (activityRef.current) {
      activityRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <group ref={activityRef} position={position}>
      {/* Discord Logo-like Structure */}
      <mesh>
        <cylinderGeometry args={[1.5, 1.5, 0.3, 6]} />
        <meshStandardMaterial
          color="#5865f2"
          emissive="#5865f2"
          emissiveIntensity={0.4}
        />
      </mesh>
      
      {/* Activity Indicators */}
      {data?.activities?.map((activity: any, i: number) => (
        <Float key={i} speed={3} rotationIntensity={1} floatIntensity={0.5}>
          <mesh position={[
            Math.cos((i / (data.activities.length)) * Math.PI * 2) * 2.5,
            Math.sin(i * 0.8) * 1.5,
            Math.sin((i / (data.activities.length)) * Math.PI * 2) * 2.5
          ]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial
              color="#0066cc"
              emissive="#0066cc"
              emissiveIntensity={0.7}
            />
          </mesh>
        </Float>
      )) || []}
      
      {/* Context Menu Usage */}
      <Text3D 
        font="/fonts/JetBrains_Mono_Bold.json" 
        position={[0, -2.5, 0]} 
        size={0.2}
        height={0.03}
      >
        opure.uk
        <meshStandardMaterial
          color="#0066cc"
          emissive="#0066cc"
          emissiveIntensity={0.3}
        />
      </Text3D>
    </group>
  )
}

function EconomyVisualization({ position, data }: any) {
  const economyRef = useRef<THREE.Group>(null)
  
  useFrame((state, delta) => {
    if (economyRef.current) {
      economyRef.current.rotation.z += delta * 0.1
    }
  })

  return (
    <group ref={economyRef} position={position}>
      {/* Fragment Flow Visualization */}
      <mesh>
        <torusKnotGeometry args={[1, 0.3, 100, 16]} />
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={0.4}
          wireframe
        />
      </mesh>
      
      {/* Economic Data Points */}
      {Array.from({ length: 6 }).map((_, i) => (
        <DataCube
          key={i}
          position={[
            Math.cos((i / 6) * Math.PI * 2) * 3,
            Math.sin(i) * 2,
            Math.sin((i / 6) * Math.PI * 2) * 3
          ]}
          scale={0.4}
          color="#ff6b35"
          intensity={0.6}
        />
      ))}
      
      <Text3D 
        font="/fonts/JetBrains_Mono_Bold.json" 
        position={[0, -2, 0]} 
        size={0.25}
        height={0.05}
      >
        FRAGMENTS
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={0.3}
        />
      </Text3D>
    </group>
  )
}

// Main 3D Scene Component
function Scene3DContent({ botData, realTimeData }: any) {
  const { camera, gl } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 5, 10)
  }, [camera])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#9d4edd" />
      <spotLight
        position={[0, 20, 0]}
        angle={0.3}
        penumbra={1}
        intensity={1}
        color="#0066cc"
        castShadow
      />
      
      {/* Background */}
      <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade />
      <Environment preset="night" />
      
      {/* Grid Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#001122"
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>
      
      {/* 3D Visualizations */}
      <SystemMonitorSphere 
        position={[-8, 2, 0]} 
        data={realTimeData?.system || {}} 
      />
      
      <AIVisualization 
        position={[0, 2, -8]} 
        data={realTimeData?.ai || {}} 
      />
      
      <DiscordActivityVisualization 
        position={[8, 2, 0]} 
        data={realTimeData?.discord || {}} 
      />
      
      <EconomyVisualization 
        position={[0, 2, 8]} 
        data={realTimeData?.economy || {}} 
      />
      
      {/* Sparkles */}
      <Sparkles
        count={200}
        scale={[20, 10, 20]}
        size={2}
        speed={0.4}
        opacity={0.6}
        color="#00ffff"
      />
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
      
      {/* Post-processing Effects */}
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
        <ChromaticAberration
          offset={[0.0005, 0.0005]}
        />
      </EffectComposer>
    </>
  )
}

// Performance Monitor Component
function PerformanceWrapper({ children }: any) {
  return (
    <PerformanceMonitor
      onIncline={() => console.log('📈 Performance increased')}
      onDecline={() => console.log('📉 Performance decreased')}
    >
      {children}
    </PerformanceMonitor>
  )
}

// Main Dashboard3D Component
export default function Dashboard3D({ botData, realTimeData }: any) {
  return (
    <motion.div 
      className="h-full w-full scene-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 75 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance" // RTX 5070 Ti optimization
        }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <Suspense fallback={null}>
          <PerformanceWrapper>
            <Scene3DContent botData={botData} realTimeData={realTimeData} />
          </PerformanceWrapper>
        </Suspense>
      </Canvas>
      
      {/* 3D UI Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Rangers FC Scottish Elements */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="glass-panel-dark px-4 py-2 rangers-border">
            <h1 className="text-rangers font-mono font-bold text-xl">
              OPURE.EXE 3D COMMAND CENTER
            </h1>
            <p className="text-scottish-blue text-sm font-mono">
              🏴󠁧󠁢󠁳󠁣󠁴󠁿 Powered by RTX 5070 Ti | Made in Scotland
            </p>
          </div>
        </div>
        
        {/* Performance Overlay */}
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <div className="system-monitor p-4">
            <h3 className="text-gpu font-mono font-bold mb-2">RTX 5070 Ti</h3>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">GPU Usage:</span>
                <span className="text-gpu-bright">{realTimeData?.gpu?.usage || 15}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">VRAM:</span>
                <span className="text-gpu-bright">{realTimeData?.gpu?.vram || 2.1}GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Temp:</span>
                <span className="text-gpu-bright">{realTimeData?.gpu?.temp || 45}°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}