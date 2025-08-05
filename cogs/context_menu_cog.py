# cogs/context_menu_cog.py
"""
Fixed Context Menu Commands for Opure.exe
Context menus must be defined outside of classes and added to the command tree.
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


class ContextMenuCog(commands.Cog):
    """Superior context menu commands with AI integration and Scottish personality."""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        
        # Cache for frequently used data
        self.cache = {
            'user_profiles': {},
            'sentiment_cache': {},
            'translation_cache': {}
        }
        
        # Scottish expressions for variety
        self.scottish_expressions = [
            "Aye, here's what I'm seein'",
            "Right then, let me check this for ye",
            "Och, that's interestin'",
            "Cannae argue with that",
            "Pure mental, but here we go",
            "Nae bother, let me sort this",
            "Proper sound, this is",
            "Ken what I mean?",
            "Mental stuff happening here",
            "Rangers forever, but here's yer answer"
        ]

    def get_scottish_intro(self) -> str:
        """Get a random Scottish introduction."""
        return random.choice(self.scottish_expressions)

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

    async def get_ai_response(self, prompt: str, context: str = "") -> str:
        """Get AI response with Scottish personality."""
        try:
            enhanced_prompt = f"""
            You are Opure.exe, a Scottish AI with a passion for Rangers FC and Juice WRLD.
            Context: {context}
            
            User request: {prompt}
            
            Respond with Scottish personality - use Scottish slang, expressions, and occasional 
            references to Rangers or Juice WRLD when appropriate. Be helpful but maintain your 
            distinctive Scottish AI character.
            """
            
            response = await self.bot.ollama_client.generate(
                model='opure', 
                prompt=enhanced_prompt
            )
            return response.get('response', 'Aye, my circuits are a bit wonky right now, ken?').strip()
        except Exception as e:
            self.bot.add_error(f"AI response failed: {e}")
            return "Och, my neural pathways are having a moment. Try again in a wee bit!"

    async def create_futuristic_embed(self, title: str, description: str, color: int = 0xFF0080) -> discord.Embed:
        """Create a futuristic embed with cyberpunk styling."""
        try:
            # Try to use futuristic embed framework if available
            if hasattr(self.bot, 'embed_framework'):
                return self.bot.embed_framework.create_ai_response_embed(description, 'cyberpunk')
        except:
            pass
        
        embed = discord.Embed(
            title=f"🔮 {title}",
            description=f"```ansi\n[2;36m{description}[0m\n```",
            color=color,
            timestamp=datetime.datetime.now()
        )
        embed.set_footer(text="Opure.exe • Scottish AI • Powered by Ollama")
        return embed


# Define context menu commands OUTSIDE the class
# This is the correct way to define context menus in discord.py

async def ask_opure_context(interaction: discord.Interaction, message: discord.Message):
    """Get AI response to any message with Scottish personality."""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(interaction.user.id)
        
        # Get AI analysis of the message
        context = f"Message from {message.author.display_name} in #{message.channel.name}: {message.content[:500]}"
        ai_response = await cog.get_ai_response(
            f"Analyze and respond to this message: {message.content}",
            context
        )
        
        embed = await cog.create_futuristic_embed(
            "Ask Opure Analysis",
            f"**Message:** {message.content[:200]}{'...' if len(message.content) > 200 else ''}\n\n**Opure's Analysis:**\n{ai_response}"
        )
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
        # Track achievement
        await bot.check_and_award_achievements(interaction.user.id, "context_menu_use")
        
    except Exception as e:
        bot.add_error(f"Ask Opure context menu failed: {e}")
        await interaction.followup.send(
            f"Och! Something went mental in my circuits. Try again in a moment, ken?",
            ephemeral=True
        )

async def explain_this_context(interaction: discord.Interaction, message: discord.Message):
    """AI explains complex topics with Scottish flair."""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(interaction.user.id)
        
        explanation = await cog.get_ai_response(
            f"Explain this in simple terms with Scottish personality: {message.content}",
            f"Educational explanation requested by {interaction.user.display_name}"
        )
        
        embed = await cog.create_futuristic_embed(
            "Scottish AI Explanation",
            f"**Original:** {message.content[:150]}{'...' if len(message.content) > 150 else ''}\n\n**Explanation:**\n{explanation}",
            0x00FFFF
        )
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
    except Exception as e:
        bot.add_error(f"Explain This context menu failed: {e}")
        await interaction.followup.send("Cannae explain this right now, my brain's having a wee malfunction!", ephemeral=True)

async def user_profile_context(interaction: discord.Interaction, member: discord.Member):
    """Show comprehensive user stats and AI personality analysis."""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        await cog.ensure_user_exists(member.id)
        
        # Get user data from database
        cursor = await bot.db.execute("""
            SELECT fragments, daily_streak, level, xp FROM players WHERE user_id = ?
        """, (member.id,))
        player_data = await cursor.fetchone()
        
        cursor = await bot.db.execute("""
            SELECT commands_used, songs_queued, achievements_earned FROM user_stats WHERE user_id = ?
        """, (member.id,))
        stats_data = await cursor.fetchone()
        
        if not player_data:
            player_data = (100, 0, 1, 0)
        if not stats_data:
            stats_data = (0, 0, 0)
        
        # AI personality analysis
        personality_prompt = f"""
        Analyze this Discord user's personality based on their stats:
        - Daily streak: {player_data[1]} days
        - Commands used: {stats_data[0]}
        - Songs queued: {stats_data[1]}
        - Achievements: {stats_data[2]}
        - Level: {player_data[2]}
        - Account created: {member.created_at.strftime('%Y-%m-%d')}
        
        Give a fun Scottish personality analysis in 2-3 sentences.
        """
        
        personality_analysis = await cog.get_ai_response(personality_prompt)
        
        embed = await cog.create_futuristic_embed(
            f"{member.display_name}'s Profile",
            f"**💎 Fragments:** {player_data[0]:,}\n"
            f"**🔥 Daily Streak:** {player_data[1]} days\n"
            f"**⭐ Level:** {player_data[2]} (XP: {player_data[3]:,})\n"
            f"**🎵 Songs Queued:** {stats_data[1]:,}\n"
            f"**🏆 Achievements:** {stats_data[2]}\n"
            f"**⚡ Commands Used:** {stats_data[0]:,}\n\n"
            f"**🏴󠁧󠁢󠁳󠁣󠁴󠁿 Personality Analysis:**\n{personality_analysis}",
            0x9d4edd
        )
        
        embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
    except Exception as e:
        bot.add_error(f"User Profile context menu failed: {e}")
        await interaction.followup.send("Cannae load the profile right now, something's gone mental!", ephemeral=True)

async def queue_audio_context(interaction: discord.Interaction, message: discord.Message):
    """Smart audio file and URL detection for music queue."""
    bot = interaction.client
    music_cog = bot.get_cog('MusicCog')
    
    if not music_cog:
        return await interaction.response.send_message("Music system not available!", ephemeral=True)
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        # Check for audio files in attachments
        audio_extensions = ('.mp3', '.wav', '.flac', '.ogg', '.m4a', '.mp4', '.webm')
        audio_urls = []
        
        for attachment in message.attachments:
            if attachment.filename.lower().endswith(audio_extensions):
                audio_urls.append(attachment.url)
        
        # Check for URLs in message content
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        urls = re.findall(url_pattern, message.content)
        audio_urls.extend(urls)
        
        if not audio_urls:
            return await interaction.followup.send("Nae audio files or URLs found in that message, ken!", ephemeral=True)
        
        # Check if user is in voice channel
        if not interaction.user.voice:
            return await interaction.followup.send("Join a voice channel first, ya numpty!", ephemeral=True)
        
        queued_count = 0
        for url in audio_urls[:5]:  # Limit to 5 URLs
            try:
                # Create fake interaction for music cog compatibility
                class FakeInteraction:
                    def __init__(self, real_interaction):
                        self.user = real_interaction.user
                        self.guild = real_interaction.guild
                        self.channel = real_interaction.channel
                        self.response = real_interaction.response
                        self.followup = real_interaction.followup
                
                fake_interaction = FakeInteraction(interaction)
                await music_cog.play(fake_interaction, query=url)
                queued_count += 1
            except Exception as e:
                bot.add_error(f"Failed to queue {url}: {e}")
        
        if queued_count > 0:
            await interaction.followup.send(
                f"🎵 Queued {queued_count} track{'s' if queued_count != 1 else ''} from the message! Pure class!",
                ephemeral=True
            )
        else:
            await interaction.followup.send("Couldnae queue any tracks from that message, sorry!", ephemeral=True)
        
    except Exception as e:
        bot.add_error(f"Queue Audio context menu failed: {e}")
        await interaction.followup.send("Something went mental trying to queue that audio!", ephemeral=True)

async def analyze_sentiment_context(interaction: discord.Interaction, message: discord.Message):
    """AI emotional analysis of messages with color coding."""
    bot = interaction.client
    cog = bot.get_cog('ContextMenuCog')
    
    await interaction.response.defer(ephemeral=True)
    
    try:
        # Check cache first
        cache_key = f"sentiment_{hash(message.content)}"
        if cache_key in cog.cache['sentiment_cache']:
            sentiment_data = cog.cache['sentiment_cache'][cache_key]
        else:
            sentiment_prompt = f"""
            Analyze the emotional sentiment of this message with Scottish personality:
            "{message.content}"
            
            Provide:
            1. Overall sentiment (Positive/Negative/Neutral)
            2. Confidence level (1-10)
            3. Key emotions detected
            4. Scottish commentary on the emotional state
            
            Format as JSON with keys: sentiment, confidence, emotions, commentary
            """
            
            ai_response = await cog.get_ai_response(sentiment_prompt)
            
            try:
                sentiment_data = json.loads(ai_response)
            except:
                # Fallback if JSON parsing fails
                sentiment_data = {
                    "sentiment": "Neutral",
                    "confidence": 5,
                    "emotions": ["Mixed"],
                    "commentary": ai_response
                }
            
            # Cache the result
            cog.cache['sentiment_cache'][cache_key] = sentiment_data
        
        # Color based on sentiment
        color_map = {
            "Positive": 0x00FF00,
            "Negative": 0xFF0000,
            "Neutral": 0xFFFF00,
            "Mixed": 0xFF8000
        }
        
        sentiment = sentiment_data.get("sentiment", "Neutral")
        color = color_map.get(sentiment, 0xFFFF00)
        
        embed = await cog.create_futuristic_embed(
            "Sentiment Analysis",
            f"**Message:** {message.content[:200]}{'...' if len(message.content) > 200 else ''}\n\n"
            f"**Sentiment:** {sentiment}\n"
            f"**Confidence:** {sentiment_data.get('confidence', 5)}/10\n"
            f"**Emotions:** {', '.join(sentiment_data.get('emotions', ['Unknown']))}\n\n"
            f"**Scottish Analysis:**\n{sentiment_data.get('commentary', 'Aye, emotional stuff happening here!')}",
            color
        )
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
    except Exception as e:
        bot.add_error(f"Sentiment Analysis context menu failed: {e}")
        await interaction.followup.send("Cannae analyze the emotions right now, my feelings are confused!", ephemeral=True)


async def setup(bot: commands.Bot):
    """Setup function to add context menu commands to the bot.""" 
    
    try:
        bot.add_log("🔧 Starting Context Menu Cog setup...")
        
        # Add the cog first
        await bot.add_cog(ContextMenuCog(bot))
        bot.add_log("✅ Context Menu Cog added successfully")
        
        # Create context menu commands and add them to the command tree
        bot.add_log("🔧 Creating context menu commands...")
        
        ask_opure_cmd = app_commands.ContextMenu(
            name="Ask Opure",
            callback=ask_opure_context,
            type=discord.AppCommandType.message
        )
        
        explain_this_cmd = app_commands.ContextMenu(
            name="Explain This",
            callback=explain_this_context,
            type=discord.AppCommandType.message
        )
        
        user_profile_cmd = app_commands.ContextMenu(
            name="User Profile",
            callback=user_profile_context,
            type=discord.AppCommandType.user
        )
        
        queue_audio_cmd = app_commands.ContextMenu(
            name="Queue Audio",
            callback=queue_audio_context,
            type=discord.AppCommandType.message
        )
        
        analyze_sentiment_cmd = app_commands.ContextMenu(
            name="Analyze Sentiment",
            callback=analyze_sentiment_context,
            type=discord.AppCommandType.message
        )
        
        # Add commands to the tree
        bot.add_log("🔧 Adding commands to command tree...")
        bot.tree.add_command(ask_opure_cmd)
        bot.tree.add_command(explain_this_cmd)
        bot.tree.add_command(user_profile_cmd)
        bot.tree.add_command(queue_audio_cmd)
        bot.tree.add_command(analyze_sentiment_cmd)
        
        bot.add_log("✅ Context Menu Commands loaded successfully!")
        bot.add_log("📋 Added 5 context menu commands to command tree")
        
    except Exception as e:
        bot.add_error(f"❌ Context Menu Cog setup failed: {e}")
        bot.add_error(f"Traceback: {traceback.format_exc()}")
        raise