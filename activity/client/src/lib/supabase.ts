// Supabase client configuration
export interface LeaderboardEntry {
  id: string
  user_id: string
  username: string
  game_id: string
  game_name: string
  score: number
  timestamp: string
  discord_avatar?: string
}

export interface UserGameStats {
  user_id: string
  username: string
  total_games: number
  total_score: number
  best_score: number
  favorite_game: string
  last_played: string
}

// Mock Supabase functions for now - will be replaced with real Supabase client
export class GameDatabase {
  static async saveScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) {
    console.log('🏆 Saving score to Supabase:', entry)
    
    // Simulate API call
    const response = {
      success: true,
      data: {
        ...entry,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      }
    }
    
    // TODO: Replace with real Supabase insert
    /*
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([entry])
      .select()
    */
    
    // Trigger bot webhook for leaderboard updates
    if (response.success) {
      this.triggerBotLeaderboardUpdate(entry.game_id)
    }
    
    return response
  }

  static async getLeaderboard(gameId?: string, limit = 10) {
    console.log('📊 Fetching leaderboard from Supabase')
    
    // Mock data for now
    const mockLeaderboard: LeaderboardEntry[] = [
      {
        id: '1',
        user_id: '1122867183727427644',
        username: 'SpaceAce',
        game_id: 'space_race',
        game_name: 'Space Race 3D',
        score: 15420,
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        user_id: '2233445566778899',
        username: 'CubeMaster',
        game_id: 'cube_dash',
        game_name: 'Cube Dash',
        score: 14890,
        timestamp: new Date().toISOString()
      },
      {
        id: '3',
        user_id: '3344556677889900',
        username: 'BallWizard',
        game_id: 'ball_bouncer',
        game_name: 'Ball Bouncer',
        score: 13650,
        timestamp: new Date().toISOString()
      },
      {
        id: '4',
        user_id: '4455667788990011',
        username: 'ColorKing',
        game_id: 'color_matcher',
        game_name: 'Color Matcher 3D',
        score: 12980,
        timestamp: new Date().toISOString()
      }
    ]
    
    // TODO: Replace with real Supabase query
    /*
    let query = supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit)
    
    if (gameId) {
      query = query.eq('game_id', gameId)
    }
    
    const { data, error } = await query
    */
    
    return {
      success: true,
      data: mockLeaderboard.slice(0, limit)
    }
  }

  static async getUserStats(userId: string) {
    console.log('👤 Fetching user stats from Supabase')
    
    // Mock user stats
    const mockStats: UserGameStats = {
      user_id: userId,
      username: 'Player',
      total_games: 42,
      total_score: 125430,
      best_score: 15420,
      favorite_game: 'Space Race 3D',
      last_played: new Date().toISOString()
    }
    
    // TODO: Replace with real Supabase query
    /*
    const { data, error } = await supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', userId)
      .single()
    */
    
    return {
      success: true,
      data: mockStats
    }
  }

  static async triggerBotLeaderboardUpdate(gameId: string) {
    console.log('🤖 Triggering bot leaderboard update for game:', gameId)
    
    // This would call a webhook to notify your Discord bot
    // Bot would then fetch top 10 and post to gaming channel
    
    try {
      // TODO: Replace with actual webhook URL
      /*
      const webhookUrl = 'https://api.opure.uk/webhook/leaderboard-update'
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          game_id: gameId,
          action: 'update_leaderboard',
          timestamp: new Date().toISOString()
        })
      })
      */
      
      console.log('✅ Bot notified of leaderboard update')
    } catch (error) {
      console.error('❌ Failed to notify bot:', error)
    }
  }
}

// Supabase table schemas for reference:
/*
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discord_avatar TEXT
);

CREATE TABLE user_game_stats (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  favorite_game TEXT,
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX idx_leaderboard_game ON leaderboard(game_id);
CREATE INDEX idx_leaderboard_user ON leaderboard(user_id);
*/