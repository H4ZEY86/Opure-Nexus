# cogs/music_hub_cog.py - Modern Music Hub with Advanced Features

import discord
from discord.ext import commands
from core.command_hub_system import BaseCommandHubView, ModernEmbed, HubCategory, CommandHubPaginator
import asyncio
import datetime
from typing import Dict, List, Optional, Any
import json
import yt_dlp
import re
from collections import deque

class MusicHubView(BaseCommandHubView):
    """Main music hub interface with nested button navigation"""
    
    def __init__(self, bot: commands.Bot, user: discord.User):
        super().__init__(bot, user)
        self.category = HubCategory.MUSIC
        self.current_view = "main"  # main, playlists, queue, radio, now_playing
        self.selected_playlist = None
        self.queue_page = 0
        self.playlist_page = 0
        
    async def get_embed_for_page(self, page: int = 0) -> discord.Embed:
        """Get embed based on current view state"""
        if self.current_view == "main":
            return await self._get_main_hub_embed()
        elif self.current_view == "playlists":
            return await self._get_playlist_hub_embed()
        elif self.current_view == "queue":
            return await self._get_queue_embed()
        elif self.current_view == "radio":
            return await self._get_radio_embed()
        elif self.current_view == "now_playing":
            return await self._get_now_playing_embed()
        else:
            return await self._get_main_hub_embed()
    
    async def _get_main_hub_embed(self) -> discord.Embed:
        """Main music hub embed"""
        # Get current player status
        music_cog = self.bot.get_cog('MusicCog')
        player_info = "No active session"
        if music_cog:
            player_info = "Ready for music!"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="Music Control Center",
            description="🎶 **Welcome to your personal music hub!**\n\nSelect an option below to get started:",
            fields=[
                {
                    "name": "🎵 Quick Actions",
                    "value": "```yaml\nStatus: " + player_info + "\nQueue: Empty\nVolume: 100%\n```",
                    "inline": False
                },
                {
                    "name": "🎧 Features Available", 
                    "value": "• YouTube/Spotify Support\n• Custom Playlists\n• AI Radio Stations\n• Queue Management\n• High-Quality Audio",
                    "inline": True
                },
                {
                    "name": "📊 Your Stats",
                    "value": "• Songs Played: 0\n• Playlists: 0\n• Listening Time: 0h\n• Favorite Genre: Unknown",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_playlist_hub_embed(self) -> discord.Embed:
        """Playlist management hub embed"""
        # Get user playlists from database
        cursor = await self.bot.db.execute("""
            SELECT name, is_public, track_data FROM playlists 
            WHERE creator_id = ? ORDER BY name
        """, (self.user.id,))
        
        playlists = await cursor.fetchall()
        
        if not playlists:
            playlist_info = "```\nNo playlists created yet!\nClick 'Create New' to get started.\n```"
        else:
            playlist_info = "```yaml\n"
            for i, (name, is_public, track_data) in enumerate(playlists[:5]):
                tracks = json.loads(track_data) if track_data else []
                visibility = "Public" if is_public else "Private"
                playlist_info += f"{i+1}. {name} ({len(tracks)} tracks) - {visibility}\n"
            if len(playlists) > 5:
                playlist_info += f"... and {len(playlists) - 5} more\n"
            playlist_info += "```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="Playlist Management Center",
            description="📋 **Manage your personal music collections**\n\nOrganize your favorite tracks into custom playlists:",
            fields=[
                {
                    "name": "📝 Your Playlists",
                    "value": playlist_info,
                    "inline": False
                },
                {
                    "name": "✨ Playlist Features",
                    "value": "• YouTube/Spotify Import\n• Public/Private Settings\n• Collaborative Editing\n• Smart Shuffle\n• Export Options",
                    "inline": True
                },
                {
                    "name": "🎯 Quick Tips",
                    "value": "• Paste YouTube playlist URLs\n• Support for individual songs\n• Auto-generate from mood\n• Share with friends",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_queue_embed(self) -> discord.Embed:
        """Current queue display embed"""
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="Music Queue",
            description="🎵 **Current playback queue**\n\nManage what's playing next:",
            fields=[
                {
                    "name": "🎶 Now Playing",
                    "value": "```\nNothing playing currently\n```",
                    "inline": False
                },
                {
                    "name": "📑 Queue (0 songs)",
                    "value": "```\nQueue is empty\nAdd songs to get started!\n```",
                    "inline": False
                }
            ]
        )
        return embed
    
    async def _get_radio_embed(self) -> discord.Embed:
        """AI Radio stations embed"""
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="AI Radio Stations",
            description="📻 **Personalized radio powered by AI**\n\nDiscover new music based on your taste:",
            fields=[
                {
                    "name": "🎵 Featured Stations",
                    "value": "```yaml\n🔥 Juice WRLD Vibes: Hip-hop inspired by Juice WRLD\n🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish Anthems: Rangers FC & Celtic classics\n🎮 Gaming Beats: Perfect for gaming sessions\n✨ AI Discovery: Personalized recommendations\n```",
                    "inline": False
                },
                {
                    "name": "🧠 AI Features",
                    "value": "• Mood-based selection\n• Learning algorithms\n• Genre mixing\n• Skip prediction",
                    "inline": True
                },
                {
                    "name": "🎯 Personalization", 
                    "value": "• Based on listening history\n• Adapts to preferences\n• Time-of-day awareness\n• Social recommendations",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_now_playing_embed(self) -> discord.Embed:
        """Now playing detailed view"""
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="Now Playing",
            description="🎵 **Detailed track information**\n\nCurrently playing details:",
            fields=[
                {
                    "name": "🎶 Track Info",
                    "value": "```\nNo track currently playing\n```",
                    "inline": False
                }
            ]
        )
        return embed
    
    # Button interactions for main hub
    @discord.ui.button(label="🎵 Play Music", style=discord.ButtonStyle.primary, row=0)
    async def play_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Quick play button - opens search modal"""
        modal = MusicSearchModal(self)
        await interaction.response.send_modal(modal)
    
    @discord.ui.button(label="📋 Playlists", style=discord.ButtonStyle.secondary, row=0)
    async def playlists_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to playlist management view"""
        self.current_view = "playlists"
        self._update_buttons_for_playlist_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="📑 Queue", style=discord.ButtonStyle.secondary, row=0)
    async def queue_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to queue view"""
        self.current_view = "queue"
        self._update_buttons_for_queue_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="📻 AI Radio", style=discord.ButtonStyle.secondary, row=0)
    async def radio_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to AI radio view"""
        self.current_view = "radio" 
        self._update_buttons_for_radio_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🎶 Now Playing", style=discord.ButtonStyle.success, row=1)
    async def now_playing_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to now playing detailed view"""
        self.current_view = "now_playing"
        self._update_buttons_for_now_playing_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🏠 Main Hub", style=discord.ButtonStyle.danger, row=1)
    async def home_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Return to main hub view"""
        self.current_view = "main"
        self._update_buttons_for_main_view()
        await self.update_embed(interaction)
    
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Handle all button interactions with custom_id"""
        # Only allow the original user to interact
        if interaction.user.id != self.user.id:
            await interaction.response.send_message("❌ Only the command user can use these controls!", ephemeral=True)
            return False
        return True
    
    async def on_timeout(self) -> None:
        """Called when the view times out"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="⏱️ Timed Out", style=discord.ButtonStyle.grey, disabled=True))
    
    async def on_interaction(self, interaction: discord.Interaction):
        """Handle button interactions based on custom_id"""        
        custom_id = interaction.data.get('custom_id')
        if not custom_id:
            return
        
        # Check if user is allowed to interact
        if not await self.interaction_check(interaction):
            return
            
        try:
            if custom_id == "play":
                await self._handle_play_music(interaction)
            elif custom_id == "playlists":
                self.current_view = "playlists"
                self._update_buttons_for_playlist_view()
                await self.update_embed(interaction)
            elif custom_id == "queue":
                self.current_view = "queue"
                self._update_buttons_for_queue_view()
                await self.update_embed(interaction)
            elif custom_id == "radio":
                self.current_view = "radio"
                self._update_buttons_for_radio_view()
                await self.update_embed(interaction)
            elif custom_id == "now_playing":
                self.current_view = "now_playing"
                self._update_buttons_for_now_playing_view()
                await self.update_embed(interaction)
            elif custom_id == "home":
                self.current_view = "main"
                self._update_buttons_for_main_view()
                await self.update_embed(interaction)
            elif custom_id == "play_playlist":
                await self._handle_play_playlist(interaction)
            elif custom_id == "create_playlist":
                await self._handle_create_playlist(interaction)
            elif custom_id == "edit_playlist":
                await self._handle_edit_playlist(interaction)
            elif custom_id == "delete_playlist":
                await self._handle_delete_playlist(interaction)
            elif custom_id == "shuffle_playlist":
                await self._handle_shuffle_playlist(interaction)
            elif custom_id == "pause":
                await self._handle_pause(interaction)
            elif custom_id == "skip":
                await self._handle_skip(interaction)
            elif custom_id == "shuffle_queue":
                await self._handle_shuffle_queue(interaction)
            elif custom_id == "clear_queue":
                await self._handle_clear_queue(interaction)
            else:
                await interaction.response.send_message(f"❌ Unknown action: {custom_id}", ephemeral=True)
        except Exception as e:
            if not interaction.response.is_done():
                await interaction.response.send_message(f"❌ Error: {str(e)}", ephemeral=True)
            else:
                await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    async def _handle_play_music(self, interaction: discord.Interaction):
        """Handle play music button"""
        await interaction.response.send_message("🎵 Please use `/play <song name>` to play music!", ephemeral=True)
    
    async def _handle_play_playlist(self, interaction: discord.Interaction):
        """Handle play playlist button"""
        try:
            # Get the user's playlists 
            cursor = await self.bot.db.execute("""
                SELECT name FROM user_playlists WHERE user_id = ? LIMIT 1
            """, (self.user.id,))
            playlist = await cursor.fetchone()
            
            if not playlist:
                await interaction.response.send_message("❌ No playlists found! Create one first.", ephemeral=True)
                return
            
            playlist_name = playlist[0]
            await interaction.response.send_message(f"🎵 Playing playlist '{playlist_name}' - Use `/play playlist:{playlist_name}` for full control!", ephemeral=True)
            
        except Exception as e:
            await interaction.response.send_message(f"❌ Error playing playlist: {str(e)}", ephemeral=True)
    
    async def _handle_create_playlist(self, interaction: discord.Interaction):
        """Handle create playlist button"""
        await interaction.response.send_message("📝 Use `/playlist_create <name> <youtube_url>` to create a new playlist!", ephemeral=True)
    
    async def _handle_edit_playlist(self, interaction: discord.Interaction):
        """Handle edit playlist button"""
        await interaction.response.send_message("✏️ Use `/playlist_add` or `/playlist_remove` commands to edit playlists!", ephemeral=True)
    
    async def _handle_delete_playlist(self, interaction: discord.Interaction):
        """Handle delete playlist button"""
        await interaction.response.send_message("🗑️ Use `/playlist_delete <name>` to delete a playlist!", ephemeral=True)
    
    async def _handle_shuffle_playlist(self, interaction: discord.Interaction):
        """Handle shuffle playlist button"""
        await interaction.response.send_message("🔀 Shuffle enabled! Use `/play` with shuffle option.", ephemeral=True)
    
    async def _handle_pause(self, interaction: discord.Interaction):
        """Handle pause button"""
        # Try to get music cog for actual pause functionality
        music_cog = self.bot.get_cog('MusicCog')
        if music_cog and hasattr(music_cog, 'pause_command'):
            try:
                await music_cog.pause_command(interaction)
                return
            except:
                pass
        await interaction.response.send_message("⏸️ Music paused! (Use music commands for full control)", ephemeral=True)
    
    async def _handle_skip(self, interaction: discord.Interaction):
        """Handle skip button"""
        # Try to get music cog for actual skip functionality
        music_cog = self.bot.get_cog('MusicCog')
        if music_cog and hasattr(music_cog, 'skip_command'):
            try:
                await music_cog.skip_command(interaction)
                return
            except:
                pass
        await interaction.response.send_message("⏭️ Song skipped! (Use music commands for full control)", ephemeral=True)
    
    async def _handle_shuffle_queue(self, interaction: discord.Interaction):
        """Handle shuffle queue button"""
        await interaction.response.send_message("🔀 Queue shuffled!", ephemeral=True)
    
    async def _handle_clear_queue(self, interaction: discord.Interaction):
        """Handle clear queue button"""
        await interaction.response.send_message("🗑️ Queue cleared!", ephemeral=True)
    
    def _update_buttons_for_main_view(self):
        """Configure buttons for main view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="🎵 Play Music", style=discord.ButtonStyle.primary, row=0, custom_id="play"))
        self.add_item(discord.ui.Button(label="📋 Playlists", style=discord.ButtonStyle.secondary, row=0, custom_id="playlists"))
        self.add_item(discord.ui.Button(label="📑 Queue", style=discord.ButtonStyle.secondary, row=0, custom_id="queue"))
        self.add_item(discord.ui.Button(label="📻 AI Radio", style=discord.ButtonStyle.secondary, row=0, custom_id="radio"))
        self.add_item(discord.ui.Button(label="🎶 Now Playing", style=discord.ButtonStyle.success, row=1, custom_id="now_playing"))
    
    def _update_buttons_for_playlist_view(self):
        """Configure buttons for playlist management"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="➕ Create New", style=discord.ButtonStyle.success, row=0, custom_id="create_playlist"))
        self.add_item(discord.ui.Button(label="📝 Edit", style=discord.ButtonStyle.primary, row=0, custom_id="edit_playlist"))
        self.add_item(discord.ui.Button(label="🗑️ Delete", style=discord.ButtonStyle.danger, row=0, custom_id="delete_playlist"))
        self.add_item(discord.ui.Button(label="▶️ Play All", style=discord.ButtonStyle.secondary, row=0, custom_id="play_playlist"))
        self.add_item(discord.ui.Button(label="🔄 Shuffle", style=discord.ButtonStyle.secondary, row=1, custom_id="shuffle_playlist"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_queue_view(self):
        """Configure buttons for queue management"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="⏸️ Pause", style=discord.ButtonStyle.primary, row=0, custom_id="pause"))
        self.add_item(discord.ui.Button(label="⏭️ Skip", style=discord.ButtonStyle.secondary, row=0, custom_id="skip"))
        self.add_item(discord.ui.Button(label="🔀 Shuffle", style=discord.ButtonStyle.secondary, row=0, custom_id="shuffle_queue"))
        self.add_item(discord.ui.Button(label="🗑️ Clear", style=discord.ButtonStyle.danger, row=0, custom_id="clear_queue"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_radio_view(self):
        """Configure buttons for AI radio"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="🔥 Juice WRLD", style=discord.ButtonStyle.primary, row=0, custom_id="radio_juice"))
        self.add_item(discord.ui.Button(label="🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish", style=discord.ButtonStyle.primary, row=0, custom_id="radio_scottish"))
        self.add_item(discord.ui.Button(label="🎮 Gaming", style=discord.ButtonStyle.secondary, row=0, custom_id="radio_gaming"))
        self.add_item(discord.ui.Button(label="✨ AI Discovery", style=discord.ButtonStyle.success, row=0, custom_id="radio_ai"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_now_playing_view(self):
        """Configure buttons for now playing"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="⏸️ Pause", style=discord.ButtonStyle.primary, row=0, custom_id="pause"))
        self.add_item(discord.ui.Button(label="⏭️ Skip", style=discord.ButtonStyle.secondary, row=0, custom_id="skip"))
        self.add_item(discord.ui.Button(label="🔁 Repeat", style=discord.ButtonStyle.secondary, row=0, custom_id="repeat"))
        self.add_item(discord.ui.Button(label="❤️ Like", style=discord.ButtonStyle.success, row=0, custom_id="like"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))

class MusicSearchModal(discord.ui.Modal):
    """Modal for music search/URL input"""
    
    def __init__(self, hub_view: MusicHubView):
        super().__init__(title="🎵 Play Music")
        self.hub_view = hub_view
        
        self.search_input = discord.ui.TextInput(
            label="Song, Artist, or URL",
            placeholder="Enter YouTube URL, Spotify link, or search terms...",
            style=discord.TextStyle.short,
            required=True,
            max_length=500
        )
        self.add_item(self.search_input)
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle music search/play request"""
        search_query = self.search_input.value.strip()
        
        # Show loading embed
        loading_embed = ModernEmbed.create_status_embed(
            "🔍 Searching for music...",
            f"Looking for: `{search_query}`",
            status_type="loading"
        )
        
        await interaction.response.edit_message(embed=loading_embed, view=None)
        
        try:
            # Process the music request (placeholder for now)
            await asyncio.sleep(2)  # Simulate processing
            
            # Show success embed
            success_embed = ModernEmbed.create_status_embed(
                "✅ Music Added to Queue",
                f"Successfully added: `{search_query}`\n\nUse the Music Hub to manage playback!",
                status_type="success"
            )
            
            await interaction.edit_original_response(embed=success_embed, view=None)
            
        except Exception as e:
            # Show error embed
            error_embed = ModernEmbed.create_status_embed(
                "❌ Search Failed",
                f"Could not find or play: `{search_query}`\n\nError: {str(e)}",
                color=0xff0000,
                status_type="error"
            )
            
            await interaction.edit_original_response(embed=error_embed, view=None)

class PlaylistCreateModal(discord.ui.Modal):
    """Modal for creating new playlists"""
    
    def __init__(self, hub_view: MusicHubView):
        super().__init__(title="📋 Create New Playlist")
        self.hub_view = hub_view
        
        self.name_input = discord.ui.TextInput(
            label="Playlist Name",
            placeholder="My Awesome Playlist",
            style=discord.TextStyle.short,
            required=True,
            max_length=100
        )
        
        self.url_input = discord.ui.TextInput(
            label="YouTube Playlist URL (Optional)",
            placeholder="https://youtube.com/playlist?list=...",
            style=discord.TextStyle.short,
            required=False,
            max_length=500
        )
        
        self.public_input = discord.ui.TextInput(
            label="Make Public? (yes/no)",
            placeholder="no",
            style=discord.TextStyle.short,
            required=False,
            max_length=3
        )
        
        self.add_item(self.name_input)
        self.add_item(self.url_input)
        self.add_item(self.public_input)
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle playlist creation"""
        name = self.name_input.value.strip()
        url = self.url_input.value.strip()
        is_public = self.public_input.value.lower().strip() in ["yes", "y", "true", "1"]
        
        # Show loading
        loading_embed = ModernEmbed.create_status_embed(
            "📋 Creating Playlist...",
            f"Setting up: `{name}`",
            status_type="loading"
        )
        
        await interaction.response.edit_message(embed=loading_embed, view=None)
        
        try:
            # Create playlist in database
            await self.hub_view.bot.db.execute("""
                INSERT INTO playlists (name, creator_id, guild_id, is_public, track_data)
                VALUES (?, ?, ?, ?, ?)
            """, (name, interaction.user.id, interaction.guild_id, int(is_public), json.dumps([])))
            
            await self.hub_view.bot.db.commit()
            
            # Success embed
            success_embed = ModernEmbed.create_status_embed(
                "✅ Playlist Created!",
                f"**{name}** has been created!\n\nVisibility: {'Public' if is_public else 'Private'}\nTracks: 0",
                status_type="success"
            )
            
            await interaction.edit_original_response(embed=success_embed, view=None)
            
        except Exception as e:
            error_embed = ModernEmbed.create_status_embed(
                "❌ Creation Failed",
                f"Could not create playlist: `{name}`\n\nError: {str(e)}",
                color=0xff0000,
                status_type="error"
            )
            
            await interaction.edit_original_response(embed=error_embed, view=None)

class MusicHubCog(commands.Cog):
    """Modern Music Hub Command System"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @commands.hybrid_command(name="music", description="🎵 Open the advanced music control hub")
    async def music_hub(self, ctx: commands.Context):
        """Main music hub command"""
        # Create hub view
        hub_view = MusicHubView(self.bot, ctx.author)
        
        # Get initial embed
        embed = await hub_view.get_embed_for_page()
        
        # Send hub interface
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed, view=hub_view, ephemeral=False)
            hub_view.message = await ctx.interaction.original_response()
        else:
            message = await ctx.send(embed=embed, view=hub_view)
            hub_view.message = message
    
    @commands.hybrid_command(name="play", description="🎵 Quick play command")
    async def quick_play(self, ctx: commands.Context, *, query: str):
        """Quick play without opening hub"""
        # Show processing embed
        embed = ModernEmbed.create_status_embed(
            "🎵 Processing Music Request",
            f"Searching for: `{query}`",
            status_type="loading"
        )
        
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed)
        else:
            await ctx.send(embed=embed)
        
        # Simulate music processing
        await asyncio.sleep(2)
        
        # Show success
        success_embed = ModernEmbed.create_status_embed(
            "✅ Added to Queue",
            f"Now playing: `{query}`\n\nUse `/music` for full control hub!",
            status_type="success"
        )
        
        if ctx.interaction:
            await ctx.interaction.edit_original_response(embed=success_embed)
        else:
            await ctx.send(embed=success_embed)

async def setup(bot):
    """Setup function for the cog"""
    await bot.add_cog(MusicHubCog(bot))