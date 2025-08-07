// Simple API test endpoint - no dependencies, always works

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const testData = {
    success: true,
    message: 'API is working perfectly!',
    timestamp: new Date().toISOString(),
    user: {
      fragments: 2500,
      level: 12,
      xp: 1250,
      lives: 3,
      data_shards: 45,
      daily_streak: 8
    },
    achievements: [
      { id: 1, name: "First Steps", description: "Complete your first quest", icon: "🏃" },
      { id: 2, name: "Music Lover", description: "Listen to 100 songs", icon: "🎵" },
      { id: 3, name: "Fragment Hunter", description: "Collect 1000 fragments", icon: "💎" }
    ],
    playlists: [
      {
        name: "Epic Gaming Mix",
        songs: [
          { title: "Warriors", artist: "Imagine Dragons", duration: "2:51" },
          { title: "Legends Never Die", artist: "Against The Current", duration: "3:51" }
        ]
      }
    ],
    api_status: 'fully_operational',
    version: '2.0.0'
  }
  
  res.status(200).json(testData)
}