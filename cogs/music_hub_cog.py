# cogs/music_hub_cog.py
import discord
from discord import app_commands
from discord.ext import commands
import asyncio
from typing import List, Optional
import traceback
from core.command_hub_system import ModernEmbed, HubCategory

class PlaylistModal(discord.ui.Modal, title="🎵 Playlist Manager"):
    def __init__(self, bot, playlists):
        super().__init__()
        self.bot = bot
        self.playlists = playlists
        
    @discord.ui.select(
        placeholder="Choose a playlist...",
        options=[]  # Will be populated dynamically
    )
    async def playlist_select(self, interaction: discord.Interaction, select: discord.ui.Select):
        await interaction.response.defer()

class PlaylistSelector(discord.ui.View):
    def __init__(self, bot, user_id, playlists):
        super().__init__(timeout=300)
        self.bot = bot
        self.user_id = user_id
        self.playlists = playlists
        self.selected_playlist = None
        
        # Create dropdown with playlists
        if playlists:
            options = []
            for playlist_name, song_count in playlists[:25]:  # Discord limit
                options.append(discord.SelectOption(
                    label=playlist_name,
                    description=f"{song_count} songs",
                    value=playlist_name
                ))
            
            self.playlist_dropdown = discord.ui.Select(
                placeholder="🎵 Choose a playlist...",
                options=options
            )
            self.playlist_dropdown.callback = self.playlist_selected
            self.add_item(self.playlist_dropdown)
        else:
            # No playlists available
            self.add_item(discord.ui.Button(
                label="❌ No playlists found", 
                style=discord.ButtonStyle.secondary, 
                disabled=True
            ))
    
    async def playlist_selected(self, interaction: discord.Interaction):
        """Handle playlist selection from dropdown"""
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("❌ Only the command user can use this!", ephemeral=True)
            return
        
        self.selected_playlist = interaction.data['values'][0]
        
        # Create playlist action buttons
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title=f"🎵 Playlist: {self.selected_playlist}",
            description=f"What would you like to do with **{self.selected_playlist}**?",
            fields=[
                {
                    "name": "📊 Playlist Info",
                    "value": f"Songs: {dict(self.playlists)[self.selected_playlist]} tracks",
                    "inline": True
                }
            ]
        )
        
        # Clear existing items and add action buttons
        self.clear_items()
        self.add_item(PlayButton(self.bot, self.selected_playlist))
        self.add_item(EditButton(self.bot, self.selected_playlist)) 
        self.add_item(DeleteButton(self.bot, self.selected_playlist))
        self.add_item(ShuffleButton(self.bot, self.selected_playlist))
        self.add_item(BackButton())
        
        await interaction.response.edit_message(embed=embed, view=self)

class PlayButton(discord.ui.Button):
    def __init__(self, bot, playlist_name):
        super().__init__(style=discord.ButtonStyle.success, label="▶️ Play", row=0)
        self.bot = bot
        self.playlist_name = playlist_name

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        
        # Check if user is in a voice channel
        if not interaction.user.voice:
            await interaction.followup.send("❌ You need to be in a voice channel to play music!", ephemeral=True)
            return
        
        # Get the music cog to handle actual playback
        music_cog = self.bot.get_cog('MusicCog')
        if not music_cog:
            await interaction.followup.send("❌ Music system is not available!", ephemeral=True)
            return
        
        try:
            # Get playlist songs from database
            cursor = await self.bot.db.execute("""
                SELECT songs FROM user_playlists WHERE user_id = ? AND name = ?
            """, (interaction.user.id, self.playlist_name))
            result = await cursor.fetchone()
            
            if not result:
                await interaction.followup.send("❌ Playlist not found!", ephemeral=True)
                return
            
            # Parse songs (assuming JSON format)
            import json
            try:
                songs = json.loads(result[0])
            except:
                songs = []
            
            if not songs:
                await interaction.followup.send("❌ Playlist is empty!", ephemeral=True)
                return
            
            # Join voice channel and start playing
            voice_channel = interaction.user.voice.channel
            
            # Connect to voice if not already connected
            if not interaction.guild.voice_client:
                voice_client = await voice_channel.connect()
            else:
                voice_client = interaction.guild.voice_client
                if voice_client.channel != voice_channel:
                    await voice_client.move_to(voice_channel)
            
            # Add all songs to queue
            queued_count = 0
            for song_url in songs[:20]:  # Limit to prevent spam
                try:
                    # Use the existing play command logic
                    if hasattr(music_cog, 'add_to_queue'):
                        await music_cog.add_to_queue(song_url, interaction.user)
                        queued_count += 1
                except Exception as e:
                    self.bot.add_error(f"Failed to queue song {song_url}: {e}")
                    continue
            
            if queued_count > 0:
                # Start playing if not already playing
                if not voice_client.is_playing() and hasattr(music_cog, 'play_next'):
                    await music_cog.play_next(interaction.guild)
                
                # Send success message with now playing controls
                await self.send_now_playing(interaction, queued_count)
            else:
                await interaction.followup.send("❌ Failed to queue any songs from playlist!", ephemeral=True)
                
        except Exception as e:
            await interaction.followup.send(f"❌ Error playing playlist: {str(e)}", ephemeral=True)
            self.bot.add_error(f"Playlist play error: {e}")
    
    async def send_now_playing(self, interaction: discord.Interaction, queued_count: int):
        """Send now playing embed with controls"""
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="🎵 Now Playing",
            description=f"**{self.playlist_name}** playlist is now playing!\n{queued_count} songs queued.",
            fields=[
                {
                    "name": "🎛️ Music Controls",
                    "value": "Use the buttons below to control playback",
                    "inline": False
                }
            ]
        )
        
        view = MusicControlView(self.bot, interaction.user.id)
        await interaction.followup.send(embed=embed, view=view)

class MusicControlView(discord.ui.View):
    def __init__(self, bot, user_id):
        super().__init__(timeout=300)
        self.bot = bot
        self.user_id = user_id
        self.loop_mode = "off"  # off, one, all
        
    @discord.ui.button(emoji="⏯️", style=discord.ButtonStyle.primary, row=0)
    async def play_pause(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("❌ Only the playlist user can control this!", ephemeral=True)
            return
        
        voice_client = interaction.guild.voice_client
        if voice_client:
            if voice_client.is_playing():
                voice_client.pause()
                await interaction.response.send_message("⏸️ Music paused", ephemeral=True)
            elif voice_client.is_paused():
                voice_client.resume()
                await interaction.response.send_message("▶️ Music resumed", ephemeral=True)
            else:
                await interaction.response.send_message("❌ Nothing is currently playing", ephemeral=True)
        else:
            await interaction.response.send_message("❌ Not connected to voice channel", ephemeral=True)
    
    @discord.ui.button(emoji="⏭️", style=discord.ButtonStyle.secondary, row=0)
    async def skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("❌ Only the playlist user can control this!", ephemeral=True)
            return
        
        voice_client = interaction.guild.voice_client
        if voice_client and voice_client.is_playing():
            voice_client.stop()  # This triggers the after callback to play next
            await interaction.response.send_message("⏭️ Skipped to next song", ephemeral=True)
        else:
            await interaction.response.send_message("❌ Nothing is currently playing", ephemeral=True)
    
    @discord.ui.button(emoji="⏹️", style=discord.ButtonStyle.danger, row=0)
    async def stop(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("❌ Only the playlist user can control this!", ephemeral=True)
            return
        
        voice_client = interaction.guild.voice_client
        if voice_client:
            # Clear queue and stop
            music_cog = self.bot.get_cog('MusicCog')
            if music_cog and hasattr(music_cog, 'clear_queue'):
                await music_cog.clear_queue(interaction.guild.id)
            
            voice_client.stop()
            await voice_client.disconnect()
            await interaction.response.send_message("⏹️ Music stopped and disconnected", ephemeral=True)
        else:
            await interaction.response.send_message("❌ Not connected to voice channel", ephemeral=True)
    
    @discord.ui.button(emoji="🔀", style=discord.ButtonStyle.secondary, row=0)
    async def shuffle(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("❌ Only the playlist user can control this!", ephemeral=True)
            return
        
        music_cog = self.bot.get_cog('MusicCog')
        if music_cog and hasattr(music_cog, 'shuffle_queue'):
            await music_cog.shuffle_queue(interaction.guild.id)
            await interaction.response.send_message("🔀 Queue shuffled", ephemeral=True)
        else:
            await interaction.response.send_message("❌ Shuffle not available", ephemeral=True)
    
    @discord.ui.button(emoji="🔁", style=discord.ButtonStyle.secondary, row=1)
    async def loop_toggle(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("❌ Only the playlist user can control this!", ephemeral=True)
            return
        
        # Cycle through loop modes: off -> one -> all -> off
        loop_modes = {"off": "one", "one": "all", "all": "off"}
        self.loop_mode = loop_modes[self.loop_mode]
        
        emoji_map = {"off": "➡️", "one": "🔂", "all": "🔁"}
        text_map = {"off": "Loop: Off", "one": "Loop: Current Song", "all": "Loop: All Songs"}
        
        button.emoji = emoji_map[self.loop_mode]
        
        await interaction.response.edit_message(view=self)
        await interaction.followup.send(f"🔁 {text_map[self.loop_mode]}", ephemeral=True)
    
    @discord.ui.button(emoji="📋", style=discord.ButtonStyle.secondary, row=1)
    async def show_queue(self, interaction: discord.Interaction, button: discord.ui.Button):
        music_cog = self.bot.get_cog('MusicCog')
        if music_cog and hasattr(music_cog, 'get_queue'):
            queue = await music_cog.get_queue(interaction.guild.id)
            if queue:
                queue_text = "\n".join([f"{i+1}. {song}" for i, song in enumerate(queue[:10])])
                if len(queue) > 10:
                    queue_text += f"\n... and {len(queue) - 10} more songs"
                
                embed = discord.Embed(
                    title="🎵 Current Queue",
                    description=queue_text,
                    color=0x00ff88
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message("📋 Queue is empty", ephemeral=True)
        else:
            await interaction.response.send_message("❌ Queue not available", ephemeral=True)

class EditButton(discord.ui.Button):
    def __init__(self, bot, playlist_name):
        super().__init__(style=discord.ButtonStyle.primary, label="✏️ Edit", row=0)
        self.bot = bot
        self.playlist_name = playlist_name

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            f"✏️ To edit **{self.playlist_name}**:\n"
            f"• Add songs: `/playlist_add {self.playlist_name} <song_url>`\n"
            f"• Remove songs: `/playlist_remove {self.playlist_name} <song_number>`\n"
            f"• View contents: `/queue playlist:{self.playlist_name}`",
            ephemeral=True
        )

class DeleteButton(discord.ui.Button):
    def __init__(self, bot, playlist_name):
        super().__init__(style=discord.ButtonStyle.danger, label="🗑️ Delete", row=0)
        self.bot = bot
        self.playlist_name = playlist_name

    async def callback(self, interaction: discord.Interaction):
        # Confirmation button
        view = discord.ui.View(timeout=60)
        
        async def confirm_delete(confirm_interaction):
            if confirm_interaction.user.id != interaction.user.id:
                await confirm_interaction.response.send_message("❌ Only the playlist owner can delete this!", ephemeral=True)
                return
            
            try:
                await self.bot.db.execute("""
                    DELETE FROM user_playlists WHERE user_id = ? AND name = ?
                """, (interaction.user.id, self.playlist_name))
                await self.bot.db.commit()
                
                await confirm_interaction.response.send_message(
                    f"🗑️ Playlist **{self.playlist_name}** has been deleted!", ephemeral=True
                )
            except Exception as e:
                await confirm_interaction.response.send_message(
                    f"❌ Error deleting playlist: {str(e)}", ephemeral=True
                )
        
        confirm_button = discord.ui.Button(label="Confirm Delete", style=discord.ButtonStyle.danger)
        confirm_button.callback = confirm_delete
        view.add_item(confirm_button)
        
        await interaction.response.send_message(
            f"⚠️ Are you sure you want to delete **{self.playlist_name}**? This cannot be undone!",
            view=view, ephemeral=True
        )

class ShuffleButton(discord.ui.Button):
    def __init__(self, bot, playlist_name):
        super().__init__(style=discord.ButtonStyle.secondary, label="🔀 Shuffle Play", row=0)
        self.bot = bot
        self.playlist_name = playlist_name

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            f"🔀 To shuffle play **{self.playlist_name}**:\n"
            f"1. First click **▶️ Play** to start the playlist\n"
            f"2. Then use the 🔀 button in the music controls\n"
            f"3. Or use `/play playlist:{self.playlist_name} shuffle:True`",
            ephemeral=True
        )

class BackButton(discord.ui.Button):
    def __init__(self):
        super().__init__(style=discord.ButtonStyle.secondary, label="🔙 Back to Playlists", row=1)

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.send_message("Use `/music-hub` to return to the main music hub!", ephemeral=True)

class MusicHubView(discord.ui.View):
    def __init__(self, bot, user):
        super().__init__(timeout=300)
        self.bot = bot
        self.user = user
        self.current_view = "main"
        
    async def get_embed_for_page(self):
        """Get the embed for the current view"""
        if self.current_view == "main":
            return await self._get_main_embed()
        elif self.current_view == "playlists":
            return await self._get_playlists_embed()
        else:
            return await self._get_main_embed()
    
    async def _get_main_embed(self):
        """Main music hub embed"""
        try:
            # Get user stats
            cursor = await self.bot.db.execute("""
                SELECT COUNT(*) FROM user_playlists WHERE user_id = ?
            """, (self.user.id,))
            playlist_count = (await cursor.fetchone())[0]
        except:
            playlist_count = 0
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="🎵 Music Hub",
            description="**Your complete music management center**\n\nAccess all music features through this interactive hub.",
            fields=[
                {
                    "name": "📊 Your Music Stats",
                    "value": f"🎵 Playlists: {playlist_count}\n🎶 Ready to rock!",
                    "inline": True
                },
                {
                    "name": "🎯 Quick Actions",
                    "value": "• **📋 Playlists** - Manage your collections\n• **🎵 Play Music** - Start listening now\n• **📑 Queue** - View current queue",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_playlists_embed(self):
        """Playlist management embed"""  
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.MUSIC,
            title="🎵 Playlist Management Center",
            description="📋 Manage your personal music collections\n\nSelect a playlist below to play, edit, or delete it.",
            fields=[]
        )
        return embed
    
    @discord.ui.button(label="📋 Playlists", style=discord.ButtonStyle.primary, row=0)
    async def playlists_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show playlist selector"""
        if interaction.user.id != self.user.id:
            await interaction.response.send_message("❌ Only the command user can use this!", ephemeral=True)
            return
        
        try:
            # Get user playlists
            cursor = await self.bot.db.execute("""
                SELECT name, song_count FROM user_playlists WHERE user_id = ? ORDER BY name
            """, (self.user.id,))
            playlists = await cursor.fetchall()
            
            if not playlists:
                await interaction.response.send_message(
                    "❌ **No playlists found!**\n\n"
                    "Create your first playlist with:\n"
                    "`/playlist_create <name> <youtube_playlist_url>`",
                    ephemeral=True
                )
                return
            
            # Create playlist selector view
            playlist_embed = ModernEmbed.create_hub_embed(
                category=HubCategory.MUSIC,
                title="🎵 Your Playlists",
                description=f"Found **{len(playlists)}** playlists. Choose one to manage:",
                fields=[
                    {
                        "name": "📝 Your Playlists",
                        "value": "\n".join([f"{i+1}. **{name}** ({count} tracks)" for i, (name, count) in enumerate(playlists[:10])]),
                        "inline": False
                    }
                ]
            )
            
            view = PlaylistSelector(self.bot, self.user.id, playlists)
            await interaction.response.send_message(embed=playlist_embed, view=view, ephemeral=True)
            
        except Exception as e:
            await interaction.response.send_message(f"❌ Error loading playlists: {str(e)}", ephemeral=True)
    
    @discord.ui.button(label="🎵 Play Music", style=discord.ButtonStyle.success, row=0)
    async def play_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Direct play music"""
        await interaction.response.send_message(
            "🎵 **Play Music Options:**\n\n"
            "• **Single song**: `/play <song name or URL>`\n"
            "• **Playlist**: Use the 📋 Playlists button above\n"
            "• **YouTube playlist**: `/play <youtube_playlist_url>`\n"
            "• **Radio**: `/play radio:<genre>`",
            ephemeral=True
        )
    
    @discord.ui.button(label="📑 Current Queue", style=discord.ButtonStyle.secondary, row=0)
    async def queue_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show current queue"""
        try:
            music_cog = self.bot.get_cog('MusicCog')
            if music_cog and hasattr(music_cog, 'get_queue'):
                queue = await music_cog.get_queue(interaction.guild.id)
                if queue:
                    queue_text = "\n".join([f"{i+1}. {song}" for i, song in enumerate(queue[:15])])
                    if len(queue) > 15:
                        queue_text += f"\n... and {len(queue) - 15} more songs"
                    
                    embed = ModernEmbed.create_hub_embed(
                        category=HubCategory.MUSIC,
                        title="📑 Current Queue",
                        description=queue_text or "Queue is empty",
                        fields=[
                            {
                                "name": "📊 Queue Stats", 
                                "value": f"Total songs: {len(queue)}",
                                "inline": True
                            }
                        ]
                    )
                    await interaction.response.send_message(embed=embed, ephemeral=True)
                else:
                    await interaction.response.send_message("📑 **Queue is empty**\n\nAdd songs with `/play <song>`", ephemeral=True)
            else:
                await interaction.response.send_message("❌ Music system not available", ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(f"❌ Error loading queue: {str(e)}", ephemeral=True)


class MusicHubCog(commands.Cog):
    """Music Hub - Interactive music management interface"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="music-hub", description="🎵 Open the interactive Music Hub")
    async def music_hub_command(self, interaction: discord.Interaction):
        """Launch the interactive Music Hub"""
        try:
            view = MusicHubView(self.bot, interaction.user)
            embed = await view.get_embed_for_page()
            await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(
                f"⚠️ Music Hub temporarily unavailable: {str(e)}", 
                ephemeral=True
            )
            self.bot.add_error(f"Music hub error: {e}")

async def setup(bot):
    await bot.add_cog(MusicHubCog(bot))