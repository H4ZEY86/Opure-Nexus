import { Router } from 'express'
import { z } from 'zod'
import { validateRequest } from '../middleware/validation'

const router = Router()

// Validation schemas
const addTrackSchema = z.object({
  url: z.string().min(1, 'Track URL is required'),
  title: z.string().optional()
})

const controlSchema = z.object({
  action: z.enum(['play', 'pause', 'stop', 'skip', 'previous'])
})

// Get current music status
router.get('/status', async (req, res) => {
  try {
    // Get music status from your bot or database
    const musicStatus = {
      playing: false,
      current_track: null,
      queue: [],
      volume: 50,
      repeat: false,
      shuffle: false
    }
    
    res.json(musicStatus)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get music status' })
  }
})

// Get music queue
router.get('/queue', async (req, res) => {
  try {
    const queue: any[] = [] // Get from database or bot
    res.json({ queue })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get music queue' })
  }
})

// Add track to queue
router.post('/queue', validateRequest(addTrackSchema), async (req, res) => {
  try {
    const { url, title } = req.body
    
    // Add track to queue logic
    const track = {
      id: Date.now().toString(),
      url,
      title: title || 'Unknown Track',
      duration: null,
      added_by: req.body.user_id || 'unknown'
    }
    
    res.json({ success: true, track })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add track to queue' })
  }
})

// Control playback
router.post('/control', validateRequest(controlSchema), async (req, res) => {
  try {
    const { action } = req.body
    
    // Send control command to bot
    console.log(`Music control: ${action}`)
    
    res.json({ success: true, action })
  } catch (error) {
    res.status(500).json({ error: 'Failed to control playback' })
  }
})

export { router as musicRouter }