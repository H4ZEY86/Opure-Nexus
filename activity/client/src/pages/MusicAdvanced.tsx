import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Shuffle, 
  Repeat,
  Heart,
  MoreVertical,
  Music,
  Video,
  Radio,
  Mic2,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  Zap,
  Bot,
  List,
  Users,
  Settings as SettingsIcon,
  Download
} from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContext'

// Mock YouTube data - in real app this would come from YouTube API
const mockVideos = [
  {
    id: '1',
    videoId: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up',
    artist: 'Rick Astley',
    duration: '3:33',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    views: '1.4B views'
  },
  {
    id: '2', 
    videoId: 'kJQP7kiw5Fk',
    title: 'Despacito ft. Daddy Yankee',
    artist: 'Luis Fonsi',
    duration: '4:42',
    thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
    views: '8.1B views'
  },
  {
    id: '3',
    videoId: 'fJ9rUzIMcZQ',
    title: 'Queen - Bohemian Rhapsody',
    artist: 'Queen',
    duration: '5:55',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg',
    views: '1.9B views'
  }
]

// EQ Component
function Equalizer({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) {
  const [bands, setBands] = useState([0, 0, 0, 0, 0, 0, 0, 0])
  const frequencies = ['32', '64', '125', '250', '500', '1K', '2K', '4K']

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed right-0 top-0 h-full w-80 bg-black/90 backdrop-blur-xl border-l border-white/10 z-50"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Equalizer</h3>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <PanelRightClose className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-white/80 mb-2">Presets</label>
                <select className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white">
                  <option>Custom</option>
                  <option>Rock</option>
                  <option>Pop</option>
                  <option>Jazz</option>
                  <option>Electronic</option>
                  <option>Bass Boost</option>
                </select>
              </div>

              {/* EQ Bands */}
              <div>
                <label className="block text-white/80 mb-4">Frequency Bands</label>
                <div className="flex space-x-2 items-end h-48">
                  {bands.map((value, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={value}
                        onChange={(e) => {
                          const newBands = [...bands]
                          newBands[index] = parseInt(e.target.value)
                          setBands(newBands)
                        }}
                        className="w-4 h-32 appearance-none bg-white/20 rounded-full slider-vertical"
                        style={{ writingMode: 'bt-lr' }}
                      />
                      <span className="text-xs text-white/60 mt-2">{frequencies[index]}</span>
                      <span className="text-xs text-white/40">{value > 0 ? '+' : ''}{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audio Effects */}
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Audio Effects</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-white/80">Bass Boost</span>
                    <input type="checkbox" className="w-4 h-4" />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-white/80">Vocal Enhancement</span>
                    <input type="checkbox" className="w-4 h-4" />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-white/80">3D Audio</span>
                    <input type="checkbox" className="w-4 h-4" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Queue Panel
function QueuePanel({ isVisible, queue, onClose }: { isVisible: boolean, queue: any[], onClose: () => void }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed right-0 top-0 h-full w-80 bg-black/90 backdrop-blur-xl border-l border-white/10 z-50"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Queue ({queue.length})</h3>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <PanelRightClose className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-auto">
              {queue.map((track, index) => (
                <div key={track.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 text-sm w-6">{index + 1}</span>
                  <img src={track.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    <p className="text-white/60 text-sm">{track.artist}</p>
                  </div>
                  <span className="text-white/40 text-sm">{track.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function MusicAdvanced() {
  const { user } = useDiscord()
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(75)
  const [progress, setProgress] = useState(0)
  const [queue, setQueue] = useState(mockVideos)
  const [showEQ, setShowEQ] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [djMode, setDjMode] = useState(false)
  const [videoMode, setVideoMode] = useState(true)
  const videoRef = useRef<HTMLIFrameElement>(null)

  const track = queue[currentTrack]

  // Simulate progress
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  const playInDiscord = async () => {
    if (!track || !user) return
    
    console.log('🎵 Playing in Discord voice channel:', track.title)
    setIsPlaying(true)
    
    try {
      const response = await fetch('https://api.opure.uk/api/music-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'play',
          query: track.title,
          userId: user.id,
          guildId: '1362815996557263049',
          videoId: track.videoId,
          title: track.title
        })
      })
      
      const result = await response.json()
      if (result.success) {
        console.log('✅ Audio playing in Discord!')
      }
    } catch (error) {
      console.log('⚠️ Discord audio failed:', error)
    }
  }

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      playInDiscord()
    }
  }

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % queue.length)
    setProgress(0)
  }

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev === 0 ? queue.length - 1 : prev - 1))
    setProgress(0)
  }

  const toggleDJMode = () => {
    setDjMode(!djMode)
    if (!djMode) {
      // Start AI DJ mode
      console.log('🤖 AI DJ Mode activated!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Music Hub</h1>
            <p className="text-white/60">Video + Audio Experience</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDJMode}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
                djMode 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <Bot className="w-5 h-5" />
              <span>AI DJ {djMode ? 'ON' : 'OFF'}</span>
            </button>
            
            <button
              onClick={() => setVideoMode(!videoMode)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
                videoMode 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {videoMode ? <Video className="w-5 h-5" /> : <Music className="w-5 h-5" />}
              <span>{videoMode ? 'Video' : 'Audio'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Player */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Video Player */}
            {videoMode && track && (
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
                <iframe
                  ref={videoRef}
                  src={`https://www.youtube.com/embed/${track.videoId}?autoplay=${isPlaying ? 1 : 0}&controls=0&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
                
                {/* Video Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold">{track.title}</h3>
                        <p className="text-white/70 text-sm">{track.artist}</p>
                      </div>
                      <button className="bg-white/20 backdrop-blur-sm p-3 rounded-full text-white hover:bg-white/30 transition-colors">
                        <Video className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Track Info & Controls */}
            <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={track?.thumbnail}
                  alt={track?.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">{track?.title}</h3>
                  <p className="text-white/60 mb-2">{track?.artist}</p>
                  <div className="flex items-center space-x-4 text-sm text-white/40">
                    <span>{track?.views}</span>
                    <span>•</span>
                    <span>{track?.duration}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress / 200) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-white/60">
                  <span>{Math.floor(progress / 60)}:{(progress % 60).toString().padStart(2, '0')}</span>
                  <span>{track?.duration}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center space-x-6 mb-6">
                <button className="p-2 text-white/60 hover:text-white transition-colors">
                  <Shuffle className="w-6 h-6" />
                </button>
                <button onClick={prevTrack} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                  <SkipBack className="w-6 h-6" />
                </button>
                <button 
                  onClick={togglePlay}
                  className="p-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-full text-white transition-all transform hover:scale-105"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
                <button onClick={nextTrack} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                  <SkipForward className="w-6 h-6" />
                </button>
                <button className="p-2 text-white/60 hover:text-white transition-colors">
                  <Repeat className="w-6 h-6" />
                </button>
              </div>

              {/* Secondary Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                    <Users className="w-5 h-5" />
                    <span className="text-sm">Discord Voice</span>
                  </button>
                  {djMode && (
                    <div className="flex items-center space-x-2 text-purple-400">
                      <Zap className="w-5 h-5" />
                      <span className="text-sm">AI DJ Active</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setVolume(volume === 0 ? 75 : 0)}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className="w-20 accent-purple-500"
                    />
                    <span className="text-white/40 text-sm w-8">{volume}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Control Tray */}
            <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Controls</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowEQ(true)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex flex-col items-center space-y-1"
                >
                  <Sliders className="w-6 h-6" />
                  <span className="text-xs">EQ</span>
                </button>
                <button 
                  onClick={() => setShowQueue(true)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex flex-col items-center space-y-1"
                >
                  <List className="w-6 h-6" />
                  <span className="text-xs">Queue</span>
                </button>
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex flex-col items-center space-y-1">
                  <Radio className="w-6 h-6" />
                  <span className="text-xs">Radio</span>
                </button>
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex flex-col items-center space-y-1">
                  <Mic2 className="w-6 h-6" />
                  <span className="text-xs">Karaoke</span>
                </button>
              </div>
            </div>

            {/* Queue Preview */}
            <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Up Next</h3>
                <button 
                  onClick={() => setShowQueue(true)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <PanelRightOpen className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                {queue.slice(currentTrack + 1, currentTrack + 4).map((track, index) => (
                  <div key={track.id} className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                    <span className="text-white/40 text-sm w-4">{index + 2}</span>
                    <img src={track.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{track.title}</p>
                      <p className="text-white/60 text-xs">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI DJ Status */}
            {djMode && (
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <h3 className="text-lg font-bold text-white">AI DJ Active</h3>
                </div>
                
                <div className="space-y-2 text-sm text-white/80">
                  <p>🎵 Analyzing your music taste...</p>
                  <p>🔍 Finding similar tracks...</p>
                  <p>📊 Optimizing for voice channel</p>
                </div>
                
                <button 
                  onClick={toggleDJMode}
                  className="w-full mt-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                >
                  Stop AI DJ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panels */}
      <Equalizer isVisible={showEQ} onClose={() => setShowEQ(false)} />
      <QueuePanel isVisible={showQueue} queue={queue} onClose={() => setShowQueue(false)} />
    </div>
  )
}