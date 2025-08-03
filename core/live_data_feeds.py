# core/live_data_feeds.py - Real-time Data Integration for Sentient AI

import asyncio
import aiohttp
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import sqlite3
import threading
from dataclasses import dataclass
import feedparser
import websockets
import discord
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

@dataclass
class DataFeed:
    """Configuration for a live data feed"""
    name: str
    url: str
    feed_type: str  # 'rss', 'api', 'websocket'
    update_interval: int  # seconds
    enabled: bool = True
    last_update: float = 0
    error_count: int = 0
    max_errors: int = 5

class LiveDataManager:
    """Manages real-time data feeds for the sentient AI system"""
    
    def __init__(self, db_path: str = "live_data.db"):
        self.db_path = db_path
        self.session = None
        self.running = False
        self.lock = threading.RLock()
        
        # Initialize database
        self.init_database()
        
        # Configure data feeds
        self.data_feeds = {
            "music_news": DataFeed(
                name="Music Industry News",
                url="https://feeds.feedburner.com/billboard/music-news",
                feed_type="rss",
                update_interval=1800  # 30 minutes
            ),
            "scottish_news": DataFeed(
                name="Scottish News",
                url="https://feeds.bbci.co.uk/news/scotland/rss.xml",
                feed_type="rss", 
                update_interval=3600  # 1 hour
            ),
            "gaming_news": DataFeed(
                name="Gaming News",
                url="https://feeds.feedburner.com/IGNGameReviews",
                feed_type="rss",
                update_interval=3600  # 1 hour
            ),
            "crypto_prices": DataFeed(
                name="Cryptocurrency Prices",
                url="https://api.coinbase.com/v2/exchange-rates?currency=GBP",
                feed_type="api",
                update_interval=300  # 5 minutes
            ),
            "weather_scotland": DataFeed(
                name="Scottish Weather",
                url="https://api.openweathermap.org/data/2.5/weather?q=Edinburgh,UK&appid=YOUR_API_KEY",
                feed_type="api",
                update_interval=1800,  # 30 minutes
                enabled=False  # Requires API key
            ),
            "discord_status": DataFeed(
                name="Discord Status",
                url="https://discordstatus.com/api/v2/status.json",
                feed_type="api",
                update_interval=600  # 10 minutes
            )
        }
        
        self.websocket_feeds = {}
        
    def init_database(self):
        """Initialize the live data database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS live_data_cache (
                    feed_name TEXT,
                    data_key TEXT,
                    data_value TEXT,
                    timestamp REAL,
                    expires_at REAL,
                    PRIMARY KEY (feed_name, data_key)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS feed_status (
                    feed_name TEXT PRIMARY KEY,
                    last_update REAL,
                    last_success REAL,
                    error_count INTEGER,
                    status TEXT
                )
            """)
            
    async def start(self):
        """Start the live data manager"""
        if self.running:
            return
            
        self.running = True
        self.session = aiohttp.ClientSession()
        
        # Start update tasks
        tasks = []
        for feed_name, feed_config in self.data_feeds.items():
            if feed_config.enabled:
                task = asyncio.create_task(self._update_feed_loop(feed_name, feed_config))
                tasks.append(task)
                
        # Start cleanup task
        tasks.append(asyncio.create_task(self._cleanup_expired_data()))
        
        logger.info("Live data manager started")
        
    async def stop(self):
        """Stop the live data manager"""
        self.running = False
        if self.session:
            await self.session.close()
        logger.info("Live data manager stopped")
        
    async def _update_feed_loop(self, feed_name: str, feed_config: DataFeed):
        """Main update loop for a data feed"""
        while self.running:
            try:
                await self._update_feed(feed_name, feed_config)
                await asyncio.sleep(feed_config.update_interval)
            except Exception as e:
                logger.error(f"Error in feed loop for {feed_name}: {e}")
                feed_config.error_count += 1
                
                # Disable feed if too many errors
                if feed_config.error_count >= feed_config.max_errors:
                    feed_config.enabled = False
                    logger.warning(f"Disabled feed {feed_name} due to repeated errors")
                    break
                    
                await asyncio.sleep(60)  # Wait before retry
                
    async def _update_feed(self, feed_name: str, feed_config: DataFeed):
        """Update a specific data feed"""
        try:
            if feed_config.feed_type == "rss":
                await self._update_rss_feed(feed_name, feed_config)
            elif feed_config.feed_type == "api":
                await self._update_api_feed(feed_name, feed_config)
            elif feed_config.feed_type == "websocket":
                await self._update_websocket_feed(feed_name, feed_config)
                
            # Update status
            feed_config.last_update = time.time()
            feed_config.error_count = 0  # Reset error count on success
            
            self._update_feed_status(feed_name, "success")
            
        except Exception as e:
            logger.error(f"Error updating feed {feed_name}: {e}")
            feed_config.error_count += 1
            self._update_feed_status(feed_name, f"error: {str(e)[:100]}")
            
    async def _update_rss_feed(self, feed_name: str, feed_config: DataFeed):
        """Update RSS/Atom feed"""
        async with self.session.get(feed_config.url) as response:
            if response.status == 200:
                content = await response.text()
                feed = feedparser.parse(content)
                
                # Store feed metadata
                self._store_data(feed_name, "title", feed.feed.get("title", ""), hours=24)
                self._store_data(feed_name, "description", feed.feed.get("description", ""), hours=24)
                self._store_data(feed_name, "last_updated", datetime.now().isoformat(), hours=24)
                
                # Store recent entries (last 10)
                recent_entries = []
                for entry in feed.entries[:10]:
                    entry_data = {
                        "title": entry.get("title", ""),
                        "link": entry.get("link", ""),
                        "summary": entry.get("summary", ""),
                        "published": entry.get("published", ""),
                        "published_parsed": entry.get("published_parsed")
                    }
                    recent_entries.append(entry_data)
                    
                self._store_data(feed_name, "recent_entries", json.dumps(recent_entries), hours=6)
                
                logger.debug(f"Updated RSS feed: {feed_name}")
                
    async def _update_api_feed(self, feed_name: str, feed_config: DataFeed):
        """Update API-based feed"""
        headers = {"User-Agent": "Opure.exe/1.0 Scottish AI Bot"}
        
        async with self.session.get(feed_config.url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                
                # Store based on feed type
                if feed_name == "crypto_prices":
                    await self._process_crypto_data(data)
                elif feed_name == "discord_status":
                    await self._process_discord_status(data)
                elif feed_name == "weather_scotland":
                    await self._process_weather_data(data)
                else:
                    # Generic JSON storage
                    self._store_data(feed_name, "data", json.dumps(data), hours=1)
                    
                logger.debug(f"Updated API feed: {feed_name}")
                
    async def _process_crypto_data(self, data: Dict):
        """Process cryptocurrency price data"""
        if "data" in data and "rates" in data["data"]:
            rates = data["data"]["rates"]
            
            # Store key cryptocurrency prices in GBP
            crypto_prices = {}
            for crypto in ["BTC", "ETH", "ADA", "DOT"]:  # Scottish-relevant cryptos
                if crypto in rates:
                    crypto_prices[crypto] = rates[crypto]
                    
            self._store_data("crypto_prices", "rates_gbp", json.dumps(crypto_prices), hours=1)
            self._store_data("crypto_prices", "last_update", datetime.now().isoformat(), hours=1)
            
    async def _process_discord_status(self, data: Dict):
        """Process Discord status data"""
        if "status" in data:
            status_info = {
                "indicator": data["status"]["indicator"],
                "description": data["status"]["description"]
            }
            self._store_data("discord_status", "status", json.dumps(status_info), hours=1)
            
        if "components" in data:
            # Check API and Gateway status
            api_status = "unknown"
            gateway_status = "unknown"
            
            for component in data["components"]:
                if "API" in component.get("name", ""):
                    api_status = component.get("status", "unknown")
                elif "Gateway" in component.get("name", ""):
                    gateway_status = component.get("status", "unknown")
                    
            self._store_data("discord_status", "api_status", api_status, hours=1)
            self._store_data("discord_status", "gateway_status", gateway_status, hours=1)
            
    async def _process_weather_data(self, data: Dict):
        """Process weather data for Scotland"""
        if "weather" in data and "main" in data:
            weather_info = {
                "description": data["weather"][0]["description"],
                "temperature": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "humidity": data["main"]["humidity"],
                "city": data.get("name", "Edinburgh")
            }
            self._store_data("weather_scotland", "current", json.dumps(weather_info), hours=1)
            
    def _store_data(self, feed_name: str, key: str, value: str, hours: float = 1):
        """Store data in the cache database"""
        with self.lock:
            expires_at = time.time() + (hours * 3600)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO live_data_cache 
                    (feed_name, data_key, data_value, timestamp, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (feed_name, key, value, time.time(), expires_at))
                
    def _update_feed_status(self, feed_name: str, status: str):
        """Update feed status in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO feed_status
                (feed_name, last_update, last_success, error_count, status)
                VALUES (?, ?, ?, ?, ?)
            """, (
                feed_name, 
                time.time(),
                time.time() if status == "success" else 0,
                self.data_feeds[feed_name].error_count,
                status
            ))
            
    def get_live_data(self, feed_name: str, key: str = None) -> Optional[Any]:
        """Get live data from cache"""
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                if key:
                    cursor = conn.execute("""
                        SELECT data_value FROM live_data_cache 
                        WHERE feed_name = ? AND data_key = ? AND expires_at > ?
                    """, (feed_name, key, time.time()))
                    
                    result = cursor.fetchone()
                    if result:
                        try:
                            return json.loads(result[0])
                        except:
                            return result[0]
                else:
                    cursor = conn.execute("""
                        SELECT data_key, data_value FROM live_data_cache 
                        WHERE feed_name = ? AND expires_at > ?
                    """, (feed_name, time.time()))
                    
                    results = {}
                    for row in cursor.fetchall():
                        try:
                            results[row[0]] = json.loads(row[1])
                        except:
                            results[row[0]] = row[1]
                    return results if results else None
                    
        return None
        
    def get_contextual_data(self, context: str) -> Dict[str, Any]:
        """Get contextually relevant live data"""
        relevant_data = {}
        
        context_lower = context.lower()
        
        # Music context
        if any(word in context_lower for word in ['music', 'song', 'artist', 'album']):
            music_news = self.get_live_data("music_news", "recent_entries")
            if music_news:
                relevant_data["music_news"] = music_news[:3]  # Top 3 stories
                
        # Scottish context
        if any(word in context_lower for word in ['scotland', 'scottish', 'highland', 'glasgow', 'edinburgh']):
            scottish_news = self.get_live_data("scottish_news", "recent_entries")
            if scottish_news:
                relevant_data["scottish_news"] = scottish_news[:3]
                
            weather = self.get_live_data("weather_scotland", "current")
            if weather:
                relevant_data["weather"] = weather
                
        # Economy/trading context
        if any(word in context_lower for word in ['economy', 'trade', 'invest', 'crypto', 'market']):
            crypto_prices = self.get_live_data("crypto_prices", "rates_gbp")
            if crypto_prices:
                relevant_data["crypto_prices"] = crypto_prices
                
        # Gaming context
        if any(word in context_lower for word in ['game', 'gaming', 'play', 'rpg']):
            gaming_news = self.get_live_data("gaming_news", "recent_entries")
            if gaming_news:
                relevant_data["gaming_news"] = gaming_news[:3]
                
        # Discord context
        if any(word in context_lower for word in ['discord', 'server', 'bot']):
            discord_status = self.get_live_data("discord_status")
            if discord_status:
                relevant_data["discord_status"] = discord_status
                
        return relevant_data
        
    def get_feed_status(self) -> Dict[str, Any]:
        """Get status of all data feeds"""
        status = {}
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM feed_status")
            for row in cursor.fetchall():
                feed_name, last_update, last_success, error_count, status_msg = row
                status[feed_name] = {
                    "last_update": last_update,
                    "last_success": last_success,
                    "error_count": error_count,
                    "status": status_msg,
                    "enabled": self.data_feeds.get(feed_name, DataFeed("", "", "", 0)).enabled
                }
                
        return status
        
    async def _cleanup_expired_data(self):
        """Clean up expired data from cache"""
        while self.running:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute("DELETE FROM live_data_cache WHERE expires_at < ?", (time.time(),))
                    
                await asyncio.sleep(3600)  # Run every hour
                
            except Exception as e:
                logger.error(f"Error during data cleanup: {e}")
                await asyncio.sleep(3600)

class DiscordActivityTracker:
    """Track real-time Discord activity for sentient AI awareness"""
    
    def __init__(self, bot):
        self.bot = bot
        self.activity_data = {}
        self.voice_channel_data = {}
        
    def track_message(self, message):
        """Track message activity"""
        guild_id = str(message.guild.id) if message.guild else "dm"
        channel_id = str(message.channel.id)
        user_id = str(message.author.id)
        
        timestamp = time.time()
        
        # Update activity data
        if guild_id not in self.activity_data:
            self.activity_data[guild_id] = {}
            
        if channel_id not in self.activity_data[guild_id]:
            self.activity_data[guild_id][channel_id] = {
                "message_count": 0,
                "last_activity": 0,
                "active_users": set(),
                "recent_messages": []
            }
            
        channel_data = self.activity_data[guild_id][channel_id]
        channel_data["message_count"] += 1
        channel_data["last_activity"] = timestamp
        channel_data["active_users"].add(user_id)
        
        # Store recent messages (last 10)
        channel_data["recent_messages"].append({
            "user_id": user_id,
            "content": message.content[:100],  # First 100 chars
            "timestamp": timestamp
        })
        
        if len(channel_data["recent_messages"]) > 10:
            channel_data["recent_messages"].pop(0)
            
    def track_voice_activity(self, member, before, after):
        """Track voice channel activity"""
        guild_id = str(member.guild.id)
        user_id = str(member.id)
        timestamp = time.time()
        
        if guild_id not in self.voice_channel_data:
            self.voice_channel_data[guild_id] = {}
            
        # User joined voice channel
        if before.channel is None and after.channel is not None:
            channel_id = str(after.channel.id)
            
            if channel_id not in self.voice_channel_data[guild_id]:
                self.voice_channel_data[guild_id][channel_id] = {
                    "users": {},
                    "total_sessions": 0
                }
                
            self.voice_channel_data[guild_id][channel_id]["users"][user_id] = {
                "joined_at": timestamp,
                "is_speaking": False
            }
            self.voice_channel_data[guild_id][channel_id]["total_sessions"] += 1
            
        # User left voice channel
        elif before.channel is not None and after.channel is None:
            channel_id = str(before.channel.id)
            
            if (guild_id in self.voice_channel_data and 
                channel_id in self.voice_channel_data[guild_id] and
                user_id in self.voice_channel_data[guild_id][channel_id]["users"]):
                
                session_data = self.voice_channel_data[guild_id][channel_id]["users"][user_id]
                session_length = timestamp - session_data["joined_at"]
                
                # Store session data for analytics
                del self.voice_channel_data[guild_id][channel_id]["users"][user_id]
                
    def get_current_activity_context(self, guild_id: str = None) -> Dict[str, Any]:
        """Get current activity context for AI awareness"""
        context = {
            "active_channels": [],
            "voice_activity": [],
            "recent_topics": [],
            "user_activity_level": "quiet"  # quiet, moderate, active, busy
        }
        
        if guild_id:
            guild_data = self.activity_data.get(guild_id, {})
            voice_data = self.voice_channel_data.get(guild_id, {})
            
            # Analyze text channel activity
            active_channels = []
            total_recent_activity = 0
            
            for channel_id, data in guild_data.items():
                if time.time() - data["last_activity"] < 300:  # Active in last 5 minutes
                    active_channels.append({
                        "channel_id": channel_id,
                        "message_count": data["message_count"],
                        "active_users": len(data["active_users"]),
                        "last_activity": data["last_activity"]
                    })
                    total_recent_activity += len(data["active_users"])
                    
            context["active_channels"] = active_channels
            
            # Analyze voice activity
            voice_activity = []
            for channel_id, data in voice_data.items():
                if data["users"]:
                    voice_activity.append({
                        "channel_id": channel_id,
                        "user_count": len(data["users"]),
                        "total_sessions": data["total_sessions"]
                    })
                    
            context["voice_activity"] = voice_activity
            
            # Determine activity level
            if total_recent_activity >= 10:
                context["user_activity_level"] = "busy"
            elif total_recent_activity >= 5:
                context["user_activity_level"] = "active"
            elif total_recent_activity >= 2:
                context["user_activity_level"] = "moderate"
                
        return context

# Global instances
live_data_manager = None
activity_tracker = None

async def get_live_data_manager() -> LiveDataManager:
    """Get or create global live data manager"""
    global live_data_manager
    if live_data_manager is None:
        live_data_manager = LiveDataManager()
        await live_data_manager.start()
    return live_data_manager

def get_activity_tracker(bot) -> DiscordActivityTracker:
    """Get or create global activity tracker"""
    global activity_tracker
    if activity_tracker is None:
        activity_tracker = DiscordActivityTracker(bot)
    return activity_tracker