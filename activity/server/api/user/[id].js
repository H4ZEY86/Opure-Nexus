// Ultra-simple user data endpoint

export default function handler(req, res) {
  const { id } = req.query
  
  // Generate data based on user ID  
  const userSeed = parseInt((id || '123456').slice(-6)) || 123456
  
  const userData = {
    success: true,
    data: {
      user: {
        id: id || '123456789012345678',
        fragments: 1000 + (userSeed % 10000),
        level: 5 + (userSeed % 20),
        xp: 100 + (userSeed % 1000),
        lives: 3,
        data_shards: 10 + (userSeed % 50),
        daily_streak: userSeed % 30
      },
      achievements: [
        { id: 1, name: "First Steps", icon: "🏃" },
        { id: 2, name: "Music Lover", icon: "🎵" },
        { id: 3, name: "Fragment Hunter", icon: "💎" }
      ].slice(0, userSeed % 5),
      playlists: [
        {
          name: "Gaming Mix",
          songs: [
            { title: "Warriors", artist: "Imagine Dragons", duration: "2:51" },
            { title: "Legends Never Die", artist: "Against The Current", duration: "3:51" }
          ]
        }
      ],
      stats: {
        last_sync: Date.now(),
        data_source: 'api_generated'
      }
    },
    timestamp: Date.now()
  }
  
  res.status(200).json(userData)
}