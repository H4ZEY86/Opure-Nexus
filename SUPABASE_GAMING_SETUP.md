# 🎮 Supabase Gaming Tables Setup

Since you already have Supabase set up, just add these tables to your existing project:

## 1. Create Gaming Tables (SQL Editor)

Go to your Supabase dashboard → SQL Editor → New query, and run this:

```sql
-- Leaderboard table for all game scores
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discord_avatar TEXT
);

-- User gaming stats table
CREATE TABLE IF NOT EXISTS user_game_stats (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  favorite_game TEXT,
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discord_avatar TEXT
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_game ON leaderboard(game_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_timestamp ON leaderboard(timestamp DESC);

-- Insert some sample data to test
INSERT INTO leaderboard (user_id, username, game_id, game_name, score) VALUES
('1122867183727427644', 'SpaceAce', 'space_race', 'Space Race 3D', 15420),
('2233445566778899', 'CubeMaster', 'cube_dash', 'Cube Dash', 14890),
('3344556677889900', 'BallWizard', 'ball_bouncer', 'Ball Bouncer', 13650),
('4455667788990011', 'ColorKing', 'color_matcher', 'Color Matcher 3D', 12980);
```

## 2. Get Your Supabase Credentials

From your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with https://)
   - **anon public key** (for client-side access)

## 3. Update Environment Variables

Add these to your `/activity/client/.env` file:

```env
# Add these to your existing .env file
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Create Real Supabase Client

Replace the mock functions in `/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Real functions (replace the mock ones)
export class GameDatabase {
  static async saveScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) {
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([entry])
      .select()
    
    if (error) throw error
    
    // Trigger bot webhook
    await this.triggerBotLeaderboardUpdate(entry.game_id)
    
    return { success: true, data }
  }

  static async getLeaderboard(gameId?: string, limit = 10) {
    let query = supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit)
    
    if (gameId) {
      query = query.eq('game_id', gameId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return { success: true, data: data || [] }
  }
}
```

## 5. Bot Webhook Integration (Optional)

For your bot to auto-post leaderboards:

1. Create a webhook endpoint in your Discord bot
2. Update the `triggerBotLeaderboardUpdate` function
3. Bot can query top 10 and post to gaming channel

## 6. Test the Setup

Once configured, the games will:
- ✅ Save real scores to your Supabase
- ✅ Show real leaderboards  
- ✅ Track user stats
- ✅ Trigger bot notifications (if configured)

Your Discord Activity will have full database persistence! 🎮