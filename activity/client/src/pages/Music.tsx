import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Music as MusicIcon, PlayCircle, Radio, Headphones, MessageCircle } from 'lucide-react'
import DiscordYouTubePlayer from '../components/DiscordYouTubePlayer'
import AIChat from '../components/AIChat'
import { useDiscord } from '../contexts/DiscordContext'
import { buildApiUrl } from '../config/api'

interface YouTubeTrack {
  id: string
  title: string
  videoId: string
  duration: string
  thumbnail: string
}

interface Playlist {
  id: string
  name: string
  tracks: YouTubeTrack[]
  thumbnail: string
}

export default function Music() {
  const { user } = useDiscord()
  const [currentPlaylist, setCurrentPlaylist] = useState<YouTubeTrack[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [currentTrack, setCurrentTrack] = useState<YouTubeTrack | null>(null)
  const [loading, setLoading] = useState(false)

  // Real playlist data will be loaded from bot database

  useEffect(() => {
    loadPlaylists()
  }, [user])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      
      console.log('🎵 Loading REAL playlists from bot database...')
      
      if (user) {
        // Get real playlists from bot database via API
        const response = await fetch(buildApiUrl(`/api/music/playlists/${user.id}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.playlists) {
            setPlaylists(data.playlists)
            setCurrentPlaylist(data.playlists[0]?.tracks || [])
            console.log('✅ REAL PLAYLISTS loaded:', data.playlists.length, 'playlists from', data.source)
            return
          }
        } else {
          console.warn('⚠️ Playlist API error:', response.status)
        }
      }
      
      // Fallback if no user or API fails
      const fallbackPlaylists = [
        {
          id: 'juice-wrld',
          name: 'Juice WRLD Essentials',
          thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
          tracks: [
            {
              id: '1',
              title: 'Lucid Dreams - Juice WRLD',
              videoId: 'mzB1VGllGMU',
              duration: '4:04',
              thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg'
            }
          ]
        }
      ]
      
      setPlaylists(fallbackPlaylists)
      setCurrentPlaylist(fallbackPlaylists[0].tracks)
      console.log('⚠️ Using fallback playlists')
      
    } catch (error) {
      console.error('❌ Error loading playlists:', error)
      
      // Emergency fallback
      const emergencyPlaylist = [{
        id: 'emergency',
        name: 'Emergency Playlist',
        thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
        tracks: [{
          id: '1',
          title: 'Lucid Dreams - Juice WRLD',
          videoId: 'mzB1VGllGMU', 
          duration: '4:04',
          thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg'
        }]
      }]
      
      setPlaylists(emergencyPlaylist)
      setCurrentPlaylist(emergencyPlaylist[0].tracks)
    } finally {
      setLoading(false)
    }
  }

  const selectPlaylist = (playlist: Playlist) => {
    console.log('🎵 Selected playlist:', playlist.name)
    setCurrentPlaylist(playlist.tracks)
  }

  const handleTrackChange = (track: YouTubeTrack) => {
    setCurrentTrack(track)
    console.log('🎵 Now playing:', track.title)
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center space-x-3 mb-2">
          <MusicIcon className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Opure Music</h1>
        </div>
        <p className="text-gray-300">
          {user ? `Welcome ${user.username}! ` : ''}Enjoy your music with AI-powered recommendations
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <PlayCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-white">{playlists.length}</p>
              <p className="text-gray-400 text-sm">Playlists</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <Radio className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-white">
                {playlists.reduce((total, playlist) => total + playlist.tracks.length, 0)}
              </p>
              <p className="text-gray-400 text-sm">Total Tracks</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <Headphones className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-white">Live</p>
              <p className="text-gray-400 text-sm">Status</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Playlists Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <div className="glass-card p-4 h-full">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <PlayCircle className="w-5 h-5 text-blue-500" />
              <span>Playlists</span>
            </h2>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-2 text-sm">Loading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => selectPlaylist(playlist)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors truncate">
                        {playlist.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {playlist.tracks.length} tracks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Music Player */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <DiscordYouTubePlayer 
            playlist={currentPlaylist}
            onTrackChange={handleTrackChange}
          />
        </motion.div>

        {/* AI Chat */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1"
        >
          <div className="glass-card h-[600px]">
            <AIChat />
          </div>
        </motion.div>
      </div>
    </div>
  )
}