# cogs/admin_cog.py

import discord
from discord import app_commands
from discord.ext import commands
import os
import io
import asyncio
from datetime import datetime
import datetime as dt
from typing import List, Optional
import yt_dlp

# --- Thematic Emojis for consistency ---
FRAGMENTS_EMOJI = "💾"
LOGKEY_EMOJI = "🔑"
LIVES_EMOJI = "❤️"
ITEM_EMOJI = "📦"

# --- YTDL Setup for Admin Cog ---
YTDL_OPTIONS = {
    'format': 'bestaudio/best',
    'noplaylist': False,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0',
    'extract_flat': False,
    'skip_download': True,
}
ytdl = yt_dlp.YoutubeDL(YTDL_OPTIONS)

class GPUOptimizationView(discord.ui.View):
    """View for GPU memory optimization controls"""
    
    def __init__(self, gpu_engine):
        super().__init__(timeout=180)
        self.gpu_engine = gpu_engine
    
    @discord.ui.button(label="🧹 Optimize Memory", style=discord.ButtonStyle.secondary)
    async def optimize_memory(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        
        try:
            if self.gpu_engine:
                self.gpu_engine.optimize_memory()
                await interaction.followup.send("✅ GPU memory optimized successfully!", ephemeral=True)
            else:
                await interaction.followup.send("❌ GPU engine not available", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Optimization failed: {e}", ephemeral=True)
    
    @discord.ui.button(label="📊 Refresh Stats", style=discord.ButtonStyle.primary)
    async def refresh_stats(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        
        try:
            if self.gpu_engine:
                performance_report = self.gpu_engine.get_performance_report()
                gpu_stats = performance_report.get('gpu_stats', {})
                
                embed = discord.Embed(
                    title="🔄 Refreshed GPU Stats",
                    color=0x3498db,
                    timestamp=datetime.now()
                )
                
                embed.add_field(
                    name="📈 Current Stats",
                    value=f"**GPU Utilization:** {gpu_stats.get('gpu_utilization', 0)}%\n"
                          f"**Memory Used:** {gpu_stats.get('memory_used_gb', 0):.1f}GB\n"
                          f"**Cache Hit Rate:** {performance_report.get('cache_hit_rate', 0):.1f}%\n"
                          f"**Total Inferences:** {performance_report.get('total_inferences', 0):,}",
                    inline=False
                )
                
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.followup.send("❌ GPU engine not available", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Failed to refresh stats: {e}", ephemeral=True)

@app_commands.guild_only() 
@app_commands.default_permissions(administrator=True) 
class AdminCog(commands.GroupCog, name="admin"):
    """Administrator commands for managing the bot and players."""
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        super().__init__()

    # --- Helper check for admin permissions ---
    def is_admin():
        async def predicate(interaction: discord.Interaction) -> bool:
            if interaction.user.guild_permissions.administrator:
                return True
            await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
            return False
        return app_commands.check(predicate)

    # --- Autocomplete Functions ---
    async def item_autocomplete(self, interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
        items = []
        if hasattr(self.bot, 'shop_items'):
            for category in self.bot.shop_items.values():
                for item in category:
                    items.append(item)
        
        choices = [
            app_commands.Choice(name=f"{item.get('emoji','')} {item['name']}", value=item['id'])
            for item in items if current.lower() in item['name'].lower()
        ]
        return choices[:25]

    async def cog_autocomplete(self, interaction: discord.Interaction, current: str) -> List[app_commands.Choice[str]]:
        """Autocompletes with the names of currently loaded cogs."""
        cogs = [ext.split('.')[-1] for ext in self.bot.extensions.keys()]
        return [
            app_commands.Choice(name=cog, value=cog)
            for cog in cogs if current.lower() in cog.lower()
        ]

    # --- Admin Sub-Commands ---
    @app_commands.command(name="give", description="Give currency, lives, or items to a user.")
    @app_commands.describe(
        user="The user to give items to.",
        fragments="The amount of fragments to give.",
        log_keys="The amount of log-keys to give.",
        lives="The amount of lives to give.",
        item="The ID of the item to give from the shop.",
        quantity="The amount of the specified item to give."
    )
    @app_commands.autocomplete(item=item_autocomplete)
    async def give(self, interaction: discord.Interaction, user: discord.Member, fragments: int = 0, log_keys: int = 0, lives: int = 0, item: str = None, quantity: int = 1):
        await interaction.response.defer(ephemeral=True)
        await self.bot.db.execute("INSERT OR IGNORE INTO players (user_id) VALUES (?)", (user.id,))
        
        await self.bot.db.execute(
            "UPDATE players SET fragments = fragments + ?, log_keys = log_keys + ?, lives = lives + ? WHERE user_id = ?",
            (fragments, log_keys, lives, user.id)
        )
        feedback_message = f"Gave `{fragments}`{FRAGMENTS_EMOJI}, `{log_keys}`{LOGKEY_EMOJI}, and `{lives}`{LIVES_EMOJI} to {user.mention}."

        if item:
            item_data = next((shop_item for cat in self.bot.shop_items.values() for shop_item in cat if shop_item['id'] == item), None)
            if item_data:
                await self.bot.db.execute(
                    "INSERT INTO player_items (user_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + ?",
                    (user.id, item, quantity, quantity)
                )
                feedback_message += f"\nAlso gave `{quantity}`x {item_data['name']} {ITEM_EMOJI}."
            else:
                feedback_message += f"\nCould not find an item with ID `{item}` in the current shop."

        await self.bot.db.commit()
        await interaction.followup.send(feedback_message, ephemeral=True)

    @app_commands.command(name="set", description="Set a user's stats to a specific value.")
    @app_commands.describe(user="The user to modify.", fragments="Set total fragments.", log_keys="Set total log-keys.", lives="Set total lives.", level="Set level.", xp="Set XP.")
    async def set(self, interaction: discord.Interaction, user: discord.Member, fragments: int = -1, log_keys: int = -1, lives: int = -1, level: int = -1, xp: int = -1):
        await interaction.response.defer(ephemeral=True)
        await self.bot.db.execute("INSERT OR IGNORE INTO players (user_id) VALUES (?)", (user.id,))
        
        updates, params = [], []
        if fragments >= 0: updates.append("fragments = ?"); params.append(fragments)
        if log_keys >= 0: updates.append("log_keys = ?"); params.append(log_keys)
        if lives >= 0: updates.append("lives = ?"); params.append(lives)
        if level >= 0: updates.append("level = ?"); params.append(level)
        if xp >= 0: updates.append("xp = ?"); params.append(xp)

        if not updates:
            return await interaction.followup.send("No stats were changed. Provide a value of 0 or greater for at least one option.", ephemeral=True)

        params.append(user.id)
        query = f"UPDATE players SET {', '.join(updates)} WHERE user_id = ?"
        await self.bot.db.execute(query, tuple(params))
        await self.bot.db.commit()
        await interaction.followup.send(f"Successfully updated stats for {user.mention}.", ephemeral=True)

    @app_commands.command(name="reset_game", description="Reset a player's game progress and sessions.")
    @app_commands.describe(user="The user whose game data will be reset.")
    async def reset_game(self, interaction: discord.Interaction, user: discord.Member):
        await interaction.response.defer(ephemeral=True)
        await self.bot.db.execute("DELETE FROM game_sessions WHERE user_id = ?", (user.id,))
        
        memory_msg = "(AI memories could not be cleared)"
        if (game_cog := self.bot.get_cog('GameCog')) and hasattr(game_cog, 'memory_system'):
            game_cog.memory_system.clear_user_memory(user_id=str(user.id))
            memory_msg = "and AI memories"
        
        await self.bot.db.commit()
        
        embed = discord.Embed(
            title="🎮 Game Data Reset",
            description=f"✅ Reset game sessions {memory_msg} for {user.mention}",
            color=0xFEE75C
        )
        embed.set_author(name=f"Admin Action by {interaction.user.display_name}", icon_url=interaction.user.display_avatar.url)
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="reset_profile", description="Reset a player's economy and profile data.")
    @app_commands.describe(user="The user whose profile data will be reset.")
    async def reset_profile(self, interaction: discord.Interaction, user: discord.Member):
        await interaction.response.defer(ephemeral=True)
        await self.bot.db.execute("DELETE FROM players WHERE user_id = ?", (user.id,))
        await self.bot.db.commit()
        
        embed = discord.Embed(
            title="👤 Profile Data Reset",
            description=f"✅ Reset economy and profile data for {user.mention}",
            color=0x5865F2
        )
        embed.set_author(name=f"Admin Action by {interaction.user.display_name}", icon_url=interaction.user.display_avatar.url)
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="reset_inventory", description="Reset a player's inventory and items.")
    @app_commands.describe(user="The user whose inventory will be cleared.")
    async def reset_inventory(self, interaction: discord.Interaction, user: discord.Member):
        await interaction.response.defer(ephemeral=True)
        await self.bot.db.execute("DELETE FROM inventory WHERE user_id = ?", (user.id,))
        await self.bot.db.execute("DELETE FROM player_items WHERE user_id = ?", (user.id,))
        await self.bot.db.commit()
        
        embed = discord.Embed(
            title="🎒 Inventory Reset",
            description=f"✅ Cleared inventory and items for {user.mention}",
            color=0x57F287
        )
        embed.set_author(name=f"Admin Action by {interaction.user.display_name}", icon_url=interaction.user.display_avatar.url)
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="broadcast", description="Broadcast a message as a system alert.")
    @app_commands.describe(message="The message to broadcast.")
    async def broadcast(self, interaction: discord.Interaction, message: str):
        await interaction.response.send_message("Broadcasting alert...", ephemeral=True)
        embed = discord.Embed(title="> SYSTEM-WIDE ALERT", description=f"```\n{message}\n```", color=discord.Color.red(), timestamp=datetime.now(datetime.timezone.utc))
        embed.set_footer(text=f"Broadcast initiated by Administrator: {interaction.user.display_name}")
        log_channel_name = "🗃️opure-logs🗃️"
        for guild in self.bot.guilds:
            if channel := discord.utils.get(guild.text_channels, name=log_channel_name):
                try: await channel.send(embed=embed)
                except discord.Forbidden: pass

    @app_commands.command(name="shop_refresh", description="Forces the AI to generate a new set of items for the shop.")
    async def shop_refresh(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        if economy_cog := self.bot.get_cog('EconomyCog'):
            try:
                await economy_cog.generate_shop_items()
                
                embed = discord.Embed(
                    title="🛒 Shop Refreshed", 
                    description="✅ **All shop categories have been regenerated using Mistral AI**",
                    color=0x57F287
                )
                embed.set_author(name=f"Admin Action by {interaction.user.display_name}", icon_url=interaction.user.display_avatar.url)
                
                # Add category info
                if hasattr(self.bot, 'shop_items'):
                    category_info = []
                    for category, items in self.bot.shop_items.items():
                        category_info.append(f"📦 **{category}**: {len(items)} items")
                    embed.add_field(name="Generated Categories", value="\n".join(category_info), inline=False)
                
                embed.set_footer(text="🤖 Generated with Mistral AI", icon_url=self.bot.user.display_avatar.url)
                await interaction.followup.send(embed=embed, ephemeral=True)
                
            except Exception as e:
                self.bot.add_error(f"Error refreshing shop: {e}")
                await interaction.followup.send("❌ An error occurred while refreshing the shop.", ephemeral=True)
        else:
            await interaction.followup.send("❌ Could not find the economy cog.", ephemeral=True)
            
    # --- Bot Management Group ---
    management_group = app_commands.Group(name="bot", description="Commands for managing the bot itself.")
    
    @management_group.command(name="reload", description="Reloads a specific cog.")
    @app_commands.describe(cog="The name of the cog to reload.")
    @app_commands.autocomplete(cog=cog_autocomplete)
    async def reload(self, interaction: discord.Interaction, cog: str):
        await interaction.response.defer(ephemeral=True)
        self.bot.add_log(f"--- Reload command initiated by {interaction.user} ---")
        full_cog_name = f"cogs.{cog}"
        
        if full_cog_name not in self.bot.extensions:
            self.bot.add_log(f"No match found for '{cog}'. Available: {list(self.bot.extensions.keys())}")
            await interaction.followup.send(f"❌ The cog `{cog}` could not be found.", ephemeral=True)
            return

        try:
            await self.bot.reload_extension(full_cog_name)
            await interaction.followup.send(f"✅ Successfully reloaded the `{cog}` cog.", ephemeral=True)
            self.bot.add_log(f"Cog '{cog}' reloaded by {interaction.user}.")
        except Exception as e:
            await interaction.followup.send(f"An error occurred while reloading `{cog}`:\n```py\n{e}\n```", ephemeral=True)
            self.bot.add_error(f"Error reloading cog '{cog}': {e}")

    @management_group.command(name="sync", description="Syncs application commands with Discord.")
    @app_commands.describe(scope="Sync to the 'current' guild or 'global' (all guilds).")
    @app_commands.choices(scope=[
        app_commands.Choice(name="Current Guild", value="current"),
        app_commands.Choice(name="Global", value="global")
    ])
    async def sync(self, interaction: discord.Interaction, scope: str):
        await interaction.response.defer(ephemeral=True)
        
        if scope == "global":
            self.bot.add_log(f"Global command sync initiated by {interaction.user}.")
            synced = await self.bot.tree.sync()
            await interaction.followup.send(f"Synced {len(synced)} commands globally.", ephemeral=True)
        else:
            self.bot.add_log(f"Guild command sync for '{interaction.guild.name}' initiated by {interaction.user}.")
            self.bot.tree.copy_global_to(guild=interaction.guild)
            synced = await self.bot.tree.sync(guild=interaction.guild)
            await interaction.followup.send(f"Synced {len(synced)} commands to this guild.", ephemeral=True)

    @app_commands.command(name="clear_commands", description="Clear guild slash commands (Entry Point safe)")
    @app_commands.describe(scope="Clear from 'current' guild only (global disabled for Entry Point safety)")
    @app_commands.choices(scope=[
        app_commands.Choice(name="Current Guild", value="current")
    ])
    @is_admin()
    async def clear_commands(self, interaction: discord.Interaction, scope: str):
        await interaction.response.defer(ephemeral=True)
        
        try:
            self.bot.add_log(f"Guild command clear for '{interaction.guild.name}' initiated by {interaction.user}.")
            self.bot.tree.clear_commands(guild=interaction.guild)
            synced = await self.bot.tree.sync(guild=interaction.guild)
            await interaction.followup.send(
                f"✅ Cleared all commands from this guild. {len(synced)} commands remain.\n"
                f"ℹ️ Global command clearing disabled to protect Entry Point commands.", 
                ephemeral=True
            )
        except Exception as e:
            if "Entry Point command" in str(e) or "50240" in str(e):
                await interaction.followup.send(
                    f"⚠️ Entry Point command detected - cannot clear safely.\n"
                    f"Use `/cleanup_duplicates` for safe command management instead.", 
                    ephemeral=True
                )
            else:
                self.bot.add_error(f"Command clear error: {e}")
                await interaction.followup.send(f"❌ Error during clear: {e}", ephemeral=True)

    @app_commands.command(name="refresh_commands", description="Refresh guild commands safely (Entry Point safe)")
    @app_commands.describe(scope="Refresh 'current' guild only (global disabled for Entry Point safety)")
    @app_commands.choices(scope=[
        app_commands.Choice(name="Current Guild", value="current")
    ])
    @is_admin()
    async def refresh_commands(self, interaction: discord.Interaction, scope: str):
        await interaction.response.defer(ephemeral=True)
        
        try:
            self.bot.add_log(f"Guild command refresh for '{interaction.guild.name}' initiated by {interaction.user}.")
            
            # Clear guild commands only (preserve global Entry Points)
            self.bot.tree.clear_commands(guild=interaction.guild)
            await self.bot.tree.sync(guild=interaction.guild)
            
            # Wait a moment for Discord to process
            await asyncio.sleep(2)
            
            # Re-sync current commands to this guild
            synced = await self.bot.tree.sync(guild=interaction.guild)
            await interaction.followup.send(
                f"✅ Refreshed guild commands. Now showing {len(synced)} commands.\n"
                f"ℹ️ Global commands preserved to protect Entry Point commands.", 
                ephemeral=True
            )
                
        except Exception as e:
            # Handle Entry Point command errors specifically
            if "Entry Point command" in str(e) or "50240" in str(e):
                self.bot.add_log(f"⚠️ Entry Point command detected during refresh")
                try:
                    # Just re-sync without clearing
                    synced = await self.bot.tree.sync(guild=interaction.guild)
                    await interaction.followup.send(
                        f"🔧 **Safe Refresh Complete!**\n"
                        f"ℹ️ Entry Point command detected - preserved to avoid conflicts\n"
                        f"✅ Re-synced {len(synced)} guild commands", 
                        ephemeral=True
                    )
                except Exception as sync_error:
                    self.bot.add_error(f"Command sync error: {sync_error}")
                    await interaction.followup.send(f"❌ Error during sync: {sync_error}", ephemeral=True)
            else:
                self.bot.add_error(f"Command refresh error: {e}")
                await interaction.followup.send(f"❌ Error during command refresh: {e}", ephemeral=True)

    @app_commands.command(name="cleanup_duplicates", description="Quick fix to remove duplicate commands")
    @is_admin()
    async def cleanup_duplicates(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        try:
            self.bot.add_log(f"Command cleanup initiated by {interaction.user}.")
            
            # Step 1: Only clear and re-sync guild commands (avoid global Entry Point issues)
            self.bot.tree.clear_commands(guild=interaction.guild)
            
            # Step 2: Wait for Discord to process
            await asyncio.sleep(2)
            
            # Step 3: Re-sync guild commands
            synced = await self.bot.tree.sync(guild=interaction.guild)
            
            self.bot.add_log(f"Command cleanup complete. {len(synced)} commands active.")
            await interaction.followup.send(
                f"🧹 **Guild Cleanup Complete!**\n"
                f"✅ Cleared guild duplicate commands\n"
                f"✅ Re-synced {len(synced)} clean commands\n\n"
                f"All slash commands should now be working properly!\n"
                f"ℹ️ Global commands preserved to avoid Entry Point conflicts.",
                ephemeral=True
            )
                
        except Exception as e:
            # Handle Entry Point command errors specifically
            if "Entry Point command" in str(e) or "50240" in str(e):
                self.bot.add_log(f"⚠️ Entry Point command detected - performing safe cleanup")
                try:
                    # Just re-sync without clearing
                    synced = await self.bot.tree.sync(guild=interaction.guild)
                    await interaction.followup.send(
                        f"🔧 **Safe Cleanup Complete!**\n"
                        f"ℹ️ Entry Point command detected - preserved to avoid conflicts\n"
                        f"✅ Re-synced {len(synced)} guild commands\n\n"
                        f"Commands should be working properly!",
                        ephemeral=True
                    )
                except Exception as sync_error:
                    self.bot.add_error(f"Command sync error: {sync_error}")
                    await interaction.followup.send(f"❌ Error during sync: {sync_error}", ephemeral=True)
            else:
                self.bot.add_error(f"Command cleanup error: {e}")
                await interaction.followup.send(f"❌ Error during cleanup: {e}", ephemeral=True)

    @app_commands.command(name="verify_guild_commands", description="Verify commands are registered as guild commands for instant updates")
    @is_admin()
    async def verify_guild_commands(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        try:
            import os
            GUILD_ID_STR = os.getenv("GUILD_ID", "")
            GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
            
            if not GUILD_IDS:
                await interaction.followup.send("❌ No GUILD_IDS found in .env file!", ephemeral=True)
                return
            
            current_guild_id = interaction.guild_id
            
            # Check if current guild is in the test guild list
            is_test_guild = current_guild_id in GUILD_IDS
            
            # Get guild commands for current guild
            guild_commands = await self.bot.tree.fetch_commands(guild=interaction.guild)
            
            # Get global commands
            global_commands = await self.bot.tree.fetch_commands()
            
            embed = discord.Embed(
                title="🔧 Command Registration Status",
                color=discord.Color.blue() if is_test_guild else discord.Color.orange()
            )
            
            embed.add_field(
                name="📋 Current Guild",
                value=f"**{interaction.guild.name}** (ID: {current_guild_id})",
                inline=False
            )
            
            embed.add_field(
                name="🎯 Test Guild Status",
                value="✅ **Test Guild** - Commands update instantly!" if is_test_guild else "⚠️ **Not a Test Guild** - Commands may take up to 1 hour to update",
                inline=False
            )
            
            embed.add_field(
                name="🔧 Guild Commands",
                value=f"**{len(guild_commands)}** commands registered for this guild",
                inline=True
            )
            
            embed.add_field(
                name="🌐 Global Commands", 
                value=f"**{len(global_commands)}** global commands (slower updates)",
                inline=True
            )
            
            embed.add_field(
                name="📝 Test Guild IDs",
                value=f"```{', '.join(map(str, GUILD_IDS))}```",
                inline=False
            )
            
            if is_test_guild:
                embed.add_field(
                    name="✅ Recommendation",
                    value="Perfect! This guild is configured for instant command updates.",
                    inline=False
                )
            else:
                embed.add_field(
                    name="⚠️ Recommendation", 
                    value="Add this guild ID to your .env GUILD_ID list for instant command updates during testing.",
                    inline=False
                )
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            self.bot.add_error(f"Command verification error: {e}")
            await interaction.followup.send(f"❌ Error during verification: {e}", ephemeral=True)

    @app_commands.command(name="list_commands", description="List all registered slash commands")
    @app_commands.describe(scope="List 'current' guild or 'global' commands.")
    @app_commands.choices(scope=[
        app_commands.Choice(name="Current Guild", value="current"),
        app_commands.Choice(name="Global", value="global")
    ])
    @is_admin()
    async def list_commands(self, interaction: discord.Interaction, scope: str):
        await interaction.response.defer(ephemeral=True)
        
        try:
            if scope == "global":
                commands = await self.bot.tree.fetch_commands()
                title = "Global Slash Commands"
            else:
                commands = await self.bot.tree.fetch_commands(guild=interaction.guild)
                title = f"Guild Commands ({interaction.guild.name})"
            
            if not commands:
                return await interaction.followup.send(f"No commands found for {scope}.", ephemeral=True)
            
            embed = discord.Embed(
                title=f"📋 {title}",
                color=0x5865F2,
                description=f"Found **{len(commands)}** commands"
            )
            
            command_list = []
            for cmd in commands:
                command_list.append(f"`/{cmd.name}` - {cmd.description[:50]}{'...' if len(cmd.description) > 50 else ''}")
            
            # Split into multiple fields if too many commands
            for i in range(0, len(command_list), 15):
                chunk = command_list[i:i+15]
                field_name = f"Commands {i+1}-{min(i+15, len(command_list))}" if len(command_list) > 15 else "Commands"
                embed.add_field(
                    name=field_name,
                    value="\n".join(chunk),
                    inline=False
                )
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            self.bot.add_error(f"List commands error: {e}")
            await interaction.followup.send(f"❌ Error listing commands: {e}", ephemeral=True)

    # --- Log Management Group ---
    logs_group = app_commands.Group(name="logs", description="Commands for managing bot logs.")

    @logs_group.command(name="view", description="View the recent history from the terminal logs.")
    async def view_logs(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        log_history = "# Opure.exe Log History\n\n## LIVE LOG\n" + "-"*10 + "\n"
        log_history += "\n".join(self.bot.log_messages)
        log_history += "\n\n## ERROR LOG\n" + "-"*10 + "\n"
        log_history += "\n".join(self.bot.error_messages)
        log_file = discord.File(io.BytesIO(log_history.encode('utf-8')), filename=f"opure_log_{datetime.now().strftime('%Y-%m-%d_%H-%M')}.txt")
        await interaction.followup.send("Here is the recent log history from the terminal:", file=log_file, ephemeral=True)

    @logs_group.command(name="clear", description="Clear both the live and error logs in the dashboard.")
    async def clear_logs(self, interaction: discord.Interaction):
        self.bot.log_messages.clear()
        self.bot.error_messages.clear()
        await interaction.response.send_message("Terminal log displays have been cleared.", ephemeral=True)
        
    @logs_group.command(name="clear_errors", description="Clear only the error log in the dashboard.")
    async def clear_error_logs(self, interaction: discord.Interaction):
        self.bot.error_messages.clear()
        await interaction.response.send_message("Terminal error log display has been cleared.", ephemeral=True)

    # --- Admin Music Control Group ---
    musicadmin_group = app_commands.Group(name="musicadmin", description="Administrative music controls.")

    @musicadmin_group.command(name="adddj", description="Forcefully add a DJ in any active session.")
    @app_commands.describe(member="The user to make a DJ.", guild_id="[Optional] The ID of the server to target.")
    @is_admin()
    async def force_add_dj(self, interaction: discord.Interaction, member: discord.Member, guild_id: Optional[str] = None):
        target_guild_id = int(guild_id) if guild_id else interaction.guild.id
        music_cog = self.bot.get_cog('music')
        if not music_cog:
            return await interaction.response.send_message("Music cog is not loaded.", ephemeral=True)
        
        player = music_cog.players.get(target_guild_id)
        if not player:
            return await interaction.response.send_message(f"There is no active music session in the server with ID `{target_guild_id}`.", ephemeral=True)
            
        player.dj_users.add(member)
        await player.update_now_playing()
        await interaction.response.send_message(f"Successfully added {member.mention} as a DJ in server `{player.guild.name}`.", ephemeral=True)

    @musicadmin_group.command(name="removedj", description="Forcefully remove a DJ in any active session.")
    @app_commands.describe(member="The user to remove from DJ list.", guild_id="[Optional] The ID of the server to target.")
    @is_admin()
    async def force_remove_dj(self, interaction: discord.Interaction, member: discord.Member, guild_id: Optional[str] = None):
        target_guild_id = int(guild_id) if guild_id else interaction.guild.id
        music_cog = self.bot.get_cog('music')
        if not music_cog:
            return await interaction.response.send_message("Music cog is not loaded.", ephemeral=True)
        
        player = music_cog.players.get(target_guild_id)
        if not player:
            return await interaction.response.send_message(f"There is no active music session in the server with ID `{target_guild_id}`.", ephemeral=True)
        
        if member == player.requester:
            return await interaction.response.send_message("You cannot remove the original requester.", ephemeral=True)

        if member in player.dj_users:
            player.dj_users.remove(member)
            await player.update_now_playing()
            await interaction.response.send_message(f"Successfully removed {member.mention} as a DJ in server `{player.guild.name}`.", ephemeral=True)
        else:
            await interaction.response.send_message(f"{member.mention} was not a DJ in that session.", ephemeral=True)

    @musicadmin_group.command(name="forcequeue", description="Forcefully add a song or playlist to a queue.")
    @app_commands.describe(query="The song/playlist URL.", guild_id="[Optional] The ID of the server to target.")
    @is_admin()
    async def force_queue(self, interaction: discord.Interaction, query: str, guild_id: Optional[str] = None):
        await interaction.response.defer(ephemeral=True)
        target_guild_id = int(guild_id) if guild_id else interaction.guild.id
        
        music_cog = self.bot.get_cog('music')
        if not music_cog:
            return await interaction.followup.send("Music cog is not loaded.", ephemeral=True)

        player = music_cog.players.get(target_guild_id)
        if not player:
            return await interaction.followup.send(f"There is no active music session in the server with ID `{target_guild_id}` to add songs to.", ephemeral=True)

        try:
            data = await self.bot.loop.run_in_executor(None, lambda: ytdl.extract_info(query, download=False))
            entries = data.get('entries', [data])
            if not entries:
                return await interaction.followup.send("Couldn't find anything for that query.")
        except Exception as e:
            self.bot.add_error(f"Admin YTDL Error: {e}")
            return await interaction.followup.send("Error fetching song data.")

        count = 0
        for entry in entries:
            if entry:
                entry['requester'] = interaction.user
                await player.queue.put(entry)
                count += 1
        
        await interaction.followup.send(f"Forcefully added {count} track(s) to the queue in `{player.guild.name}`.")

    @app_commands.command(name="gpu_status", description="🚀 View GPU AI Engine performance and statistics")
    @is_admin()
    async def gpu_status(self, interaction: discord.Interaction):
        """Display GPU AI Engine performance dashboard"""
        await interaction.response.defer()
        
        try:
            if not hasattr(self.bot, 'gpu_engine') or not self.bot.gpu_engine:
                embed = discord.Embed(
                    title="⚠️ GPU AI Engine Status",
                    description="```ansi\n[2;31m> STATUS: NOT INITIALIZED\n[2;33m> FALLBACK: CPU MODE ACTIVE\n[2;36m> RECOMMENDATION: CHECK CUDA INSTALLATION[0m\n```",
                    color=0xff6b35,
                    timestamp=datetime.now()
                )
                embed.add_field(
                    name="🔧 Setup Required",
                    value="Install GPU requirements:\n```bash\npip install -r requirements_gpu.txt\n```",
                    inline=False
                )
                return await interaction.followup.send(embed=embed)
            
            # Get comprehensive performance report
            performance_report = self.bot.gpu_engine.get_performance_report()
            gpu_stats = performance_report.get('gpu_stats', {})
            
            # Main status embed
            embed = discord.Embed(
                title="🚀 GPU AI Engine Dashboard",
                description=f"```ansi\n[2;32m> STATUS: ONLINE\n[2;36m> DEVICE: {performance_report.get('device', 'Unknown')}\n[2;33m> MODELS: {performance_report.get('models_loaded_count', 0)} LOADED\n[2;35m> CUDA: {performance_report.get('cuda_available', False)}[0m\n```",
                color=0x00ff88,
                timestamp=datetime.now()
            )
            
            # GPU Hardware Info
            if not gpu_stats.get('error'):
                embed.add_field(
                    name="🔥 GPU Hardware",
                    value=f"**Device:** {gpu_stats.get('device_name', 'Unknown')}\n"
                          f"**Memory:** {gpu_stats.get('memory_used_gb', 0):.1f}GB / {gpu_stats.get('memory_total_gb', 0):.1f}GB\n"
                          f"**Utilization:** {gpu_stats.get('gpu_utilization', 0)}%\n"
                          f"**CUDA:** {gpu_stats.get('cuda_version', 'N/A')}",
                    inline=True
                )
                
                # Memory breakdown
                embed.add_field(
                    name="💾 Memory Usage",
                    value=f"**System:** {gpu_stats.get('memory_percent', 0):.1f}%\n"
                          f"**PyTorch:** {gpu_stats.get('cuda_allocated_gb', 0):.1f}GB\n"
                          f"**Cached:** {gpu_stats.get('cuda_cached_gb', 0):.1f}GB\n"
                          f"**Available:** {gpu_stats.get('memory_total_gb', 0) - gpu_stats.get('memory_used_gb', 0):.1f}GB",
                    inline=True
                )
            else:
                embed.add_field(
                    name="⚠️ GPU Error",
                    value=f"```{gpu_stats.get('error', 'Unknown error')}```",
                    inline=False
                )
            
            # Performance metrics
            embed.add_field(
                name="📊 AI Performance",
                value=f"**Total Inferences:** {performance_report.get('total_inferences', 0):,}\n"
                      f"**Avg Processing:** {performance_report.get('average_processing_time', 0):.3f}s\n"
                      f"**Cache Hit Rate:** {performance_report.get('cache_hit_rate', 0):.1f}%\n"
                      f"**Avg GPU Usage:** {performance_report.get('average_gpu_utilization', 0):.1f}%",
                inline=True
            )
            
            # Loaded models
            models_loaded = performance_report.get('models_loaded', [])
            if models_loaded:
                embed.add_field(
                    name="🧠 AI Models Active",
                    value="\n".join([f"• **{model.title()}**" for model in models_loaded]),
                    inline=True
                )
            
            # Memory optimization button
            embed.add_field(
                name="🧹 Optimization",
                value="Use the button below to optimize GPU memory usage and clear caches.",
                inline=False
            )
            
            embed.set_footer(text="Opure GPU AI Engine • RTX 5070 Ti Optimized")
            
            # Create optimization button
            view = GPUOptimizationView(self.bot.gpu_engine)
            await interaction.followup.send(embed=embed, view=view)
            
        except Exception as e:
            self.bot.add_error(f"GPU status command error: {e}")
            await interaction.followup.send("❌ Failed to retrieve GPU status. Check console for details.", ephemeral=True)

    async def cog_app_command_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("Error: You do not have `Administrator` permissions for this command.", ephemeral=True)
        else:
            self.bot.add_error(f"An error occurred in AdminCog: {error}")
            try: await interaction.response.send_message("An unexpected error occurred.", ephemeral=True)
            except discord.InteractionResponded: await interaction.followup.send("An unexpected error occurred.", ephemeral=True)

    @app_commands.command(name="setup_opure", description="🏗️ Set up Opure's dedicated channels and categories")
    @is_admin()
    async def setup_opure_command(self, interaction: discord.Interaction):
        """Manual command to set up Opure channels"""
        await interaction.response.defer()
        
        try:
            # Store initial channel count
            initial_count = len(interaction.guild.channels)
            
            await self.bot.setup_opure_channels(interaction.guild)
            
            # Check how many new channels were created
            final_count = len(interaction.guild.channels)
            new_channels = final_count - initial_count
            
            embed = discord.Embed(
                title="🧠 Opure Smart Channel Manager",
                description=f"```ansi\n[2;36m> MEMORY SYSTEM: ACTIVE\n[2;32m> DUPLICATION CHECK: PASSED\n[2;33m> NEW CHANNELS: {new_channels}\n[2;35m> AI EXPANSION: ENABLED[0m\n```",
                color=0x00ff88,
                timestamp=dt.datetime.now()
            )
            
            # Show smart status
            if new_channels > 0:
                embed.add_field(
                    name="🏗️ Infrastructure Update",
                    value=f"Created **{new_channels}** new channels\nSkipped existing channels (smart detection)",
                    inline=True
                )
            else:
                embed.add_field(
                    name="✅ Infrastructure Status", 
                    value="All channels already exist\nNo duplicates created",
                    inline=True
                )
            
            embed.add_field(
                name="🤖 AI Features",
                value="• Smart duplication prevention\n• Channel memory system\n• AI-driven expansion suggestions\n• Usage pattern analysis",
                inline=True
            )
            
            embed.add_field(
                name="📋 Opure Channel Network",
                value="• 🤖｜opure-consciousness\n• 📊｜opure-analytics\n• 🎵｜opure-music-hub\n• 💎｜opure-economy\n• 📢｜opure-announcements\n• 💬｜opure-discussions\n• 🎤｜Opure's Stage\n• 🎮｜Gaming Lounge\n• 🎭｜Opure's Theater",
                inline=False
            )
            
            embed.set_footer(text="Opure Smart Infrastructure • AI will suggest expansions via DM")
            
            await interaction.followup.send(embed=embed)
            self.bot.add_log(f"🧠 Smart setup completed for {interaction.guild.name} ({new_channels} new channels)")
            
        except Exception as e:
            await interaction.followup.send(f"❌ Setup failed: {e}", ephemeral=True)
            self.bot.add_error(f"Manual setup failed for {interaction.guild.name}: {e}")

async def setup(bot: commands.Bot):
    """The setup function called by discord.py to load the cog."""
    GUILD_ID_STR = os.getenv("GUILD_ID", "")
    if not GUILD_ID_STR:
        bot.add_log("WARNING: GUILD_ID not found in .env. AdminCog will not be loaded as it is guild-only.")
        return
    
    GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
    await bot.add_cog(AdminCog(bot), guilds=[discord.Object(id=gid) for gid in GUILD_IDS])
    bot.add_log(f"Cog 'AdminCog' loaded for Guild IDs: {GUILD_IDS}")

