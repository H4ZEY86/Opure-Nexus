import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipForward, SkipBack, Volume2, ExternalLink } from 'lucide-react'

interface Track {
  id: string
  title: string
  videoId: string
  duration: string
  thumbnail: string
}

interface SimplePlayerProps {
  playlist: Track[]
  onTrackChange?: (track: Track) => void
}

export const SimplePlayer: React.FC<SimplePlayerProps> = ({ 
  playlist = [], 
  onTrackChange 
}) => {
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(100)

  const track = playlist[currentTrack]
  if (!track) return null

  const nextTrack = () => {
    const next = (currentTrack + 1) % playlist.length
    setCurrentTrack(next)
    onTrackChange?.(playlist[next])
    console.log('▶️ Next track:', playlist[next].title)
  }

  const prevTrack = () => {
    const prev = currentTrack === 0 ? playlist.length - 1 : currentTrack - 1
    setCurrentTrack(prev)
    onTrackChange?.(playlist[prev])
    console.log('⏮️ Previous track:', playlist[prev].title)
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    console.log(isPlaying ? '⏸️ Paused' : '▶️ Playing:', track.title)
  }

  const openYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${track.videoId}`, '_blank')
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass-card p-6">
        {/* Current Track Display */}
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={openYouTube}
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              {track.title}
            </h3>
            <p className="text-gray-400 mb-2">Duration: {track.duration}</p>
            <button
              onClick={openYouTube}
              className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in YouTube</span>
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white mb-1">
              {currentTrack + 1} / {playlist.length}
            </div>
            <div className="text-sm text-gray-400">Track</div>
          </div>
        </div>

        {/* Progress Bar (Visual Only) */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div 
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: isPlaying ? '100%' : '20%' }}
              transition={{ duration: isPlaying ? 30 : 2, ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>0:00</span>
            <span>{track.duration}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button 
            onClick={prevTrack}
            className="btn-icon hover:bg-white/20"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="btn-icon w-16 h-16 bg-blue-500 hover:bg-blue-600"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
          
          <button 
            onClick={nextTrack}
            className="btn-icon hover:bg-white/20"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3 mb-6">
          <Volume2 className="w-5 h-5 text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-full appearance-none volume-slider"
          />
          <span className="text-sm text-gray-400 w-8">{volume}%</span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border border-green-500/30">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm text-white">
            {isPlaying ? `Now Playing: ${track.title}` : 'Paused - Click play to start'}
          </span>
        </div>

        {/* Quick YouTube Access */}
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-gray-300 mb-2">
            🎵 For full audio experience, click "Open in YouTube" or use YouTube app
          </p>
          <div className="flex space-x-2">
            <button
              onClick={openYouTube}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
            >
              YouTube
            </button>
            <button
              onClick={() => window.open(`https://music.youtube.com/watch?v=${track.videoId}`, '_blank')}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
            >
              YouTube Music
            </button>
          </div>
        </div>
      </div>

      {/* Playlist */}
      <div className="mt-6 glass-card p-4">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
          <span>Playlist</span>
          <div className="text-sm text-gray-400">({playlist.length} tracks)</div>
        </h4>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {playlist.map((playlistTrack, index) => (
            <div
              key={playlistTrack.id}
              onClick={() => {
                setCurrentTrack(index)
                onTrackChange?.(playlistTrack)
                console.log('🎵 Selected track:', playlistTrack.title)
              }}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                index === currentTrack
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'hover:bg-white/5'
              }`}
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
              <div className="text-sm text-gray-400">
                {index + 1}
              </div>
              {index === currentTrack && (
                <div className="flex space-x-1">
                  {isPlaying ? (
                    <div className="flex space-x-1">
                      <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" />
                      <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  ) : (
                    <Play className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SimplePlayer