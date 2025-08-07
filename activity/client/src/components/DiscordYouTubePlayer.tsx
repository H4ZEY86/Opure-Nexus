import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipForward, SkipBack, Volume2, Users, ExternalLink } from 'lucide-react'
import { useDiscord } from '../contexts/DiscordContext'

interface Track {
  id: string
  title: string
  videoId: string
  duration: string
  thumbnail: string
}

interface DiscordYouTubePlayerProps {
  playlist: Track[]
  onTrackChange?: (track: Track) => void
}

export const DiscordYouTubePlayer: React.FC<DiscordYouTubePlayerProps> = ({ 
  playlist = [], 
  onTrackChange 
}) => {
  const { discordSdk, user } = useDiscord()
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(100)
  const [participants, setParticipants] = useState<any[]>([])

  const track = playlist[currentTrack]

  useEffect(() => {
    if (discordSdk) {
      // Try to get participants for Watch Together
      const getParticipants = async () => {
        try {
          const result = await discordSdk.commands.getInstanceConnectedParticipants()
          console.log('🎵 Activity participants:', result?.participants?.length || 0)
          setParticipants(result?.participants || [])
        } catch (error) {
          console.log('ℹ️ Could not get participants for Watch Together')
        }
      }
      getParticipants()
    }
  }, [discordSdk])

  const startWatchTogether = async () => {
    if (!track || !discordSdk) return
    
    try {
      console.log('🎵 Starting Discord Watch Together for:', track.title)
      
      // Use Discord's Watch Together API
      const result = await discordSdk.commands.startActivity({
        activity: {
          type: 3, // WATCHING
          name: track.title,
          url: `https://www.youtube.com/watch?v=${track.videoId}`,
          details: 'Listening together',
          state: `Track ${currentTrack + 1} of ${playlist.length}`,
          assets: {
            large_image: track.thumbnail,
            large_text: track.title
          },
          party: {
            id: `opure-music-${Date.now()}`,
            size: [participants.length + 1, 10]
          },
          timestamps: {
            start: Date.now()
          }
        }
      })
      
      console.log('✅ Watch Together started:', result)
      setIsPlaying(true)
      
    } catch (error) {
      console.log('⚠️ Watch Together not available, using direct YouTube link')
      // Fallback to opening YouTube
      window.open(`https://www.youtube.com/watch?v=${track.videoId}`, '_blank')
      setIsPlaying(true)
    }
  }

  const nextTrack = () => {
    const next = (currentTrack + 1) % playlist.length
    setCurrentTrack(next)
    onTrackChange?.(playlist[next])
    setIsPlaying(false) // Reset play state for new track
  }

  const prevTrack = () => {
    const prev = currentTrack === 0 ? playlist.length - 1 : currentTrack - 1
    setCurrentTrack(prev)
    onTrackChange?.(playlist[prev])
    setIsPlaying(false) // Reset play state for new track
  }

  if (!track) return null

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass-card p-6">
        {/* Current Track Display */}
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-24 h-24 rounded-lg object-cover shadow-lg"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              {track.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Duration: {track.duration}</span>
              <span>•</span>
              <span>Track {currentTrack + 1} of {playlist.length}</span>
              {participants.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{participants.length + 1} listening</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-3">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: isPlaying ? '100%' : '5%' }}
              transition={{ duration: isPlaying ? 180 : 1, ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>0:00</span>
            <span>{track.duration}</span>
          </div>
        </div>

        {/* Main Play Button */}
        <div className="text-center mb-6">
          {!isPlaying ? (
            <button
              onClick={startWatchTogether}
              className="group relative px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <Play className="w-6 h-6" />
                <span className="text-lg">Watch Together on YouTube</span>
                <Users className="w-5 h-5" />
              </div>
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <div className="p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl border border-green-500/30">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white font-medium">Now Playing: {track.title}</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-4 bg-green-500 rounded animate-pulse" />
                  <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-center space-x-6 mb-6">
          <button 
            onClick={prevTrack}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <SkipBack className="w-5 h-5" />
            <span className="text-sm">Previous</span>
          </button>
          
          <div className="px-4 py-2 bg-blue-500/20 rounded-lg border border-blue-500/50">
            <span className="text-blue-400 font-medium">
              {currentTrack + 1} / {playlist.length}
            </span>
          </div>
          
          <button 
            onClick={nextTrack}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <span className="text-sm">Next</span>
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Alternative Links */}
        <div className="flex justify-center space-x-3 mb-4">
          <button
            onClick={() => window.open(`https://www.youtube.com/watch?v=${track.videoId}`, '_blank')}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">YouTube</span>
          </button>
          <button
            onClick={() => window.open(`https://music.youtube.com/watch?v=${track.videoId}`, '_blank')}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">YT Music</span>
          </button>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-400">
          <p>🎵 Click "Watch Together" to start synchronized playback with voice channel participants</p>
          <p className="mt-1">Or use the YouTube links for individual listening</p>
        </div>
      </div>

      {/* Playlist */}
      <div className="mt-6 glass-card p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <span>Playlist</span>
          <div className="text-sm text-gray-400">({playlist.length} tracks)</div>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {playlist.map((playlistTrack, index) => (
            <motion.div
              key={playlistTrack.id}
              onClick={() => {
                setCurrentTrack(index)
                onTrackChange?.(playlistTrack)
                setIsPlaying(false)
              }}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                index === currentTrack
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'hover:bg-white/5'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                src={playlistTrack.thumbnail}
                alt={playlistTrack.title}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${
                  index === currentTrack ? 'text-blue-400 font-medium' : 'text-white'
                }`}>
                  {playlistTrack.title}
                </p>
                <p className="text-xs text-gray-500">{playlistTrack.duration}</p>
              </div>
              <div className="text-xs text-gray-400 px-2 py-1 bg-white/10 rounded">
                #{index + 1}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DiscordYouTubePlayer