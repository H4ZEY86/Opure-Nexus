-- Opure Discord Activity Database Schema
-- Optimized for Supabase PostgreSQL Free Tier (500MB limit)
-- Designed for Discord bots, activities, and real-time data sync

-- Enable Row Level Security and required extensions
BEGIN;

-- Enable UUID extension for performance
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable real-time subscriptions (Supabase feature)
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Users table - Core Discord user data
CREATE TABLE users (
    id BIGINT PRIMARY KEY, -- Discord user ID (bigint for Discord snowflakes)
    username VARCHAR(32) NOT NULL,
    discriminator VARCHAR(4),
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
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT users_username_check CHECK (LENGTH(username) >= 1)
);

-- Optimized indexes for Discord queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_level ON users(level DESC);
CREATE INDEX idx_users_fragments ON users(fragments DESC);
CREATE INDEX idx_users_last_activity ON users(last_activity DESC);

-- User stats table - Separate for better performance
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

-- Achievements table - Reusable achievement definitions
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(8) DEFAULT '🏆',
    category VARCHAR(32) DEFAULT 'general',
    
    -- Requirements
    requirement_type VARCHAR(32), -- 'fragments', 'level', 'messages', 'music', etc.
    requirement_value INTEGER,
    
    -- Rewards
    reward_fragments INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    reward_shards INTEGER DEFAULT 0,
    
    -- Metadata
    rarity VARCHAR(16) DEFAULT 'common', -- common, rare, epic, legendary
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements - Many-to-many relationship
CREATE TABLE user_achievements (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (user_id, achievement_id)
);

-- Optimized index for achievement queries
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned ON user_achievements(earned_at DESC);

-- Playlists table - User music collections
CREATE TABLE playlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(64) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(256),
    
    -- Metadata
    is_public BOOLEAN DEFAULT false,
    track_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- in seconds
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT playlists_name_check CHECK (LENGTH(name) >= 1)
);

CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_public ON playlists(is_public) WHERE is_public = true;

-- Playlist tracks - Music track data
CREATE TABLE playlist_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    
    -- YouTube/music data
    video_id VARCHAR(16),
    title VARCHAR(128) NOT NULL,
    artist VARCHAR(128),
    duration INTEGER, -- seconds
    thumbnail VARCHAR(256),
    url VARCHAR(512),
    
    -- Playlist position
    position INTEGER NOT NULL DEFAULT 0,
    
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT playlist_tracks_title_check CHECK (LENGTH(title) >= 1)
);

CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
CREATE INDEX idx_playlist_tracks_video ON playlist_tracks(video_id);

-- Activity sessions - Track Discord Activity usage
CREATE TABLE activity_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session data
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- seconds, calculated on end
    
    -- Context
    source VARCHAR(32) DEFAULT 'discord_activity', -- 'discord_activity', 'bot_command', 'web'
    ip_address INET,
    user_agent TEXT,
    
    -- Activity data (JSON for flexibility)
    activity_data JSONB,
    
    -- Indexes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_sessions_user ON activity_sessions(user_id, started_at DESC);
CREATE INDEX idx_activity_sessions_source ON activity_sessions(source);
CREATE INDEX idx_activity_sessions_date ON activity_sessions(started_at::date);

-- Bot commands log - Track command usage
CREATE TABLE bot_commands_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    command VARCHAR(32) NOT NULL,
    params JSONB,
    result JSONB,
    
    -- Execution data
    execution_time INTEGER, -- milliseconds
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Context
    source VARCHAR(32) DEFAULT 'discord', -- 'discord', 'activity', 'api'
    guild_id BIGINT,
    channel_id BIGINT,
    
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_commands_log_user ON bot_commands_log(user_id, executed_at DESC);
CREATE INDEX idx_commands_log_command ON bot_commands_log(command);
CREATE INDEX idx_commands_log_success ON bot_commands_log(success);

-- Real-time sync cache - For performance optimization
CREATE TABLE sync_cache (
    user_id BIGINT PRIMARY KEY,
    
    -- Cached data (JSON for flexibility)
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

-- Triggers for playlist maintenance
CREATE TRIGGER playlist_track_count_trigger
    AFTER INSERT OR DELETE ON playlist_tracks
    FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

-- Function to clean expired cache entries (for maintenance)
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM sync_cache WHERE expires_at < NOW();
    DELETE FROM activity_sessions WHERE ended_at IS NULL AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ language 'plpgsql';

-- Row Level Security (RLS) for multi-tenant security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_commands_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cache ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on authentication needs)
CREATE POLICY "Users can view their own data" ON users
    FOR ALL USING (id = current_setting('app.user_id')::bigint);

CREATE POLICY "Users can view their own stats" ON user_stats
    FOR ALL USING (user_id = current_setting('app.user_id')::bigint);

CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR ALL USING (user_id = current_setting('app.user_id')::bigint);

CREATE POLICY "Users can manage their own playlists" ON playlists
    FOR ALL USING (user_id = current_setting('app.user_id')::bigint);

-- Service role policy (for API access)
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role stats access" ON user_stats
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role achievements access" ON user_achievements
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role playlists access" ON playlists
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role playlist_tracks access" ON playlist_tracks
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role activity_sessions access" ON activity_sessions
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role bot_commands_log access" ON bot_commands_log
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service role sync_cache access" ON sync_cache
    FOR ALL USING (current_user = 'service_role');

COMMIT;

-- Performance optimization queries for monitoring
-- Use these to monitor database performance:

-- Query to check table sizes (useful for free tier monitoring)
/*
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY size_bytes DESC;
*/

-- Query to check index usage
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelname)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
*/

-- Query to find slow queries (for optimization)
/*
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%users%' OR query LIKE '%playlists%'
ORDER BY mean_time DESC
LIMIT 10;
*/