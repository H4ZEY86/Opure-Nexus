// Mock data that works without API calls - for Discord iframe compatibility
export interface UserData {
  fragments: number
  level: number
  xp: number
  lives: number
  dataShards: number
  dailyStreak: number
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
}

export interface Playlist {
  id: string
  name: string
  tracks: Track[]
  thumbnail: string
  owner: string
}

export interface Track {
  id: string
  title: string
  videoId: string
  duration: string
  thumbnail: string
  addedBy?: string
}

export interface AIResponse {
  message: string
  personality: 'scottish' | 'gaming' | 'music'
  timestamp: string
}

// Generate user data based on Discord user ID
export const generateUserData = (userId: string): UserData => {
  // Use user ID to generate consistent data
  const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  return {
    fragments: 1250 + (seed % 2000), // 1250-3250 fragments
    level: 5 + (seed % 15), // Level 5-20
    xp: (seed % 400) + 100, // XP progress
    lives: 3,
    dataShards: seed % 50, // 0-50 shards
    dailyStreak: (seed % 7) + 1, // 1-7 day streak
    achievements: generateAchievements(seed)
  }
}

const generateAchievements = (seed: number): Achievement[] => {
  const allAchievements = [
    {
      id: 'first_song',
      name: 'First Beat',
      description: 'Played your first song',
      icon: '🎵',
      unlocked: true,
      unlockedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: 'scottish_pride',
      name: 'Scottish Pride',
      description: 'Unlocked Scottish AI personality',
      icon: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      unlocked: true,
      unlockedAt: '2024-01-16T14:22:00Z'
    },
    {
      id: 'juice_wrld_fan',
      name: 'Juice WRLD Forever',
      description: 'Played 10 Juice WRLD songs',
      icon: '🎤',
      unlocked: seed % 3 === 0,
      unlockedAt: seed % 3 === 0 ? '2024-01-20T18:45:00Z' : undefined
    },
    {
      id: 'fragment_collector',
      name: 'Fragment Collector',
      description: 'Earned 1000+ fragments',
      icon: '💎',
      unlocked: true,
      unlockedAt: '2024-01-18T09:15:00Z'
    },
    {
      id: 'rangers_supporter',
      name: 'Rangers Supporter',
      description: 'Showed support for Rangers FC',
      icon: '⚽',
      unlocked: seed % 2 === 0,
      unlockedAt: seed % 2 === 0 ? '2024-01-22T16:30:00Z' : undefined
    },
    {
      id: 'daily_warrior',
      name: 'Daily Warrior',
      description: 'Maintained 7-day daily streak',
      icon: '🔥',
      unlocked: seed % 4 === 0,
      unlockedAt: seed % 4 === 0 ? '2024-01-25T12:00:00Z' : undefined
    }
  ]
  
  return allAchievements
}

// User's personalized playlists
export const getUserPlaylists = (userId: string, username: string): Playlist[] => {
  return [
    {
      id: `user-${userId}-favorites`,
      name: `${username}'s Favorites`,
      owner: username,
      thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
      tracks: [
        {
          id: 'fav-1',
          title: 'Lucid Dreams - Juice WRLD',
          videoId: 'mzB1VGllGMU',
          duration: '4:04',
          thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
          addedBy: username
        },
        {
          id: 'fav-2',
          title: 'The Proclaimers - 500 Miles',
          videoId: 'tbNlMtqrYS0',
          duration: '3:38',
          thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg',
          addedBy: username
        },
        {
          id: 'fav-3',
          title: 'Lewis Capaldi - Someone You Loved',
          videoId: 'zABzlMbD4gI',
          duration: '3:22',
          thumbnail: 'https://img.youtube.com/vi/zABzlMbD4gI/hqdefault.jpg',
          addedBy: username
        }
      ]
    },
    {
      id: `user-${userId}-gaming`,
      name: `${username}'s Gaming Mix`,
      owner: username,
      thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
      tracks: [
        {
          id: 'game-1',
          title: 'TheFatRat - Unity',
          videoId: 'fJ9rUzIMcZQ',
          duration: '4:08',
          thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
          addedBy: username
        },
        {
          id: 'game-2',
          title: 'Alan Walker - Faded',
          videoId: '60ItHLz5WEA',
          duration: '3:32',
          thumbnail: 'https://img.youtube.com/vi/60ItHLz5WEA/hqdefault.jpg',
          addedBy: username
        }
      ]
    }
  ]
}

// Scottish AI responses
export const getAIResponse = (message: string, username: string): AIResponse => {
  const scottishResponses = [
    `Aye ${username}, that's a belter of a question! What's got ye thinking about that?`,
    `Och, ${username}! Ye know what? Rangers are pure class, and so are you for asking!`,
    `Listen ${username}, Juice WRLD was a legend, and his music still hits different, ken?`,
    `Right ${username}, I'm buzzing to help ye out! What else can this Scottish AI do for ye?`,
    `Proper mental question there ${username}! Love the energy, same as a Rangers match day!`,
    `Aye aye ${username}! That's some quality chat right there, pure brilliant!`,
    `${username}, ye absolute legend! Keep the questions coming, I'm here for it all!`,
    `Scottish wisdom coming your way ${username} - life's like a Rangers game, full of passion!`,
    `Ochaye ${username}, that's got me thinking! Proper good question from a proper good person!`,
    `${username} my friend, that's the kind of chat I live for! Keep being amazing!`
  ]
  
  const musicResponses = [
    `${username}, that reminds me of a Juice WRLD track - pure emotion, pure genius!`,
    `Aye ${username}, music is life! What's your current anthem? Mine changes daily!`,
    `${username}, ye know what slaps? Good music and good company - and you've got both!`,
    `That's music to my ears ${username}! Speaking of which, what should we queue up next?`,
    `${username}, you've got taste! That's rarer than a Rangers trophy these days... wait, we've got loads!`
  ]
  
  const responses = message.toLowerCase().includes('music') || message.toLowerCase().includes('song') 
    ? musicResponses : scottishResponses
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)]
  
  return {
    message: randomResponse,
    personality: message.toLowerCase().includes('music') ? 'music' : 'scottish',
    timestamp: new Date().toISOString()
  }
}

// Default playlists available to everyone
export const defaultPlaylists: Playlist[] = [
  {
    id: 'juice-wrld-essentials',
    name: 'Juice WRLD Essentials',
    owner: 'Opure',
    thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg',
    tracks: [
      {
        id: 'juice-1',
        title: 'Lucid Dreams - Juice WRLD',
        videoId: 'mzB1VGllGMU',
        duration: '4:04',
        thumbnail: 'https://img.youtube.com/vi/mzB1VGllGMU/hqdefault.jpg'
      },
      {
        id: 'juice-2',
        title: 'Robbery - Juice WRLD',
        videoId: 'iI34LYmJ1Fs',
        duration: '4:03',
        thumbnail: 'https://img.youtube.com/vi/iI34LYmJ1Fs/hqdefault.jpg'
      },
      {
        id: 'juice-3',
        title: 'All Girls Are The Same - Juice WRLD',
        videoId: 'h3h3Y-4qk-g',
        duration: '2:45',
        thumbnail: 'https://img.youtube.com/vi/h3h3Y-4qk-g/hqdefault.jpg'
      },
      {
        id: 'juice-4',
        title: 'Bandit ft. YoungBoy - Juice WRLD',
        videoId: 'ySw57tDQPcQ',
        duration: '3:44',
        thumbnail: 'https://img.youtube.com/vi/ySw57tDQPcQ/hqdefault.jpg'
      }
    ]
  },
  {
    id: 'scottish-classics',
    name: 'Scottish Classics',
    owner: 'Opure',
    thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg',
    tracks: [
      {
        id: 'scot-1',
        title: 'The Proclaimers - 500 Miles',
        videoId: 'tbNlMtqrYS0',
        duration: '3:38',
        thumbnail: 'https://img.youtube.com/vi/tbNlMtqrYS0/hqdefault.jpg'
      },
      {
        id: 'scot-2',
        title: 'Lewis Capaldi - Someone You Loved',
        videoId: 'zABzlMbD4gI',
        duration: '3:22',
        thumbnail: 'https://img.youtube.com/vi/zABzlMbD4gI/hqdefault.jpg'
      },
      {
        id: 'scot-3',
        title: 'Simple Minds - Don\'t You Forget About Me',
        videoId: 'CdqoNKCCt7A',
        duration: '4:20',
        thumbnail: 'https://img.youtube.com/vi/CdqoNKCCt7A/hqdefault.jpg'
      },
      {
        id: 'scot-4',
        title: 'Bay City Rollers - Saturday Night',
        videoId: 'z0iCBnf8MIY',
        duration: '3:25',
        thumbnail: 'https://img.youtube.com/vi/z0iCBnf8MIY/hqdefault.jpg'
      }
    ]
  },
  {
    id: 'gaming-energy',
    name: 'Gaming Energy',
    owner: 'Opure',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    tracks: [
      {
        id: 'game-1',
        title: 'TheFatRat - Unity',
        videoId: 'fJ9rUzIMcZQ',
        duration: '4:08',
        thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg'
      },
      {
        id: 'game-2',
        title: 'Alan Walker - Faded',
        videoId: '60ItHLz5WEA',
        duration: '3:32',
        thumbnail: 'https://img.youtube.com/vi/60ItHLz5WEA/hqdefault.jpg'
      },
      {
        id: 'game-3',
        title: 'Marshmello - Alone',
        videoId: 'ALZHF5UqnU4',
        duration: '4:35',
        thumbnail: 'https://img.youtube.com/vi/ALZHF5UqnU4/hqdefault.jpg'
      },
      {
        id: 'game-4',
        title: 'Skrillex - Bangarang',
        videoId: 'YJVmu6yttiw',
        duration: '3:35',
        thumbnail: 'https://img.youtube.com/vi/YJVmu6yttiw/hqdefault.jpg'
      }
    ]
  }
]