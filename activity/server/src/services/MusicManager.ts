export interface Track {
  id: string
  title: string
  artist?: string
  url: string
  duration?: number
  thumbnail?: string
  added_by: string
  added_at: Date
}

export interface MusicStatus {
  playing: boolean
  current_track: Track | null
  queue: Track[]
  volume: number
  position: number
  repeat: 'none' | 'track' | 'queue'
  shuffle: boolean
}

export interface RoomMusicState extends MusicStatus {
  isPlaying: boolean
  playlist: Track[]
  currentTime: number
  totalDuration: number
}

export class MusicManager {
  private roomStates: Map<string, MusicStatus> = new Map()

  private getOrCreateRoomState(roomId: string): MusicStatus {
    if (!this.roomStates.has(roomId)) {
      this.roomStates.set(roomId, {
        playing: false,
        current_track: null,
        queue: [],
        volume: 50,
        position: 0,
        repeat: 'none',
        shuffle: false
      })
    }
    return this.roomStates.get(roomId)!
  }

  getRoomState(roomId: string): RoomMusicState {
    const state = this.getOrCreateRoomState(roomId)
    return {
      ...state,
      isPlaying: state.playing,
      playlist: [...state.queue],
      currentTime: state.position,
      totalDuration: state.current_track?.duration || 0
    }
  }

  async playTrack(roomId: string, data: { url: string; title?: string; duration?: number }, userId: string): Promise<RoomMusicState> {
    const state = this.getOrCreateRoomState(roomId)
    
    const track: Track = {
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title || 'Unknown Track',
      url: data.url,
      duration: data.duration,
      added_by: userId,
      added_at: new Date()
    }

    state.current_track = track
    state.playing = true
    state.position = 0
    
    console.log(`Track playing in room ${roomId}: ${track.title}`)
    return this.getRoomState(roomId)
  }

  async pauseTrack(roomId: string, userId: string): Promise<RoomMusicState> {
    const state = this.getOrCreateRoomState(roomId)
    state.playing = false
    console.log(`Playback paused in room ${roomId} by ${userId}`)
    return this.getRoomState(roomId)
  }

  async resumeTrack(roomId: string, userId: string): Promise<RoomMusicState> {
    const state = this.getOrCreateRoomState(roomId)
    if (state.current_track) {
      state.playing = true
      console.log(`Playback resumed in room ${roomId} by ${userId}`)
    }
    return this.getRoomState(roomId)
  }

  async seekTrack(roomId: string, position: number, userId: string): Promise<RoomMusicState> {
    const state = this.getOrCreateRoomState(roomId)
    state.position = Math.max(0, position)
    console.log(`Seek to ${position}s in room ${roomId} by ${userId}`)
    return this.getRoomState(roomId)
  }

  async setVolume(roomId: string, volume: number, userId: string): Promise<RoomMusicState> {
    const state = this.getOrCreateRoomState(roomId)
    state.volume = Math.max(0, Math.min(100, volume))
    console.log(`Volume set to ${state.volume}% in room ${roomId} by ${userId}`)
    return this.getRoomState(roomId)
  }

  async addToPlaylist(roomId: string, data: { url: string; title?: string; duration?: number }, userId: string): Promise<Track[]> {
    const state = this.getOrCreateRoomState(roomId)
    
    const track: Track = {
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title || 'Unknown Track',
      url: data.url,
      duration: data.duration,
      added_by: userId,
      added_at: new Date()
    }

    state.queue.push(track)
    console.log(`Track added to playlist in room ${roomId}: ${track.title}`)
    return [...state.queue]
  }

  async removeFromPlaylist(roomId: string, index: number, userId: string): Promise<Track[]> {
    const state = this.getOrCreateRoomState(roomId)
    
    if (index >= 0 && index < state.queue.length) {
      const removed = state.queue.splice(index, 1)[0]
      console.log(`Track removed from playlist in room ${roomId}: ${removed.title}`)
    }
    
    return [...state.queue]
  }

  stopRoom(roomId: string): void {
    this.roomStates.delete(roomId)
    console.log(`Music stopped for room ${roomId}`)
  }

  // Legacy methods for backwards compatibility
  getStatus(): MusicStatus {
    // Return default room state for backwards compatibility
    return this.getOrCreateRoomState('default')
  }

  addTrack(track: Omit<Track, 'id' | 'added_at'>): Track {
    const state = this.getOrCreateRoomState('default')
    const newTrack: Track = {
      ...track,
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      added_at: new Date()
    }

    state.queue.push(newTrack)
    console.log(`Track added to queue: ${newTrack.title}`)
    return newTrack
  }

  removeTrack(trackId: string): boolean {
    const state = this.getOrCreateRoomState('default')
    const index = state.queue.findIndex(track => track.id === trackId)
    
    if (index === -1) {
      return false
    }

    const removed = state.queue.splice(index, 1)[0]
    console.log(`Track removed from queue: ${removed.title}`)
    return true
  }

  play(): boolean {
    const state = this.getOrCreateRoomState('default')
    if (!state.current_track && state.queue.length > 0) {
      state.current_track = state.queue.shift()!
    }

    if (state.current_track) {
      state.playing = true
      console.log(`Now playing: ${state.current_track.title}`)
      return true
    }

    return false
  }

  pause(): void {
    const state = this.getOrCreateRoomState('default')
    state.playing = false
    console.log('Playback paused')
  }

  stop(): void {
    const state = this.getOrCreateRoomState('default')
    state.playing = false
    state.current_track = null
    state.position = 0
    console.log('Playback stopped')
  }

  skip(): boolean {
    const state = this.getOrCreateRoomState('default')
    if (state.queue.length > 0) {
      state.current_track = state.queue.shift()!
      state.position = 0
      console.log(`Skipped to: ${state.current_track.title}`)
      return true
    } else {
      this.stop()
      return false
    }
  }

  setGlobalVolume(volume: number): void {
    const state = this.getOrCreateRoomState('default')
    state.volume = Math.max(0, Math.min(100, volume))
    console.log(`Volume set to: ${state.volume}%`)
  }

  setRepeat(mode: MusicStatus['repeat']): void {
    const state = this.getOrCreateRoomState('default')
    state.repeat = mode
    console.log(`Repeat mode: ${mode}`)
  }

  setShuffle(enabled: boolean): void {
    const state = this.getOrCreateRoomState('default')
    state.shuffle = enabled
    
    if (enabled) {
      // Shuffle the queue
      for (let i = state.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]]
      }
    }
    
    console.log(`Shuffle: ${enabled ? 'enabled' : 'disabled'}`)
  }

  clearQueue(): void {
    const state = this.getOrCreateRoomState('default')
    state.queue = []
    console.log('Queue cleared')
  }

  getQueue(): Track[] {
    const state = this.getOrCreateRoomState('default')
    return [...state.queue]
  }

  getCurrentTrack(): Track | null {
    const state = this.getOrCreateRoomState('default')
    return state.current_track
  }
}