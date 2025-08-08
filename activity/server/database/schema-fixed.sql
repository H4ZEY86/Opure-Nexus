-- Opure Discord Activity Database Schema - FIXED VERSION
-- Optimized for Supabase PostgreSQL with corrected syntax
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Core Discord user data
CREATE TABLE users (
    id BIGINT PRIMARY KEY, -- Discord user ID
    username VARCHAR(32) NOT NULL DEFAULT 'User',
    discriminator VARCHAR(4) DEFAULT '0000',
    global_name VARCHAR(32),
    avatar VARCHAR(64),
    
    -- Economy system
    fragments BIGINT DEFAULT 100 CHECK (fragments >= 0),
    data_shards INTEGER DEFAULT 0 CHECK (data_shards >= 0),
    log_keys INTEGER DEFAULT 1 CHECK (log_keys >= 0),
    
    -- Progression system
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    xp BIGINT DEFAULT 0 CHECK (xp >= 0),
    lives INTEGER DEFAULT 3 CHECK (lives >= 0 AND lives <= 10),
    daily_streak INTEGER DEFAULT 0 CHECK (daily_streak >= 0),
    last_daily DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_level ON users(level DESC);
CREATE INDEX idx_users_fragments ON users(fragments DESC);
CREATE INDEX idx_users_last_activity ON users(last_activity DESC);

-- User stats table
CREATE TABLE user_stats (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity counters
    messages_sent BIGINT DEFAULT 0,
    commands_used BIGINT DEFAULT 0,
    music_tracks_played BIGINT DEFAULT 0,
    games_completed INTEGER DEFAULT 0,
    ai_conversations BIGINT DEFAULT 0,
    voice_minutes INTEGER DEFAULT 0,
    
    -- Session data
    total_sessions INTEGER DEFAULT 0,
    last_session_duration INTEGER DEFAULT 0,
    longest_session INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements table
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(8) DEFAULT '🏆',
    category VARCHAR(32) DEFAULT 'general',
    
    -- Requirements
    requirement_type VARCHAR(32),
    requirement_value INTEGER,
    
    -- Rewards
    reward_fragments INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    reward_shards INTEGER DEFAULT 0,
    
    -- Metadata
    rarity VARCHAR(16) DEFAULT 'common',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (user_id, achievement_id)
);

-- Playlists table
CREATE TABLE playlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(64) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(256),
    
    -- Metadata
    is_public BOOLEAN DEFAULT false,
    track_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playlist tracks
CREATE TABLE playlist_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    
    -- Music data
    video_id VARCHAR(16),
    title VARCHAR(128) NOT NULL,
    artist VARCHAR(128),
    duration INTEGER,
    thumbnail VARCHAR(256),
    url VARCHAR(512),
    
    -- Position
    position INTEGER NOT NULL DEFAULT 0,
    
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity sessions
CREATE TABLE activity_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session data
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    
    -- Context
    source VARCHAR(32) DEFAULT 'discord_activity',
    ip_address INET,
    user_agent TEXT,
    
    -- Activity data
    activity_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot commands log
CREATE TABLE bot_commands_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    command VARCHAR(32) NOT NULL,
    params JSONB,
    result JSONB,
    
    -- Execution data
    execution_time INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Context
    source VARCHAR(32) DEFAULT 'discord',
    guild_id BIGINT,
    channel_id BIGINT,
    
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync cache
CREATE TABLE sync_cache (
    user_id BIGINT PRIMARY KEY,
    
    -- Cached data
    user_data JSONB NOT NULL,
    achievements_data JSONB,
    stats_data JSONB,
    
    -- Cache metadata
    cache_version INTEGER DEFAULT 1,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
    
    -- Source tracking
    source VARCHAR(32) DEFAULT 'api_sync',
    sync_successful BOOLEAN DEFAULT true
);

-- Create optimized indexes
CREATE INDEX idx_user_stats_user ON user_stats(user_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned ON user_achievements(earned_at DESC);
CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_public ON playlists(is_public) WHERE is_public = true;
CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
CREATE INDEX idx_playlist_tracks_video ON playlist_tracks(video_id);
CREATE INDEX idx_activity_sessions_user ON activity_sessions(user_id, started_at DESC);
CREATE INDEX idx_activity_sessions_source ON activity_sessions(source);
CREATE INDEX idx_commands_log_user ON bot_commands_log(user_id, executed_at DESC);
CREATE INDEX idx_commands_log_command ON bot_commands_log(command);
CREATE INDEX idx_commands_log_success ON bot_commands_log(success);
CREATE INDEX idx_sync_cache_expires ON sync_cache(expires_at);
CREATE INDEX idx_sync_cache_source ON sync_cache(source);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, reward_fragments, reward_xp) VALUES
('First Steps', 'Complete your first action in Opure', '🏃', 'starter', 'sessions', 1, 100, 50),
('Music Lover', 'Play 10 music tracks', '🎵', 'music', 'music_tracks_played', 10, 200, 100),
('Fragment Hunter', 'Collect 1000 fragments', '💎', 'economy', 'fragments', 1000, 500, 250),
('Level Up', 'Reach level 10', '⭐', 'progression', 'level', 10, 1000, 500),
('Social Butterfly', 'Use the Activity for 10 sessions', '🦋', 'social', 'sessions', 10, 300, 150),
('Command Master', 'Use 50 bot commands', '⚡', 'commands', 'commands_used', 50, 400, 200),
('Daily Dedication', 'Maintain a 7-day streak', '🔥', 'daily', 'daily_streak', 7, 700, 350),
('AI Conversationalist', 'Have 25 AI conversations', '🤖', 'ai', 'ai_conversations', 25, 300, 150),
('Voice Champion', 'Spend 2 hours in voice channels', '🎤', 'voice', 'voice_minutes', 120, 600, 300),
('Legendary User', 'Reach level 50', '👑', 'legendary', 'level', 50, 5000, 2500);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to maintain playlist track counts
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE playlists 
        SET track_count = track_count + 1,
            updated_at = NOW()
        WHERE id = NEW.playlist_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE playlists 
        SET track_count = GREATEST(track_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.playlist_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for playlist maintenance
CREATE TRIGGER playlist_track_count_trigger
    AFTER INSERT OR DELETE ON playlist_tracks
    FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM sync_cache WHERE expires_at < NOW();
    DELETE FROM activity_sessions WHERE ended_at IS NULL AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ language 'plpgsql';

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_commands_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service role (API access)
CREATE POLICY "Service role full access users" ON users FOR ALL USING (current_user = 'service_role');
CREATE POLICY "Service role full access user_stats" ON user_stats FOR ALL USING (current_user = 'service_role');
CREATE POLICY "Service role full access user_achievements" ON user_achievements FOR ALL USING (current_user = 'service_role');
CREATE POLICY "Service role full access playlists" ON playlists FOR ALL USING (current_user = 'service_role');
CREATE POLICY "Service role full access playlist_tracks" ON playlist_tracks FOR ALL USING (current_user = 'service_role');
CREATE POLICY "Service role full access activity_sessions" ON activity_sessions FOR ALL USING (current_user = 'service_role');
CREATE POLICY "Service role full access bot_commands_log" ON bot_commands_log FOR ALL USING (current_user = 'service_role');
CREATE POLICY "Service role full access sync_cache" ON sync_cache FOR ALL USING (current_user = 'service_role');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Opure Discord Activity database schema created successfully!';
    RAISE NOTICE '📊 Created 8 tables with optimized indexes and triggers';
    RAISE NOTICE '🏆 Inserted 10 default achievements';
    RAISE NOTICE '🔐 Enabled Row Level Security for all tables';
    RAISE NOTICE '🚀 Database ready for Discord Activity integration!';
END $$;