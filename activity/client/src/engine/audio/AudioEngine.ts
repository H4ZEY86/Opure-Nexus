/**
 * Audio Engine for Discord Activity Games
 * Handles sound effects, music, and spatial audio
 */

export interface AudioConfig {
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  spatialAudio: boolean
}

export interface Sound {
  id: string
  buffer: AudioBuffer
  loop: boolean
  volume: number
  category: 'sfx' | 'music' | 'voice'
}

export class AudioEngine {
  private context: AudioContext
  private masterGain: GainNode
  private sfxGain: GainNode
  private musicGain: GainNode
  private sounds: Map<string, Sound> = new Map()
  private activeSources: Map<string, AudioBufferSourceNode> = new Map()
  private config: AudioConfig

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = {
      masterVolume: 1.0,
      sfxVolume: 0.8,
      musicVolume: 0.6,
      spatialAudio: true,
      ...config
    }

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.setupGainNodes()
  }

  private setupGainNodes() {
    this.masterGain = this.context.createGain()
    this.sfxGain = this.context.createGain()
    this.musicGain = this.context.createGain()

    this.masterGain.gain.value = this.config.masterVolume
    this.sfxGain.gain.value = this.config.sfxVolume
    this.musicGain.gain.value = this.config.musicVolume

    this.sfxGain.connect(this.masterGain)
    this.musicGain.connect(this.masterGain)
    this.masterGain.connect(this.context.destination)
  }

  public async loadSound(id: string, url: string, category: 'sfx' | 'music' | 'voice' = 'sfx', loop: boolean = false): Promise<void> {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer)

      this.sounds.set(id, {
        id,
        buffer: audioBuffer,
        loop,
        volume: 1.0,
        category
      })
    } catch (error) {
      console.error(`Failed to load sound ${id}:`, error)
    }
  }

  public playSound(id: string, volume: number = 1.0, playbackRate: number = 1.0): string | null {
    const sound = this.sounds.get(id)
    if (!sound) {
      console.warn(`Sound ${id} not found`)
      return null
    }

    const source = this.context.createBufferSource()
    const gainNode = this.context.createGain()
    
    source.buffer = sound.buffer
    source.loop = sound.loop
    source.playbackRate.value = playbackRate
    gainNode.gain.value = volume * sound.volume

    // Connect to appropriate gain node
    const targetGain = sound.category === 'music' ? this.musicGain : this.sfxGain
    source.connect(gainNode)
    gainNode.connect(targetGain)

    const instanceId = `${id}_${Date.now()}_${Math.random()}`
    this.activeSources.set(instanceId, source)

    source.onended = () => {
      this.activeSources.delete(instanceId)
    }

    source.start()
    return instanceId
  }

  public stopSound(instanceId: string) {
    const source = this.activeSources.get(instanceId)
    if (source) {
      source.stop()
      this.activeSources.delete(instanceId)
    }
  }

  public stopAllSounds() {
    this.activeSources.forEach((source, id) => {
      source.stop()
    })
    this.activeSources.clear()
  }

  public setMasterVolume(volume: number) {
    this.config.masterVolume = Math.max(0, Math.min(1, volume))
    this.masterGain.gain.value = this.config.masterVolume
  }

  public setSfxVolume(volume: number) {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume))
    this.sfxGain.gain.value = this.config.sfxVolume
  }

  public setMusicVolume(volume: number) {
    this.config.musicVolume = Math.max(0, Math.min(1, volume))
    this.musicGain.gain.value = this.config.musicVolume
  }

  public createSpatialSound(id: string, x: number, y: number, z: number = 0): string | null {
    if (!this.config.spatialAudio) {
      return this.playSound(id)
    }

    const sound = this.sounds.get(id)
    if (!sound) return null

    const source = this.context.createBufferSource()
    const panner = this.context.createPanner()
    const gainNode = this.context.createGain()

    source.buffer = sound.buffer
    source.loop = sound.loop
    gainNode.gain.value = sound.volume

    // Configure spatial audio
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 10000
    panner.rolloffFactor = 1
    panner.coneInnerAngle = 360
    panner.coneOuterAngle = 0
    panner.coneOuterGain = 0
    panner.positionX.value = x
    panner.positionY.value = y
    panner.positionZ.value = z

    const targetGain = sound.category === 'music' ? this.musicGain : this.sfxGain
    source.connect(gainNode)
    gainNode.connect(panner)
    panner.connect(targetGain)

    const instanceId = `spatial_${id}_${Date.now()}`
    this.activeSources.set(instanceId, source)

    source.onended = () => {
      this.activeSources.delete(instanceId)
    }

    source.start()
    return instanceId
  }

  public updateListenerPosition(x: number, y: number, z: number = 0) {
    if (this.context.listener.positionX) {
      this.context.listener.positionX.value = x
      this.context.listener.positionY.value = y
      this.context.listener.positionZ.value = z
    }
  }

  public suspend() {
    return this.context.suspend()
  }

  public resume() {
    return this.context.resume()
  }

  public getConfig(): AudioConfig {
    return { ...this.config }
  }

  public destroy() {
    this.stopAllSounds()
    this.context.close()
  }
}