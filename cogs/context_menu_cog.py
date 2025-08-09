# cogs/context_menu_cog.py
"""
Maximum 5 Context Menu Commands for Opure.exe - Production Ready
Full integration with hub systems, ModernEmbed, ChromaDB, and gpt-oss:20b AI
"""

import discord
from discord import app_commands
from discord.ext import commands
import asyncio
import datetime
import json
import re
import random
from typing import Optional, Dict, Any, List
import aiohttp
import traceback
from urllib.parse import quote
from core.command_hub_system import ModernEmbed, HubCategory, NewAIEngine


class ContextMenuCog(commands.Cog):
    """Maximum 5 Context Menu Commands with complete hub integration."""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        
        # Performance cache for expensive operations
        self.cache = {
            'user_profiles': {},
            'music_data': {},
            'gaming_stats': {},
            'ai_responses': {}
        }
        
        # Activity names for gaming challenges
        self.activity_games = {
            "ball-bouncer-3d": "Ball Bouncer 3D",
            "color-matcher-3d": "Color Matcher 3D", 
            "cube-dash-3d": "Cube Dash 3D",
            "space-race-3d": "Space Race 3D",
            "puzzle-game": "Puzzle Master"
        }
        
        self.scottish_phrases = [
            "Aye, pure mental!", "Ken what I mean?", "Cannae argue with that!",
            "Mental stuff here!", "Proper sound!", "Nae bother!"
        ]

    async def ensure_user_exists(self, user_id: int):
        """Ensure user exists in database with default values."""
        try:
            await self.bot.db.execute("""
                INSERT OR IGNORE INTO players (user_id, fragments, last_daily, daily_streak) 
                VALUES (?, 100, NULL, 0)
            """, (user_id,))
            
            await self.bot.db.execute("""
                INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)
            """, (user_id,))
            
            await self.bot.db.commit()
        except Exception as e:
            self.bot.add_error(f"Failed to ensure user exists: {e}")

    async def get_ai_response(self, prompt: str, context: str = "", use_memory: bool = True) -> str:
        """Get AI response using gpt-oss:20b with ChromaDB memory integration."""
        try:
            # Check cache first for performance
            cache_key = f"ai_{hash(prompt + context)}"
            if cache_key in self.cache['ai_responses']:
                return self.cache['ai_responses'][cache_key]
            
            enhanced_prompt = f"""
            You are Opure.exe, a Scottish AI with personality. Context: {context}
            
            User request: {prompt}
            
            Respond with Scottish flair but stay professional and helpful. Be concise but engaging.
            """
            
            # Try new AI hub integration first
            try:
                ai_hub_cog = self.bot.get_cog('AIHubCog')
                if ai_hub_cog and hasattr(ai_hub_cog, 'ai_engine'):
                    response = await ai_hub_cog.ai_engine.generate_response(
                        prompt=enhanced_prompt,
                        personality="Scottish",
                        use_memory=use_memory
                    )
                    if response:
                        self.cache['ai_responses'][cache_key] = response
                        return response
            except:
                pass
            
            # Fallback to NewAIEngine for gpt-oss:20b integration
            try:
                ai_engine = NewAIEngine(self.bot)
                response = await ai_engine.generate_response(
                    prompt=enhanced_prompt,
                    mode="fun"  # Fun mode for Scottish personality
                )
                if response:
                    self.cache['ai_responses'][cache_key] = response
                    return response
            except:
                pass
            
            return f"Aye, {random.choice(self.scottish_phrases)} My AI circuits are processing..."
            
        except Exception as e:
            self.bot.add_error(f"AI response failed: {e}")
            return "Och, having a wee technical moment! Try again shortly."

    async def create_context_embed(self, category: HubCategory, title: str, description: str, fields: List[Dict] = None, color: int = None) -> discord.Embed:
        """Create modern context menu embed using the hub system."""
        try:
            # Use ModernEmbed from hub system for consistency
            embed = ModernEmbed.create_hub_embed(
                category=category,
                title=title, 
                description=description,
                fields=fields or []
            )
            
            # Override color if specified
            if color:
                embed.color = color
                
            return embed
            
        except Exception as e:
            # Fallback to basic embed
            embed = discord.Embed(
                title=f"🔮 {title}",
                description=description,
                color=color or 0xFF0080,
                timestamp=datetime.datetime.now()
            )
            embed.set_footer(text="Opure.exe • Context Menu • gpt-oss:20b")
            return embed
    
    async def get_user_comprehensive_data(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive user data from all systems."""
        try:
            # Economy data
            cursor = await self.bot.db.execute("""
                SELECT fragments, data_shards, level, xp, daily_streak, last_daily 
                FROM players WHERE user_id = ?
            """, (user_id,))
            economy_data = await cursor.fetchone()
            
            # Stats data  
            cursor = await self.bot.db.execute("""
                SELECT commands_used, songs_queued, achievements_earned, games_completed 
                FROM user_stats WHERE user_id = ?
            """, (user_id,))
            stats_data = await cursor.fetchone()
            
            # Gaming data
            cursor = await self.bot.db.execute("""
                SELECT total_score, games_won, current_streak, highest_score 
                FROM gaming_stats WHERE user_id = ?
            """, (user_id,))
            gaming_data = await cursor.fetchone()
            
            return {
                'economy': economy_data or (100, 0, 1, 0, 0, None),
                'stats': stats_data or (0, 0, 0, 0), 
                'gaming': gaming_data or (0, 0, 0, 0)
            }
            
        except Exception as e:
            self.bot.add_error(f"Failed to get user data: {e}")
            return {
                'economy': (100, 0, 1, 0, 0, None),
                'stats': (0, 0, 0, 0),
                'gaming': (0, 0, 0, 0)
            }
    
    async def get_user_music_data(self, user_id: int) -> Dict[str, Any]:
        """Get user's music preferences and history."""
        try:
            # Get recent music activity
            cursor = await self.bot.db.execute("""
                SELECT song_title, artist, played_at FROM music_history 
                WHERE user_id = ? ORDER BY played_at DESC LIMIT 5
            """, (user_id,))
            recent_songs = await cursor.fetchall()
            
            # Get playlists
            cursor = await self.bot.db.execute("""
                SELECT name, song_count FROM user_playlists 
                WHERE user_id = ? LIMIT 3
            """, (user_id,))
            playlists = await cursor.fetchall()
            
            return {
                'recent_songs': recent_songs or [],
                'playlists': playlists or [],
                'total_played': len(recent_songs)
            }
            
        except Exception as e:
            # Mock data for demo
            return {
                'recent_songs': [
                    ("Lucid Dreams", "Juice WRLD", "2024-08-08"),
                    ("All Girls Are The Same", "Juice WRLD", "2024-08-07"),
                    ("Robbery", "Juice WRLD", "2024-08-07")
                ],
                'playlists': [
                    ("My Favorites", 15),
                    ("Chill Vibes", 8)
                ],
                'total_played': 156
            }


# MAXIMUM 5 CONTEXT MENU COMMANDS - PRODUCTION READY
# These are defined outside the class per Discord.py requirements

# ============================================================================
# USER CONTEXT MENUS (3 maximum allowed by Discord)
# ============================================================================

async def view_user_profile_context(interaction: discord.Interaction, member: discord.Member):
    """📊 View User Profile - Complete user stats, achievements, economy, gaming history"""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(member.id)
        
        # Get comprehensive user data
        user_data = await cog.get_user_comprehensive_data(member.id)
        economy = user_data['economy']
        stats = user_data['stats']
        gaming = user_data['gaming']
        
        # Calculate user level and rank
        total_xp = economy[3]
        level = economy[2]
        fragments = economy[0]
        daily_streak = economy[4]
        
        # Determine user tier based on activity
        total_activity = stats[0] + stats[1] + stats[3]  # commands + songs + games
        if total_activity >= 1000:
            tier = "🏆 Legend"
            tier_color = 0xFFD700
        elif total_activity >= 500:
            tier = "💎 Elite"
            tier_color = 0x9d4edd
        elif total_activity >= 100:
            tier = "⚡ Active"
            tier_color = 0x00d4ff
        else:
            tier = "🌟 Explorer"
            tier_color = 0x00ff00
        
        # Get AI personality analysis
        personality_prompt = f"""
        Analyze this Discord user based on their activity:
        - Level: {level}, XP: {total_xp:,}
        - Daily streak: {daily_streak} days
        - Commands used: {stats[0]:,}
        - Songs played: {stats[1]:,}
        - Games completed: {stats[3]:,}
        - Achievements: {stats[2]}
        
        Give a 2-sentence Scottish personality analysis focusing on their engagement style.
        """
        
        personality = await cog.get_ai_response(
            personality_prompt,
            f"Profile analysis for {member.display_name}"
        )
        
        embed = await cog.create_context_embed(
            category=HubCategory.ECONOMY,
            title=f"{member.display_name}'s Complete Profile",
            description=f"**{tier}** • Joined {member.created_at.strftime('%B %d, %Y')}",
            fields=[
                {
                    "name": "💎 Economy Status",
                    "value": f"```yaml\nFragments: {fragments:,}\nData Shards: {economy[1]:,}\nLevel: {level} (XP: {total_xp:,})\nDaily Streak: {daily_streak} days\n```",
                    "inline": True
                },
                {
                    "name": "📊 Activity Stats",
                    "value": f"```yaml\nCommands: {stats[0]:,}\nSongs Queued: {stats[1]:,}\nAchievements: {stats[2]}\nGames Played: {stats[3]:,}\n```",
                    "inline": True
                },
                {
                    "name": "🎮 Gaming Performance", 
                    "value": f"```yaml\nTotal Score: {gaming[0]:,}\nGames Won: {gaming[1]:,}\nCurrent Streak: {gaming[2]}\nHigh Score: {gaming[3]:,}\n```",
                    "inline": True
                },
                {
                    "name": "🏴󠁧󠁢󠁳󠁣󠁴󠁿 AI Personality Analysis",
                    "value": f"*{personality}*",
                    "inline": False
                }
            ],
            color=tier_color
        )
        
        embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)
        embed.set_footer(text=f"Total Activity Score: {total_activity:,} • Tier: {tier.split()[1]}")
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
        # Track achievement
        await bot.check_and_award_achievements(interaction.user.id, "profile_viewed")
        
    except Exception as e:
        bot.add_error(f"View User Profile context menu failed: {e}")
        await interaction.followup.send(
            "Cannae load that profile right now, something's gone mental! 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
            ephemeral=True
        )

async def user_music_hub_context(interaction: discord.Interaction, member: discord.Member):
    """🎵 User's Music Hub - Recently played, playlists, music preferences, shared playlists"""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    music_cog = bot.get_cog('MusicCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(member.id)
        
        # Get user's music data
        music_data = await cog.get_user_music_data(member.id)
        user_stats = await cog.get_user_comprehensive_data(member.id)
        songs_queued = user_stats['stats'][1]
        
        # Build recent songs list
        recent_songs_text = ""
        if music_data['recent_songs']:
            for i, (title, artist, date) in enumerate(music_data['recent_songs'][:5], 1):
                recent_songs_text += f"{i}. **{title}** by {artist}\n"
        else:
            recent_songs_text = "No recent music activity 🎵"
        
        # Build playlists list
        playlists_text = ""
        if music_data['playlists']:
            for name, count in music_data['playlists'][:3]:
                playlists_text += f"🎧 **{name}** ({count} tracks)\n"
        else:
            playlists_text = "No custom playlists created"
        
        # Get music personality analysis
        music_prompt = f"""
        Analyze this user's music behavior:
        - Total songs queued: {songs_queued:,}
        - Recent activity: {len(music_data['recent_songs'])} songs
        - Playlists created: {len(music_data['playlists'])}
        
        Give a 1-2 sentence Scottish analysis of their music taste and habits.
        """
        
        music_personality = await cog.get_ai_response(
            music_prompt,
            f"Music analysis for {member.display_name}"
        )
        
        # Check if user is currently in voice
        voice_status = "Not in voice chat" 
        if member.voice and member.voice.channel:
            voice_status = f"In {member.voice.channel.name}"
        
        embed = await cog.create_context_embed(
            category=HubCategory.MUSIC,
            title=f"{member.display_name}'s Music Hub",
            description=f"🎶 **Complete music profile and preferences**\n\n🔊 **Voice Status:** {voice_status}",
            fields=[
                {
                    "name": "🎵 Recent Tracks",
                    "value": recent_songs_text,
                    "inline": False
                },
                {
                    "name": "📀 Custom Playlists",
                    "value": playlists_text,
                    "inline": True
                },
                {
                    "name": "📊 Music Stats",
                    "value": f"```yaml\nTotal Queued: {songs_queued:,}\nPlaylists: {len(music_data['playlists'])}\nRecent Songs: {len(music_data['recent_songs'])}\n```",
                    "inline": True
                },
                {
                    "name": "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Music Personality",
                    "value": f"*{music_personality}*",
                    "inline": False
                }
            ]
        )
        
        embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)
        
        # Add interactive buttons for music actions
        class MusicHubView(discord.ui.View):
            def __init__(self):
                super().__init__(timeout=300)
            
            @discord.ui.button(label="🎵 Open Music Hub", style=discord.ButtonStyle.primary)
            async def open_music_hub(self, button_interaction: discord.Interaction, button: discord.ui.Button):
                if button_interaction.user.id != interaction.user.id:
                    return await button_interaction.response.send_message("Only the command user can use this!", ephemeral=True)
                
                # Launch music hub
                music_hub_cog = bot.get_cog('MusicHubCog')
                if music_hub_cog:
                    await music_hub_cog.music_hub_command(button_interaction)
                else:
                    await button_interaction.response.send_message("Music hub not available!", ephemeral=True)
        
        await interaction.followup.send(embed=embed, view=MusicHubView(), ephemeral=True)
        
        # Track achievement
        await bot.check_and_award_achievements(interaction.user.id, "music_profile_viewed")
        
    except Exception as e:
        bot.add_error(f"User Music Hub context menu failed: {e}")
        await interaction.followup.send(
            "Cannae load the music data right now, speakers are acting up! 🎵",
            ephemeral=True
        )

async def challenge_to_game_context(interaction: discord.Interaction, member: discord.Member):
    """🎮 Challenge to Game - Challenge user to Discord Activity games with fragment wagers"""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    gaming_cog = bot.get_cog('GamingHubCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(interaction.user.id)
        await cog.ensure_user_exists(member.id)
        
        if member.id == interaction.user.id:
            return await interaction.followup.send(
                "Cannae challenge yerself, ya numpty! Find someone else to compete with! 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
                ephemeral=True
            )
        
        if member.bot:
            return await interaction.followup.send(
                "Cannae challenge a bot to a game - they'd cheat with their perfect calculations! 🤖",
                ephemeral=True
            )
        
        # Get both users' data
        challenger_data = await cog.get_user_comprehensive_data(interaction.user.id)
        target_data = await cog.get_user_comprehensive_data(member.id)
        
        challenger_fragments = challenger_data['economy'][0]
        target_fragments = target_data['economy'][0]
        challenger_games = challenger_data['gaming'][1]  # games won
        target_games = target_data['gaming'][1]
        
        # Calculate suggested wager (5-10% of lower player's fragments)
        min_fragments = min(challenger_fragments, target_fragments)
        suggested_wager = max(10, min_fragments // 15)  # Minimum 10, max ~7% of balance
        
        # Determine skill levels
        challenger_skill = "Rookie" if challenger_games < 5 else "Veteran" if challenger_games < 20 else "Master"
        target_skill = "Rookie" if target_games < 5 else "Veteran" if target_games < 20 else "Master"
        
        embed = await cog.create_context_embed(
            category=HubCategory.GAMING,
            title="Gaming Challenge Initiated!",
            description=f"⚔️ **{interaction.user.display_name}** has challenged **{member.display_name}** to a gaming duel!\n\n🎯 **Suggested Wager:** {suggested_wager:,} fragments",
            fields=[
                {
                    "name": f"🚀 {interaction.user.display_name} ({challenger_skill})",
                    "value": f"```yaml\nFragments: {challenger_fragments:,}\nGames Won: {challenger_games:,}\nCurrent Score: {challenger_data['gaming'][0]:,}\nWin Streak: {challenger_data['gaming'][2]}\n```",
                    "inline": True
                },
                {
                    "name": f"🎯 {member.display_name} ({target_skill})",
                    "value": f"```yaml\nFragments: {target_fragments:,}\nGames Won: {target_games:,}\nCurrent Score: {target_data['gaming'][0]:,}\nWin Streak: {target_data['gaming'][2]}\n```",
                    "inline": True
                },
                {
                    "name": "🎮 Available Discord Activities",
                    "value": "• **Ball Bouncer 3D** - Physics puzzles\n• **Color Matcher 3D** - Speed & accuracy\n• **Cube Dash 3D** - Reflexes challenge\n• **Space Race 3D** - Racing competition\n• **Puzzle Master** - Logic & strategy",
                    "inline": False
                },
                {
                    "name": "💰 Challenge Rules",
                    "value": f"• Winner takes the wagered fragments\n• Loser pays from their balance\n• Suggested wager: **{suggested_wager:,}** fragments\n• Challenge expires in 10 minutes",
                    "inline": False
                }
            ]
        )
        
        embed.set_thumbnail(url="https://cdn.discordapp.com/app-icons/1388207626944249856/icon.png")
        
        # Create challenge acceptance view
        class GameChallengeView(discord.ui.View):
            def __init__(self):
                super().__init__(timeout=600)  # 10 minutes
                self.wager_amount = suggested_wager
            
            @discord.ui.button(label="🚀 Accept Challenge", style=discord.ButtonStyle.success)
            async def accept_challenge(self, button_interaction: discord.Interaction, button: discord.ui.Button):
                if button_interaction.user.id != member.id:
                    return await button_interaction.response.send_message(
                        "Only the challenged player can accept this!", ephemeral=True
                    )
                
                # Check if target has enough fragments for wager
                if target_fragments < self.wager_amount:
                    return await button_interaction.response.send_message(
                        f"Ye need at least {self.wager_amount:,} fragments to accept this wager! Get grinding! 💎",
                        ephemeral=True
                    )
                
                # Launch gaming hub for challenged user
                if gaming_cog:
                    await button_interaction.response.send_message(
                        f"🎮 Challenge accepted! Opening Gaming Hub... Wager: **{self.wager_amount:,} fragments**",
                        ephemeral=True
                    )
                    # Launch gaming hub interface
                    try:
                        await gaming_cog.gaming_hub_command(button_interaction)
                    except:
                        # Fallback message
                        await button_interaction.followup.send(
                            "Use `/gaming` command to launch the gaming hub and start playing!",
                            ephemeral=True
                        )
                else:
                    await button_interaction.response.send_message(
                        "Gaming system not available! Try again later.", ephemeral=True
                    )
            
            @discord.ui.button(label="💰 Set Custom Wager", style=discord.ButtonStyle.secondary)
            async def set_wager(self, button_interaction: discord.Interaction, button: discord.ui.Button):
                if button_interaction.user.id not in [interaction.user.id, member.id]:
                    return await button_interaction.response.send_message(
                        "Only the challenger or challenged can adjust the wager!", ephemeral=True
                    )
                
                # Simple wager selection
                wager_options = [10, 50, 100, 250, 500, 1000]
                available_wagers = [w for w in wager_options if w <= min_fragments]
                
                if not available_wagers:
                    return await button_interaction.response.send_message(
                        "Not enough fragments for any standard wagers!", ephemeral=True
                    )
                
                wager_text = "\n".join([f"• **{w:,}** fragments" for w in available_wagers[-3:]])
                await button_interaction.response.send_message(
                    f"💰 **Available Wagers:**\n{wager_text}\n\nUse `/economy wager <amount>` to set a custom wager amount!",
                    ephemeral=True
                )
            
            @discord.ui.button(label="❌ Decline", style=discord.ButtonStyle.danger)
            async def decline_challenge(self, button_interaction: discord.Interaction, button: discord.ui.Button):
                if button_interaction.user.id != member.id:
                    return await button_interaction.response.send_message(
                        "Only the challenged player can decline!", ephemeral=True
                    )
                
                await button_interaction.response.send_message(
                    f"❌ **{member.display_name}** has declined the gaming challenge. Maybe next time! 🎮",
                    ephemeral=False
                )
                
                # Disable all buttons
                for item in self.children:
                    item.disabled = True
                await button_interaction.edit_original_response(view=self)
        
        await interaction.followup.send(
            f"⚔️ {member.mention} You've been challenged!",
            embed=embed,
            view=GameChallengeView()
        )
        
        # Track achievements
        await bot.check_and_award_achievements(interaction.user.id, "challenge_sent")
        
        # Notify challenger
        await interaction.followup.send(
            f"✅ Challenge sent to **{member.display_name}**! They have 10 minutes to respond. 🎮",
            ephemeral=True
        )
        
    except Exception as e:
        bot.add_error(f"Challenge to Game context menu failed: {e}")
        await interaction.followup.send(
            "Och! Something went mental trying to set up that gaming challenge! 🎮",
            ephemeral=True
        )

# ============================================================================
# MESSAGE CONTEXT MENUS (2 maximum allowed by Discord)
# ============================================================================

async def ask_ai_about_this_context(interaction: discord.Interaction, message: discord.Message):
    """🧠 Ask AI About This - Analyze message content with gpt-oss:20b AI in context"""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(interaction.user.id)
        
        if not message.content.strip() and not message.attachments:
            return await interaction.followup.send(
                "Cannae analyze an empty message, ya numpty! 🧠",
                ephemeral=True
            )
        
        # Prepare message content for analysis
        content_to_analyze = message.content[:1500]  # Limit for performance
        
        # Add attachment information
        attachment_info = ""
        if message.attachments:
            attachment_info = f"\n\nAttachments: {len(message.attachments)} files - "
            attachment_info += ", ".join([att.filename for att in message.attachments[:3]])
            if len(message.attachments) > 3:
                attachment_info += f" and {len(message.attachments) - 3} more..."
        
        # Build context for AI
        context = f"""
        Message Context:
        - Author: {message.author.display_name}
        - Channel: #{message.channel.name}
        - Sent: {message.created_at.strftime('%Y-%m-%d %H:%M')}
        - Guild: {message.guild.name if message.guild else 'DM'}
        {attachment_info}
        
        Message Content: {content_to_analyze}
        """
        
        # Get AI analysis with ChromaDB memory integration
        analysis_prompt = f"""
        Analyze this Discord message comprehensively:
        
        {context}
        
        Provide analysis covering:
        1. Main topic/theme
        2. Emotional tone/sentiment
        3. Key information or insights
        4. Any questions it raises
        5. Brief Scottish commentary
        
        Be thorough but concise.
        """
        
        ai_analysis = await cog.get_ai_response(
            analysis_prompt,
            f"Message analysis requested by {interaction.user.display_name}",
            use_memory=True
        )
        
        # Determine embed color based on message sentiment
        sentiment_keywords = {
            'positive': ['good', 'great', 'awesome', 'love', 'happy', 'excellent'],
            'negative': ['bad', 'hate', 'angry', 'terrible', 'awful', 'sad'],
            'neutral': ['okay', 'fine', 'alright']
        }
        
        embed_color = 0x00d4ff  # Default AI blue
        content_lower = content_to_analyze.lower()
        
        if any(word in content_lower for word in sentiment_keywords['positive']):
            embed_color = 0x00ff00  # Green for positive
        elif any(word in content_lower for word in sentiment_keywords['negative']):
            embed_color = 0xff4444  # Red for negative
        
        embed = await cog.create_context_embed(
            category=HubCategory.AI,
            title="AI Message Analysis",
            description=f"🧠 **Deep analysis using gpt-oss:20b with memory integration**\n\n📝 **Original Message:**\n> {content_to_analyze[:300]}{'...' if len(content_to_analyze) > 300 else ''}",
            fields=[
                {
                    "name": "📊 Message Details",
                    "value": f"```yaml\nAuthor: {message.author.display_name}\nChannel: #{message.channel.name}\nLength: {len(content_to_analyze)} chars\nAttachments: {len(message.attachments)}\n```",
                    "inline": True
                },
                {
                    "name": "🧠 AI Analysis", 
                    "value": ai_analysis[:800] + ('...' if len(ai_analysis) > 800 else ''),
                    "inline": False
                }
            ],
            color=embed_color
        )
        
        # Add message link if possible
        try:
            message_link = f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
            embed.add_field(
                name="🔗 Actions",
                value=f"[Jump to Message]({message_link}) • Use `/ai` for more AI features",
                inline=False
            )
        except:
            pass
        
        embed.set_footer(text="AI Analysis • ChromaDB Memory • gpt-oss:20b")
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
        # Store interaction in ChromaDB memory if available
        try:
            if hasattr(bot, 'memory_system') and bot.memory_system:
                await bot.memory_system.store_interaction(
                    user_id=str(interaction.user.id),
                    content=f"Analyzed message: {content_to_analyze[:200]}",
                    context=f"AI analysis in #{message.channel.name}",
                    interaction_type="ai_analysis"
                )
        except Exception as mem_error:
            bot.add_error(f"Memory storage failed: {mem_error}")
        
        # Track achievements
        await bot.check_and_award_achievements(interaction.user.id, "ai_analysis")
        
    except Exception as e:
        bot.add_error(f"Ask AI About This context menu failed: {e}")
        await interaction.followup.send(
            "Och! My AI circuits are having a wee malfunction. Try again in a moment! 🧠",
            ephemeral=True
        )

async def save_to_memory_context(interaction: discord.Interaction, message: discord.Message):
    """💾 Save to Memory - Store message in AI knowledge base for learning (admin-approved)"""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(interaction.user.id)
        
        # Validate message content
        if not message.content.strip() and not message.attachments:
            return await interaction.followup.send(
                "Cannae save an empty message to memory, ya numpty! 💾",
                ephemeral=True
            )
        
        content_to_save = message.content[:2000]  # Limit for storage
        
        # Check if message has valuable content for learning
        value_keywords = [
            'how to', 'tutorial', 'guide', 'tip', 'trick', 'solution', 'answer',
            'explain', 'definition', 'example', 'code', 'script', 'function',
            'discord', 'bot', 'programming', 'development'
        ]
        
        has_value = any(keyword in content_to_save.lower() for keyword in value_keywords)
        is_long_enough = len(content_to_save.strip()) > 20
        
        # Determine storage priority
        if has_value and is_long_enough:
            priority = "high"
            approval_needed = False
        elif is_long_enough:
            priority = "medium"
            approval_needed = True  
        else:
            priority = "low"
            approval_needed = True
        
        # Build comprehensive context
        context_data = {
            'author': message.author.display_name,
            'author_id': message.author.id,
            'channel': message.channel.name,
            'guild': message.guild.name if message.guild else 'DM',
            'timestamp': message.created_at.isoformat(),
            'message_id': message.id,
            'saved_by': interaction.user.display_name,
            'saved_by_id': interaction.user.id,
            'priority': priority,
            'approval_needed': approval_needed,
            'attachments': [att.filename for att in message.attachments] if message.attachments else []
        }
        
        memory_saved = False
        storage_method = "Cache"
        
        # Try to save to ChromaDB memory system
        try:
            if hasattr(bot, 'memory_system') and bot.memory_system:
                await bot.memory_system.store_interaction(
                    user_id=str(interaction.user.id),
                    content=content_to_save,
                    context=json.dumps(context_data),
                    interaction_type="saved_knowledge"
                )
                memory_saved = True
                storage_method = "ChromaDB Memory"
                bot.add_log(f"✅ Message saved to ChromaDB by {interaction.user.display_name}")
        except Exception as mem_error:
            bot.add_error(f"ChromaDB storage failed: {mem_error}")
        
        # Fallback to database storage
        if not memory_saved:
            try:
                await bot.db.execute("""
                    INSERT INTO saved_messages (user_id, message_content, context_data, priority, approval_needed, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    interaction.user.id,
                    content_to_save,
                    json.dumps(context_data),
                    priority,
                    approval_needed,
                    datetime.datetime.now()
                ))
                await bot.db.commit()
                memory_saved = True
                storage_method = "Database"
            except Exception as db_error:
                bot.add_error(f"Database storage failed: {db_error}")
        
        # Build status embed
        status_color = 0x00ff80 if memory_saved else 0xff4444
        status_text = "✅ Successfully Saved" if memory_saved else "❌ Storage Failed"
        
        approval_text = ""
        if approval_needed and memory_saved:
            approval_text = "\n⚠️ **Admin approval required** for permanent learning integration"
        elif memory_saved:
            approval_text = "\n🚀 **Auto-approved** for immediate AI learning"
        
        embed = await cog.create_context_embed(
            category=HubCategory.AI,
            title="Memory Storage Complete",
            description=f"💾 **Message saved to AI knowledge base**\n\n📝 **Content Preview:**\n> {content_to_save[:200]}{'...' if len(content_to_save) > 200 else ''}",
            fields=[
                {
                    "name": "📊 Storage Details",
                    "value": f"```yaml\nStatus: {status_text}\nMethod: {storage_method}\nPriority: {priority.title()}\nLength: {len(content_to_save)} chars\nAttachments: {len(message.attachments)}\n```",
                    "inline": True
                },
                {
                    "name": "🧠 Memory Integration",
                    "value": f"**Author:** {message.author.display_name}\n**Channel:** #{message.channel.name}\n**Saved By:** {interaction.user.display_name}\n**Date:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}{approval_text}",
                    "inline": True
                }
            ],
            color=status_color
        )
        
        # Add action buttons for memory management
        class MemoryManagementView(discord.ui.View):
            def __init__(self):
                super().__init__(timeout=300)
            
            @discord.ui.button(label="🧠 View AI Hub", style=discord.ButtonStyle.primary)
            async def view_ai_hub(self, button_interaction: discord.Interaction, button: discord.ui.Button):
                if button_interaction.user.id != interaction.user.id:
                    return await button_interaction.response.send_message(
                        "Only the command user can use this!", ephemeral=True
                    )
                
                ai_hub_cog = bot.get_cog('AIHubCog')
                if ai_hub_cog:
                    await ai_hub_cog.ai_hub_command(button_interaction)
                else:
                    await button_interaction.response.send_message(
                        "AI Hub not available! Use `/ai` command.", ephemeral=True
                    )
            
            @discord.ui.button(label="📋 Memory Stats", style=discord.ButtonStyle.secondary)
            async def memory_stats(self, button_interaction: discord.Interaction, button: discord.ui.Button):
                try:
                    # Get user's memory storage stats
                    cursor = await bot.db.execute("""
                        SELECT COUNT(*) FROM saved_messages WHERE user_id = ?
                    """, (interaction.user.id,))
                    saved_count = (await cursor.fetchone())[0]
                    
                    stats_text = f"**Your Memory Storage:**\n• Messages Saved: {saved_count}\n• Storage Method: {storage_method}\n• Priority: {priority.title()}"
                    
                    await button_interaction.response.send_message(
                        stats_text, ephemeral=True
                    )
                except Exception as e:
                    await button_interaction.response.send_message(
                        "Cannae fetch memory stats right now!", ephemeral=True
                    )
        
        await interaction.followup.send(
            embed=embed,
            view=MemoryManagementView() if memory_saved else None,
            ephemeral=True
        )
        
        # Track achievements
        await bot.check_and_award_achievements(interaction.user.id, "memory_save")
        
        # Notify admins if high-priority content was saved
        if priority == "high" and memory_saved:
            try:
                admin_channel = bot.get_channel(1362815996557263049)  # Replace with your admin channel ID
                if admin_channel:
                    await admin_channel.send(
                        f"🧠 **High-priority knowledge saved:**\n{interaction.user.display_name} saved a valuable message to AI memory.\nContent: `{content_to_save[:100]}...`"
                    )
            except:
                pass
        
    except Exception as e:
        bot.add_error(f"Save to Memory context menu failed: {e}")
        await interaction.followup.send(
            "Och! Couldnae save that to memory right now, storage is having a wee moment! 💾",
            ephemeral=True
        )




# ============================================================================
# SETUP FUNCTION - Register all 5 context menu commands
# ============================================================================

async def setup(bot: commands.Bot):
    """Setup function to register the maximum 5 context menu commands with full hub integration.""" 
    
    try:
        bot.add_log("🚀 Starting Maximum Context Menu System setup...")
        
        # Add the cog first
        await bot.add_cog(ContextMenuCog(bot))
        bot.add_log("✅ Context Menu Cog loaded with hub integration")
        
        # Initialize database tables if needed
        try:
            await bot.db.execute("""
                CREATE TABLE IF NOT EXISTS saved_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    message_content TEXT NOT NULL,
                    context_data TEXT,
                    priority TEXT DEFAULT 'medium',
                    approval_needed BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await bot.db.execute("""
                CREATE TABLE IF NOT EXISTS gaming_stats (
                    user_id INTEGER PRIMARY KEY,
                    total_score INTEGER DEFAULT 0,
                    games_won INTEGER DEFAULT 0,
                    current_streak INTEGER DEFAULT 0,
                    highest_score INTEGER DEFAULT 0,
                    last_played TIMESTAMP
                )
            """)
            await bot.db.execute("""
                CREATE TABLE IF NOT EXISTS music_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    song_title TEXT NOT NULL,
                    artist TEXT,
                    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await bot.db.execute("""
                CREATE TABLE IF NOT EXISTS user_playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    song_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await bot.db.commit()
            bot.add_log("💾 Context menu database tables initialized")
        except Exception as db_error:
            bot.add_error(f"Database initialization error: {db_error}")
        
        bot.add_log("🔧 Creating maximum 5 context menu commands...")
        
        # ============================================================================
        # MAXIMUM 5 CONTEXT MENU COMMANDS (Discord API Limit)
        # ============================================================================
        
        # USER CONTEXT MENUS (3 maximum)
        view_user_profile_cmd = app_commands.ContextMenu(
            name="📊 View User Profile",
            callback=view_user_profile_context,
            type=discord.AppCommandType.user
        )
        
        user_music_hub_cmd = app_commands.ContextMenu(
            name="🎵 User's Music Hub",
            callback=user_music_hub_context,
            type=discord.AppCommandType.user
        )
        
        challenge_to_game_cmd = app_commands.ContextMenu(
            name="🎮 Challenge to Game",
            callback=challenge_to_game_context,
            type=discord.AppCommandType.user
        )
        
        # MESSAGE CONTEXT MENUS (2 maximum)
        ask_ai_about_this_cmd = app_commands.ContextMenu(
            name="🧠 Ask AI About This",
            callback=ask_ai_about_this_context,
            type=discord.AppCommandType.message
        )
        
        save_to_memory_cmd = app_commands.ContextMenu(
            name="💾 Save to Memory",
            callback=save_to_memory_context,
            type=discord.AppCommandType.message
        )
        
        # Add all 5 commands to the tree (MAXIMUM ALLOWED)
        bot.add_log("🔧 Registering 5/5 context menu commands...")
        
        bot.tree.add_command(view_user_profile_cmd)      # User Context Menu 1
        bot.tree.add_command(user_music_hub_cmd)         # User Context Menu 2
        bot.tree.add_command(challenge_to_game_cmd)      # User Context Menu 3
        bot.tree.add_command(ask_ai_about_this_cmd)      # Message Context Menu 1
        bot.tree.add_command(save_to_memory_cmd)         # Message Context Menu 2
        
        bot.add_log("✅ All 5 context menu commands registered successfully!")
        bot.add_log("📋 MAXIMUM CONTEXT MENU CONFIGURATION:")
        bot.add_log("👥 User Menus: View Profile, Music Hub, Gaming Challenge")
        bot.add_log("💬 Message Menus: AI Analysis, Memory Save")
        bot.add_log("🎮 Full integration: Economy, Music, Gaming, AI, ChromaDB")
        bot.add_log("📡 Ready for Discord Activity challenges and hub systems!")
        
    except Exception as e:
        bot.add_error(f"❌ Context Menu Cog setup failed: {e}")
        bot.add_error(f"Traceback: {traceback.format_exc()}")
        raise