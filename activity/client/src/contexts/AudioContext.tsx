import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface Track {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string
  youtubeId: string
  audioUrl?: string
}

interface Playlist {
  id: string
  name: string
  tracks: Track[]
  createdBy: string
  isPublic: boolean
}

interface AudioContextType {
  // Playback State
  currentTrack: Track | null
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  volume: number
  
  // Playlist State
  currentPlaylist: Playlist | null
  playlists: Playlist[]
  queue: Track[]
  
  // Visualizer Data
  audioData: Uint8Array | null
  isVisualizerActive: boolean
  
  // Player Controls
  play: (track?: Track) => Promise<void>
  pause: () => void
  stop: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  
  // Playlist Management
  createPlaylist: (name: string) => Promise<Playlist>
  addToPlaylist: (playlistId: string, track: Track) => void
  removeFromPlaylist: (playlistId: string, trackId: string) => void
  loadPlaylist: (playlist: Playlist) => void
  
  // Queue Management
  addToQueue: (track: Track) => void
  removeFromQueue: (trackId: string) => void
  clearQueue: () => void
  
  // Visualizer
  toggleVisualizer: () => void
  
  // DJ Mode
  isDjMode: boolean
  toggleDjMode: () => void
  crossfadeValue: number
  setCrossfadeValue: (value: number) => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}

interface AudioProviderProps {
  children: ReactNode
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  // Audio State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  
  // Playlist State
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  
  // Visualizer State
  const [audioData, setAudioData] = useState<Uint8Array | null>(null)
  const [isVisualizerActive, setIsVisualizerActive] = useState(false)
  
  // DJ Mode State
  const [isDjMode, setIsDjMode] = useState(false)
  const [crossfadeValue, setCrossfadeValue] = useState(0)
  
  // Audio References
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const socketRef = useRef<Socket | null>(null)
  
  // Initialize Audio Context and Socket Connection
  useEffect(() => {
    // Initialize Web Audio API for visualizer
    const initAudioContext = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        
        audioContextRef.current = audioCtx
        analyserRef.current = analyser
      } catch (error) {
        console.warn('Web Audio API not supported:', error)
      }
    }
    
    // Initialize Socket.IO connection - Temporarily disabled for Discord Activity
    const initSocket = () => {
      // WebSocket/Socket.IO not supported in current serverless API setup
      console.log('🔌 Audio WebSocket connection disabled for Discord Activity compatibility')
      return
      
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
        autoConnect: true,
      })
      
      socket.on('connect', () => {
        console.log('Connected to audio server')
      })
      
      socket.on('playlistUpdate', (playlist: Playlist) => {
        setPlaylists(prev => {
          const index = prev.findIndex(p => p.id === playlist.id)
          if (index >= 0) {
            const newPlaylists = [...prev]
            newPlaylists[index] = playlist
            return newPlaylists
          }
          return [...prev, playlist]
        })
      })
      
      socketRef.current = socket
    }
    
    initAudioContext()
    initSocket()
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])
  
  // Audio Visualizer Effect
  useEffect(() => {
    if (!isVisualizerActive || !analyserRef.current) return
    
    const updateAudioData = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)
        setAudioData(dataArray)
      }
      
      if (isVisualizerActive) {
        requestAnimationFrame(updateAudioData)
      }
    }
    
    updateAudioData()
  }, [isVisualizerActive])
  
  // Player Controls
  const play = async (track?: Track) => {
    if (track) {
      setCurrentTrack(track)
      // Here you would integrate with YouTube API or your audio streaming service
      // For now, we'll simulate audio playback
    }
    
    if (audioRef.current) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
        setIsPaused(false)
      } catch (error) {
        console.error('Failed to play audio:', error)
      }
    }
  }
  
  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setIsPaused(true)
    }
  }
  
  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentTime(0)
    }
  }
  
  const next = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0]
      setQueue(prev => prev.slice(1))
      play(nextTrack)
    }
  }
  
  const previous = () => {
    // Implementation for previous track
    console.log('Previous track')
  }
  
  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }
  
  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }
  
  // Playlist Management
  const createPlaylist = async (name: string): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      name,
      tracks: [],
      createdBy: 'current_user',
      isPublic: false,
    }
    
    setPlaylists(prev => [...prev, newPlaylist])
    
    // Emit to server for persistence
    if (socketRef.current) {
      socketRef.current.emit('createPlaylist', newPlaylist)
    }
    
    return newPlaylist
  }
  
  const addToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev => prev.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, tracks: [...playlist.tracks, track] }
        : playlist
    ))
    
    if (socketRef.current) {
      socketRef.current.emit('addToPlaylist', { playlistId, track })
    }
  }
  
  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, tracks: playlist.tracks.filter(t => t.id !== trackId) }
        : playlist
    ))
    
    if (socketRef.current) {
      socketRef.current.emit('removeFromPlaylist', { playlistId, trackId })
    }
  }
  
  const loadPlaylist = (playlist: Playlist) => {
    setCurrentPlaylist(playlist)
    setQueue(playlist.tracks)
  }
  
  // Queue Management
  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track])
  }
  
  const removeFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(t => t.id !== trackId))
  }
  
  const clearQueue = () => {
    setQueue([])
  }
  
  // Visualizer
  const toggleVisualizer = () => {
    setIsVisualizerActive(prev => !prev)
  }
  
  // DJ Mode
  const toggleDjMode = () => {
    setIsDjMode(prev => !prev)
  }
  
  const value: AudioContextType = {
    // Playback State
    currentTrack,
    isPlaying,
    isPaused,
    currentTime,
    duration,
    volume,
    
    // Playlist State
    currentPlaylist,
    playlists,
    queue,
    
    // Visualizer Data
    audioData,
    isVisualizerActive,
    
    // Player Controls
    play,
    pause,
    stop,
    next,
    previous,
    seek,
    setVolume,
    
    // Playlist Management
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    loadPlaylist,
    
    // Queue Management
    addToQueue,
    removeFromQueue,
    clearQueue,
    
    // Visualizer
    toggleVisualizer,
    
    // DJ Mode
    isDjMode,
    toggleDjMode,
    crossfadeValue,
    setCrossfadeValue,
  }
  
  return (
    <AudioContext.Provider value={value}>
      {children}
      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={next}
        style={{ display: 'none' }}
      />
    </AudioContext.Provider>
  )
}