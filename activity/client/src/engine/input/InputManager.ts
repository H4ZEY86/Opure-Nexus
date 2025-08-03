/**
 * Input Manager for Discord Activity Games
 * Handles keyboard, mouse, and touch inputs
 */

export interface InputEvent {
  type: 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemove' | 'touchstart' | 'touchend' | 'touchmove'
  key?: string
  button?: number
  x?: number
  y?: number
  touches?: Array<{ x: number; y: number; id: number }>
}

export class InputManager {
  private keys: Set<string> = new Set()
  private mouseButtons: Set<number> = new Set()
  private mousePosition = { x: 0, y: 0 }
  private touches: Map<number, { x: number; y: number }> = new Map()
  private listeners: Array<(event: InputEvent) => void> = []

  constructor(private canvas: HTMLCanvasElement) {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase())
      this.notifyListeners({ type: 'keydown', key: e.key.toLowerCase() })
    })

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase())
      this.notifyListeners({ type: 'keyup', key: e.key.toLowerCase() })
    })

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button)
      this.notifyListeners({ 
        type: 'mousedown', 
        button: e.button, 
        x: e.offsetX, 
        y: e.offsetY 
      })
    })

    this.canvas.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button)
      this.notifyListeners({ 
        type: 'mouseup', 
        button: e.button, 
        x: e.offsetX, 
        y: e.offsetY 
      })
    })

    this.canvas.addEventListener('mousemove', (e) => {
      this.mousePosition = { x: e.offsetX, y: e.offsetY }
      this.notifyListeners({ 
        type: 'mousemove', 
        x: e.offsetX, 
        y: e.offsetY 
      })
    })

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touches = Array.from(e.touches).map(touch => ({
        x: touch.clientX - this.canvas.offsetLeft,
        y: touch.clientY - this.canvas.offsetTop,
        id: touch.identifier
      }))
      
      touches.forEach(touch => this.touches.set(touch.id, touch))
      this.notifyListeners({ type: 'touchstart', touches })
    })

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      const changedTouches = Array.from(e.changedTouches).map(touch => ({
        x: touch.clientX - this.canvas.offsetLeft,
        y: touch.clientY - this.canvas.offsetTop,
        id: touch.identifier
      }))
      
      changedTouches.forEach(touch => this.touches.delete(touch.id))
      this.notifyListeners({ type: 'touchend', touches: changedTouches })
    })

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touches = Array.from(e.touches).map(touch => ({
        x: touch.clientX - this.canvas.offsetLeft,
        y: touch.clientY - this.canvas.offsetTop,
        id: touch.identifier
      }))
      
      touches.forEach(touch => this.touches.set(touch.id, touch))
      this.notifyListeners({ type: 'touchmove', touches })
    })
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase())
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.mouseButtons.has(button)
  }

  public getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition }
  }

  public getTouches(): Array<{ x: number; y: number; id: number }> {
    return Array.from(this.touches.entries()).map(([id, pos]) => ({ ...pos, id }))
  }

  public addListener(listener: (event: InputEvent) => void) {
    this.listeners.push(listener)
  }

  public removeListener(listener: (event: InputEvent) => void) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  private notifyListeners(event: InputEvent) {
    this.listeners.forEach(listener => listener(event))
  }

  public destroy() {
    this.keys.clear()
    this.mouseButtons.clear()
    this.touches.clear()
    this.listeners.length = 0
  }
}