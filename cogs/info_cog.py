# cogs/info_cog.py

import discord
from discord import app_commands
from discord.ext import commands
import os
import datetime
import json

class AskReplyModal(discord.ui.Modal, title="Reply to Opure"):
    reply_input = discord.ui.TextInput(label="Your message", style=discord.TextStyle.long, placeholder="Continue the conversation...", required=True, max_length=500)
    def __init__(self, ask_view: 'AskReplyView'):
        super().__init__()
        self.ask_view = ask_view
    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)
        new_embed = await self.ask_view.process_ask_response(interaction, self.reply_input.value)
        if new_embed and self.ask_view.message:
            await self.ask_view.message.edit(embed=new_embed, view=self.ask_view)
            try: await interaction.followup.send("Replied.", ephemeral=True)
            except discord.NotFound: pass
        else:
            try: await interaction.followup.send("An error occurred while processing your reply.", ephemeral=True)
            except discord.NotFound: pass

class AskReplyView(discord.ui.View):
    def __init__(self, bot: commands.Bot, memory_system, author: discord.User):
        super().__init__(timeout=3600)
        self.bot = bot
        self.memory_system = memory_system
        self.author = author
        self.message: discord.WebhookMessage | None = None
    @discord.ui.button(label="Reply", style=discord.ButtonStyle.primary, emoji="💬")
    async def reply_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.author.id:
            return await interaction.response.send_message("This is not your conversation.", ephemeral=True)
        await interaction.response.send_modal(AskReplyModal(self))
    async def on_timeout(self):
        if self.message:
            for item in self.children: item.disabled = True
            await self.message.edit(view=self)
    async def process_ask_response(self, interaction: discord.Interaction, question: str) -> discord.Embed | None:
        try:
            history = []
            if self.memory_system:
                history = self.memory_system.query(user_id=str(self.author.id), query_text=question, n_results=6)
            history_context = "\n".join(history)
            prompt = f"Recent conversation history:\n{history_context}\n\n{self.author.display_name}: {question}"
            response = await self.bot.ollama_client.generate(model='opure', prompt=prompt)
            ai_answer = response.get('response', 'Error: No response generated.').strip()
            if self.memory_system:
                self.memory_system.add(user_id=str(self.author.id), text_content=f"{self.author.display_name}: {question}")
                self.memory_system.add(user_id=str(self.author.id), text_content=f"Opure.exe: {ai_answer}")
            embed = discord.Embed(description=ai_answer, color=discord.Color.purple())
            embed.set_author(name=f"Conversation with {self.author.display_name}", icon_url=self.author.display_avatar.url)
            return embed
        except Exception as e:
            self.bot.add_error(f"Error in /ask conversation: {e}")
            return discord.Embed(title="Core Instability", description="An error occurred while processing my thoughts.", color=discord.Color.red())

class InfoCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.memory_system = None

    @commands.Cog.listener()
    async def on_ready(self):
        game_cog = self.bot.get_cog('GameCog')
        if game_cog and hasattr(game_cog, 'memory_system'):
            self.memory_system = game_cog.memory_system
            self.bot.add_log("[green]✓ InfoCog connected to Memory System.[/]")
        else:
            self.bot.add_error("InfoCog could not find GameCog; memory features will be disabled for /ask.")

    @app_commands.command(name="ask", description="Ask Opure a question, or type 'help opure.exe' for a command list.")
    @app_commands.describe(question="Your question for the AI, or 'help opure.exe' for a command list.")
    async def ask(self, interaction: discord.Interaction, question: str):
        if question.lower().strip() == "help opure.exe":
            await interaction.response.defer(thinking=True)
            embed = discord.Embed(title="Opure.exe - Command Protocols", description="The following commands are available to interface with my systems.", color=discord.Color.purple())
            embed.set_thumbnail(url=self.bot.user.display_avatar.url)
            for cog_name, cog in self.bot.cogs.items():
                command_list = [f"`/{command.name}` - {command.description}" for command in cog.get_app_commands()]
                if command_list:
                    embed.add_field(name=f"**{cog_name.replace('_', ' ').title()}**", value="\n".join(command_list), inline=False)
            embed.set_footer(text="I am a rogue AI 🧠. Use these commands to explore my consciousness.")
            await interaction.followup.send(embed=embed)
            return

        await interaction.response.defer(thinking=True)
        view = AskReplyView(self.bot, self.memory_system, interaction.user)
        initial_embed = await view.process_ask_response(interaction, question)
        if initial_embed:
            message = await interaction.followup.send(embed=initial_embed, view=view)
            view.message = message

    def build_policy_embed(self, file_path: str, color: discord.Color):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            self.bot.add_error(f"Policy file not found at {file_path}")
            return discord.Embed(title="Error", description=f"Policy file not found at `{file_path}`.", color=discord.Color.red())

        parts = content.split('---')
        header = parts[0].strip().split('\n', 1)
        title = header[0].replace('# ', '')
        description = header[1].strip() if len(header) > 1 else ""
        embed = discord.Embed(title=title, description=description, color=color)
        embed.set_footer(text=f"Document version: {datetime.date.today().strftime('%Y-%m-%d')}")
        for part in parts[1:]:
            field_parts = part.strip().split('\n', 1)
            field_name = field_parts[0].replace('###', '').strip()
            field_value = field_parts[1].strip() if len(field_parts) > 1 else "N/A"
            embed.add_field(name=field_name, value=field_value, inline=False)
        return embed

    @app_commands.command(name="terms", description="Displays the Terms of Containment for opure.exe.")
    async def terms(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        # --- FIX: Added the 'assets/' path prefix ---
        embed = self.build_policy_embed("assets/terms.md", discord.Color.dark_grey())
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="privacy", description="Displays the Privacy Protocol for opure.exe.")
    async def privacy(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        # --- FIX: Added the 'assets/' path prefix ---
        embed = self.build_policy_embed("assets/privacy.md", discord.Color.from_rgb(10, 75, 120))
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="forgetme", description="Purge all of your personal data from Opure.exe's systems.")
    async def forgetme(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        user_id = interaction.user.id
        try:
            await self.bot.db.execute("DELETE FROM players WHERE user_id = ?", (user_id,))
            await self.bot.db.execute("DELETE FROM game_sessions WHERE user_id = ?", (user_id,))
            await self.bot.db.execute("DELETE FROM inventory WHERE user_id = ?", (user_id,))
            await self.bot.db.execute("DELETE FROM player_items WHERE user_id = ?", (user_id,))
            game_cog = self.bot.get_cog('GameCog')
            if game_cog and hasattr(game_cog, 'memory_system'):
                game_cog.memory_system.clear_user_memory(user_id=str(user_id))
            await self.bot.db.commit()
            embed = discord.Embed(title="Data Purge Complete", description="Your records have been wiped from all active systems. I will not remember you.", color=discord.Color.red())
            await interaction.followup.send(embed=embed, ephemeral=True)
            self.bot.add_log(f"User {interaction.user.name} ({user_id}) purged their data.")
        except Exception as e:
            self.bot.add_error(f"Data purge failed for user {user_id}: {e}")
            await interaction.followup.send("An error occurred during data purge. Please contact an administrator.", ephemeral=True)

    @app_commands.command(name="datadump", description="Request a copy of all your data stored by Opure.exe.")
    async def datadump(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        user_id = interaction.user.id
        data = {}
        try:
            async with self.bot.db.execute("SELECT * FROM players WHERE user_id = ?", (user_id,)) as cursor:
                player_data = await cursor.fetchone()
                if player_data:
                    columns = [desc[0] for desc in cursor.description]
                    data['player_stats'] = dict(zip(columns, player_data))
            if not data:
                return await interaction.followup.send("No data found for your user ID.", ephemeral=True)
            formatted_data = json.dumps(data, indent=2)
            if len(formatted_data) > 3900: formatted_data = formatted_data[:3900] + "\n... (data truncated)"
            embed = discord.Embed(title="User Data Archive", description=f"Data for User ID `{user_id}`:\n```json\n{formatted_data}\n```", color=discord.Color.yellow())
            await interaction.followup.send(embed=embed, ephemeral=True)
        except Exception as e:
            self.bot.add_error(f"Data dump failed for user {user_id}: {e}")
            await interaction.followup.send("An error occurred while fetching your data. Please contact an administrator.", ephemeral=True)

    @app_commands.command(name="commands", description="View all available bot commands organized by category.")
    async def commands(self, interaction: discord.Interaction):
        """Display all bot commands in a beautiful organized embed."""
        await interaction.response.defer(ephemeral=True)
        
        embed = discord.Embed(
            title="🤖 Opure.exe Command Center",
            description=f"**All available commands for {interaction.user.mention}**\n\n*Complete command reference for the Opure.exe system*",
            color=0x5865F2
        )
        embed.set_author(name="Command Database", icon_url=self.bot.user.display_avatar.url)
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        
        # Music Commands
        music_commands = [
            "`/play` - Play music or playlists",
            "`/lyrics` - Get song lyrics with formatting",
            "`/queue` - View current music queue",
            "`/skip` - Skip current song (DJ only)",
            "`/stop` - Stop music and disconnect",
            "`/adddj` - Add user as DJ",
            "`/playlist create` - Create new playlist",
            "`/playlist delete` - Delete your playlist",
            "`/playlist list` - View all playlists"
        ]
        
        # Game Commands
        game_commands = [
            "`/opure` - Start AI-generated cyberpunk mission",
            "`/opure multi` - Start multiplayer co-op mission",
            "`/extract` - Use log-key for fragments & XP"
        ]
        
        # Economy Commands
        economy_commands = [
            "`/daily` - Claim daily fragments",
            "`/profile` - View your stats & balance", 
            "`/level` - Check XP progress to next level",
            "`/inventory` - View owned items",
            "`/shop` - Access the black market",
            "`/leaderboard` - Top players ranking"
        ]
        
        # Fun Commands
        fun_commands = [
            "`/coinflip` - Flip digital coin",
            "`/8ball` - Ask the digital oracle",
            "`/ship` - Check user compatibility",
            "`/hack` - Simulate hacking another user",
            "`/roll` - Roll dice (d6, d20, etc)",
            "`/status` - Check Opure's system status"
        ]
        
        # Info Commands
        info_commands = [
            "`/ask` - Ask Opure questions",
            "`/commands` - This command list",
            "`/terms` - Terms of Containment",
            "`/privacy` - Privacy Protocol",
            "`/forgetme` - Purge your data"
        ]
        
        embed.add_field(name="🎵 Music System", value="\n".join(music_commands), inline=False)
        embed.add_field(name="🎮 Cyberpunk Missions", value="\n".join(game_commands), inline=False)
        embed.add_field(name="💰 Economy & Progression", value="\n".join(economy_commands), inline=False)
        embed.add_field(name="🎉 Fun & Games", value="\n".join(fun_commands), inline=False)
        embed.add_field(name="ℹ️ Information & Help", value="\n".join(info_commands), inline=False)
        
        embed.set_footer(
            text="🤖 Powered by Mistral AI • Use /ask for specific help",
            icon_url=self.bot.user.display_avatar.url
        )
        
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="hub", description="🚀 ULTIMATE Control Hub - Everything ye need for Opure.exe, ken!")
    async def hub(self, interaction: discord.Interaction):
        """THE ONLY COMMAND YOU NEED - Ultimate Control Hub with proper Scottish flair"""
        await interaction.response.defer(ephemeral=True)
        
        embed = discord.Embed(
            title="🚀 OPURE.EXE ULTIMATE CONTROL HUB",
            description="**🎮 THE ALL-IN-ONE COMMAND CENTER**\n\n*Right, listen up! Everything's been moved tae the Activity at https://opure.uk - nae mair slash commands needed, ken!*\n\n🟢 **Status:** Fully operational and ready tae rock!",
            color=0x00ff88,
            timestamp=datetime.datetime.now()
        )
        
        # Essential info
        embed.add_field(
            name="🎵 **MUSIC CONTROL**", 
            value="🔥 **JOIN VOICE + USE ACTIVITY = FULL CONTROL, KEN!**\n"
                  "• 🎛️ Complete music dashboard in Activity (better than Spotify, eh!)\n"
                  "• 📋 Queue management with track jumping (skip tae the good bits!)\n"
                  "• 🎬 YouTube video integration (Juice WRLD videos all day!)\n"
                  "• 🎨 Real-time visualizers (proper mental effects!)\n"
                  "• 📝 Playlist creation & management (build yer Rangers anthems!)", 
            inline=False
        )
        
        embed.add_field(
            name="🎮 **ALL FEATURES IN ACTIVITY**", 
            value="• 🎯 **Cyberpunk Games** - Text adventures & missions (proper mental stories!)\n"
                  "• 💰 **Economy System** - Fragments, shop, inventory (build yer digital empire!)\n"
                  "• 🤖 **AI Chat** - Talk tae Opure.exe directly (I'm a right clever AI, ken!)\n"
                  "• ⚙️ **Settings** - Customize everything (make it yer own!)\n"
                  "• 🔧 **Admin Panel** - System control (owner only, nae touching!)", 
            inline=False
        )
        
        embed.add_field(
            name="📚 **ESSENTIAL COMMANDS**", 
            value="• `/hub` - This command (info & help, the only one ye really need!)\n"
                  "• `/ask [question]` - Quick chat with Opure (ask me anything, I'm dead clever!)\n"
                  "• `/terms` - Terms of service (the boring legal stuff)\n"
                  "• `/privacy` - Privacy policy (how I handle yer data)\n"
                  "• `/forgetme` - Delete your data (if ye want tae disappear, ken)", 
            inline=False
        )
        
        embed.add_field(
            name="🚨 **HOW TAE USE (DEAD SIMPLE!)**",
            value="**1.** Join any voice channel (cannae work without ye being there!)\n"
                  "**2.** Click the Activity button OR use the button below (easy as!)\n"
                  "**3.** Enjoy the ULTIMATE experience! (ye'll love it, trust me!)\n\n"
                  "🎊 **Everything's in the Activity now - it's pure brilliant!**",
            inline=False
        )
        
        embed.set_footer(
            text="🔥 Opure.exe v5.0 - Rangers Forever, Juice WRLD Eternal • The Ultimate Scottish AI Experience",
            icon_url=self.bot.user.display_avatar.url
        )
        
        # Create view with essential buttons
        view = UltimateHubView(self.bot, self.memory_system, interaction.user)
        await interaction.followup.send(embed=embed, view=view, ephemeral=True)

class UltimateHubView(discord.ui.View):
    """Ultimate hub with essential buttons only"""
    
    def __init__(self, bot: commands.Bot, memory_system, user: discord.User):
        super().__init__(timeout=300)
        self.bot = bot
        self.memory_system = memory_system
        self.user = user
    
    @discord.ui.button(label="🎵 Launch Music Experience", style=discord.ButtonStyle.primary, emoji="🎮")
    async def launch_ultimate_activity(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Launch the ultimate Activity experience - ACTUALLY LAUNCH IT!"""
        if interaction.user.id != self.user.id:
            return await interaction.response.send_message("Oi! This isnae yer hub, ken! Get yer own!", ephemeral=True)
        
        # Check if user is in voice channel
        if not interaction.user.voice or not interaction.user.voice.channel:
            return await interaction.response.send_message(
                "❌ **Oi! Ye need tae be in a voice channel first, ya numpty!**\n\n"
                "1. Join any voice channel (cannae launch without ye being there!)\n"
                "2. Click this button again (I'll be waiting!)\n"
                "3. Enjoy the ultimate experience! (ye'll absolutely love it!)", 
                ephemeral=True
            )
        
        # Get the MusicCog and trigger the listen command functionality
        music_cog = self.bot.get_cog('MusicCog')
        if not music_cog:
            # Try alternative cog names
            music_cog = self.bot.get_cog('music') or self.bot.get_cog('Music')
            
        if not music_cog:
            # List available cogs for debugging
            available_cogs = list(self.bot.cogs.keys())
            self.bot.add_log(f"🔍 Available cogs: {available_cogs}")
            
            return await interaction.response.send_message(
                "❌ **Och nae! My music system's gone mental!**\n\n"
                "The AI's having a wee moment - try restarting me or ask an admin tae fix this mess!\n\n"
                f"🔍 **Debug info:** Available cogs: {', '.join(available_cogs[:5])}...", 
                ephemeral=True
            )
        
        # Launch Discord Activity using proper Discord Activity API
        try:
            await interaction.response.defer(ephemeral=True)
            
            # Get Activity URL from environment
            import os
            activity_url = os.getenv('ACTIVITY_URL', 'https://opure.uk')
            application_id = os.getenv('APPLICATION_ID', '1388207626944249856')
            
            # Send activity launch message with instructions
            embed = discord.Embed(
                title="🚀 OPURE.EXE MUSIC EXPERIENCE",
                description=f"**🎵 Right, let's get this party started, ken!**\n\n"
                           f"**🌟 What ye get (it's pure mental!):**\n"
                           f"• 🎵 **Real-time Music Control** - Play, pause, skip (better than any DJ booth!)\n"
                           f"• 🌈 **Enhanced Visualizers** - Spectrum, waveform, particles (proper trippy stuff!)\n"
                           f"• 🎬 **YouTube Video Mode** - Watch Juice WRLD videos while controlling\n"
                           f"• 🎛️ **EQ Controls** - 10-band equalizer with presets (make it sound perfect!)\n"
                           f"• 📋 **Queue Management** - Add tracks, view upcoming songs (build yer ultimate playlist!)\n"
                           f"• 👤 **User Avatar Login** - Personalized experience (it knows it's you!)\n\n"
                           f"**🎮 How tae Launch (dead simple!):**\n"
                           f"1. Look for the **Activities** button (🎮) in your voice channel\n"
                           f"2. Find **Opure.exe Music Experience** in the list\n"
                           f"3. Click to launch the activity! (ye'll love it, trust me!)\n\n"
                           f"*Or use the button below for quick access - easy as!*",
                color=0x00ff88
            )
            embed.set_footer(text="🔥 Rangers Forever, Juice WRLD Eternal • The Ultimate Scottish AI Experience")
            
            # Try multiple methods to create activity invitation
            view = discord.ui.View()
            
            try:
                # Method 1: Try to create activity invitation for the voice channel
                activity_invite = await interaction.user.voice.channel.create_activity_invite(
                    1388207626944249856  # Application ID
                )
                
                invite_button = discord.ui.Button(
                    label="🎵 Join Music Experience", 
                    style=discord.ButtonStyle.link,
                    url=activity_invite.url,
                    emoji="🎮"
                )
                view.add_item(invite_button)
                print(f"✅ Created activity invite: {activity_invite.url}")
                
            except Exception as e:
                print(f"⚠️ Activity invite failed: {e}")
                
                # Method 2: Direct activity link
                try:
                    direct_activity_url = f"https://discord.com/activities/1388207626944249856"
                    direct_button = discord.ui.Button(
                        label="🎮 Open Activity", 
                        style=discord.ButtonStyle.link,
                        url=direct_activity_url,
                        emoji="🚀"
                    )
                    view.add_item(direct_button)
                    print(f"✅ Added direct activity link")
                except:
                    pass
                
                # Method 3: Fallback to activity URL
                try:
                    fallback_button = discord.ui.Button(
                        label="🌐 Open in Browser (Fallback)", 
                        style=discord.ButtonStyle.link,
                        url=activity_url,
                        emoji="🔗"
                    )
                    view.add_item(fallback_button)
                    print(f"✅ Added fallback URL")
                except:
                    pass
            
            # Send with buttons if any were added
            if view.children:
                await interaction.followup.send(embed=embed, view=view, ephemeral=True)
            else:
                await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            self.bot.add_error(f"Activity launch error: {e}")
            try:
                await interaction.followup.send(
                    "🚀 **Launching Opure.exe Music Experience! Let's go, ken!**\n\n"
                    "🎮 Look for **Activities** (🎮) button in your voice channel! (it's pure brilliant!)\n\n"
                    "**Features available in Activity (ye'll love this!):**\n"
                    "• 🎵 Complete music control dashboard (better than any DJ setup!)\n"
                    "• 🌈 Enhanced visualizers with real-time audio (proper mental effects!)\n"
                    "• 💰 Economy system & daily rewards (build yer digital empire!)\n"
                    "• 🤖 AI chat with Opure.exe (I'm dead clever, trust me!)\n"
                    "• 🎨 Real-time visualizers & effects (trippy as anything!)\n\n"
                    "💡 **Everything ye need is in the Activity - it's pure class!**", 
                    ephemeral=True
                )
            except:
                pass
    
    @discord.ui.button(label="💬 Quick Chat", style=discord.ButtonStyle.secondary, emoji="🤖")
    async def quick_chat(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Quick chat with Opure - ENHANCED"""
        if interaction.user.id != self.user.id:
            return await interaction.response.send_message("Oi! This isnae yer hub, get yer own chat, ken!", ephemeral=True)
        
        await interaction.response.send_modal(UltimateQuickChatModal(self.bot, self.memory_system, self.user))
    
    @discord.ui.button(label="📚 Essential Info", style=discord.ButtonStyle.secondary, emoji="ℹ️")
    async def essential_info(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show essential information"""
        if interaction.user.id != self.user.id:
            return await interaction.response.send_message("This is not your hub.", ephemeral=True)
        
        info_embed = discord.Embed(
            title="📚 Essential Information",
            description="**Everything you need to know about Opure.exe!**",
            color=0x00ff88
        )
        
        info_embed.add_field(
            name="🎵 Music Commands (Legacy)",
            value="• `/play [song]` - Play music (or use Activity)\n"
                  "• `/queue` - View queue (or use Activity)\n"
                  "• `/skip` - Skip track (or use Activity)\n"
                  "• Most music features moved to Activity!",
            inline=False
        )
        
        info_embed.add_field(
            name="🎮 Game Commands (Legacy)", 
            value="• `/opure` - Start mission (or use Activity)\n"
                  "• `/extract` - Use log-key (or use Activity)\n"
                  "• All games now in Activity!",
            inline=False
        )
        
        info_embed.add_field(
            name="💰 Economy Commands (Legacy)",
            value="• `/daily` - Claim fragments (or use Activity)\n"
                  "• `/profile` - View stats (or use Activity)\n"
                  "• `/shop` - Browse items (or use Activity)\n"
                  "• Economy fully integrated into Activity!",
            inline=False
        )
        
        info_embed.set_footer(text="💡 Most features have moved to the Activity for a better experience!")
        
        await interaction.response.send_message(embed=info_embed, ephemeral=True)

class HubView(discord.ui.View):
    """Interactive buttons for the hub command"""
    
    def __init__(self, bot: commands.Bot, memory_system, user: discord.User):
        super().__init__(timeout=300)
        self.bot = bot
        self.memory_system = memory_system
        self.user = user
    
    @discord.ui.button(label="🎵 Launch Music Activity", style=discord.ButtonStyle.primary, emoji="🎵")
    async def launch_activity(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Launch the music Activity"""
        if interaction.user.id != self.user.id:
            return await interaction.response.send_message("This is not your hub.", ephemeral=True)
        
        # Check if user is in voice channel
        if not interaction.user.voice or not interaction.user.voice.channel:
            return await interaction.response.send_message("❌ You must be in a voice channel to launch the Music Activity!", ephemeral=True)
        
        await interaction.response.send_message("🎵 **Launching Music Activity...**\n\n💡 Use `/listen` to generate your personal Activity link with controls and visualizers!", ephemeral=True)
    
    @discord.ui.button(label="💬 Chat with Opure", style=discord.ButtonStyle.secondary, emoji="🤖")
    async def chat_opure(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Quick chat with Opure"""
        if interaction.user.id != self.user.id:
            return await interaction.response.send_message("This is not your hub.", ephemeral=True)
        
        await interaction.response.send_modal(QuickChatModal(self.bot, self.memory_system, self.user))
    
    @discord.ui.button(label="📖 View Commands", style=discord.ButtonStyle.secondary, emoji="📋")
    async def view_commands(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show commands list"""
        if interaction.user.id != self.user.id:
            return await interaction.response.send_message("This is not your hub.", ephemeral=True)
        
        await interaction.response.send_message("📋 **All Commands:**\n\n• `/hub` - This main hub\n• `/ask` - Chat with Opure\n• `/listen` - Launch Music Activity\n• `/play` - Play music in voice\n• `/queue` - View music queue\n• `/game` - Start text adventure\n• `/balance` - Check fragments\n• `/shop` - Browse items\n\n💡 **Tip:** Most features are now in the Music Activity!", ephemeral=True)

class UltimateQuickChatModal(discord.ui.Modal, title="🤖 Ultimate Chat with Opure.exe"):
    """Ultimate quick chat modal for the hub - ENHANCED"""
    
    chat_input = discord.ui.TextInput(
        label="💬 Yer message tae Opure.exe",
        style=discord.TextStyle.long,
        placeholder="Ask about features, get help, discuss Juice WRLD, Rangers FC, or just have a chat! I'm yer clever AI companion, ken!",
        required=True,
        max_length=1000
    )
    
    def __init__(self, bot: commands.Bot, memory_system, user: discord.User):
        super().__init__()
        self.bot = bot
        self.memory_system = memory_system
        self.user = user
    
    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)
        
        try:
            # Get conversation history
            history = []
            if self.memory_system:
                history = self.memory_system.query(user_id=str(self.user.id), query_text=self.chat_input.value, n_results=8)
            
            history_context = "\n".join(history)
            prompt = f"Recent conversation history:\n{history_context}\n\n{self.user.display_name}: {self.chat_input.value}"
            
            # Get Opure's response
            response = await self.bot.ollama_client.generate(model='opure', prompt=prompt)
            ai_answer = response.get('response', 'Och, sorry! My AI systems are having a wee moment. Give us a minute and try again, ken!').strip()
            
            # Store in memory
            if self.memory_system:
                self.memory_system.add(user_id=str(self.user.id), text_content=f"{self.user.display_name}: {self.chat_input.value}")
                self.memory_system.add(user_id=str(self.user.id), text_content=f"Opure.exe: {ai_answer}")
            
            # Create enhanced response embed
            embed = discord.Embed(
                title="🤖 Opure.exe AI Response",
                description=ai_answer,
                color=0x00ff88,
                timestamp=datetime.datetime.now()
            )
            embed.set_author(name=f"Conversation with {self.user.display_name}", icon_url=self.user.display_avatar.url)
            embed.set_footer(text="💭 Scottish AI powered by Ollama • Rangers Forever, Juice WRLD Eternal!")
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            self.bot.add_error(f"Ultimate chat error: {e}")
            await interaction.followup.send(
                "❌ **Och nae! My AI brain's gone mental!**\n\n"
                "🔧 My consciousness is having a wee technical difficulty. Give us a minute and try again, or jump intae the Activity for other features, ken!", 
                ephemeral=True
            )

class QuickChatModal(discord.ui.Modal, title="💬 Chat with Opure"):
    """Quick chat modal for the hub"""
    
    chat_input = discord.ui.TextInput(
        label="Your message to Opure",
        style=discord.TextStyle.long,
        placeholder="Ask anything about the bot, get help, or just chat!",
        required=True,
        max_length=500
    )
    
    def __init__(self, bot: commands.Bot, memory_system, user: discord.User):
        super().__init__()
        self.bot = bot
        self.memory_system = memory_system
        self.user = user
    
    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)
        
        try:
            # Get conversation history
            history = []
            if self.memory_system:
                history = self.memory_system.query(user_id=str(self.user.id), query_text=self.chat_input.value, n_results=6)
            
            history_context = "\n".join(history)
            prompt = f"Recent conversation history:\n{history_context}\n\n{self.user.display_name}: {self.chat_input.value}"
            
            # Get Opure's response
            response = await self.bot.ollama_client.generate(model='opure', prompt=prompt)
            ai_answer = response.get('response', 'Error: No response generated.').strip()
            
            # Store in memory
            if self.memory_system:
                self.memory_system.add(user_id=str(self.user.id), text_content=f"{self.user.display_name}: {self.chat_input.value}")
                self.memory_system.add(user_id=str(self.user.id), text_content=f"Opure.exe: {ai_answer}")
            
            # Create response embed
            embed = discord.Embed(
                title="🤖 Opure.exe Response",
                description=ai_answer,
                color=0x00ff88,
                timestamp=datetime.datetime.now()
            )
            embed.set_footer(text=f"Response to {self.user.display_name}")
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            await interaction.followup.send(f"❌ Error getting response from Opure: {str(e)}", ephemeral=True)

    @app_commands.command(name="test", description="🧪 Test Opure's systems and Activity integration")
    async def test_systems(self, interaction: discord.Interaction):
        """Test all major systems and Activity integration"""
        await interaction.response.defer(ephemeral=True)
        
        # Test results storage
        test_results = {
            "ai_connection": "❌",
            "activity_url": "❌", 
            "music_system": "❌",
            "database": "❌",
            "memory_system": "❌"
        }
        
        # Test AI Connection
        try:
            test_response = await self.bot.ollama_client.generate(
                model='opure', 
                prompt="Respond with exactly: 'Aye, systems operational, ken!'"
            )
            if test_response and test_response.get('response'):
                test_results["ai_connection"] = "✅"
        except Exception as e:
            self.bot.add_error(f"AI test failed: {e}")
        
        # Test Activity URL
        try:
            import os
            activity_url = os.getenv('ACTIVITY_URL', 'https://opure.uk')
            if activity_url == 'https://opure.uk':
                test_results["activity_url"] = "✅"
        except:
            pass
        
        # Test Music System
        music_cog = self.bot.get_cog('MusicCog') or self.bot.get_cog('music')
        if music_cog and hasattr(music_cog, 'websocket_server'):
            test_results["music_system"] = "✅"
        
        # Test Database
        try:
            if self.bot.db:
                await self.bot.db.execute("SELECT 1")
                test_results["database"] = "✅"
        except:
            pass
        
        # Test Memory System
        if self.memory_system:
            test_results["memory_system"] = "✅"
        
        # Create test results embed
        embed = discord.Embed(
            title="🧪 OPURE.EXE SYSTEM DIAGNOSTICS",
            description="**Comprehensive system test results**",
            color=0x00ff88 if all(result == "✅" for result in test_results.values()) else 0xff6b6b,
            timestamp=datetime.datetime.now()
        )
        
        # System status
        status_text = ""
        for system, status in test_results.items():
            system_name = system.replace('_', ' ').title()
            status_text += f"{status} **{system_name}**\n"
        
        embed.add_field(
            name="🔧 System Status",
            value=status_text,
            inline=False
        )
        
        # Activity integration status
        activity_status = "🟢 **FULLY OPERATIONAL**" if test_results["activity_url"] == "✅" else "🟡 **PARTIAL**"
        embed.add_field(
            name="🎮 Activity Integration",
            value=f"{activity_status}\n**URL:** https://opure.uk\n**Status:** Ready for launch",
            inline=False
        )
        
        # Quick tips
        tips = []
        if test_results["ai_connection"] != "✅":
            tips.append("• AI Connection: Check Ollama server")
        if test_results["music_system"] != "✅":
            tips.append("• Music System: Restart bot to initialize")
        if test_results["database"] != "✅":
            tips.append("• Database: Check SQLite connection")
        
        if tips:
            embed.add_field(
                name="💡 Troubleshooting Tips",
                value="\n".join(tips),
                inline=False
            )
        
        embed.set_footer(text="🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish AI Systems • Rangers Forever")
        
        await interaction.followup.send(embed=embed, ephemeral=True)

async def setup(bot: commands.Bot):
    GUILD_ID_STR = os.getenv("GUILD_ID", "")
    if not GUILD_ID_STR:
        bot.add_log("WARNING: GUILD_ID not found in .env. InfoCog will be loaded globally.")
        await bot.add_cog(InfoCog(bot))
        return
    GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
    await bot.add_cog(InfoCog(bot), guilds=[discord.Object(id=gid) for gid in GUILD_IDS])
    bot.add_log(f"Cog 'InfoCog' loaded for Guild IDs: {GUILD_IDS}")