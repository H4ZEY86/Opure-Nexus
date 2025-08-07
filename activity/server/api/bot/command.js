// Serverless API endpoint to execute bot commands from Discord Activity
// Connects to real bot system for command execution

const { executeBotCommand, getUserData } = require('../database-cloud.js')

// CORS headers for Discord Activity
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Discord-User-ID, X-Activity-Instance',
  'Access-Control-Max-Age': '86400'
}

export default async function handler(req, res) {
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key])
  })
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { userId, command, args = [] } = req.body
  
  if (!userId || !command) {
    console.log('❌ Missing userId or command')
    return res.status(400).json({ 
      error: 'User ID and command required',
      success: false 
    })
  }
  
  console.log(`🤖 EXECUTING BOT COMMAND: ${command} for user ${userId}`)
  
  try {
    // Execute the bot command
    const result = await executeBotCommand(userId, command, args)
    
    console.log(`✅ COMMAND EXECUTED: ${command} -> ${result.substring(0, 100)}...`)
    
    return res.status(200).json({
      success: true,
      result,
      command,
      userId,
      timestamp: Date.now(),
      source: 'real_bot_command'
    })
    
  } catch (error) {
    console.error(`❌ COMMAND ERROR: ${command} for user ${userId}:`, error)
    
    return res.status(500).json({
      success: false,
      error: error.message,
      command,
      userId,
      timestamp: Date.now()
    })
  }
}