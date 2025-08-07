import React, { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, List } from 'lucide-react'

interface YouTubeTrack {
  id: string
  title: string
  videoId: string
  duration: string
  thumbnail: string
}

interface YouTubePlayerProps {
  playlist?: YouTubeTrack[]
  onTrackChange?: (track: YouTubeTrack) => void
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  playlist = [], 
  onTrackChange 
}) => {
  const playerRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [volume, setVolume] = useState(100)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)

  // Default Scottish music playlist if none provided
  const defaultPlaylist: YouTubeTrack[] = [
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
      title: 'The Proclaimers - 500 Miles',
      videoId: 'tbNlMtqrYS0',
      duration: '3:38',
      thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg'
    },
    {
      id: '4',
      title: 'Lewis Capaldi - Someone You Loved',
      videoId: 'zABzlMbD4gI',
      duration: '3:22',
      thumbnail: 'https://img.youtube.com/vi/zABzlMbD4gI/hqdefault.jpg'
    }
  ]

  const activePlaylist = playlist.length > 0 ? playlist : defaultPlaylist
  const currentTrackData = activePlaylist[currentTrack]

  useEffect(() => {
    // Load YouTube IFrame API
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag)

    window.onYouTubeIframeAPIReady = () => {
      setIsReady(true)
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (isReady && currentTrackData && !playerRef.current) {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '200',
        width: '100%',
        videoId: currentTrackData.videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube player ready')
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true)
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false)
            } else if (event.data === window.YT.PlayerState.ENDED) {
              nextTrack()
            }
          }
        }
      })
    }
  }, [isReady, currentTrackData])

  // Update progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && isPlaying) {
        const currentTime = playerRef.current.getCurrentTime()
        const duration = playerRef.current.getDuration()
        setCurrentTime(currentTime)
        setDuration(duration)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying])

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
    }
  }

  const nextTrack = () => {
    const nextIndex = (currentTrack + 1) % activePlaylist.length
    setCurrentTrack(nextIndex)
    if (playerRef.current) {
      playerRef.current.loadVideoById(activePlaylist[nextIndex].videoId)
    }
    onTrackChange?.(activePlaylist[nextIndex])
  }

  const previousTrack = () => {
    const prevIndex = currentTrack === 0 ? activePlaylist.length - 1 : currentTrack - 1
    setCurrentTrack(prevIndex)
    if (playerRef.current) {
      playerRef.current.loadVideoById(activePlaylist[prevIndex].videoId)
    }
    onTrackChange?.(activePlaylist[prevIndex])
  }

  const setVolumeLevel = (newVolume: number) => {
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video Player (Hidden) */}
      <div className="hidden">
        <div id="youtube-player"></div>
      </div>

      {/* Player UI */}
      <div className="glass-card p-6">
        {/* Current Track Display */}
        {currentTrackData && (
          <div className="flex items-center space-x-4 mb-6">
            <img
              src={currentTrackData.thumbnail}
              alt={currentTrackData.title}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">
                {currentTrackData.title}
              </h3>
              <p className="text-gray-400">Duration: {currentTrackData.duration}</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button 
            onClick={previousTrack}
            className="btn-icon hover:bg-white/20"
            disabled={!isReady}
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="btn-icon w-16 h-16 bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
            disabled={!isReady}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </button>
          
          <button 
            onClick={nextTrack}
            className="btn-icon hover:bg-white/20"
            disabled={!isReady}
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
            onChange={(e) => setVolumeLevel(parseInt(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-full appearance-none volume-slider"
          />
          <span className="text-sm text-gray-400 w-8">{volume}%</span>
        </div>

        {/* Playlist */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center space-x-2 mb-3">
            <List className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-400">PLAYLIST</span>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activePlaylist.map((track, index) => (
              <div
                key={track.id}
                onClick={() => {
                  setCurrentTrack(index)
                  if (playerRef.current) {
                    playerRef.current.loadVideoById(track.videoId)
                  }
                }}
                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  index === currentTrack
                    ? 'bg-blue-500/20 border border-blue-500/50'
                    : 'hover:bg-white/5'
                }`}
              >
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    index === currentTrack ? 'text-blue-400' : 'text-white'
                  }`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-500">{track.duration}</p>
                </div>
                {index === currentTrack && isPlaying && (
                  <div className="flex space-x-1">
                    <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" />
                    <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default YouTubePlayer