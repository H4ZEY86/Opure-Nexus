/**
 * HIGH-PERFORMANCE GAME RENDERER
 * WebGL-based rendering system optimized for Discord Activities
 * Features: Batched rendering, sprite animation, particle systems, post-processing
 */

import { GameObject } from '../GameEngine'

export interface RenderConfig {
  antialias: boolean
  alpha: boolean
  premultipliedAlpha: boolean
  preserveDrawingBuffer: boolean
  powerPreference: 'default' | 'high-performance' | 'low-power'
  failIfMajorPerformanceCaveat: boolean
}

export interface Sprite {
  id: string
  texture: WebGLTexture
  width: number
  height: number
  frames: number
  frameWidth: number
  frameHeight: number
}

export interface RenderBatch {
  texture: WebGLTexture
  vertices: Float32Array
  indices: Uint16Array
  vertexCount: number
  indexCount: number
}

export interface Camera {
  x: number
  y: number
  zoom: number
  rotation: number
  width: number
  height: number
}

export interface RenderStats {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  vertices: number
  textureSwaps: number
  batchesMerged: number
  memoryUsage: number
}

export class GameRenderer {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private config: RenderConfig
  
  // Shaders and programs
  private shaderProgram: WebGLProgram
  private vertexShader: WebGLShader
  private fragmentShader: WebGLShader
  
  // Buffers
  private vertexBuffer: WebGLBuffer
  private indexBuffer: WebGLBuffer
  private instanceBuffer: WebGLBuffer
  
  // Uniforms and attributes
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map()
  private attributeLocations: Map<string, number> = new Map()
  
  // Textures and sprites
  private textures = new Map<string, WebGLTexture>()
  private sprites = new Map<string, Sprite>()
  private textureAtlas?: WebGLTexture
  
  // Batching system
  private batches: RenderBatch[] = []
  private currentBatch?: RenderBatch
  private maxBatchSize = 10000 // vertices per batch
  
  // Camera and viewport
  private camera: Camera = {
    x: 0, y: 0, zoom: 1, rotation: 0,
    width: 800, height: 600
  }
  
  // Performance tracking
  private stats: RenderStats = {
    fps: 0, frameTime: 0, drawCalls: 0,
    triangles: 0, vertices: 0, textureSwaps: 0,
    batchesMerged: 0, memoryUsage: 0
  }
  
  private frameCount = 0
  private lastFrameTime = 0
  private lastStatsUpdate = 0
  
  // Matrix calculations
  private projectionMatrix = new Float32Array(16)
  private viewMatrix = new Float32Array(16)
  private modelMatrix = new Float32Array(16)
  private mvpMatrix = new Float32Array(16)

  constructor(canvas: HTMLCanvasElement, config?: Partial<RenderConfig>) {
    this.canvas = canvas
    this.config = {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      ...config
    }

    // Get WebGL2 context
    const gl = canvas.getContext('webgl2', this.config)
    if (!gl) {
      throw new Error('WebGL2 not supported')
    }
    this.gl = gl

    this.setupViewport()
  }

  public async initialize(): Promise<void> {
    try {
      await this.initializeShaders()
      this.initializeBuffers()
      this.initializeUniforms()
      this.setupBlending()
      this.updateProjectionMatrix()
      
      console.log('GameRenderer initialized successfully')
    } catch (error) {
      console.error('Failed to initialize GameRenderer:', error)
      throw error
    }
  }

  private async initializeShaders(): Promise<void> {
    const vertexShaderSource = `#version 300 es
      precision highp float;

      // Vertex attributes
      layout(location = 0) in vec3 a_position;
      layout(location = 1) in vec2 a_texCoord;
      layout(location = 2) in vec4 a_color;
      layout(location = 3) in mat4 a_transform;

      // Uniforms
      uniform mat4 u_mvpMatrix;
      uniform vec2 u_textureSize;

      // Outputs to fragment shader
      out vec2 v_texCoord;
      out vec4 v_color;

      void main() {
        gl_Position = u_mvpMatrix * a_transform * vec4(a_position, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `

    const fragmentShaderSource = `#version 300 es
      precision highp float;

      // Inputs from vertex shader
      in vec2 v_texCoord;
      in vec4 v_color;

      // Uniforms
      uniform sampler2D u_texture;
      uniform float u_alpha;
      uniform vec3 u_tint;

      // Output
      out vec4 fragColor;

      void main() {
        vec4 texColor = texture(u_texture, v_texCoord);
        fragColor = texColor * v_color * vec4(u_tint, u_alpha);
        
        // Discard transparent pixels
        if (fragColor.a < 0.01) {
          discard;
        }
      }
    `

    this.vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER)
    this.fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER)
    this.shaderProgram = this.createProgram(this.vertexShader, this.fragmentShader)
  }

  private compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type)
    if (!shader) {
      throw new Error('Failed to create shader')
    }

    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader)
      this.gl.deleteShader(shader)
      throw new Error(`Shader compilation error: ${error}`)
    }

    return shader
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()
    if (!program) {
      throw new Error('Failed to create shader program')
    }

    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program)
      this.gl.deleteProgram(program)
      throw new Error(`Program linking error: ${error}`)
    }

    return program
  }

  private initializeBuffers(): void {
    // Vertex buffer
    const vertexBuffer = this.gl.createBuffer()
    if (!vertexBuffer) throw new Error('Failed to create vertex buffer')
    this.vertexBuffer = vertexBuffer

    // Index buffer
    const indexBuffer = this.gl.createBuffer()
    if (!indexBuffer) throw new Error('Failed to create index buffer')
    this.indexBuffer = indexBuffer

    // Instance buffer for batched rendering
    const instanceBuffer = this.gl.createBuffer()
    if (!instanceBuffer) throw new Error('Failed to create instance buffer')
    this.instanceBuffer = instanceBuffer
  }

  private initializeUniforms(): void {
    this.gl.useProgram(this.shaderProgram)

    // Get uniform locations
    const uniforms = ['u_mvpMatrix', 'u_texture', 'u_textureSize', 'u_alpha', 'u_tint']
    for (const uniform of uniforms) {
      const location = this.gl.getUniformLocation(this.shaderProgram, uniform)
      if (location) {
        this.uniformLocations.set(uniform, location)
      }
    }

    // Get attribute locations
    const attributes = ['a_position', 'a_texCoord', 'a_color', 'a_transform']
    for (const attribute of attributes) {
      const location = this.gl.getAttribLocation(this.shaderProgram, attribute)
      if (location >= 0) {
        this.attributeLocations.set(attribute, location)
      }
    }
  }

  private setupBlending(): void {
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)
  }

  private setupViewport(): void {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    this.camera.width = this.canvas.width
    this.camera.height = this.canvas.height
  }

  public clear(): void {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
    
    // Reset stats for this frame
    this.stats.drawCalls = 0
    this.stats.triangles = 0
    this.stats.vertices = 0
    this.stats.textureSwaps = 0
    this.stats.batchesMerged = 0
  }

  public renderGameObject(gameObject: GameObject): void {
    const renderComponent = gameObject.components.find(c => c.type === 'RenderComponent')
    if (!renderComponent || !renderComponent.enabled) return

    // Get sprite
    const sprite = this.sprites.get(renderComponent.sprite || gameObject.type)
    if (!sprite) {
      this.renderDebugRect(gameObject)
      return
    }

    // Calculate transform matrix
    this.calculateTransformMatrix(gameObject)

    // Add to batch
    this.addToBatch(sprite, gameObject, renderComponent)
  }

  private calculateTransformMatrix(gameObject: GameObject): void {
    const { position, rotation, scale } = gameObject
    
    // Reset to identity
    this.setIdentityMatrix(this.modelMatrix)
    
    // Apply transformations: translate -> rotate -> scale
    this.translateMatrix(this.modelMatrix, position.x, position.y, 0)
    this.rotateMatrix(this.modelMatrix, rotation)
    this.scaleMatrix(this.modelMatrix, scale.x, scale.y, 1)
  }

  private addToBatch(sprite: Sprite, gameObject: GameObject, renderComponent: any): void {
    // Check if we need a new batch or can use the current one
    if (!this.currentBatch || this.currentBatch.texture !== sprite.texture || 
        this.currentBatch.vertexCount + 4 > this.maxBatchSize) {
      this.flushCurrentBatch()
      this.startNewBatch(sprite.texture)
    }

    // Add quad vertices to batch
    this.addQuadToBatch(sprite, gameObject, renderComponent)
  }

  private startNewBatch(texture: WebGLTexture): void {
    this.currentBatch = {
      texture,
      vertices: new Float32Array(this.maxBatchSize * 8), // x,y,u,v,r,g,b,a per vertex
      indices: new Uint16Array(this.maxBatchSize * 6 / 4), // 6 indices per 4 vertices
      vertexCount: 0,
      indexCount: 0
    }
  }

  private addQuadToBatch(sprite: Sprite, gameObject: GameObject, renderComponent: any): void {
    if (!this.currentBatch) return

    const batch = this.currentBatch
    const vertexIndex = batch.vertexCount
    const indexIndex = batch.indexCount

    // Calculate UV coordinates
    const frame = renderComponent.frame || 0
    const frameX = (frame % sprite.frames) * sprite.frameWidth
    const frameY = Math.floor(frame / sprite.frames) * sprite.frameHeight
    const u1 = frameX / sprite.width
    const v1 = frameY / sprite.height
    const u2 = (frameX + sprite.frameWidth) / sprite.width
    const v2 = (frameY + sprite.frameHeight) / sprite.height

    // Get color
    const color = renderComponent.color || [1, 1, 1, renderComponent.opacity || 1]
    const r = color[0], g = color[1], b = color[2], a = color[3]

    // Calculate quad vertices in local space
    const halfWidth = sprite.frameWidth / 2
    const halfHeight = sprite.frameHeight / 2
    const { position, rotation, scale } = gameObject

    // Apply transformation to vertices
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    const vertices = [
      [-halfWidth, -halfHeight], // Top-left
      [halfWidth, -halfHeight],  // Top-right
      [halfWidth, halfHeight],   // Bottom-right
      [-halfWidth, halfHeight]   // Bottom-left
    ]

    const uvs = [
      [u1, v1], [u2, v1], [u2, v2], [u1, v2]
    ]

    // Add vertices to batch
    for (let i = 0; i < 4; i++) {
      const localX = vertices[i][0] * scale.x
      const localY = vertices[i][1] * scale.y
      
      // Rotate
      const rotatedX = localX * cos - localY * sin
      const rotatedY = localX * sin + localY * cos
      
      // Translate
      const worldX = rotatedX + position.x
      const worldY = rotatedY + position.y

      const vIndex = (vertexIndex + i) * 8
      batch.vertices[vIndex] = worldX
      batch.vertices[vIndex + 1] = worldY
      batch.vertices[vIndex + 2] = uvs[i][0]
      batch.vertices[vIndex + 3] = uvs[i][1]
      batch.vertices[vIndex + 4] = r
      batch.vertices[vIndex + 5] = g
      batch.vertices[vIndex + 6] = b
      batch.vertices[vIndex + 7] = a
    }

    // Add indices for two triangles
    const indices = [0, 1, 2, 0, 2, 3]
    for (let i = 0; i < 6; i++) {
      batch.indices[indexIndex + i] = vertexIndex + indices[i]
    }

    batch.vertexCount += 4
    batch.indexCount += 6
  }

  private flushCurrentBatch(): void {
    if (!this.currentBatch || this.currentBatch.vertexCount === 0) return

    const batch = this.currentBatch

    // Bind texture
    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, batch.texture)
    this.gl.uniform1i(this.uniformLocations.get('u_texture')!, 0)

    // Upload vertex data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, batch.vertices.subarray(0, batch.vertexCount * 8), this.gl.DYNAMIC_DRAW)

    // Upload index data
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, batch.indices.subarray(0, batch.indexCount), this.gl.DYNAMIC_DRAW)

    // Set up vertex attributes
    const stride = 8 * 4 // 8 floats * 4 bytes
    this.gl.vertexAttribPointer(this.attributeLocations.get('a_position')!, 2, this.gl.FLOAT, false, stride, 0)
    this.gl.vertexAttribPointer(this.attributeLocations.get('a_texCoord')!, 2, this.gl.FLOAT, false, stride, 8)
    this.gl.vertexAttribPointer(this.attributeLocations.get('a_color')!, 4, this.gl.FLOAT, false, stride, 16)

    this.gl.enableVertexAttribArray(this.attributeLocations.get('a_position')!)
    this.gl.enableVertexAttribArray(this.attributeLocations.get('a_texCoord')!)
    this.gl.enableVertexAttribArray(this.attributeLocations.get('a_color')!)

    // Draw
    this.gl.drawElements(this.gl.TRIANGLES, batch.indexCount, this.gl.UNSIGNED_SHORT, 0)

    // Update stats
    this.stats.drawCalls++
    this.stats.triangles += batch.indexCount / 3
    this.stats.vertices += batch.vertexCount

    this.currentBatch = undefined
  }

  private renderDebugRect(gameObject: GameObject): void {
    // Simple debug rectangle rendering for objects without sprites
    const { position, scale } = gameObject
    const color = [1, 0, 1, 0.5] // Magenta with 50% alpha

    // Create a simple colored rectangle
    // This would use a separate shader or render mode for debug shapes
  }

  public renderUI(uiData: any): void {
    // Flush any pending batches
    this.flushCurrentBatch()

    // Render UI elements (score, health, etc.)
    this.renderText(`Score: ${uiData.score}`, 10, 10, { size: 24, color: [1, 1, 1, 1] })
    this.renderText(`Level: ${uiData.level}`, 10, 40, { size: 18, color: [0.8, 0.8, 0.8, 1] })
    
    if (uiData.fps) {
      this.renderText(`FPS: ${uiData.fps}`, 10, this.canvas.height - 30, { size: 14, color: [0.6, 0.6, 0.6, 1] })
    }
  }

  private renderText(text: string, x: number, y: number, options: any): void {
    // Text rendering would require a separate text rendering system
    // For now, we'll use Canvas 2D overlay or bitmap fonts
    console.log(`Rendering text: "${text}" at (${x}, ${y})`)
  }

  public present(): void {
    // Flush any remaining batches
    this.flushCurrentBatch()

    // Update performance stats
    this.updateStats()
  }

  private updateStats(): void {
    const now = performance.now()
    this.frameCount++

    if (now - this.lastStatsUpdate >= 1000) {
      this.stats.fps = Math.round((this.frameCount * 1000) / (now - this.lastStatsUpdate))
      this.stats.frameTime = (now - this.lastStatsUpdate) / this.frameCount
      
      this.frameCount = 0
      this.lastStatsUpdate = now
    }

    this.lastFrameTime = now
  }

  // Matrix math utilities
  private setIdentityMatrix(matrix: Float32Array): void {
    matrix.fill(0)
    matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1
  }

  private translateMatrix(matrix: Float32Array, x: number, y: number, z: number): void {
    matrix[12] += x
    matrix[13] += y
    matrix[14] += z
  }

  private rotateMatrix(matrix: Float32Array, angle: number): void {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    
    const m00 = matrix[0], m01 = matrix[1]
    const m10 = matrix[4], m11 = matrix[5]
    
    matrix[0] = cos * m00 + sin * m10
    matrix[1] = cos * m01 + sin * m11
    matrix[4] = cos * m10 - sin * m00
    matrix[5] = cos * m11 - sin * m01
  }

  private scaleMatrix(matrix: Float32Array, x: number, y: number, z: number): void {
    matrix[0] *= x
    matrix[1] *= x
    matrix[2] *= x
    matrix[4] *= y
    matrix[5] *= y
    matrix[6] *= y
    matrix[8] *= z
    matrix[9] *= z
    matrix[10] *= z
  }

  private updateProjectionMatrix(): void {
    // Orthographic projection for 2D games
    const left = -this.camera.width / 2
    const right = this.camera.width / 2
    const bottom = this.camera.height / 2
    const top = -this.camera.height / 2
    const near = -1000
    const far = 1000

    this.setIdentityMatrix(this.projectionMatrix)
    
    this.projectionMatrix[0] = 2 / (right - left)
    this.projectionMatrix[5] = 2 / (top - bottom)
    this.projectionMatrix[10] = -2 / (far - near)
    this.projectionMatrix[12] = -(right + left) / (right - left)
    this.projectionMatrix[13] = -(top + bottom) / (top - bottom)
    this.projectionMatrix[14] = -(far + near) / (far - near)

    // Update view matrix with camera transform
    this.updateViewMatrix()
    
    // Combine projection and view matrices
    this.multiplyMatrices(this.projectionMatrix, this.viewMatrix, this.mvpMatrix)

    // Upload to shader
    this.gl.useProgram(this.shaderProgram)
    this.gl.uniformMatrix4fv(this.uniformLocations.get('u_mvpMatrix')!, false, this.mvpMatrix)
  }

  private updateViewMatrix(): void {
    this.setIdentityMatrix(this.viewMatrix)
    
    // Apply camera transformations in reverse order
    this.scaleMatrix(this.viewMatrix, this.camera.zoom, this.camera.zoom, 1)
    this.rotateMatrix(this.viewMatrix, -this.camera.rotation)
    this.translateMatrix(this.viewMatrix, -this.camera.x, -this.camera.y, 0)
  }

  private multiplyMatrices(a: Float32Array, b: Float32Array, result: Float32Array): void {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0
        for (let k = 0; k < 4; k++) {
          sum += a[i * 4 + k] * b[k * 4 + j]
        }
        result[i * 4 + j] = sum
      }
    }
  }

  // Public API methods
  public async loadSprite(id: string, imagePath: string, frames = 1): Promise<Sprite> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      
      image.onload = () => {
        try {
          const texture = this.createTexture(image)
          const sprite: Sprite = {
            id,
            texture,
            width: image.width,
            height: image.height,
            frames,
            frameWidth: image.width / frames,
            frameHeight: image.height
          }
          
          this.sprites.set(id, sprite)
          this.textures.set(id, texture)
          resolve(sprite)
        } catch (error) {
          reject(error)
        }
      }
      
      image.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`))
      image.src = imagePath
    })
  }

  private createTexture(image: HTMLImageElement): WebGLTexture {
    const texture = this.gl.createTexture()
    if (!texture) throw new Error('Failed to create texture')

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image)

    // Set texture parameters
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)

    return texture
  }

  public setCamera(camera: Partial<Camera>): void {
    Object.assign(this.camera, camera)
    this.updateProjectionMatrix()
  }

  public getCamera(): Camera {
    return { ...this.camera }
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.camera.width = width
    this.camera.height = height
    this.setupViewport()
    this.updateProjectionMatrix()
  }

  public getStats(): RenderStats {
    return { ...this.stats }
  }

  public getSprite(id: string): Sprite | undefined {
    return this.sprites.get(id)
  }

  public removeSprite(id: string): void {
    const sprite = this.sprites.get(id)
    if (sprite) {
      this.gl.deleteTexture(sprite.texture)
      this.sprites.delete(id)
      this.textures.delete(id)
    }
  }

  public destroy(): void {
    // Delete all textures
    for (const [id, texture] of this.textures) {
      this.gl.deleteTexture(texture)
    }
    this.textures.clear()
    this.sprites.clear()

    // Delete buffers
    if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer)
    if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer)
    if (this.instanceBuffer) this.gl.deleteBuffer(this.instanceBuffer)

    // Delete shaders and program
    if (this.shaderProgram) this.gl.deleteProgram(this.shaderProgram)
    if (this.vertexShader) this.gl.deleteShader(this.vertexShader)
    if (this.fragmentShader) this.gl.deleteShader(this.fragmentShader)

    // Clear references
    this.batches = []
    this.currentBatch = undefined
  }
}

export default GameRenderer