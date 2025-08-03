/**
 * COMPREHENSIVE PERFORMANCE MONITORING SYSTEM
 * Real-time performance tracking and optimization for Discord Activities
 * Features: FPS monitoring, memory tracking, network analysis, bottleneck detection
 */

import { EventEmitter } from '../../utils/EventEmitter'

export interface PerformanceMetrics {
  // Frame rate metrics
  fps: number
  frameTime: number
  frameDelta: number
  frameJitter: number
  
  // Memory metrics
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  heapUsage: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  
  // CPU metrics
  cpuUsage: number
  mainThreadTime: number
  idleTime: number
  
  // GPU/Rendering metrics
  gpuMemoryUsage?: number
  drawCalls: number
  triangles: number
  textureMemory: number
  
  // Network metrics
  networkLatency: number
  packetsLost: number
  bandwidth: { up: number; down: number }
  
  // Game-specific metrics
  gameObjects: number
  activePhysicsBodies: number
  soundsPlaying: number
  
  // Device metrics
  batteryLevel?: number
  deviceTemperature?: number
  deviceMemoryPressure: 'nominal' | 'fair' | 'serious' | 'critical'
  
  // Performance scores
  overallScore: number
  stabilityScore: number
  efficiencyScore: number
}

export interface PerformanceThresholds {
  minFPS: number
  maxFrameTime: number
  maxMemoryUsage: number
  maxCPUUsage: number
  maxNetworkLatency: number
  warningThresholds: {
    fps: number
    memory: number
    cpu: number
    latency: number
  }
}

export interface PerformanceAlert {
  type: 'warning' | 'critical'
  category: 'fps' | 'memory' | 'cpu' | 'network' | 'stability'
  message: string
  value: number
  threshold: number
  timestamp: number
  suggestions: string[]
}

export interface PerformanceReport {
  timestamp: number
  duration: number
  averageMetrics: PerformanceMetrics
  minMetrics: PerformanceMetrics
  maxMetrics: PerformanceMetrics
  alerts: PerformanceAlert[]
  bottlenecks: string[]
  recommendations: string[]
}

export class PerformanceMonitor extends EventEmitter {
  private isMonitoring = false
  private metrics: PerformanceMetrics
  private thresholds: PerformanceThresholds
  
  // Historical data
  private metricsHistory: PerformanceMetrics[] = []
  private alertHistory: PerformanceAlert[] = []
  private maxHistorySize = 300 // ~5 minutes at 60fps
  
  // Timing and measurement
  private lastFrameTime = 0
  private frameCount = 0
  private lastFPSUpdate = 0
  private fpsBuffer: number[] = []
  private frameTimeBuffer: number[] = []
  
  // Memory tracking
  private memoryObserver?: PerformanceObserver
  private lastMemoryCheck = 0
  private memoryCheckInterval = 1000 // 1 second
  
  // Network tracking
  private networkObserver?: PerformanceObserver
  private lastNetworkCheck = 0
  private networkBuffer: number[] = []
  
  // Performance optimization
  private adaptiveMonitoring = true
  private monitoringLevel: 'low' | 'medium' | 'high' = 'medium'
  private backgroundMonitoring = true
  
  // Device capability detection
  private deviceCapabilities = {
    maxConcurrentTextures: 16,
    maxTextureSize: 2048,
    supportsWebGL2: false,
    supportsWebGPU: false,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemory: (navigator as any).deviceMemory || 4
  }

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super()
    
    this.thresholds = {
      minFPS: 30,
      maxFrameTime: 33.33, // ~30fps
      maxMemoryUsage: 500 * 1024 * 1024, // 500MB
      maxCPUUsage: 80,
      maxNetworkLatency: 200,
      warningThresholds: {
        fps: 45,
        memory: 300 * 1024 * 1024, // 300MB
        cpu: 60,
        latency: 100
      },
      ...thresholds
    }

    this.metrics = this.createInitialMetrics()
    this.detectDeviceCapabilities()
  }

  public start(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.lastFrameTime = performance.now()
    this.lastFPSUpdate = this.lastFrameTime
    
    this.setupPerformanceObservers()
    this.startMonitoringLoop()
    
    console.log('Performance monitoring started')
    this.emit('started')
  }

  public stop(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    this.cleanup()
    
    console.log('Performance monitoring stopped')
    this.emit('stopped')
  }

  public update(): void {
    if (!this.isMonitoring) return

    const currentTime = performance.now()
    this.updateFrameMetrics(currentTime)
    this.updateMemoryMetrics()
    this.updateCPUMetrics()
    this.updateNetworkMetrics()
    this.refreshGameMetrics()
    this.updateDeviceMetrics()
    
    this.calculateScores()
    this.checkThresholds()
    this.storeMetrics()
    
    this.emit('performanceUpdate', this.metrics)
  }

  private createInitialMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      frameDelta: 0,
      frameJitter: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      heapUsage: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 },
      cpuUsage: 0,
      mainThreadTime: 0,
      idleTime: 0,
      drawCalls: 0,
      triangles: 0,
      textureMemory: 0,
      networkLatency: 0,
      packetsLost: 0,
      bandwidth: { up: 0, down: 0 },
      gameObjects: 0,
      activePhysicsBodies: 0,
      soundsPlaying: 0,
      deviceMemoryPressure: 'nominal',
      overallScore: 100,
      stabilityScore: 100,
      efficiencyScore: 100
    }
  }

  private detectDeviceCapabilities(): void {
    // Test WebGL2 support
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2')
    this.deviceCapabilities.supportsWebGL2 = !!gl2

    if (gl2) {
      this.deviceCapabilities.maxConcurrentTextures = gl2.getParameter(gl2.MAX_TEXTURE_IMAGE_UNITS)
      this.deviceCapabilities.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE)
    }

    // Test WebGPU support
    this.deviceCapabilities.supportsWebGPU = 'gpu' in navigator

    // Get device memory if available
    const nav = navigator as any
    if (nav.deviceMemory) {
      this.deviceCapabilities.deviceMemory = nav.deviceMemory
    }
  }

  private setupPerformanceObservers(): void {
    if ('PerformanceObserver' in window) {
      try {
        // Memory observer
        this.memoryObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'memory') {
              this.updateMemoryFromObserver(entry as any)
            }
          }
        })
        this.memoryObserver.observe({ entryTypes: ['memory'] })

        // Network observer
        this.networkObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
              this.updateNetworkFromObserver(entry)
            }
          }
        })
        this.networkObserver.observe({ entryTypes: ['navigation', 'resource'] })
      } catch (error) {
        console.warn('Performance observers not fully supported:', error)
      }
    }
  }

  private startMonitoringLoop(): void {
    const monitoringInterval = this.getMonitoringInterval()
    
    const monitor = () => {
      if (!this.isMonitoring) return
      
      this.update()
      
      // Adaptive monitoring - adjust frequency based on performance
      const nextInterval = this.adaptiveMonitoring ? 
        this.calculateAdaptiveInterval() : 
        monitoringInterval
      
      setTimeout(monitor, nextInterval)
    }
    
    monitor()
  }

  private getMonitoringInterval(): number {
    switch (this.monitoringLevel) {
      case 'low': return 1000 // 1 second
      case 'medium': return 500 // 0.5 seconds
      case 'high': return 100 // 0.1 seconds
      default: return 500
    }
  }

  private calculateAdaptiveInterval(): number {
    const baseInterval = this.getMonitoringInterval()
    
    // Reduce monitoring frequency if performance is poor
    if (this.metrics.fps < this.thresholds.warningThresholds.fps) {
      return Math.min(baseInterval * 2, 2000)
    }
    
    // Increase monitoring frequency if performance is critical
    if (this.metrics.overallScore < 50) {
      return Math.max(baseInterval / 2, 50)
    }
    
    return baseInterval
  }

  private updateFrameMetrics(currentTime: number): void {
    this.frameCount++
    
    // Calculate frame delta
    const frameDelta = currentTime - this.lastFrameTime
    this.metrics.frameDelta = frameDelta
    this.metrics.frameTime = frameDelta
    
    // Update frame time buffer for jitter calculation
    this.frameTimeBuffer.push(frameDelta)
    if (this.frameTimeBuffer.length > 60) {
      this.frameTimeBuffer.shift()
    }
    
    // Calculate frame jitter (variance in frame times)
    if (this.frameTimeBuffer.length > 10) {
      const avg = this.frameTimeBuffer.reduce((a, b) => a + b, 0) / this.frameTimeBuffer.length
      const variance = this.frameTimeBuffer.reduce((acc, time) => acc + Math.pow(time - avg, 2), 0) / this.frameTimeBuffer.length
      this.metrics.frameJitter = Math.sqrt(variance)
    }
    
    // Update FPS
    if (currentTime - this.lastFPSUpdate >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate))
      this.metrics.fps = fps
      
      this.fpsBuffer.push(fps)
      if (this.fpsBuffer.length > 60) {
        this.fpsBuffer.shift()
      }
      
      this.frameCount = 0
      this.lastFPSUpdate = currentTime
    }
    
    this.lastFrameTime = currentTime
  }

  private updateMemoryMetrics(): void {
    const now = Date.now()
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) return
    
    // JavaScript heap usage
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.heapUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
      
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      }
    }
    
    // Device memory pressure (if available)
    if ('memory' in navigator) {
      const deviceMemory = (navigator as any).memory
      if (deviceMemory?.pressure) {
        this.metrics.deviceMemoryPressure = deviceMemory.pressure
      }
    }
    
    this.lastMemoryCheck = now
  }

  private updateCPUMetrics(): void {
    // Estimate CPU usage based on frame timing
    const targetFrameTime = 16.67 // 60fps
    const actualFrameTime = this.metrics.frameTime
    
    if (actualFrameTime > 0) {
      this.metrics.cpuUsage = Math.min(100, (actualFrameTime / targetFrameTime) * 100)
    }
    
    // Main thread time estimation
    this.metrics.mainThreadTime = Math.max(0, actualFrameTime - 5) // Assume 5ms overhead
    this.metrics.idleTime = Math.max(0, targetFrameTime - actualFrameTime)
  }

  private updateNetworkMetrics(): void {
    const now = Date.now()
    if (now - this.lastNetworkCheck < 5000) return // Check every 5 seconds
    
    // Network latency estimation from resource timing
    if ('getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0]
        this.metrics.networkLatency = nav.responseStart - nav.requestStart
      }
      
      // Recent resource timing for bandwidth estimation
      const resourceEntries = performance.getEntriesByType('resource').slice(-10) as PerformanceResourceTiming[]
      if (resourceEntries.length > 0) {
        const totalBytes = resourceEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
        const totalTime = resourceEntries.reduce((sum, entry) => sum + (entry.responseEnd - entry.requestStart), 0)
        
        if (totalTime > 0) {
          this.metrics.bandwidth.down = (totalBytes * 8) / (totalTime / 1000) // bits per second
        }
      }
    }
    
    this.lastNetworkCheck = now
  }

  private refreshGameMetrics(): void {
    // These would be updated by the game engine
    // For now, we'll use placeholder values
    // In a real implementation, the game engine would call updateGameMetrics with actual values
  }

  private updateDeviceMetrics(): void {
    // Battery API (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.batteryLevel = battery.level * 100
      }).catch(() => {
        // Battery API not available
      })
    }
    
    // Device temperature (experimental, limited availability)
    if ('deviceTemperature' in navigator) {
      this.metrics.deviceTemperature = (navigator as any).deviceTemperature
    }
  }

  private updateMemoryFromObserver(entry: any): void {
    if (entry.usedJSHeapSize !== undefined) {
      this.metrics.heapUsage.usedJSHeapSize = entry.usedJSHeapSize
      this.metrics.heapUsage.totalJSHeapSize = entry.totalJSHeapSize
      this.metrics.heapUsage.jsHeapSizeLimit = entry.jsHeapSizeLimit
    }
  }

  private updateNetworkFromObserver(entry: PerformanceEntry): void {
    const resourceEntry = entry as PerformanceResourceTiming
    if (resourceEntry.responseStart && resourceEntry.requestStart) {
      const latency = resourceEntry.responseStart - resourceEntry.requestStart
      this.networkBuffer.push(latency)
      
      if (this.networkBuffer.length > 10) {
        this.networkBuffer.shift()
      }
      
      // Update average latency
      this.metrics.networkLatency = this.networkBuffer.reduce((a, b) => a + b, 0) / this.networkBuffer.length
    }
  }

  private calculateScores(): void {
    // Overall performance score (0-100)
    let overallScore = 100
    
    // FPS score
    const fpsScore = Math.min(100, (this.metrics.fps / 60) * 100)
    overallScore *= fpsScore / 100
    
    // Memory score
    const memoryScore = Math.max(0, 100 - this.metrics.memoryUsage.percentage)
    overallScore *= memoryScore / 100
    
    // CPU score
    const cpuScore = Math.max(0, 100 - this.metrics.cpuUsage)
    overallScore *= cpuScore / 100
    
    // Network score
    const networkScore = Math.max(0, 100 - (this.metrics.networkLatency / 5)) // 5ms = 1% penalty
    overallScore *= networkScore / 100
    
    this.metrics.overallScore = Math.round(overallScore)
    
    // Stability score (based on frame jitter and consistency)
    const jitterPenalty = Math.min(50, this.metrics.frameJitter * 2)
    this.metrics.stabilityScore = Math.max(0, 100 - jitterPenalty)
    
    // Efficiency score (based on resource usage vs performance)
    const efficiencyRatio = this.metrics.fps / Math.max(1, this.metrics.memoryUsage.percentage + this.metrics.cpuUsage)
    this.metrics.efficiencyScore = Math.min(100, efficiencyRatio * 20)
  }

  private checkThresholds(): void {
    const alerts: PerformanceAlert[] = []
    
    // FPS check
    if (this.metrics.fps < this.thresholds.minFPS) {
      alerts.push({
        type: 'critical',
        category: 'fps',
        message: `Low FPS detected: ${this.metrics.fps}`,
        value: this.metrics.fps,
        threshold: this.thresholds.minFPS,
        timestamp: Date.now(),
        suggestions: [
          'Reduce visual quality settings',
          'Disable non-essential visual effects',
          'Close other browser tabs',
          'Check for background processes'
        ]
      })
    } else if (this.metrics.fps < this.thresholds.warningThresholds.fps) {
      alerts.push({
        type: 'warning',
        category: 'fps',
        message: `FPS below optimal: ${this.metrics.fps}`,
        value: this.metrics.fps,
        threshold: this.thresholds.warningThresholds.fps,
        timestamp: Date.now(),
        suggestions: [
          'Consider reducing particle effects',
          'Lower rendering resolution'
        ]
      })
    }
    
    // Memory check
    if (this.metrics.memoryUsage.used > this.thresholds.maxMemoryUsage) {
      alerts.push({
        type: 'critical',
        category: 'memory',
        message: `High memory usage: ${Math.round(this.metrics.memoryUsage.used / 1024 / 1024)}MB`,
        value: this.metrics.memoryUsage.used,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: Date.now(),
        suggestions: [
          'Clear game cache',
          'Reduce texture quality',
          'Close other browser tabs',
          'Restart the game'
        ]
      })
    }
    
    // CPU check
    if (this.metrics.cpuUsage > this.thresholds.maxCPUUsage) {
      alerts.push({
        type: 'critical',
        category: 'cpu',
        message: `High CPU usage: ${this.metrics.cpuUsage.toFixed(1)}%`,
        value: this.metrics.cpuUsage,
        threshold: this.thresholds.maxCPUUsage,
        timestamp: Date.now(),
        suggestions: [
          'Reduce physics simulation quality',
          'Lower AI difficulty',
          'Disable advanced visual effects'
        ]
      })
    }
    
    // Network check
    if (this.metrics.networkLatency > this.thresholds.maxNetworkLatency) {
      alerts.push({
        type: 'warning',
        category: 'network',
        message: `High network latency: ${this.metrics.networkLatency.toFixed(0)}ms`,
        value: this.metrics.networkLatency,
        threshold: this.thresholds.maxNetworkLatency,
        timestamp: Date.now(),
        suggestions: [
          'Check internet connection',
          'Switch to a closer server',
          'Close streaming services'
        ]
      })
    }
    
    // Emit alerts
    for (const alert of alerts) {
      this.emit('performanceAlert', alert)
      this.alertHistory.push(alert)
    }
    
    // Keep alert history manageable
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-50)
    }
  }

  private storeMetrics(): void {
    this.metricsHistory.push({ ...this.metrics })
    
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift()
    }
  }

  private cleanup(): void {
    if (this.memoryObserver) {
      this.memoryObserver.disconnect()
      this.memoryObserver = undefined
    }
    
    if (this.networkObserver) {
      this.networkObserver.disconnect()
      this.networkObserver = undefined
    }
  }

  // Public API methods
  public getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory]
  }

  public getAlertHistory(): PerformanceAlert[] {
    return [...this.alertHistory]
  }

  public generateReport(duration?: number): PerformanceReport {
    const now = Date.now()
    const reportDuration = duration || 60000 // Default: 1 minute
    const startTime = now - reportDuration
    
    const relevantMetrics = this.metricsHistory.filter(m => 
      (now - reportDuration) <= now
    )
    
    if (relevantMetrics.length === 0) {
      throw new Error('No metrics data available for report')
    }
    
    const report: PerformanceReport = {
      timestamp: now,
      duration: reportDuration,
      averageMetrics: this.calculateAverageMetrics(relevantMetrics),
      minMetrics: this.calculateMinMetrics(relevantMetrics),
      maxMetrics: this.calculateMaxMetrics(relevantMetrics),
      alerts: this.alertHistory.filter(a => a.timestamp >= startTime),
      bottlenecks: this.identifyBottlenecks(relevantMetrics),
      recommendations: this.generateRecommendations(relevantMetrics)
    }
    
    return report
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const avg = this.createInitialMetrics()
    
    if (metrics.length === 0) return avg
    
    // Sum all numeric values
    for (const metric of metrics) {
      avg.fps += metric.fps
      avg.frameTime += metric.frameTime
      avg.memoryUsage.used += metric.memoryUsage.used
      avg.cpuUsage += metric.cpuUsage
      avg.networkLatency += metric.networkLatency
      avg.overallScore += metric.overallScore
    }
    
    // Calculate averages
    const count = metrics.length
    avg.fps /= count
    avg.frameTime /= count
    avg.memoryUsage.used /= count
    avg.cpuUsage /= count
    avg.networkLatency /= count
    avg.overallScore /= count
    
    return avg
  }

  private calculateMinMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) return this.createInitialMetrics()
    
    return metrics.reduce((min, current) => ({
      ...min,
      fps: Math.min(min.fps, current.fps),
      frameTime: Math.min(min.frameTime, current.frameTime),
      memoryUsage: {
        ...min.memoryUsage,
        used: Math.min(min.memoryUsage.used, current.memoryUsage.used)
      },
      cpuUsage: Math.min(min.cpuUsage, current.cpuUsage),
      networkLatency: Math.min(min.networkLatency, current.networkLatency),
      overallScore: Math.min(min.overallScore, current.overallScore)
    }), metrics[0])
  }

  private calculateMaxMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) return this.createInitialMetrics()
    
    return metrics.reduce((max, current) => ({
      ...max,
      fps: Math.max(max.fps, current.fps),
      frameTime: Math.max(max.frameTime, current.frameTime),
      memoryUsage: {
        ...max.memoryUsage,
        used: Math.max(max.memoryUsage.used, current.memoryUsage.used)
      },
      cpuUsage: Math.max(max.cpuUsage, current.cpuUsage),
      networkLatency: Math.max(max.networkLatency, current.networkLatency),
      overallScore: Math.max(max.overallScore, current.overallScore)
    }), metrics[0])
  }

  private identifyBottlenecks(metrics: PerformanceMetrics[]): string[] {
    const bottlenecks: string[] = []
    const avgMetrics = this.calculateAverageMetrics(metrics)
    
    if (avgMetrics.fps < 45) bottlenecks.push('Frame Rate')
    if (avgMetrics.memoryUsage.percentage > 70) bottlenecks.push('Memory Usage')
    if (avgMetrics.cpuUsage > 70) bottlenecks.push('CPU Usage')
    if (avgMetrics.networkLatency > 100) bottlenecks.push('Network Latency')
    if (avgMetrics.frameJitter > 5) bottlenecks.push('Frame Stability')
    
    return bottlenecks
  }

  private generateRecommendations(metrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = []
    const avgMetrics = this.calculateAverageMetrics(metrics)
    
    if (avgMetrics.fps < 45) {
      recommendations.push('Consider reducing visual quality or effects')
      recommendations.push('Optimize rendering batches and draw calls')
    }
    
    if (avgMetrics.memoryUsage.percentage > 70) {
      recommendations.push('Implement object pooling for frequently created objects')
      recommendations.push('Optimize texture sizes and compression')
    }
    
    if (avgMetrics.cpuUsage > 70) {
      recommendations.push('Optimize game logic and reduce unnecessary calculations')
      recommendations.push('Consider using web workers for heavy computations')
    }
    
    if (avgMetrics.networkLatency > 100) {
      recommendations.push('Implement client-side prediction')
      recommendations.push('Optimize network message frequency and size')
    }
    
    return recommendations
  }

  public updateGameMetrics(gameMetrics: Partial<PerformanceMetrics>): void {
    Object.assign(this.metrics, gameMetrics)
  }

  public setThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }

  public setMonitoringLevel(level: 'low' | 'medium' | 'high'): void {
    this.monitoringLevel = level
  }

  public enableAdaptiveMonitoring(enabled: boolean): void {
    this.adaptiveMonitoring = enabled
  }

  public getDeviceCapabilities(): any {
    return { ...this.deviceCapabilities }
  }

  public clearHistory(): void {
    this.metricsHistory = []
    this.alertHistory = []
  }

  public exportData(): any {
    return {
      metrics: this.metrics,
      history: this.metricsHistory,
      alerts: this.alertHistory,
      thresholds: this.thresholds,
      deviceCapabilities: this.deviceCapabilities
    }
  }
}

export default PerformanceMonitor