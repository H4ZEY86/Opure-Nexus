import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Sphere, Box, Plane, Cylinder } from '@react-three/drei'
import { useDiscord } from '../hooks/useDiscord'
import * as THREE from 'three'

// 3D Music Visualizer
function MusicVisualizer({ isPlaying, audioData }) {
  const groupRef = useRef()
  const barsRef = useRef([])
  
  useFrame((state) => {
    if (groupRef.current && isPlaying) {
      groupRef.current.rotation.y += 0.01
      
      // Animate visualizer bars
      barsRef.current.forEach((bar, index) => {
        if (bar) {
          const frequency = audioData?.[index] || Math.random()
          bar.scale.y = 0.5 + frequency * 2
          bar.material.emissiveIntensity = frequency * 0.5
        }
      })
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Central Music Sphere */}
      <Sphere args={[2]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#4f46e5"
          emissive="#312e81"
          emissiveIntensity={isPlaying ? 0.5 : 0.1}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      
      {/* Visualizer Bars */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 32) * Math.PI * 2
        const radius = 4
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        
        return (
          <Cylinder
            key={i}
            ref={(el) => (barsRef.current[i] = el)}
            args={[0.1, 0.1, 1]}
            position={[x, 0, z]}
            rotation={[0, angle, 0]}
          >
            <meshStandardMaterial 
              color={`hsl(${i * 11}, 80%, 60%)`}
              emissive={`hsl(${i * 11}, 80%, 30%)`}
              emissiveIntensity={0.2}
            />
          </Cylinder>
        )
      })}
      
      {/* Floating Music Notes */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Text
          key={i}
          position={[
            Math.sin(Date.now() * 0.001 + i) * 8,
            Math.cos(Date.now() * 0.0008 + i) * 3,
            Math.cos(Date.now() * 0.0012 + i) * 6
          ]}
          fontSize={0.5}
          color="#fbbf24"
          rotation={[0, 0, Math.sin(Date.now() * 0.002 + i) * 0.3]}
        >
          {['♪', '♫', '♬', '♩'][i % 4]}
        </Text>
      ))}
    </group>
  )
}

// 3D Video Player
function VideoPlayer3D({ videoUrl, position, isActive }) {
  const videoRef = useRef()
  const [video, setVideo] = useState(null)
  
  useEffect(() => {
    if (videoUrl && isActive) {
      const videoElement = document.createElement('video')
      videoElement.src = videoUrl
      videoElement.crossOrigin = 'anonymous'
      videoElement.loop = true
      videoElement.play()
      setVideo(videoElement)
    }
  }, [videoUrl, isActive])

  return (
    <group position={position}>
      <Plane args={[6, 4]} position={[0, 0, 0.01]}>
        <meshStandardMaterial color="#000" />
      </Plane>
      <Plane args={[5.8, 3.8]}>
        {video && (
          <meshStandardMaterial>
            <videoTexture args={[video]} attach="map" />
          </meshStandardMaterial>
        )}
      </Plane>
      {/* Video Controls */}
      <Box args={[1, 0.3, 0.1]} position={[0, -2.5, 0.1]}>
        <meshStandardMaterial color="#1f2937" />
      </Box>
      <Text
        position={[0, -2.5, 0.2]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {isActive ? "⏸️ Pause" : "▶️ Play"}
      </Text>
    </group>
  )
}

// Enhanced UI Components
function MusicLibrary({ onTrackSelect, tracks }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Music Library</h2>
      
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search for music, artists, or videos..."
          className="w-full bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        <button className="absolute right-3 top-3 text-gray-400 hover:text-white">
          🔍
        </button>
      </div>

      {/* Popular Tracks */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Popular Tracks</h3>
        {tracks.map((track, index) => (
          <motion.div
            key={track.id}
            className="bg-white/5 rounded-lg p-3 flex items-center space-x-3 cursor-pointer border border-white/10"
            whileHover={{ backgroundColor: "rgba(255,255,255,0.1)", scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onTrackSelect(track)}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              {track.hasVideo ? '📺' : '🎵'}
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">{track.title}</h4>
              <p className="text-gray-400 text-sm">{track.artist}</p>
            </div>
            <div className="text-gray-400 text-sm">
              {track.duration}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Playlists */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Your Playlists</h3>
        <div className="grid grid-cols-2 gap-3">
          {['Favorites', 'Chill Vibes', 'Workout', 'Study'].map((playlist) => (
            <motion.div
              key={playlist}
              className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl p-4 cursor-pointer border border-white/10"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-2xl mb-2">🎵</div>
              <h4 className="text-white font-medium">{playlist}</h4>
              <p className="text-gray-400 text-sm">{Math.floor(Math.random() * 50) + 10} songs</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MusicPlayer({ currentTrack, isPlaying, onPlayPause, onNext, onPrevious }) {
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(75)

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev + 1) % 100)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
    >
      {/* Track Info */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
          {currentTrack?.hasVideo ? '📺' : '🎵'}
        </div>
        <div className="flex-1">
          <h3 className="text-white text-xl font-bold">{currentTrack?.title || 'No track selected'}</h3>
          <p className="text-gray-300">{currentTrack?.artist || 'Select a track to begin'}</p>
        </div>
        <div className="text-right">
          <div className="text-white text-sm">{Math.floor(progress * 2.4)}:30</div>
          <div className="text-gray-400 text-sm">4:00</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-6 mb-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPrevious}
          className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          ⏮️
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPlayPause}
          className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onNext}
          className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          ⏭️
        </motion.button>
      </div>

      {/* Additional Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-white text-sm">🔊</span>
          <div className="w-20 bg-gray-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full" 
              style={{ width: `${volume}%` }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="text-gray-400 hover:text-white transition-colors">🔀</button>
          <button className="text-gray-400 hover:text-white transition-colors">🔁</button>
          <button className="text-gray-400 hover:text-white transition-colors">❤️</button>
        </div>
      </div>
    </motion.div>
  )
}

function SocialFeatures({ currentTrack, isPlaying }) {
  const [isSharing, setIsSharing] = useState(false)
  const [listeners, setListeners] = useState(Math.floor(Math.random() * 500) + 100)

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Social Hub</h2>
      
      {/* Live Listeners */}
      <motion.div
        className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl p-4 border border-white/10"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Live Listeners</h3>
            <p className="text-gray-300 text-sm">Currently vibing with you</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">{listeners.toLocaleString()}</div>
            <div className="flex items-center justify-end space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs">LIVE</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Share Current Track */}
      <motion.div
        className="bg-white/5 rounded-xl p-4 border border-white/10"
        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
      >
        <h3 className="text-white font-semibold mb-3">Share This Track</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Discord', icon: '💬', color: 'bg-indigo-500' },
            { name: 'Twitter', icon: '🐦', color: 'bg-blue-500' },
            { name: 'TikTok', icon: '🎵', color: 'bg-pink-500' }
          ].map((platform) => (
            <motion.button
              key={platform.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSharing(true)}
              className={`${platform.color} rounded-lg p-3 text-white text-center transition-all hover:shadow-lg`}
            >
              <div className="text-lg mb-1">{platform.icon}</div>
              <div className="text-xs">{platform.name}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Music Challenges */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-white/10">
        <h3 className="text-white font-semibold mb-3">Music Challenges</h3>
        <div className="space-y-2">
          {[
            { title: 'Listen for 1 hour', progress: 65, reward: '100 XP' },
            { title: 'Discover 5 new artists', progress: 40, reward: '50 Fragments' },
            { title: 'Share 3 tracks', progress: 33, reward: 'Exclusive Badge' }
          ].map((challenge, index) => (
            <div key={index} className="bg-black/20 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-white text-sm">{challenge.title}</span>
                <span className="text-blue-300 text-xs">{challenge.reward}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full"
                  style={{ width: `${challenge.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-white font-semibold mb-3">Top Listeners This Week</h3>
        <div className="space-y-2">
          {[
            { name: 'MusicLover99', hours: 24, avatar: '🎵' },
            { name: 'BeatMaster', hours: 21, avatar: '🎧' },
            { name: 'VibeCheck', hours: 18, avatar: '🎤' }
          ].map((user, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{user.avatar}</span>
                <span className="text-white text-sm">{user.name}</span>
              </div>
              <span className="text-blue-300 text-sm">{user.hours}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function Music3D() {
  const { user } = useDiscord()
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [audioData, setAudioData] = useState(null)
  const [activeTab, setActiveTab] = useState('library')

  // Sample tracks data
  const tracks = [
    {
      id: 1,
      title: 'Lucid Dreams',
      artist: 'Juice WRLD',
      duration: '3:59',
      hasVideo: true,
      videoUrl: '/videos/lucid-dreams.mp4'
    },
    {
      id: 2,
      title: 'Robbery',
      artist: 'Juice WRLD',
      duration: '4:02',
      hasVideo: true,
      videoUrl: '/videos/robbery.mp4'
    },
    {
      id: 3,
      title: 'All Girls Are The Same',
      artist: 'Juice WRLD',
      duration: '2:45',
      hasVideo: false
    },
    {
      id: 4,
      title: 'Legends',
      artist: 'Juice WRLD',
      duration: '3:24',
      hasVideo: true,
      videoUrl: '/videos/legends.mp4'
    }
  ]

  // Simulate audio data for visualizer
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setAudioData(Array.from({ length: 32 }, () => Math.random()))
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  const handleTrackSelect = (track) => {
    setCurrentTrack(track)
    setShowVideo(track.hasVideo)
    setIsPlaying(true)
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleNext = () => {
    if (currentTrack) {
      const currentIndex = tracks.findIndex(t => t.id === currentTrack.id)
      const nextTrack = tracks[(currentIndex + 1) % tracks.length]
      setCurrentTrack(nextTrack)
      setShowVideo(nextTrack.hasVideo)
    }
  }

  const handlePrevious = () => {
    if (currentTrack) {
      const currentIndex = tracks.findIndex(t => t.id === currentTrack.id)
      const prevTrack = tracks[(currentIndex - 1 + tracks.length) % tracks.length]
      setCurrentTrack(prevTrack)
      setShowVideo(prevTrack.hasVideo)
    }
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#4f46e5" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7c3aed" />
        
        <MusicVisualizer isPlaying={isPlaying} audioData={audioData} />
        
        {showVideo && currentTrack?.videoUrl && (
          <VideoPlayer3D 
            videoUrl={currentTrack.videoUrl} 
            position={[0, 0, -5]} 
            isActive={isPlaying}
          />
        )}
      </Canvas>

      {/* UI Overlay */}
      <div className="fixed inset-0 pointer-events-none z-20">
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
          <motion.div className="flex items-center space-x-4">
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2">
              <span className="text-white font-semibold">🎵 Music Hub</span>
            </div>
          </motion.div>
          
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowVideo(!showVideo)}
              className={`px-4 py-2 rounded-xl transition-all ${
                showVideo 
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' 
                  : 'bg-black/20 text-white/70 border border-white/10 hover:bg-white/10'
              }`}
            >
              📺 Video Mode
            </motion.button>
          </div>
        </div>

        {/* Bottom Player */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
          <MusicPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </div>

        {/* Side Panel */}
        <div className="absolute top-20 right-4 bottom-20 w-80 pointer-events-auto">
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl h-full overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-white/10">
              {[
                { id: 'library', label: 'Library', icon: '🎵' },
                { id: 'social', label: 'Social', icon: '👥' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-300 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div className="p-4 h-full overflow-y-auto">
              {activeTab === 'library' && (
                <MusicLibrary onTrackSelect={handleTrackSelect} tracks={tracks} />
              )}
              {activeTab === 'social' && (
                <SocialFeatures currentTrack={currentTrack} isPlaying={isPlaying} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}