# core/database_manager.py
# Advanced Database Management with Connection Pooling

import aiosqlite
import asyncio
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import json

@dataclass
class DatabaseStats:
    total_connections: int
    active_connections: int
    pool_size: int
    total_queries: int
    avg_query_time: float
    cache_hits: int
    cache_misses: int

class DatabasePool:
    """
    Advanced database connection pool for Opure.bot
    Aye, this'll make our database pure dead brilliant!
    """
    
    def __init__(self, db_path: str, pool_size: int = 10, enable_wal: bool = True):
        self.db_path = db_path
        self.pool_size = pool_size
        self.enable_wal = enable_wal
        self.connections = asyncio.Queue(maxsize=pool_size)
        self.active_connections = 0
        self.total_queries = 0
        self.query_times = []
        self.cache = {}
        self.cache_hits = 0
        self.cache_misses = 0
        self.initialized = False
        
    async def initialize(self):
        """Initialize the connection pool"""
        if self.initialized:
            return
            
        for i in range(self.pool_size):
            conn = await aiosqlite.connect(self.db_path)
            
            # Enable WAL mode for better concurrency
            if self.enable_wal:
                await conn.execute("PRAGMA journal_mode=WAL")
                
            # Optimize SQLite settings
            await conn.execute("PRAGMA synchronous=NORMAL")
            await conn.execute("PRAGMA cache_size=10000")
            await conn.execute("PRAGMA temp_store=MEMORY")
            await conn.execute("PRAGMA mmap_size=268435456")  # 256MB
            
            await self.connections.put(conn)
            
        self.initialized = True
        logging.info(f"🚀 Database pool initialized with {self.pool_size} connections")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a connection from the pool"""
        if not self.initialized:
            await self.initialize()
            
        conn = await self.connections.get()
        self.active_connections += 1
        
        try:
            yield conn
        finally:
            self.active_connections -= 1
            await self.connections.put(conn)
    
    async def execute(self, query: str, params: tuple = (), fetch_one: bool = False, fetch_all: bool = False, cache_key: Optional[str] = None):
        """Execute a query with optional caching"""
        start_time = time.time()
        
        # Check cache first
        if cache_key and cache_key in self.cache:
            self.cache_hits += 1
            return self.cache[cache_key]
        
        if cache_key:
            self.cache_misses += 1
        
        async with self.get_connection() as conn:
            cursor = await conn.execute(query, params)
            
            result = None
            if fetch_one:
                result = await cursor.fetchone()
            elif fetch_all:
                result = await cursor.fetchall()
            else:
                result = cursor
            
            await conn.commit()
            
        # Cache result if cache_key provided
        if cache_key and (fetch_one or fetch_all):
            self.cache[cache_key] = result
            
            # Limit cache size
            if len(self.cache) > 1000:
                # Remove oldest 20% of cache entries
                oldest_keys = list(self.cache.keys())[:200]
                for key in oldest_keys:
                    del self.cache[key]
        
        # Track performance
        query_time = time.time() - start_time
        self.query_times.append(query_time)
        self.total_queries += 1
        
        # Keep only last 100 query times for avg calculation
        if len(self.query_times) > 100:
            self.query_times = self.query_times[-50:]
        
        return result
    
    async def execute_many(self, query: str, params_list: List[tuple]):
        """Execute multiple queries efficiently"""
        async with self.get_connection() as conn:
            await conn.executemany(query, params_list)
            await conn.commit()
    
    def clear_cache(self):
        """Clear the query cache"""
        self.cache.clear()
        logging.info("Database cache cleared")
    
    def get_stats(self) -> DatabaseStats:
        """Get database pool statistics"""
        avg_query_time = sum(self.query_times) / len(self.query_times) if self.query_times else 0
        
        return DatabaseStats(
            total_connections=self.pool_size,
            active_connections=self.active_connections,
            pool_size=self.pool_size,
            total_queries=self.total_queries,
            avg_query_time=avg_query_time,
            cache_hits=self.cache_hits,
            cache_misses=self.cache_misses
        )
    
    async def close(self):
        """Close all connections in the pool"""
        while not self.connections.empty():
            conn = await self.connections.get()
            await conn.close()
        
        logging.info("Database pool closed")

class OpureDatabase:
    """
    Main database manager for Opure.bot
    Handles all database operations with Scottish efficiency!
    """
    
    def __init__(self, db_path: str = "opure.db"):
        self.pool = DatabasePool(db_path)
        self.db_path = db_path
    
    async def initialize(self):
        """Initialize database with all required tables"""
        await self.pool.initialize()
        await self._create_tables()
        await self._create_indexes()
        await self._add_new_columns()  # For upgrades
    
    async def _create_tables(self):
        """Create all required database tables"""
        
        # User profiles table
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                fragments INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                lives INTEGER DEFAULT 3,
                daily_streak INTEGER DEFAULT 0,
                last_daily DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Enhanced achievements table
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                achievement_id TEXT PRIMARY KEY,
                user_id INTEGER,
                achievement_name TEXT,
                description TEXT,
                category TEXT,
                rarity TEXT,
                fragments_reward INTEGER,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                source_activity TEXT,
                FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
            )
        """)
        
        # Enhanced user stats table
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS user_stats (
                user_id INTEGER PRIMARY KEY,
                music_minutes INTEGER DEFAULT 0,
                songs_queued INTEGER DEFAULT 0,
                games_completed INTEGER DEFAULT 0,
                commands_used INTEGER DEFAULT 0,
                daily_streak INTEGER DEFAULT 0,
                social_interactions INTEGER DEFAULT 0,
                unique_achievements INTEGER DEFAULT 0,
                juice_wrld_tracks_played INTEGER DEFAULT 0,
                favorite_genres TEXT DEFAULT '[]',
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
            )
        """)
        
        # Daily quests table
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS daily_quests (
                quest_id TEXT PRIMARY KEY,
                user_id INTEGER,
                quest_type TEXT,
                quest_name TEXT,
                description TEXT,
                target_value INTEGER,
                current_progress INTEGER DEFAULT 0,
                fragment_reward INTEGER,
                created_date TEXT,
                completed_at TEXT,
                is_completed INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
            )
        """)
        
        # Enhanced music features table
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS song_features (
                song_id TEXT PRIMARY KEY,
                title TEXT,
                artist TEXT,
                album TEXT,
                features_json TEXT,
                analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_juice_wrld INTEGER DEFAULT 0,
                mood TEXT,
                energy_level REAL,
                tempo INTEGER,
                genre TEXT
            )
        """)
        
        # User music preferences
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS user_music_preferences (
                user_id INTEGER,
                genre TEXT,
                play_count INTEGER DEFAULT 1,
                last_played DATETIME DEFAULT CURRENT_TIMESTAMP,
                avg_rating REAL DEFAULT 0,
                PRIMARY KEY (user_id, genre),
                FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
            )
        """)
        
        # Rate limiting table
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                user_id INTEGER,
                operation TEXT,
                request_count INTEGER DEFAULT 1,
                window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, operation)
            )
        """)
        
        # Performance monitoring
        await self.pool.execute("""
            CREATE TABLE IF NOT EXISTS performance_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                operation TEXT,
                execution_time_ms REAL,
                success INTEGER DEFAULT 1,
                error_message TEXT,
                user_id INTEGER,
                gpu_utilization REAL
            )
        """)
    
    async def _create_indexes(self):
        """Create database indexes for performance"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements (user_id)",
            "CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements (category)",
            "CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements (rarity)",
            "CREATE INDEX IF NOT EXISTS idx_daily_quests_user_id ON daily_quests (user_id)",
            "CREATE INDEX IF NOT EXISTS idx_daily_quests_date ON daily_quests (created_date)",
            "CREATE INDEX IF NOT EXISTS idx_song_features_is_juice ON song_features (is_juice_wrld)",
            "CREATE INDEX IF NOT EXISTS idx_song_features_mood ON song_features (mood)",
            "CREATE INDEX IF NOT EXISTS idx_user_music_prefs_user ON user_music_preferences (user_id)",
            "CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON performance_logs (timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_user_stats_last_activity ON user_stats (last_activity)"
        ]
        
        for index_sql in indexes:
            await self.pool.execute(index_sql)
    
    async def _add_new_columns(self):
        """Add new columns for upgrades (handles existing databases)"""
        try:
            # Add Juice WRLD tracking to user_stats
            await self.pool.execute("ALTER TABLE user_stats ADD COLUMN juice_wrld_tracks_played INTEGER DEFAULT 0")
            await self.pool.execute("ALTER TABLE user_stats ADD COLUMN favorite_genres TEXT DEFAULT '[]'")
            await self.pool.execute("ALTER TABLE user_stats ADD COLUMN last_activity DATETIME DEFAULT CURRENT_TIMESTAMP")
            
            # Add enhanced song features
            await self.pool.execute("ALTER TABLE song_features ADD COLUMN is_juice_wrld INTEGER DEFAULT 0")
            await self.pool.execute("ALTER TABLE song_features ADD COLUMN mood TEXT")
            await self.pool.execute("ALTER TABLE song_features ADD COLUMN energy_level REAL")
            await self.pool.execute("ALTER TABLE song_features ADD COLUMN tempo INTEGER")
            await self.pool.execute("ALTER TABLE song_features ADD COLUMN genre TEXT")
            
        except Exception as e:
            # Columns might already exist
            pass
    
    # User Management
    async def get_user_profile(self, user_id: int) -> Optional[Dict]:
        """Get user profile with caching"""
        result = await self.pool.execute(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            (user_id,),
            fetch_one=True,
            cache_key=f"user_profile_{user_id}"
        )
        
        if result:
            return dict(zip([
                'user_id', 'username', 'fragments', 'level', 'xp', 'lives',
                'daily_streak', 'last_daily', 'created_at', 'updated_at'
            ], result))
        return None
    
    async def update_user_stats(self, user_id: int, **kwargs):
        """Update user statistics"""
        # Clear cache for this user
        self.pool.cache.pop(f"user_profile_{user_id}", None)
        self.pool.cache.pop(f"user_stats_{user_id}", None)
        
        # Build dynamic update query
        set_clauses = []
        params = []
        
        for key, value in kwargs.items():
            set_clauses.append(f"{key} = ?")
            params.append(value)
        
        if set_clauses:
            params.append(user_id)
            query = f"""
                INSERT OR REPLACE INTO user_stats 
                (user_id, {', '.join(kwargs.keys())}, last_activity)
                VALUES (?, {', '.join(['?' for _ in kwargs])}, CURRENT_TIMESTAMP)
            """
            await self.pool.execute(query, params)
    
    async def track_juice_wrld_play(self, user_id: int):
        """Track when user plays a Juice WRLD song"""
        await self.pool.execute("""
            UPDATE user_stats 
            SET juice_wrld_tracks_played = juice_wrld_tracks_played + 1,
                last_activity = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (user_id,))
        
        # Clear cache
        self.pool.cache.pop(f"user_stats_{user_id}", None)
    
    async def get_top_juice_wrld_fans(self, limit: int = 10) -> List[Dict]:
        """Get top Juice WRLD fans by play count"""
        result = await self.pool.execute("""
            SELECT user_id, juice_wrld_tracks_played
            FROM user_stats
            WHERE juice_wrld_tracks_played > 0
            ORDER BY juice_wrld_tracks_played DESC
            LIMIT ?
        """, (limit,), fetch_all=True)
        
        return [{"user_id": row[0], "juice_plays": row[1]} for row in result]
    
    async def log_performance(self, operation: str, execution_time: float, success: bool = True, 
                            error: str = None, user_id: int = None, gpu_utilization: float = None):
        """Log performance metrics"""
        await self.pool.execute("""
            INSERT INTO performance_logs 
            (operation, execution_time_ms, success, error_message, user_id, gpu_utilization)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (operation, execution_time * 1000, int(success), error, user_id, gpu_utilization))
    
    async def cleanup_old_data(self):
        """Clean up old performance logs and rate limit data"""
        # Remove performance logs older than 7 days
        await self.pool.execute("""
            DELETE FROM performance_logs 
            WHERE timestamp < datetime('now', '-7 days')
        """)
        
        # Remove old rate limit entries
        await self.pool.execute("""
            DELETE FROM rate_limits 
            WHERE window_start < datetime('now', '-1 day')
        """)
    
    def get_stats(self) -> DatabaseStats:
        """Get database pool statistics"""
        return self.pool.get_stats()
    
    async def close(self):
        """Close the database pool"""
        await self.pool.close()

# Global database instance
db = OpureDatabase()