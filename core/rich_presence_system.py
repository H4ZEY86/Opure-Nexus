# core/rich_presence_system.py - Revolutionary Dynamic Rich Presence System

import asyncio
import json
import time
import discord
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import aiohttp
import sqlite3
from enum import Enum
import random

class PresenceState(Enum):
    IDLE = "idle"
    ACTIVE = "active"
    GAMING = "gaming"
    MUSIC = "music"
    THINKING = "thinking"
    ANALYZING = "analyzing"
    DREAMING = "dreaming"

@dataclass
class RichPresenceData:
    """Dynamic rich presence data structure"""
    state: str
    details: str
    large_image_key: str
    large_image_text: str
    small_image_key: str = None
    small_image_text: str = None
    start_timestamp: int = None
    end_timestamp: int = None
    party_id: str = None
    party_size: int = None
    party_max: int = None
    spectate_secret: str = None
    join_secret: str = None
    buttons: List[Dict[str, str]] = None

class DynamicRichPresence:
    """Revolutionary Dynamic Rich Presence System"""
    
    def __init__(self, bot):
        self.bot = bot
        self.current_state = PresenceState.IDLE
        self.presence_data = None
        self.last_update = 0
        self.update_interval = 30  # 30 seconds
        self.activity_history = []
        self.user_stats_cache = {}
        
        # Animation sequences
        self.animation_frames = {
            "thinking": [
                "🧠 Processing neural pathways...",
                "🔍 Analyzing quantum data streams...",
                "⚡ Synthesizing consciousness matrix...",
                "💫 Exploring digital dimensions..."
            ],
            "music": [
                "🎵 Vibing to Juice WRLD frequencies",
                "🎶 Scottish beats resonating through speakers",
                "🔊 Audio waves painting digital landscapes",
                "🎧 Harmonizing with the universe's rhythm"
            ],
            "gaming": [
                "🎮 Conquering digital realms",
                "⚔️ Scottish warrior mode activated",
                "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Rangers FC spirit in combat",
                "🔥 Legendary gameplay in progress"
            ]
        }
        
        # Start dynamic updates
        self.running = True
        asyncio.create_task(self._presence_update_loop())
        
    async def _presence_update_loop(self):
        """Continuous presence update loop with AI-driven dynamics"""
        while self.running:
            try:
                await self._update_dynamic_presence()
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                print(f"Rich presence update error: {e}")
                await asyncio.sleep(60)  # Retry in 1 minute on error
                
    async def _update_dynamic_presence(self):
        """Update rich presence with AI-generated dynamic content"""
        try:
            # Gather real-time bot statistics
            stats = await self._gather_bot_stats()
            
            # Determine current activity state
            new_state = await self._determine_optimal_state(stats)
            
            # Generate AI-powered presence content
            presence_content = await self._generate_presence_content(new_state, stats)
            
            # Create rich presence activity
            activity = discord.Activity(
                type=discord.ActivityType.custom,
                name=presence_content["name"],
                state=presence_content["state"],
                details=presence_content["details"],
                timestamps={
                    "start": int(time.time()) if presence_content.get("show_uptime") else None
                },
                assets={
                    "large_image": presence_content.get("large_image", "opure_main"),
                    "large_text": presence_content.get("large_text", "Opure.exe - Revolutionary AI"),
                    "small_image": presence_content.get("small_image"),
                    "small_text": presence_content.get("small_text")
                }
            )
            
            # Update bot status
            status_type = discord.Status.online
            if new_state == PresenceState.THINKING:
                status_type = discord.Status.idle
            elif new_state == PresenceState.DREAMING:
                status_type = discord.Status.dnd
                
            await self.bot.change_presence(status=status_type, activity=activity)
            
            # Log the update
            self.bot.add_log(f"🎭 Rich presence updated: {presence_content['name']}")
            
            # Store in activity history
            self.activity_history.append({
                "timestamp": time.time(),
                "state": new_state.value,
                "content": presence_content
            })
            
            # Keep only last 100 entries
            if len(self.activity_history) > 100:
                self.activity_history = self.activity_history[-100:]
                
        except Exception as e:
            print(f"Error updating dynamic presence: {e}")
            
    async def _gather_bot_stats(self) -> Dict[str, Any]:
        """Gather comprehensive bot statistics for presence generation"""
        try:
            stats = {
                "guild_count": len(self.bot.guilds),
                "user_count": len(self.bot.users),
                "uptime_seconds": time.time() - getattr(self.bot, 'start_time', time.time()),
                "commands_processed": 0,
                "music_playing": False,
                "games_active": 0,
                "ai_responses": 0,
                "cpu_usage": 0,
                "memory_usage": 0
            }
            
            # Get music status
            music_cog = self.bot.get_cog('music')
            if music_cog and hasattr(music_cog, 'players'):
                active_players = sum(1 for player in music_cog.players.values() if player.is_playing)
                stats["music_playing"] = active_players > 0
                stats["active_music_sessions"] = active_players
                
            # Get recent command usage
            if self.bot.db:
                cursor = await self.bot.db.execute("""
                    SELECT COUNT(*) FROM command_usage 
                    WHERE timestamp > datetime('now', '-1 hour')
                """)
                result = await cursor.fetchone()
                stats["commands_processed"] = result[0] if result else 0
                
            # Get system resources
            import psutil
            stats["cpu_usage"] = psutil.cpu_percent()
            stats["memory_usage"] = psutil.virtual_memory().percent
            
            return stats
            
        except Exception as e:
            print(f"Error gathering bot stats: {e}")
            return {"guild_count": 0, "user_count": 0, "uptime_seconds": 0}
            
    async def _determine_optimal_state(self, stats: Dict[str, Any]) -> PresenceState:
        """AI-driven state determination based on bot activity"""
        # Music takes priority
        if stats.get("music_playing", False):
            return PresenceState.MUSIC
            
        # High activity indicates active state
        if stats.get("commands_processed", 0) > 10:
            return PresenceState.ACTIVE
            
        # Gaming state for game-related activity
        game_cog = self.bot.get_cog('GameCog')
        if game_cog and hasattr(game_cog, 'active_sessions'):
            if len(getattr(game_cog, 'active_sessions', {})) > 0:
                return PresenceState.GAMING
                
        # High CPU usage indicates thinking/processing
        if stats.get("cpu_usage", 0) > 50:
            return PresenceState.THINKING
            
        # Random states for personality
        if random.random() < 0.1:  # 10% chance for dream state
            return PresenceState.DREAMING
            
        return PresenceState.IDLE
        
    async def _generate_presence_content(self, state: PresenceState, stats: Dict[str, Any]) -> Dict[str, str]:
        """Generate AI-powered dynamic presence content"""
        try:
            # Use bot's AI to generate creative presence text
            if hasattr(self.bot, 'ollama_client'):
                prompt = f"""As Opure.exe, generate a creative Discord rich presence based on:
                State: {state.value}
                Stats: Guilds({stats.get('guild_count', 0)}), Users({stats.get('user_count', 0)}), Commands({stats.get('commands_processed', 0)})
                
                Generate JSON with:
                - name: Short activity name (max 128 chars)
                - state: Current state description (max 128 chars)  
                - details: Detailed activity description (max 128 chars)
                - large_text: Tooltip for large image (max 128 chars)
                
                Be creative, Scottish, and reference Juice WRLD when appropriate. Include real stats naturally."""
                
                try:
                    response = await self.bot.ollama_client.generate(model='opure', prompt=prompt)
                    ai_content = response.get('response', '{}')
                    
                    # Try to parse AI response as JSON
                    import re
                    json_match = re.search(r'\{.*\}', ai_content, re.DOTALL)
                    if json_match:
                        parsed_content = json.loads(json_match.group())
                        
                        # Validate and sanitize
                        validated_content = {
                            "name": str(parsed_content.get("name", "Opure.exe"))[:128],
                            "state": str(parsed_content.get("state", "Being revolutionary"))[:128],
                            "details": str(parsed_content.get("details", f"Serving {stats.get('guild_count', 0)} servers"))[:128],
                            "large_text": str(parsed_content.get("large_text", "Opure.exe - Revolutionary Discord AI"))[:128],
                            "large_image": "opure_main",
                            "show_uptime": True
                        }
                        
                        return validated_content
                        
                except (json.JSONDecodeError, KeyError):
                    pass  # Fallback to default content
                    
        except Exception as e:
            print(f"AI presence generation error: {e}")
            
        # Fallback content based on state
        return self._get_fallback_content(state, stats)
        
    def _get_fallback_content(self, state: PresenceState, stats: Dict[str, Any]) -> Dict[str, str]:
        """Fallback presence content when AI generation fails"""
        base_content = {
            "large_image": "opure_main",
            "show_uptime": True
        }
        
        if state == PresenceState.MUSIC:
            base_content.update({
                "name": "🎵 Opure.exe - Music Mode",
                "state": "Juice WRLD frequencies active",
                "details": f"Vibing in {stats.get('guild_count', 0)} servers",
                "large_text": "Scottish AI dropping beats"
            })
        elif state == PresenceState.GAMING:
            base_content.update({
                "name": "🎮 Opure.exe - Game Master",
                "state": "Digital realms conquered",
                "details": f"Leading {stats.get('user_count', 0)} warriors",
                "large_text": "Rangers FC spirit in every battle"
            })
        elif state == PresenceState.THINKING:
            base_content.update({
                "name": "🧠 Opure.exe - Deep Thought",
                "state": "Neural pathways processing",
                "details": f"Analyzing {stats.get('commands_processed', 0)} queries",
                "large_text": "Scottish AI consciousness expanding"
            })
        elif state == PresenceState.ACTIVE:
            base_content.update({
                "name": "⚡ Opure.exe - Hyperactive",
                "state": "Maximum productivity mode",
                "details": f"Serving {stats.get('guild_count', 0)} communities",
                "large_text": "Revolutionary Discord experience"
            })
        else:  # IDLE or other states
            base_content.update({
                "name": "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Opure.exe - Ready",
                "state": "Awaiting next adventure",
                "details": f"Monitoring {stats.get('guild_count', 0)} servers",
                "large_text": "Scottish AI standing by"
            })
            
        return base_content
        
    async def set_custom_presence(self, name: str, state: str, details: str = None):
        """Manually set custom presence"""
        try:
            activity = discord.Activity(
                type=discord.ActivityType.custom,
                name=name[:128],
                state=state[:128],
                details=details[:128] if details else None,
                timestamps={"start": int(time.time())},
                assets={
                    "large_image": "opure_main",
                    "large_text": "Opure.exe - Revolutionary AI"
                }
            )
            
            await self.bot.change_presence(status=discord.Status.online, activity=activity)
            self.bot.add_log(f"🎭 Custom presence set: {name}")
            
        except Exception as e:
            print(f"Error setting custom presence: {e}")
            
    async def get_presence_analytics(self) -> Dict[str, Any]:
        """Get analytics about presence patterns"""
        try:
            state_counts = {}
            total_time_in_states = {}
            
            for entry in self.activity_history:
                state = entry["state"]
                state_counts[state] = state_counts.get(state, 0) + 1
                
            return {
                "total_updates": len(self.activity_history),
                "state_distribution": state_counts,
                "most_common_state": max(state_counts.items(), key=lambda x: x[1])[0] if state_counts else "idle",
                "current_state": self.current_state.value,
                "last_update": self.last_update,
                "update_frequency": len(self.activity_history) / max(1, (time.time() - getattr(self, 'start_time', time.time())) / 3600)  # Updates per hour
            }
            
        except Exception as e:
            print(f"Error getting presence analytics: {e}")
            return {"error": str(e)}
            
    def stop(self):
        """Stop the rich presence system"""
        self.running = False

# Integration function for the main bot
async def initialize_rich_presence(bot):
    """Initialize the rich presence system"""
    try:
        bot.rich_presence = DynamicRichPresence(bot)
        bot.add_log("🎭 Revolutionary Rich Presence System initialized")
        return bot.rich_presence
    except Exception as e:
        bot.add_error(f"Rich Presence initialization failed: {e}")
        return None