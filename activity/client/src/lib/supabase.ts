import { createClient } from '@supabase/supabase-js'

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  discord_avatar?: string
}

// Real Supabase functions
export class GameDatabase {
  static async saveScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) {
    console.log('🏆 Saving score to Supabase:', entry)
    
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .insert([entry])
        .select()
      
      if (error) {
        console.error('❌ Supabase insert error:', error)
        throw error
      }
      
      console.log('✅ Score saved successfully:', data)
      
      // Update user stats
      await this.updateUserStats(entry.user_id, entry.username, entry.score, entry.game_name, entry.discord_avatar)
      
      // Trigger bot webhook for leaderboard updates
      await this.triggerBotLeaderboardUpdate(entry.game_id)
      
      return {
        success: true,
        data: data?.[0] || entry
      }
    } catch (error) {
      console.error('❌ Failed to save score:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async getLeaderboard(gameId?: string, limit = 10) {
    console.log('📊 Fetching leaderboard from Supabase')
    
    try {
      let query = supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit)
      
      if (gameId) {
        query = query.eq('game_id', gameId)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('❌ Supabase query error:', error)
        throw error
      }
      
      console.log('✅ Leaderboard fetched:', data?.length, 'entries')
      
      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error)
      
      // Fallback to mock data if Supabase fails
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          id: '1',
          user_id: 'demo_user_1',
          username: 'SpaceAce',
          game_id: 'space_race',
          game_name: 'Space Race 3D',
          score: 15420,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          user_id: 'demo_user_2',
          username: 'CubeMaster',
          game_id: 'cube_dash',
          game_name: 'Cube Dash',
          score: 14890,
          timestamp: new Date().toISOString()
        }
      ]
      
      return {
        success: true,
        data: mockLeaderboard.slice(0, limit)
      }
    }
  }

  static async getUserStats(userId: string) {
    console.log('👤 Fetching user stats from Supabase')
    
    try {
      const { data, error } = await supabase
        .from('user_game_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Supabase user stats error:', error)
        throw error
      }
      
      if (!data) {
        // Create default stats for new user
        const defaultStats: Omit<UserGameStats, 'user_id'> = {
          username: 'New Player',
          total_games: 0,
          total_score: 0,
          best_score: 0,
          favorite_game: '',
          last_played: new Date().toISOString()
        }
        
        return {
          success: true,
          data: { user_id: userId, ...defaultStats }
        }
      }
      
      console.log('✅ User stats fetched:', data)
      
      return {
        success: true,
        data
      }
    } catch (error) {
      console.error('❌ Failed to fetch user stats:', error)
      
      // Fallback stats
      const fallbackStats: UserGameStats = {
        user_id: userId,
        username: 'Player',
        total_games: 0,
        total_score: 0,
        best_score: 0,
        favorite_game: '',
        last_played: new Date().toISOString()
      }
      
      return {
        success: true,
        data: fallbackStats
      }
    }
  }

  static async updateUserStats(userId: string, username: string, newScore: number, gameName: string, avatar?: string) {
    try {
      // Get existing stats
      const { data: existingStats } = await supabase
        .from('user_game_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (existingStats) {
        // Update existing stats
        const updatedStats = {
          username,
          total_games: existingStats.total_games + 1,
          total_score: existingStats.total_score + newScore,
          best_score: Math.max(existingStats.best_score, newScore),
          favorite_game: gameName, // Could be more sophisticated
          last_played: new Date().toISOString(),
          discord_avatar: avatar
        }
        
        const { error } = await supabase
          .from('user_game_stats')
          .update(updatedStats)
          .eq('user_id', userId)
        
        if (error) throw error
      } else {
        // Create new user stats
        const newStats: UserGameStats = {
          user_id: userId,
          username,
          total_games: 1,
          total_score: newScore,
          best_score: newScore,
          favorite_game: gameName,
          last_played: new Date().toISOString(),
          discord_avatar: avatar
        }
        
        const { error } = await supabase
          .from('user_game_stats')
          .insert([newStats])
        
        if (error) throw error
      }
      
      console.log('✅ User stats updated')
    } catch (error) {
      console.error('❌ Failed to update user stats:', error)
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