import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Music as MusicIcon, PlayCircle, Radio, Headphones } from 'lucide-react'
import YouTubePlayer from '../components/YouTubePlayer'
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

  // Default Scottish/Gaming playlist
  const defaultPlaylists: Playlist[] = [
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
        },
        {
          id: '2',
          title: 'Robbery - Juice WRLD',
          videoId: 'iI34LYmJ1Fs',
          duration: '4:03',
          thumbnail: 'https://img.youtube.com/vi/iI34LYmJ1Fs/hqdefault.jpg'
        },
        {
          id: '3',
          title: 'All Girls Are The Same - Juice WRLD',
          videoId: 'h3h3Y-4qk-g',
          duration: '2:45',
          thumbnail: 'https://img.youtube.com/vi/h3h3Y-4qk-g/hqdefault.jpg'
        },
        {
          id: '4',
          title: 'Bandit (with YoungBoy Never Broke Again) - Juice WRLD',
          videoId: 'ySw57tDQPcQ',
          duration: '3:44',
          thumbnail: 'https://img.youtube.com/vi/ySw57tDQPcQ/hqdefault.jpg'
        }
      ]
    },
    {
      id: 'scottish-vibes',
      name: 'Scottish Vibes',
      thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg',
      tracks: [
        {
          id: '5',
          title: 'The Proclaimers - 500 Miles',
          videoId: 'tbNlMtqrYS0',
          duration: '3:38',
          thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg'
        },
        {
          id: '6',
          title: 'Lewis Capaldi - Someone You Loved',
          videoId: 'zABzlMbD4gI',
          duration: '3:22',
          thumbnail: 'https://img.youtube.com/vi/zABzlMbD4gI/hqdefault.jpg'
        },
        {
          id: '7',
          title: 'Simple Minds - Don\'t You Forget About Me',
          videoId: 'CdqoNKCCt7A',
          duration: '4:20',
          thumbnail: 'https://img.youtube.com/vi/CdqoNKCCt7A/hqdefault.jpg'
        },
        {
          id: '8',
          title: 'Bay City Rollers - Saturday Night',
          videoId: 'z0iCBnf8MIY',
          duration: '3:25',
          thumbnail: 'https://img.youtube.com/vi/z0iCBnf8MIY/hqdefault.jpg'
        }
      ]
    },
    {
      id: 'gaming-mix',
      name: 'Gaming Mix',
      thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
      tracks: [
        {
          id: '9',
          title: 'TheFatRat - Unity',
          videoId: 'fJ9rUzIMcZQ',
          duration: '4:08',
          thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg'
        },
        {
          id: '10',
          title: 'Alan Walker - Faded',
          videoId: '60ItHLz5WEA',
          duration: '3:32',
          thumbnail: 'https://img.youtube.com/vi/60ItHLz5WEA/hqdefault.jpg'
        },
        {
          id: '11',
          title: 'Marshmello - Alone',
          videoId: 'ALZHF5UqnU4',
          duration: '4:35',
          thumbnail: 'https://img.youtube.com/vi/ALZHF5UqnU4/hqdefault.jpg'
        },
        {
          id: '12',
          title: 'Skrillex - Bangarang',
          videoId: 'YJVmu6yttiw',
          duration: '3:35',
          thumbnail: 'https://img.youtube.com/vi/YJVmu6yttiw/hqdefault.jpg'
        }
      ]
    }
  ]

  useEffect(() => {
    loadPlaylists()
  }, [user])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      
      if (!user) {
        console.log('🎵 No user logged in, using default playlists')
        setPlaylists(defaultPlaylists)
        setCurrentPlaylist(defaultPlaylists[0].tracks)
        return
      }

      // Try to load user's playlists from bot
      try {
        console.log('🎵 Loading playlists for user:', user.id)
        const response = await fetch(buildApiUrl(`/api/music/playlists/${user.id}`))
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ User playlists loaded:', data.playlists?.length || 0)
          
          if (data.playlists && data.playlists.length > 0) {
            setPlaylists([...defaultPlaylists, ...data.playlists])
          } else {
            setPlaylists(defaultPlaylists)
          }
        } else {
          console.log('🎵 No user playlists found, using defaults')
          setPlaylists(defaultPlaylists)
        }
      } catch (apiError) {
        console.warn('⚠️ API not available, using default playlists:', apiError)
        setPlaylists(defaultPlaylists)
      }

      // Set first playlist as active
      setCurrentPlaylist(defaultPlaylists[0].tracks)
      
    } catch (error) {
      console.error('❌ Error loading playlists:', error)
      setPlaylists(defaultPlaylists)
      setCurrentPlaylist(defaultPlaylists[0].tracks)
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlists Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <div className="glass-card p-6 h-full">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <PlayCircle className="w-5 h-5 text-blue-500" />
              <span>Playlists</span>
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading playlists...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => selectPlaylist(playlist)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                        {playlist.name}
                      </p>
                      <p className="text-gray-400 text-sm">
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
          <YouTubePlayer 
            playlist={currentPlaylist}
            onTrackChange={handleTrackChange}
          />
          
          {currentTrack && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 glass-card"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-300">
                  Now playing: <span className="text-white font-medium">{currentTrack.title}</span>
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}