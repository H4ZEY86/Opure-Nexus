# core/achievement_system.py
# Advanced Achievement System with Juice WRLD Integration

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import random

@dataclass
class Achievement:
    id: str
    name: str
    description: str
    category: str
    rarity: str
    fragments_reward: int
    source_activity: str
    unlocked_at: datetime
    special_type: Optional[str] = None  # "juice_wrld", "rangers", etc.

@dataclass 
class AchievementCategory:
    name: str
    icon: str
    color: int
    description: str

class JuiceWRLDAchievementGenerator:
    """
    Specialized achievement generator for Juice WRLD content
    Because Legends Never Die, and neither do achievements!
    """
    
    JUICE_WRLD_TRACKS = [
        "Lucid Dreams", "All Girls Are The Same", "Robbery", "Legends", "Righteous",
        "Come & Go", "Wishing Well", "Conversations", "Life's a Mess", "Bad Energy",
        "Armed and Dangerous", "Lean wit Me", "Hear Me Calling", "Empty", "Bandit",
        "Graduation", "Fast", "Feeling", "Stay High", "Maze", "Screw Juice",
        "Ring Ring", "Titanic", "Won't Let Go", "Smile", "Hate the Other Side"
    ]
    
    JUICE_ACHIEVEMENTS = [
        {
            "trigger": "first_juice_song",
            "name": "999 Initiate",
            "description": "Played your first Juice WRLD track - legends never die!",
            "category": "MUSIC",
            "rarity": "RARE",
            "fragments": 200
        },
        {
            "trigger": "juice_streak_5",
            "name": "Lucid Dreamer",
            "description": "Played 5 Juice WRLD songs in a row - pure mental dedication!",
            "category": "MUSIC", 
            "rarity": "EPIC",
            "fragments": 400
        },
        {
            "trigger": "juice_total_25",
            "name": "999 Disciple",
            "description": "Played 25 different Juice WRLD tracks - you ken the catalog!",
            "category": "DISCOVERY",
            "rarity": "LEGENDARY",
            "fragments": 750
        },
        {
            "trigger": "juice_late_night",
            "name": "All Girls Are The Same (At 3AM)",
            "description": "Listening to Juice WRLD during the wee hours - pure emotional hours",
            "category": "META",
            "rarity": "RARE",
            "fragments": 300
        },
        {
            "trigger": "juice_emotional",
            "name": "Righteous Feelings",
            "description": "Played emotional Juice tracks when you needed them most",
            "category": "SOCIAL",
            "rarity": "EPIC",
            "fragments": 500
        }
    ]
    
    @staticmethod
    def is_juice_wrld_track(title: str, artist: str) -> bool:
        """Check if a track is by Juice WRLD"""
        juice_indicators = [
            "juice wrld", "juice world", "jarad higgins", "999",
            "juicewrld", "juice"
        ]
        
        full_text = f"{title} {artist}".lower()
        return any(indicator in full_text for indicator in juice_indicators)
    
    @staticmethod
    def get_juice_achievement(trigger: str, context: Dict = None) -> Optional[Dict]:
        """Get Juice WRLD specific achievement based on trigger"""
        for achievement in JuiceWRLDAchievementGenerator.JUICE_ACHIEVEMENTS:
            if achievement["trigger"] == trigger:
                return achievement.copy()
        return None

class AdvancedAchievementSystem:
    """
    Advanced achievement system with AI generation and Juice WRLD integration
    Pure dead brilliant achievements with Scottish and 999 flair!
    """
    
    def __init__(self, bot, gpu_engine=None):
        self.bot = bot
        self.gpu_engine = gpu_engine
        self.juice_generator = JuiceWRLDAchievementGenerator()
        
        # Achievement categories
        self.categories = {
            "MUSIC": AchievementCategory("Music", "🎵", 0x1f8b4c, "Musical accomplishments and discoveries"),
            "GAMING": AchievementCategory("Gaming", "🎮", 0xe74c3c, "RPG and game-related achievements"),
            "SOCIAL": AchievementCategory("Social", "👥", 0x3498db, "Community interaction achievements"),
            "ECONOMY": AchievementCategory("Economy", "💰", 0xf39c12, "Fragment and shop achievements"),
            "DISCOVERY": AchievementCategory("Discovery", "🔍", 0x9b59b6, "Exploration and feature discovery"),
            "META": AchievementCategory("Meta", "🤖", 0x95a5a6, "System and time-based achievements"),
            "JUICE_WRLD": AchievementCategory("Juice WRLD", "💜", 0x8B00FF, "999 Forever - Juice WRLD dedication"),
            "RANGERS": AchievementCategory("Rangers", "⚽", 0x0033A0, "WATP - Rangers FC achievements")
        }
        
        # User activity tracking
        self.user_activity = {}
        self.juice_streaks = {}
        self.last_activity = {}
    
    async def check_and_award_achievements(self, user_id: int, activity_type: str, **kwargs):
        """
        Enhanced achievement detection with Juice WRLD and Rangers integration
        """
        try:
            # Update user activity tracking
            await self._update_activity_tracking(user_id, activity_type, **kwargs)
            
            # Check for Juice WRLD specific achievements
            juice_achievement = await self._check_juice_wrld_achievements(user_id, activity_type, **kwargs)
            if juice_achievement:
                await self._award_achievement(user_id, juice_achievement, activity_type)
                return
            
            # Check for Rangers FC achievements
            rangers_achievement = await self._check_rangers_achievements(user_id, activity_type, **kwargs)
            if rangers_achievement:
                await self._award_achievement(user_id, rangers_achievement, activity_type)
                return
            
            # Get user stats for AI analysis
            cursor = await self.bot.db.execute("""
                SELECT * FROM user_stats WHERE user_id = ?
            """, (user_id,))
            stats = await cursor.fetchone()
            
            if not stats:
                return
            
            # Enhanced AI achievement generation
            achievement_data = await self._generate_ai_achievement(user_id, activity_type, stats, **kwargs)
            
            if achievement_data:
                await self._award_achievement(user_id, achievement_data, activity_type)
                
        except Exception as e:
            logging.error(f"Achievement check failed: {e}")
    
    async def _update_activity_tracking(self, user_id: int, activity_type: str, **kwargs):
        """Update internal activity tracking for complex achievements"""
        now = datetime.now()
        
        # Initialize user tracking
        if user_id not in self.user_activity:
            self.user_activity[user_id] = {
                "music_streak": 0,
                "juice_streak": 0,
                "commands_today": 0,
                "last_command_date": None
            }
        
        # Track daily command usage
        if activity_type == "command_use":
            today = now.date()
            if self.user_activity[user_id]["last_command_date"] != today:
                self.user_activity[user_id]["commands_today"] = 0
                self.user_activity[user_id]["last_command_date"] = today
            
            self.user_activity[user_id]["commands_today"] += 1
        
        # Track music streaks
        if activity_type == "music_play":
            song_title = kwargs.get("song_title", "")
            artist = kwargs.get("artist", "")
            
            # Check if it's a Juice WRLD track
            if self.juice_generator.is_juice_wrld_track(song_title, artist):
                self.user_activity[user_id]["juice_streak"] += 1
                await self.bot.db.execute("""
                    UPDATE user_stats 
                    SET juice_wrld_tracks_played = juice_wrld_tracks_played + 1
                    WHERE user_id = ?
                """, (user_id,))
            else:
                self.user_activity[user_id]["juice_streak"] = 0
        
        self.last_activity[user_id] = now
    
    async def _check_juice_wrld_achievements(self, user_id: int, activity_type: str, **kwargs) -> Optional[Dict]:
        """Check for Juice WRLD specific achievements"""
        if activity_type != "music_play":
            return None
        
        song_title = kwargs.get("song_title", "")
        artist = kwargs.get("artist", "")
        
        if not self.juice_generator.is_juice_wrld_track(song_title, artist):
            return None
        
        # Get user's Juice WRLD stats
        cursor = await self.bot.db.execute("""
            SELECT juice_wrld_tracks_played FROM user_stats WHERE user_id = ?
        """, (user_id,))
        result = await cursor.fetchone()
        juice_plays = result[0] if result else 0
        
        # Check for first Juice WRLD song
        if juice_plays == 1:
            return self.juice_generator.get_juice_achievement("first_juice_song")
        
        # Check for streak achievements
        juice_streak = self.user_activity.get(user_id, {}).get("juice_streak", 0)
        if juice_streak == 5:
            return self.juice_generator.get_juice_achievement("juice_streak_5")
        
        # Check for total plays milestone
        if juice_plays == 25:
            return self.juice_generator.get_juice_achievement("juice_total_25")
        
        # Check for late night listening (3-6 AM)
        current_hour = datetime.now().hour
        if 3 <= current_hour <= 6:
            return self.juice_generator.get_juice_achievement("juice_late_night")
        
        return None
    
    async def _check_rangers_achievements(self, user_id: int, activity_type: str, **kwargs) -> Optional[Dict]:
        """Check for Rangers FC related achievements"""
        
        # Rangers music achievements
        if activity_type == "music_play":
            song_title = kwargs.get("song_title", "").lower()
            rangers_keywords = ["rangers", "ibrox", "gers", "watp", "follow follow"]
            
            if any(keyword in song_title for keyword in rangers_keywords):
                return {
                    "name": "Blue True Anthem",
                    "description": "Played a Rangers anthem - We Are The People!",
                    "category": "RANGERS",
                    "rarity": "RARE",
                    "fragments": 300,
                    "special_type": "rangers"
                }
        
        # Command usage on Rangers match days (would need API integration)
        # Daily streak achievements with Rangers themes
        if activity_type == "daily_claim":
            cursor = await self.bot.db.execute("""
                SELECT daily_streak FROM user_profiles WHERE user_id = ?
            """, (user_id,))
            result = await cursor.fetchone()
            streak = result[0] if result else 0
            
            if streak == 55:  # 1955 - Rangers founded
                return {
                    "name": "1955 Legend",
                    "description": "55-day streak like Rangers' founding year - pure dedication!",
                    "category": "RANGERS",
                    "rarity": "LEGENDARY",
                    "fragments": 1955,
                    "special_type": "rangers"
                }
        
        return None
    
    async def _generate_ai_achievement(self, user_id: int, activity_type: str, stats: tuple, **kwargs) -> Optional[Dict]:
        """Generate AI-powered achievements with Scottish and Juice WRLD context"""
        
        # Enhanced prompt with Scottish/Juice WRLD personality
        achievement_prompt = f"""
        You are Opure.exe's achievement system - a Scottish AI that loves Rangers FC and Juice WRLD (999 forever!).
        
        Analyze this user activity for potential achievements:
        
        Activity: {activity_type}
        User Stats: Music:{stats[1]}min, Songs:{stats[2]}, Games:{stats[3]}, Commands:{stats[4]}, Juice Plays:{stats[8] if len(stats) > 8 else 0}
        Context: {kwargs}
        
        Scottish Achievement Guidelines:
        - Use Scottish expressions: "pure dead brilliant", "mental", "belter", "aye", "ken"
        - Reference Rangers positively, mock Celtic when appropriate
        - Show enthusiasm for Juice WRLD (999 references)
        - Make achievements feel personal and meaningful
        
        If this activity deserves an achievement, respond EXACTLY in this format:
        ACHIEVEMENT|name|description|category|rarity|fragments
        
        Categories: MUSIC, GAMING, SOCIAL, ECONOMY, DISCOVERY, META
        Rarity: COMMON(50), RARE(150), EPIC(300), LEGENDARY(500), MYTHIC(1000)
        
        Examples with Scottish/Juice WRLD flair:
        ACHIEVEMENT|Digital Dreamer|Like Juice's lucid dreams, you've found your rhythm in the digital realm|MUSIC|RARE|150
        ACHIEVEMENT|Ibrox Commander|Used 50 commands with the dedication of a Rangers supporter|SOCIAL|EPIC|300
        ACHIEVEMENT|999 Seeker|Your quest for digital excellence mirrors Juice's 999 philosophy|META|LEGENDARY|500
        
        Only respond if truly deserving. Consider user's journey and make it special!
        """
        
        try:
            # Use GPU-accelerated AI if available
            if self.gpu_engine:
                ai_response = await self.gpu_engine.generate_enhanced_response(
                    achievement_prompt,
                    context={
                        'user_id': user_id,
                        'activity_type': activity_type,
                        'stats': stats,
                        'personality': 'scottish_juice_wrld'
                    }
                )
            else:
                # Fallback to Ollama
                response = await self.bot.ollama_client.generate(model='opure', prompt=achievement_prompt)
                ai_response = response.get('response', '').strip()
            
            # Parse AI response
            if ai_response.startswith('ACHIEVEMENT|'):
                parts = ai_response.split('|')
                if len(parts) == 6:
                    return {
                        "name": parts[1].strip(),
                        "description": parts[2].strip(),
                        "category": parts[3].strip(),
                        "rarity": parts[4].strip(),
                        "fragments": int(parts[5].strip())
                    }
            
        except Exception as e:
            logging.error(f"AI achievement generation failed: {e}")
        
        return None
    
    async def _award_achievement(self, user_id: int, achievement_data: Dict, source_activity: str):
        """Award achievement to user with enhanced tracking"""
        try:
            achievement_id = f"{user_id}_{achievement_data['name'].replace(' ', '_')}_{int(time.time())}"
            
            # Check for duplicate achievements
            cursor = await self.bot.db.execute("""
                SELECT COUNT(*) FROM achievements 
                WHERE user_id = ? AND achievement_name = ?
            """, (user_id, achievement_data['name']))
            
            count = (await cursor.fetchone())[0]
            if count > 0:
                return  # Already has this achievement
            
            # Insert achievement
            await self.bot.db.execute("""
                INSERT INTO achievements 
                (achievement_id, user_id, achievement_name, description, category, rarity, fragments_reward, source_activity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                achievement_id, user_id, achievement_data['name'], achievement_data['description'],
                achievement_data['category'], achievement_data['rarity'], achievement_data['fragments'], source_activity
            ))
            
            # Award fragments
            await self.bot.db.execute("""
                UPDATE user_profiles 
                SET fragments = fragments + ?
                WHERE user_id = ?
            """, (achievement_data['fragments'], user_id))
            
            # Update achievement count
            await self.bot.db.execute("""
                UPDATE user_stats 
                SET unique_achievements = unique_achievements + 1
                WHERE user_id = ?
            """, (user_id,))
            
            await self.bot.db.commit()
            
            # Post achievement notification
            await self._post_achievement_notification(
                user_id, achievement_data['name'], achievement_data['description'],
                achievement_data['category'], achievement_data['rarity'], achievement_data['fragments']
            )
            
            logging.info(f"🏆 Awarded achievement '{achievement_data['name']}' to user {user_id}")
            
        except Exception as e:
            logging.error(f"Failed to award achievement: {e}")
    
    async def _post_achievement_notification(self, user_id: int, name: str, description: str, 
                                          category: str, rarity: str, fragments: int):
        """Post beautiful achievement notification"""
        try:
            user = self.bot.get_user(user_id)
            if not user:
                return
            
            # Rarity colors and emojis
            rarity_config = {
                "COMMON": {"color": 0x95a5a6, "emoji": "🥉"},
                "RARE": {"color": 0x3498db, "emoji": "🥈"},
                "EPIC": {"color": 0x9b59b6, "emoji": "🥇"},
                "LEGENDARY": {"color": 0xf39c12, "emoji": "🏆"},
                "MYTHIC": {"color": 0xe74c3c, "emoji": "💎"}
            }
            
            config = rarity_config.get(rarity, rarity_config["COMMON"])
            
            # Special handling for Juice WRLD achievements
            if category == "JUICE_WRLD" or "999" in name or "Juice" in name:
                config["emoji"] = "💜"
                config["color"] = 0x8B00FF
            
            # Special handling for Rangers achievements
            if category == "RANGERS" or "Rangers" in name or "Ibrox" in name:
                config["emoji"] = "⚽"
                config["color"] = 0x0033A0
            
            embed_data = {
                "title": f"{config['emoji']} Achievement Unlocked!",
                "description": f"```ansi\n[2;36m> DIGITAL EXCELLENCE RECOGNIZED\n[2;32m> FRAGMENTS AWARDED: {fragments}\n[2;33m> RARITY: {rarity}\n[2;35m> CATEGORY: {category}[0m\n```",
                "color": config["color"],
                "fields": [
                    {
                        "name": f"{config['emoji']} {name}",
                        "value": f"**{description}**\n\n*Pure dead brilliant achievement, {user.display_name}!*",
                        "inline": True
                    },
                    {
                        "name": "💰 Reward",
                        "value": f"**+{fragments:,}** fragments\nKeep up the brilliant work!",
                        "inline": True
                    }
                ],
                "footer": f"Opure Achievement System • {rarity} • 999/WATP"
            }
            
            await self.bot.post_to_opure_channels(embed_data, "economy")
            
        except Exception as e:
            logging.error(f"Failed to post achievement notification: {e}")
    
    async def get_user_achievements(self, user_id: int, category: str = None) -> List[Achievement]:
        """Get user's achievements with optional category filter"""
        query = "SELECT * FROM achievements WHERE user_id = ?"
        params = [user_id]
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        query += " ORDER BY unlocked_at DESC"
        
        cursor = await self.bot.db.execute(query, params)
        results = await cursor.fetchall()
        
        achievements = []
        for row in results:
            achievements.append(Achievement(
                id=row[0], name=row[2], description=row[3], category=row[4],
                rarity=row[5], fragments_reward=row[6], source_activity=row[8],
                unlocked_at=datetime.fromisoformat(row[7])
            ))
        
        return achievements
    
    async def get_achievement_leaderboard(self, category: str = None, limit: int = 10) -> List[Dict]:
        """Get achievement leaderboard"""
        query = """
            SELECT user_id, COUNT(*) as achievement_count,
                   SUM(fragments_reward) as total_fragments,
                   COUNT(CASE WHEN rarity = 'MYTHIC' THEN 1 END) as mythic_count,
                   COUNT(CASE WHEN rarity = 'LEGENDARY' THEN 1 END) as legendary_count
            FROM achievements
        """
        
        params = []
        if category:
            query += " WHERE category = ?"
            params.append(category)
        
        query += """
            GROUP BY user_id
            ORDER BY achievement_count DESC, total_fragments DESC
            LIMIT ?
        """
        params.append(limit)
        
        cursor = await self.bot.db.execute(query, params)
        return await cursor.fetchall()
    
    def get_categories(self) -> Dict[str, AchievementCategory]:
        """Get all achievement categories"""
        return self.categories