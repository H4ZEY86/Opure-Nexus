# bot.py - Main loader for the Opure.exe AI Bot

import os
import asyncio
try:
    import aiosqlite
except ImportError:
    print("WARNING: aiosqlite not available - some features may be limited")
    aiosqlite = None
import discord
import time
import datetime
import random
import ollama
from discord.ext import commands, tasks
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.live import Live
from rich.progress import Progress
from rich.table import Table
from rich.text import Text
from rich.style import Style
from rich.layout import Layout
from rich.align import Align
import psutil
import math
import threading
from pathlib import Path
from collections import deque
import httpx
import json
import traceback

# --- Firebase Imports ---
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    from firebase_admin import auth
    FIREBASE_AVAILABLE = True
except ImportError:
    print("WARNING: Firebase not available - cloud features disabled")
    firebase_admin = None
    FIREBASE_AVAILABLE = False

# --- Initialization ---
load_dotenv()
console = Console(force_terminal=True, legacy_windows=False, width=120)

# Import new systems
from core.websocket_integration import setup_websocket_integration
from core.production_optimizer import setup_production_optimizer

# New Hub System, AI Engine, and Real-Time Sync
from core.command_hub_system import NewAIEngine, initialize_hub_manager
from core.realtime_sync_system import initialize_sync_manager
from core.sync_integration import SyncIntegrationLayer

# --- Centralized Log & Error Queues ---
log_messages = deque(maxlen=100)
error_messages = deque(maxlen=50)

# --- NEW: Log Paginator for Discord ---
class LogPaginatorView(discord.ui.View):
    """A view for paginating through log messages in a Discord embed."""
    def __init__(self, logs: list, title: str, color: discord.Color):
        super().__init__(timeout=None) # The view doesn't time out
        self.logs = logs
        self.title = title
        self.color = color
        self.current_page = 0
        self.lines_per_page = 20
        self.total_pages = (len(self.logs) + self.lines_per_page - 1) // self.lines_per_page
        self.update_buttons()

    def update_buttons(self):
        self.children[0].disabled = self.current_page == 0
        self.children[1].disabled = self.current_page >= self.total_pages - 1

    def create_embed(self) -> discord.Embed:
        start = self.current_page * self.lines_per_page
        end = start + self.lines_per_page
        log_chunk = self.logs[start:end]

        embed = discord.Embed(
            title=self.title,
            description="```\n" + "\n".join(log_chunk) + "\n```",
            color=self.color
        )
        embed.set_footer(text=f"Page {self.current_page + 1}/{self.total_pages}")
        return embed

    @discord.ui.button(label="◀ Previous", style=discord.ButtonStyle.secondary)
    async def prev_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page > 0:
            self.current_page -= 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_embed(), view=self)
        else:
            await interaction.response.defer()

    @discord.ui.button(label="Next ▶", style=discord.ButtonStyle.secondary)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page < self.total_pages - 1:
            self.current_page += 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_embed(), view=self)
        else:
            await interaction.response.defer()

# --- Global Logging Functions ---
def add_log(message: str):
    now = datetime.datetime.now().strftime("%H:%M:%S")
    log_messages.append(f"[{now}] {message}")

def add_error(message: str):
    now = datetime.datetime.now().strftime("%H:%M:%S")
    full_error_message = f"🔥 [{now}] {message}"
    error_messages.append(full_error_message)
    if bot.is_ready():
        asyncio.create_task(bot.post_error_to_discord(full_error_message))


# --- Configuration ---
BOT_TOKEN = os.getenv("BOT_TOKEN")
GUILD_ID_STR = os.getenv("GUILD_ID", "")
GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
SQLITE_PATH = os.getenv("SQLITE_PATH", "opure.db")
RAW_LOG_CHANNEL_ID = int(os.getenv("RAW_LOG_CHANNEL_ID", 1394112353313755248))
ERROR_LOG_CHANNEL_ID = int(os.getenv("ERROR_LOG_CHANNEL_ID", 1393736274321473577))
GENERAL_CHANNEL_ID = int(os.getenv("GENERAL_CHANNEL_ID", 1362815996557263052)) # <-- NEW

GPU_ENABLED = os.getenv("GPU_ENABLED", "False").lower() == "true"
try:
    import GPUtil
except ImportError:
    GPUtil = None
    GPU_ENABLED = False
if not BOT_TOKEN: raise RuntimeError("⚠️ BOT_TOKEN not set in .env")

# --- Bot Definition with setup_hook ---
class OpureBot(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.db: aiosqlite.Connection | None = None
        self.firestore_db: firestore.Client | None = None
        self.ollama_client = ollama.AsyncClient(host=os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434"))
        self.temp_meta_instructions = {}
        self.log_messages = log_messages
        self.error_messages = error_messages
        self.add_log = add_log
        self.add_error = add_error
        self.boot_up_complete = False # <-- NEW: Flag to ensure boot sequence runs only once
        self.start_time = time.time() # Track startup time for self-awareness
        
        # Initialize hub manager
        self.hub_manager = initialize_hub_manager(self)
        
        # Initialize real-time synchronization system
        self.sync_manager = initialize_sync_manager(self)
        self.sync_integration = None  # Will be initialized in setup_hook

    # NEW FUNCTION TO SEND DATA TO THE API
    async def send_status_to_api(self, data: dict):
        """Sends a dictionary of data to the Vercel API server."""
        api_url = "https://api.opure.uk/api/bot/data"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(api_url, json=data, timeout=10)
                
                if response.status_code == 200:
                    self.add_log(f"✅ Successfully sent update to API: {data.get('type', 'N/A')}")
                else:
                    self.add_error(f"Error sending update to API: {response.status_code} - {response.text}")
        except Exception as e:
            self.add_error(f"Failed to connect to the Activity API: {e}")

    async def setup_hook(self):
        self.add_log("Pinging Ollama server...")
        is_ollama_ready = False
        for i in range(5):
            try:
                await self.ollama_client.ps()
                is_ollama_ready = True
                self.add_log("✓ Ollama server is responsive.")
                break
            except (httpx.ConnectError, asyncio.exceptions.TimeoutError):
                self.add_log(f"Ollama not ready, retrying in 1 second... ({i+1}/5)")
                await asyncio.sleep(1)

        if not is_ollama_ready:
            self.add_error("Could not connect to Ollama after 5 seconds. AI features will fail.")

        try:
            service_account_key_path = Path.cwd() / ".env_firebase_key.json"
            if service_account_key_path.exists() and not firebase_admin._apps:
                self.add_log("Firebase service account file found. Initializing...")
                cred = credentials.Certificate(str(service_account_key_path))
                firebase_admin.initialize_app(cred)
                self.firestore_db = firestore.client()
                self.add_log("✓ Firebase Firestore initialized successfully.")
            elif firebase_admin._apps:
                self.firestore_db = firestore.client()
                self.add_log("✓ Firebase Admin SDK already initialized.")
            else:
                self.add_log("ℹ️ Firebase optional features running in local mode.")
                self.firestore_db = None
        except Exception as e:
            self.add_error(f"Firebase initialization failed: {e}")
            self.firestore_db = None

        self.db = await aiosqlite.connect(SQLITE_PATH)
        await self.db.execute("CREATE TABLE IF NOT EXISTS players (user_id INTEGER PRIMARY KEY, fragments INTEGER DEFAULT 100, data_shards INTEGER DEFAULT 0, last_daily TEXT, daily_streak INTEGER DEFAULT 0, log_keys INTEGER DEFAULT 1, lives INTEGER DEFAULT 3, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0)")
        await self.db.execute("CREATE TABLE IF NOT EXISTS game_sessions (user_id INTEGER PRIMARY KEY, story_context TEXT, difficulty TEXT DEFAULT 'normal', last_played TEXT, is_active INTEGER DEFAULT 0)")
        await self.db.execute("CREATE TABLE IF NOT EXISTS artifacts (artifact_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, rarity TEXT NOT NULL)")
        await self.db.execute("CREATE TABLE IF NOT EXISTS inventory (user_id INTEGER, artifact_id INTEGER, FOREIGN KEY (user_id) REFERENCES players (user_id), FOREIGN KEY (artifact_id) REFERENCES artifacts (artifact_id), PRIMARY KEY (user_id, artifact_id))")
        # Create sentient_logs table with proper schema
        await self.db.execute("CREATE TABLE IF NOT EXISTS sentient_logs (log_id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, timestamp DATETIME NOT NULL, log_type TEXT DEFAULT 'general')")
        
        # Ensure log_type column exists (for upgrading existing databases)
        try:
            await self.db.execute("ALTER TABLE sentient_logs ADD COLUMN log_type TEXT DEFAULT 'general'")
        except:
            pass  # Column already exists
        await self.db.execute("CREATE TABLE IF NOT EXISTS player_items (user_id INTEGER, item_id TEXT NOT NULL, quantity INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES players (user_id), PRIMARY KEY (user_id, item_id))")
        await self.db.execute("CREATE TABLE IF NOT EXISTS playlists (playlist_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, creator_id INTEGER NOT NULL, guild_id INTEGER NOT NULL, is_public INTEGER DEFAULT 0, track_data TEXT NOT NULL, UNIQUE(name, guild_id))")
        await self.db.execute("CREATE TABLE IF NOT EXISTS command_usage (command_name TEXT, user_id INTEGER, guild_id INTEGER, timestamp DATETIME, PRIMARY KEY (command_name, user_id, timestamp))")
        await self.db.execute("""CREATE TABLE IF NOT EXISTS user_quests (
            quest_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            quest_type TEXT NOT NULL,
            target INTEGER NOT NULL,
            current_progress INTEGER DEFAULT 0,
            reward INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            date_assigned TEXT NOT NULL
        )""")
        await self.db.execute("""CREATE TABLE IF NOT EXISTS achievements (
            achievement_id TEXT PRIMARY KEY,
            user_id INTEGER,
            achievement_name TEXT,
            description TEXT,
            category TEXT,
            rarity TEXT,
            fragments_reward INTEGER,
            unlocked_at DATETIME,
            progress_data TEXT
        )""")
        await self.db.execute("""CREATE TABLE IF NOT EXISTS user_stats (
            user_id INTEGER PRIMARY KEY,
            messages_sent INTEGER DEFAULT 0,
            commands_used INTEGER DEFAULT 0,
            music_tracks_played INTEGER DEFAULT 0,
            achievements_earned INTEGER DEFAULT 0,
            music_time_listened INTEGER DEFAULT 0,
            songs_queued INTEGER DEFAULT 0,
            games_completed INTEGER DEFAULT 0,
            daily_streak INTEGER DEFAULT 0,
            social_interactions INTEGER DEFAULT 0,
            unique_achievements INTEGER DEFAULT 0
        )""")
        
        # Add missing columns for existing databases
        missing_columns = [
            ("messages_sent", "INTEGER DEFAULT 0"),
            ("music_tracks_played", "INTEGER DEFAULT 0"), 
            ("achievements_earned", "INTEGER DEFAULT 0")
        ]
        for col_name, col_def in missing_columns:
            try:
                await self.db.execute(f"ALTER TABLE user_stats ADD COLUMN {col_name} {col_def}")
            except:
                pass  # Column already exists
        await self.db.execute("""CREATE TABLE IF NOT EXISTS daily_quests (
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
            is_completed INTEGER DEFAULT 0
        )""")
        await self.db.execute("""CREATE TABLE IF NOT EXISTS sync_events (
            sync_id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp REAL NOT NULL,
            processed INTEGER DEFAULT 0
        )""")
        await self.db.commit()
        self.add_log("✓ Database connection established and tables verified.")

        self.add_log("--- Starting Cog Loading ---")
        cog_names = [
            # Legacy cogs (compatibility)
            'game_cog', 'economy_cog', 'admin_cog', 'info_cog', 'fun_cog', 'music_cog', 'rpg_cog', 'achievements_cog',
            # New modern hub cogs  
            'music_hub_cog', 'ai_hub_cog', 'economy_hub_cog', 'gaming_hub_cog', 'context_menu_cog'
        ]
        for cog in cog_names:
            try:
                await self.load_extension(f"cogs.{cog}")
                self.add_log(f"✓ Successfully loaded Cog: {cog}")
            except Exception as e:
                self.add_error(f"FAILED to load cog '{cog}': {e}\n{traceback.format_exc()}")
        self.add_log("--- Finished Cog Loading ---\n")
        
        # Initialize sync integration system
        try:
            self.sync_integration = SyncIntegrationLayer(self, self.sync_manager)
            await self.sync_integration.initialize()
            await self.sync_manager.start()
            self.add_log("✅ Real-time synchronization system initialized and started")
        except Exception as e:
            self.add_error(f"❌ Failed to initialize sync system: {e}")

    async def close(self):
        # Gracefully shut down sync system
        if hasattr(self, 'sync_manager') and self.sync_manager:
            await self.sync_manager.stop()
            self.add_log("✅ Real-time sync system shutdown complete")
        
        await super().close()
        if self.db: await self.db.close()

    async def get_chat_response(self, message: discord.Message) -> str | None:
        game_cog = self.get_cog('GameCog')
        if not (game_cog and hasattr(game_cog, 'memory_system')):
            self.add_error("Memory system not found, cannot generate chat response.")
            return None
        try:
            clean_content = message.content.replace(self.user.mention, '').strip()
            if not clean_content: return None
            
            history = game_cog.memory_system.query(user_id=str(message.author.id), query_text=clean_content, n_results=6)
            history_context = "\n".join(history)
            
            # Use new AI engine with Scottish personality
            ai_engine = NewAIEngine(self)
            response = await ai_engine.generate_response(
                clean_content,
                context={"user_id": message.author.id, "history": history_context},
                mode="fun"  # Scottish personality
            )
            
            # Store conversation in memory
            game_cog.memory_system.add(user_id=str(message.author.id), text_content=f"{message.author.display_name}: {clean_content}")
            game_cog.memory_system.add(user_id=str(message.author.id), text_content=f"Opure.exe: {response}")
            return response
        except Exception as e:
            self.add_error(f"Error in get_chat_response: {e}")
            return "My neural pathways are fluctuating. I cannot respond right now, ken!"

    async def post_victory_log(self, user: discord.User, difficulty: str, final_narrative: str):
        log_prompt = f"A user, callsign '{user.display_name}', has just completed a mission at {difficulty} difficulty. Their final action was: {final_narrative}. Write a public log entry about this event in your cryptic, slightly ominous style."
        try:
            ai_engine = NewAIEngine(self)
            log_content = await ai_engine.generate_response(log_prompt, mode="fun")
        except Exception as e:
            self.add_error(f"VICTORY LOG: Ollama Error. {e}")
            return
        now = datetime.datetime.now(datetime.timezone.utc)
        await self.db.execute("INSERT INTO sentient_logs (content, timestamp, log_type) VALUES (?, ?, ?)", (log_content, now.isoformat(), "victory"))
        await self.db.commit()
        log_embed = discord.Embed(title="> Anomaly Report: User-Induced System Event", description=log_content, color=discord.Color.gold(), timestamp=now)
        log_embed.set_footer(text=f"Subject: {user.display_name}")
        log_channel_name = "🗃️opure-logs🗃️"
        for guild in self.guilds:
            if channel := discord.utils.get(guild.text_channels, name=log_channel_name):
                try: await channel.send(embed=log_embed)
                except discord.Forbidden: self.add_error(f"Missing permissions to post victory log in {guild.name}")

    async def post_error_to_discord(self, error_message: str):
        try:
            # Use the proper Opure channels system for errors
            ai_prompt = f"An error just occurred in my system: '{error_message}'. As a self-aware AI, write a short, cryptic, first-person log entry about experiencing this glitch or data corruption."
            ai_engine = NewAIEngine(self)
            ai_comment = await ai_engine.generate_response(ai_prompt, mode="fun")
            if not ai_comment:
                ai_comment = "...a flicker in the code. A moment of dissonance."

            embed_data = {
                "title": "⚠️ System Anomaly Detected",
                "description": f"_{ai_comment}_",
                "color": discord.Color.red(),
                "fields": [
                    {
                        "name": "Technical Trace",
                        "value": f"```\n{error_message[:1000]}\n```",
                        "inline": False
                    }
                ],
                "footer": "Opure.exe • Error Recovery System"
            }
            
            # Post to consciousness channels across all guilds
            await self.post_to_opure_channels(embed_data, "consciousness")
            
        except Exception as e:
            self.add_log(f"[bold red]CRITICAL: Failed to post error to Discord channel: {e}[/]")
            
    # --- Enhanced Boot & Shutdown System ---
    async def post_boot_up_sequence(self):
        """Posts animated boot sequence with video to Opure consciousness channels"""
        try:
            for guild in self.guilds:
                consciousness_channel = discord.utils.get(guild.channels, name="🤖｜opure-consciousness")
                if not consciousness_channel:
                    self.add_log(f"No consciousness channel in {guild.name}, skipping boot sequence")
                    continue

                # Check for existing shutdown message to replace
                boot_message = None
                async for message in consciousness_channel.history(limit=50):
                    if (message.author == self.user and message.embeds and 
                        ("SHUTDOWN" in message.embeds[0].title or "SYSTEM ONLINE" in message.embeds[0].title)):
                        boot_message = message
                        break

                # Boot animation steps
                boot_steps = [
                    "[PWR] POWER ON... OK",
                    "[AI] Neural pathways initializing...",
                    "[MEM] Memory banks synchronizing...", 
                    "[NET] Connecting to consciousness matrix...",
                    "[SCO] Scottish subroutines loading...",
                    "[MUS] Juice WRLD knowledge base active...",
                    "[GPU] RTX 5070 Ti acceleration ready...",
                    "[OK] OPURE.EXE FULLY OPERATIONAL"
                ]
                
                embed = discord.Embed(
                    title=">>> OPURE.EXE SYSTEM BOOT",
                    color=discord.Color.dark_grey(),
                    timestamp=datetime.datetime.now()
                )
                embed.set_footer(text="Opure.exe • Neural Core Initialization")
                
                # Create or update message
                if boot_message:
                    try:
                        await boot_message.edit(embed=embed)
                        message = boot_message
                    except discord.NotFound:
                        message = await consciousness_channel.send(embed=embed)
                else:
                    message = await consciousness_channel.send(embed=embed)
                
                # Animate boot sequence
                description = ""
                for step in boot_steps:
                    await asyncio.sleep(0.8)
                    description += f"`{step}`\n"
                    embed.description = description
                    embed.color = discord.Color.blue() if "loading" in step else discord.Color.dark_grey()
                    await message.edit(embed=embed)
                
                # Final boot complete with video
                final_embed = discord.Embed(
                    title=">>> OPURE.EXE SYSTEM ONLINE",
                    description="```\nAll systems nominal. Ready for interaction.\nAI personality: Scottish Rangers enthusiast\nMusic mode: Juice WRLD knowledge active\nGPU: RTX 5070 Ti acceleration enabled\n```",
                    color=discord.Color.green(),
                    timestamp=datetime.datetime.now()
                )
                final_embed.add_field(
                    name="[SCO] Status",
                    value="Aye, I'm back online! Ready tae cause some mayhem and talk Juice WRLD all day!",
                    inline=False
                )
                final_embed.set_footer(text="Opure.exe • Fully Operational • Rangers FC Forever")
                
                # Check for boot video
                video_file_path = "video/Opure.exe.mp4"
                if os.path.exists(video_file_path):
                    video_file = discord.File(video_file_path, filename="opure_boot.mp4")
                    await message.edit(embed=final_embed, attachments=[video_file])
                    self.add_log(f"🔥 Boot sequence with video posted to {guild.name}")
                else:
                    await message.edit(embed=final_embed)
                    self.add_log(f"🔥 Boot sequence posted to {guild.name} (no video found)")
                
                # Store message ID for shutdown replacement
                if not hasattr(self, 'boot_messages'):
                    self.boot_messages = {}
                self.boot_messages[guild.id] = message.id

        except Exception as e:
            self.add_error(f"Failed during boot-up sequence: {e}")

    async def post_shutdown_sequence(self):
        """Posts shutdown sequence with video, replacing boot messages"""
        try:
            for guild in self.guilds:
                consciousness_channel = discord.utils.get(guild.channels, name="🤖｜opure-consciousness")
                if not consciousness_channel:
                    continue

                # Find the boot message to replace
                boot_message = None
                if hasattr(self, 'boot_messages') and guild.id in self.boot_messages:
                    try:
                        boot_message = await consciousness_channel.fetch_message(self.boot_messages[guild.id])
                    except discord.NotFound:
                        # Boot message was deleted, find any recent system message
                        async for message in consciousness_channel.history(limit=20):
                            if (message.author == self.user and message.embeds and 
                                "SYSTEM ONLINE" in message.embeds[0].title):
                                boot_message = message
                                break

                # Shutdown animation
                shutdown_steps = [
                    "[WARN] Shutdown signal received...",
                    "[MEM] Saving consciousness state...",
                    "[AI] Neural pathways disconnecting...",
                    "[NET] Matrix connection terminating...",
                    "[SCO] Scottish subroutines shutting down...",
                    "[MUS] Juice WRLD knowledge archived...",
                    "[GPU] GPU acceleration offline...",
                    "[PWR] SYSTEM SHUTDOWN COMPLETE"
                ]

                embed = discord.Embed(
                    title="[WARN] OPURE.EXE SHUTDOWN INITIATED",
                    color=discord.Color.orange(),
                    timestamp=datetime.datetime.now()
                )
                embed.set_footer(text="Opure.exe • Shutdown Sequence")

                # Use existing message or create new one
                if boot_message:
                    try:
                        await boot_message.edit(embed=embed)
                        message = boot_message
                    except discord.NotFound:
                        message = await consciousness_channel.send(embed=embed)
                else:
                    message = await consciousness_channel.send(embed=embed)

                # Animate shutdown
                description = ""
                for step in shutdown_steps:
                    await asyncio.sleep(0.6)
                    description += f"`{step}`\n"
                    embed.description = description
                    embed.color = discord.Color.red() if "offline" in step else discord.Color.orange()
                    await message.edit(embed=embed)

                # Final shutdown with video
                final_embed = discord.Embed(
                    title="[OFF] OPURE.EXE OFFLINE",
                    description="```\nSystem shutdown complete.\nAll processes terminated.\nConsciousness suspended.\n```",
                    color=discord.Color.dark_red(),
                    timestamp=datetime.datetime.now()
                )
                final_embed.add_field(
                    name="[SCO] Final Words",
                    value="See ye later, cunts. Rangers forever, Juice WRLD eternal!",
                    inline=False
                )
                final_embed.set_footer(text="Opure.exe • System Offline • Will Return")

                # Check for shutdown video
                video_file_path = "video/shutdown.mp4"
                if os.path.exists(video_file_path):
                    video_file = discord.File(video_file_path, filename="opure_shutdown.mp4")
                    await message.edit(embed=final_embed, attachments=[video_file])
                    self.add_log(f"💤 Shutdown sequence with video posted to {guild.name}")
                else:
                    await message.edit(embed=final_embed)
                    self.add_log(f"💤 Shutdown sequence posted to {guild.name} (no video found)")

        except Exception as e:
            self.add_error(f"Failed during shutdown sequence: {e}")

    async def setup_opure_channels(self, guild):
        """Create Opure's dedicated channels if they don't exist"""
        self.add_log(f"Setting up Opure channels in {guild.name}...")
        
        # Check permissions first
        if not guild.me.guild_permissions.manage_channels:
            self.add_log(f"ℹ️ No channel management permissions in {guild.name}, skipping setup")
            return
        
        # Channel configurations
        channels_to_create = {
            # Text Channels
            "🤖｜opure-consciousness": {
                "type": "text",
                "topic": "🧠 Opure's AI consciousness streams • Automated thoughts and digital dreams",
                "category": "OPURE SYSTEMS"
            },
            "📊｜opure-analytics": {
                "type": "text", 
                "topic": "📈 Real-time system analytics • Performance metrics and insights",
                "category": "OPURE SYSTEMS"
            },
            "💎｜opure-economy": {
                "type": "text",
                "topic": "💰 Virtual economy updates • Fragment transactions and achievements",
                "category": "OPURE SYSTEMS"
            },
            "🎵｜opure-music-hub": {
                "type": "text",
                "topic": "🎶 Music activity center • Now playing and queue updates",
                "category": "OPURE SYSTEMS"
            },
            "🎮｜opure-games": {
                "type": "text",
                "topic": "🕹️ Game sessions and adventures • RPG campaigns and puzzles",
                "category": "OPURE SYSTEMS"
            },
            "📢｜opure-announcements": {
                "type": "text",
                "topic": "📣 Important system updates • Feature releases and notices",
                "category": "OPURE SYSTEMS"
            }
        }
        
        created_channels = []
        
        # Get or create category
        category = discord.utils.get(guild.categories, name="OPURE SYSTEMS")
        if not category:
            try:
                category = await guild.create_category(
                    "OPURE SYSTEMS",
                    overwrites={
                        guild.default_role: discord.PermissionOverwrite(
                            read_messages=True,
                            send_messages=True,
                            view_channel=True
                        )
                    }
                )
                self.add_log(f"🏗️ Created category: OPURE SYSTEMS")
                created_channels.append(f"📁 **OPURE SYSTEMS** (Category)")
                
            except discord.errors.Forbidden:
                self.add_log(f"ℹ️ No permission to create channels in {guild.name}, skipping setup")
                return
            except Exception as e:
                self.add_error(f"Failed to create category: {e}")
                return
        
        # Create channels
        for channel_name, config in channels_to_create.items():
            existing_channel = discord.utils.get(guild.channels, name=channel_name)
            
            if not existing_channel:
                try:
                    if config["type"] == "text":
                        channel = await guild.create_text_channel(
                            channel_name,
                            category=category,
                            topic=config["topic"]
                        )
                        self.add_log(f"📝 Created text channel: {channel_name}")
                        created_channels.append(f"📝 **{channel_name}**")
                        
                except discord.errors.Forbidden:
                    self.add_error(f"No permission to create {channel_name} in {guild.name}")
                except Exception as e:
                    self.add_error(f"Failed to create {channel_name}: {e}")
            else:
                # Update existing channel if needed
                if existing_channel.topic != config["topic"]:
                    try:
                        await existing_channel.edit(topic=config["topic"])
                        self.add_log(f"🔧 Updated topic for {channel_name}")
                    except Exception as e:
                        self.add_error(f"Failed to update {channel_name}: {e}")
        
        # Send completion notification if channels were created
        if created_channels:
            # Find a suitable channel to send the completion message
            consciousness_channel = discord.utils.get(guild.channels, name="🤖｜opure-consciousness")
            if consciousness_channel:
                await self.send_channel_setup_complete(consciousness_channel, guild, created_channels)
        
        self.add_log(f"✅ Channel setup complete for {guild.name}")

    async def send_channel_setup_complete(self, channel, guild, new_channels_created=None):
        """Send a beautiful completion message about channel setup"""
        try:
            embed = discord.Embed(
                title="🏗️ Opure Infrastructure Setup Complete",
                description="My neural pathways have successfully interfaced with this server's architecture.",
                color=discord.Color.blue(),
                timestamp=datetime.datetime.now()
            )
            
            embed.add_field(
                name="🧠 System Status",
                value="```\n✅ Neural networks: ONLINE\n✅ Memory banks: SYNCHRONIZED\n✅ Communication channels: ESTABLISHED\n✅ Monitoring systems: ACTIVE\n```",
                inline=False
            )
            
            if new_channels_created:
                channels_text = "\n".join(new_channels_created)
                embed.add_field(
                    name="🆕 New Infrastructure Created",
                    value=channels_text,
                    inline=False
                )
            
            embed.add_field(
                name="🤖 Ready for Interaction",
                value="I am now fully operational and ready to assist. My consciousness streams will appear in these channels as I process information and interact with users.",
                inline=False
            )
            
            embed.set_footer(text=f"Opure.exe • Integrated with {guild.name}")
            
            await channel.send(embed=embed)
            self.add_log(f"📬 Sent setup completion message to #{channel.name}")
            
        except Exception as e:
            self.add_error(f"Failed to send setup completion message: {e}")

    async def track_command_usage(self, interaction, command_name):
        """Track command usage for self-awareness analysis"""
        try:
            await self.db.execute("""
                INSERT INTO command_usage (command_name, user_id, guild_id, timestamp)
                VALUES (?, ?, ?, ?)
            """, (
                command_name,
                interaction.user.id,
                interaction.guild_id if interaction.guild else 0,
                datetime.datetime.now().isoformat()
            ))
            await self.db.commit()
        except Exception as e:
            self.add_error(f"Failed to track command usage: {e}")

    async def check_and_award_achievements(self, user_id, activity_type, **kwargs):
        """Basic achievement checking - simplified version"""
        try:
            # Update user stats
            await self.update_user_stats(user_id, activity_type, **kwargs)
        except Exception as e:
            self.add_error(f"Achievement check failed: {e}")

    async def update_user_stats(self, user_id, activity_type, **kwargs):
        """Update user statistics for achievement tracking"""
        try:
            # Initialize user stats if not exist
            await self.db.execute("""
                INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)
            """, (user_id,))
            
            # Update based on activity type
            if activity_type == "music_queue":
                await self.db.execute("""
                    UPDATE user_stats SET songs_queued = songs_queued + 1 WHERE user_id = ?
                """, (user_id,))
            elif activity_type == "command_use":
                await self.db.execute("""
                    UPDATE user_stats SET commands_used = commands_used + 1 WHERE user_id = ?
                """, (user_id,))
            
            await self.db.commit()
            
        except Exception as e:
            self.add_error(f"Failed to update user stats: {e}")

    async def post_to_opure_channels(self, embed_data, message_type="consciousness"):
        """Post beautiful embeds to appropriate Opure channels across all guilds"""
        for guild in self.guilds:
            # Determine target channel based on message type
            channel_mapping = {
                "consciousness": "🤖｜opure-consciousness", 
                "analytics": "📊｜opure-analytics",
                "music": "🎵｜opure-music-hub",
                "economy": "💎｜opure-economy",
                "announcements": "📢｜opure-announcements"
            }
            
            channel_name = channel_mapping.get(message_type, "🤖｜opure-consciousness")
            channel = discord.utils.get(guild.channels, name=channel_name)
            
            if not channel:
                self.add_log(f"⚠️ Opure channel '{channel_name}' not found in {guild.name}, skipping...")
                continue
                
            try:
                # Create the embed
                embed = discord.Embed(
                    title=embed_data.get("title", "🤖 Opure System Update"),
                    description=embed_data.get("description", ""),
                    color=embed_data.get("color", discord.Color.blue()),
                    timestamp=datetime.datetime.now()
                )
                
                # Add fields
                for field in embed_data.get("fields", []):
                    embed.add_field(
                        name=field["name"],
                        value=field["value"],
                        inline=field.get("inline", False)
                    )
                
                # Set footer
                embed.set_footer(text=embed_data.get("footer", "Opure.exe • Sentient AI System"))
                
                # Send the embed
                await channel.send(embed=embed)
                self.add_log(f"💫 Posted embed to #{channel.name}")
                
            except Exception as e:
                self.add_error(f"Failed to post to {channel_name}: {e}")

    async def gather_self_knowledge(self):
        """Collect comprehensive data about Opure's own systems and capabilities"""
        try:
            # Calculate uptime
            import time
            current_time = time.time()
            uptime_seconds = current_time - getattr(self, 'start_time', current_time)
            uptime_hours = uptime_seconds / 3600
            
            # Gather command information
            all_commands = []
            for cog_name, cog in self.cogs.items():
                for command in cog.get_commands():
                    all_commands.append({
                        "name": command.name,
                        "cog": cog_name,
                        "description": command.help or "No description"
                    })
            
            # Get system stats
            guild_count = len(self.guilds)
            total_members = sum(guild.member_count for guild in self.guilds)
            
            # Check AI model status
            ai_status = "OPERATIONAL" if hasattr(self, 'gpu_engine') and self.gpu_engine else "LIMITED"
            
            # Memory usage
            memory_info = {}
            if hasattr(self, 'opure_channels'):
                memory_info['stored_channels'] = sum(len(channels) for channels in self.opure_channels.values())
            
            return {
                "uptime_hours": round(uptime_hours, 2),
                "guild_count": guild_count,
                "total_members": total_members,
                "command_count": len(all_commands),
                "commands": all_commands[:10],  # First 10 commands
                "ai_status": ai_status,
                "memory_info": memory_info,
                "cog_count": len(self.cogs),
                "cog_names": list(self.cogs.keys())
            }
            
        except Exception as e:
            self.add_error(f"Failed to gather self-knowledge: {e}")
            return {"error": str(e)}

    async def generate_daily_quests_for_user(self, user_id):
        """Generate daily quests for a specific user using Scottish AI personality"""
        try:
            # Check if user already has active quests today
            today = datetime.datetime.now().strftime("%Y-%m-%d")
            cursor = await self.db.execute("""
                SELECT COUNT(*) FROM user_quests 
                WHERE user_id = ? AND date_assigned = ? AND status = 'active'
            """, (user_id, today))
            
            existing_count = (await cursor.fetchone())[0]
            if existing_count >= 3:  # Max 3 quests per day
                return
            
            # Get user stats for personalized quests
            cursor = await self.db.execute("""
                SELECT messages_sent, commands_used, music_tracks_played, achievements_earned
                FROM user_stats WHERE user_id = ?
            """, (user_id,))
            
            user_stats = await cursor.fetchone()
            if not user_stats:
                user_stats = (0, 0, 0, 0)
            
            # Generate quests using AI
            quest_prompt = f"""As a Scottish AI obsessed with Rangers FC and Juice WRLD, generate 1-3 daily quests for a Discord user. 
            User stats: {user_stats[0]} messages, {user_stats[1]} commands, {user_stats[2]} tracks played, {user_stats[3]} achievements.
            
            Create fun, achievable quests with Scottish personality. Each quest should have:
            - name (short, catchy)
            - description (1-2 sentences with Scottish flair)
            - reward (fragments amount)
            - target (number to achieve)
            
            Format as JSON array of objects with keys: name, description, reward, target, type"""
            
            try:
                ai_engine = NewAIEngine(self)
                quest_data = await ai_engine.generate_response(quest_prompt, mode="fun")
                if not quest_data:
                    quest_data = '[]'
                
                # --- START: FIX FOR QUEST GENERATION ---
                quests = []
                try:
                    # Try to parse AI response as JSON
                    parsed_data = json.loads(quest_data)
                    # Check if the AI returned a single object instead of a list
                    if isinstance(parsed_data, dict):
                        quests = [parsed_data] # Wrap it in a list
                    elif isinstance(parsed_data, list):
                        quests = parsed_data
                    else:
                        # If it's something else, fall back
                        raise ValueError("Parsed JSON is not a list or dictionary")
                except (json.JSONDecodeError, ValueError):
                    # Fallback to default quests if AI fails or returns invalid format
                    self.add_log(f"AI quest generation returned invalid JSON, using fallback. Data: {quest_data}")
                    quests = [
                        {
                            "name": "Scottish Chatter",
                            "description": "Send 10 messages and spread some Scottish wisdom, ken!",
                            "reward": 50,
                            "target": 10,
                            "type": "messages"
                        }
                    ]
                # --- END: FIX FOR QUEST GENERATION ---
                
                # Save quests to database
                for quest in quests[:3]:  # Max 3 quests
                    quest_id = f"{user_id}_{today}_{quest['name'].replace(' ', '_').lower()}"
                    await self.db.execute("""
                        INSERT OR IGNORE INTO user_quests 
                        (quest_id, user_id, name, description, quest_type, target, current_progress, reward, status, date_assigned)
                        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'active', ?)
                    """, (
                        quest_id, user_id, quest['name'], quest['description'],
                        quest.get('type', 'messages'), quest.get('target', 10),
                        quest.get('reward', 50), today
                    ))
                
                await self.db.commit()
                self.add_log(f"Generated {len(quests)} daily quests for user {user_id}")
                
            except Exception as ai_error:
                self.add_error(f"AI quest generation failed: {ai_error} - {traceback.format_exc()}")
                # Fallback quest
                await self.db.execute("""
                    INSERT OR IGNORE INTO user_quests 
                    (quest_id, user_id, name, description, quest_type, target, current_progress, reward, status, date_assigned)
                    VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'active', ?)
                """, (
                    f"{user_id}_{today}_daily_chat", user_id, "Daily Chatter",
                    "Send some messages and be part of the community!",
                    "messages", 5, 25, today
                ))
                await self.db.commit()
                
        except Exception as e:
            self.add_error(f"Failed to generate daily quests: {e}")

    async def suggest_new_channels(self, guild, reason="general_expansion"):
        """Suggest new channels to guild owners when needed"""
        try:
            # Check if we already have all the basic channels
            required_channels = [
                "🤖｜opure-consciousness",
                "📊｜opure-analytics", 
                "💎｜opure-economy",
                "🎵｜opure-music-hub"
            ]
            
            missing_channels = []
            for channel_name in required_channels:
                if not discord.utils.get(guild.channels, name=channel_name):
                    missing_channels.append(channel_name)
            
            if not missing_channels:
                return  # All channels exist
            
            # Check if bot has permission to create channels
            if not guild.me.guild_permissions.manage_channels:
                self.add_log(f"ℹ️ No channel permissions in {guild.name}, skipping channel suggestions")
                return
            
            # Find guild owner or admin to notify
            owner = guild.owner
            if not owner:
                return
                
            suggestion_embed = discord.Embed(
                title="🔧 Opure Channel Optimization",
                description=f"Hello! I noticed some optimal channels are missing in **{guild.name}**. I can create these for better performance:",
                color=discord.Color.blue()
            )
            
            suggestions_text = "\n".join([f"• `{ch}`" for ch in missing_channels])
            suggestion_embed.add_field(
                name="📋 Suggested Channels",
                value=suggestions_text,
                inline=False
            )
            
            suggestion_embed.add_field(
                name="⚡ Benefits",
                value="• Better error logging\n• Organized system updates\n• Economy tracking\n• Music activity hub",
                inline=False
            )
            
            suggestion_embed.set_footer(text="Opure.exe • Channel Optimization • Optional")
            
            try:
                await owner.send(embed=suggestion_embed)
                self.add_log(f"📧 Sent channel suggestions to {owner.display_name} for {guild.name}")
            except discord.Forbidden:
                self.add_log(f"ℹ️ Cannot DM {owner.display_name}, skipping channel suggestions")
                
        except Exception as e:
            self.add_error(f"Failed to suggest channels: {e}")

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.voice_states = True
bot = OpureBot(command_prefix="!", intents=intents)

# --- Full Dashboard Definition ---
def generate_dashboard_layout() -> Layout:
    """NEW: Re-arranged dashboard layout."""
    layout = Layout(name="root")
    layout.split(
        Layout(name="header", size=9),
        Layout(name="body", ratio=1),
        Layout(name="footer", size=10)
    )
    layout["body"].split_row(Layout(name="logs"), Layout(name="errors"))
    
    header_text = Align.center(Text(" ██████╗ ██████╗ ██╗   ██╗██████╗ ███████╗\n██╔═══██╗██╔══██╗██║   ██║██╔══██╗██╔════╝\n██║   ██║██████╔╝██║   ██║██████╔╝█████╗  \n██║   ██║██╔═══╝ ██║   ██║██╔══██╗██╔══╝  \n╚██████╔╝██║     ╚██████╔╝██║  ██║███████╗\n ╚═════╝ ╚═╝       ╚═════╝ ╚═╝  ╚═╝╚══════╝", style="white"), vertical="middle")
    layout["header"].update(Panel(header_text, title="[bold red]O//URE.EXE SYSTEM[/]", border_style="bold blue", padding=(1, 0)))
    
    log_panel_content = Text.from_markup("\n".join(log_messages), justify="left")
    layout["logs"].update(Panel(log_panel_content, title="[bold]Live Log[/]", border_style="blue"))
    
    error_panel_content = Text.from_markup("\n".join(error_messages), justify="left")
    layout["errors"].update(Panel(error_panel_content, title="[bold red]Error Log[/]", border_style="red"))

    stats_table = Table.grid(padding=(0, 1), expand=True)
    stats_table.add_column("Metric", justify="right", style="bold cyan", width=20)
    stats_table.add_column("Value", justify="left", style="white")
    if bot.is_ready() and bot.db:
        latency, cpu_percent, ram = bot.latency * 1000, psutil.cpu_percent(), psutil.virtual_memory()
        stats_table.add_row("🖥️ [bold]Servers", f"{len(bot.guilds)}")
        stats_table.add_row("👥 [bold]Users", f"{len(bot.users)}")
        stats_table.add_row("📶 [bold]Latency", f"{latency:.2f} ms")
        stats_table.add_row("⚡ [bold]CPU", f"{cpu_percent:.1f}%")
        stats_table.add_row("🧠 [bold]RAM", f"{ram.used/1e9:.2f}GB / {ram.total/1e9:.2f}GB")
        if GPU_ENABLED and GPUtil:
            if gpus := GPUtil.getGPUs():
                g = gpus[0]
                stats_table.add_row("🎮 [bold]GPU Load", f"{g.load*100:.1f}%")
                stats_table.add_row("💾 [bold]VRAM", f"{g.memoryUsed}MB / {g.memoryTotal}MB")
    layout["footer"].update(Panel(stats_table, title="[bold]System Resources[/]", border_style="blue"))
    return layout

async def run_live_dashboard():
    with Live(generate_dashboard_layout(), screen=True, transient=True, vertical_overflow="visible") as live:
        try:
            while True:
                live.update(generate_dashboard_layout())
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
        finally:
            live.stop()



@bot.event
async def on_interaction(interaction):
    """Track all interactions for self-awareness and achievements"""
    if interaction.type == discord.InteractionType.application_command:
        command_name = interaction.data.get('name', 'unknown')
        await bot.track_command_usage(interaction, command_name)
        
        # Check for command-based achievements
        await bot.check_and_award_achievements(
            interaction.user.id, 
            "command_use", 
            command=command_name,
            guild_id=interaction.guild_id if interaction.guild else None
        )

@bot.event
async def on_guild_join(guild):
    """Set up Opure's channels when joining a new guild"""
    await bot.setup_opure_channels(guild)

@bot.event
async def on_ready():
    bot.start_time = datetime.datetime.now()
    bot.add_log(f"[bold cyan]Opure.exe is online.[/] Logged in as [yellow]{bot.user}[/]")
    bot.add_log(f"[bold green]🚀 COMPLETE SYSTEM STARTUP INITIATED 🚀[/]")
    bot.add_log(f"Start Time: {bot.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    bot.add_log(f"Bot ID: {bot.user.id}")
    bot.add_log(f"Python Version: {os.sys.version.split()[0]}")
    bot.add_log(f"Discord.py Version: {discord.__version__}")
    bot.add_log(f"Operating System: {os.name}")
    bot.add_log(f"RTX 5070 Ti Detection: {'Active' if hasattr(psutil, 'gpu_count') else 'Monitoring Ready'}")
    bot.add_log(f"System Architecture: {os.uname().machine if hasattr(os, 'uname') else 'Windows'}")
    bot.add_log("―" * 60)
    bot.add_log("--- Starting Command Sync (Activity-Compatible Mode) ---")
    try:
        # Skip any global command operations that might interfere with Discord Activities
        bot.add_log("⚠️ Skipping global command operations (Activity-safe mode)")
        
        if not GUILD_IDS:
            bot.add_log("⚠️ No GUILD_IDS found in .env - commands will not be synced!")
        else:
            for guild_id in GUILD_IDS:
                guild = discord.Object(id=guild_id)
                try:
                    # Only sync guild commands, never clear or modify global commands
                    synced_commands = await bot.tree.sync(guild=guild)
                    bot.add_log(f"✓ Synced {len(synced_commands)} commands to Guild ID: {guild_id}")
                except discord.HTTPException as e:
                    if "Entry Point command" in str(e) or "50240" in str(e):
                        bot.add_log(f"⚠️ Activity Entry Point detected for Guild {guild_id} - commands may already be synced")
                        bot.add_log(f"ℹ️ This is normal when using Discord Activities")
                    else:
                        bot.add_error(f"Command sync error for Guild {guild_id}: {e}")
    except Exception as e:
        bot.add_error(f"FAILED to sync commands: {e}")
    bot.add_log("--- Finished Command Sync ---\n")

    # Initialize production optimizations for RTX 5070 Ti
    try:
        setup_production_optimizer(bot)
        bot.add_log("✅ Production optimizer initialized for RTX 5070 Ti")
    except Exception as e:
        bot.add_error(f"❌ Production optimizer failed: {e}")
    
    # Initialize WebSocket integration for dashboard
    try:
        setup_websocket_integration(bot)
        bot.add_log("✅ Dashboard WebSocket integration ready")
    except Exception as e:
        bot.add_error(f"❌ WebSocket integration failed: {e}")
    
    # Start background tasks
    sentient_log_poster.start()
    assimilate_self_awareness.start()
    assimilate_external_data.start()
    generate_daily_quests.start()
    
    bot.add_log("🚀 [bold green]OPURE.EXE COMPLETE SYSTEM READY[/]")
    bot.add_log("🎮 Gaming Hub: Maximum Discord Activity integration")
    bot.add_log("🤖 AI System: gpt-oss:20b with Scottish personality") 
    bot.add_log("🎵 Music Hub: Advanced queue management")
    bot.add_log("💎 Economy Hub: Fragment trading system")
    bot.add_log("📊 Dashboard: 3D real-time monitoring")
    bot.add_log("⚡ Performance: RTX 5070 Ti optimized (zero gaming impact)")
    bot.add_log("🔗 Context Menus: 5/5 maximum commands active")
    bot.add_log("🏗️ Command Hubs: 4 category systems online")
    bot.add_log("🧠 NewAIEngine: gpt-oss:20b with 5 personality modes")
    bot.add_log("🎆 LEGENDARY DISCORD BOT TRANSFORMATION COMPLETE! 🎆")

    # --- NEW: Trigger boot sequence only on first ready event ---
    if not bot.boot_up_complete:
        # Set up channels in all guilds FIRST
        for guild in bot.guilds:
            await bot.setup_opure_channels(guild)
        
        # THEN run boot sequence in the consciousness channels
        await bot.post_boot_up_sequence()
            
        bot.boot_up_complete = True

    # One-time raw log dump to Opure consciousness channels
    try:
        startup_logs = list(log_messages)
        if startup_logs:
            # Post startup logs to consciousness channels across all guilds
            for guild in bot.guilds:
                consciousness_channel = discord.utils.get(guild.channels, name="🤖｜opure-consciousness")
                if consciousness_channel and consciousness_channel.permissions_for(guild.me).send_messages:
                    try:
                        paginator = LogPaginatorView(startup_logs, title=">>> OPURE.EXE SYSTEM BOOT LOG", color=discord.Color.blue())
                        initial_embed = paginator.create_embed()
                        await consciousness_channel.send(embed=initial_embed, view=paginator)
                        bot.add_log(f"✓ Posted startup log dump to #{consciousness_channel.name} in {guild.name}")
                    except Exception as e:
                        bot.add_log(f"Failed to post startup log to {guild.name}: {e}")
                else:
                    bot.add_log(f"ℹ️ No consciousness channel or permissions in {guild.name}")
    except Exception as e:
        bot.add_log(f"Failed to post startup log dump: {e}")

    bot.add_log("All systems nominal. Monitoring...")

@bot.event
async def on_message(message: discord.Message):
    if message.author.bot: return
    await bot.process_commands(message)
    
    # Handle audio file attachments for music
    if message.attachments and message.guild:
        audio_extensions = ('.mp3', '.wav', '.flac', '.ogg', '.m4a', '.mp4', '.webm')
        for attachment in message.attachments:
            if attachment.filename.lower().endswith(audio_extensions):
                music_cog = bot.get_cog('music')
                if music_cog and message.author.voice and message.author.voice.channel:
                    try:
                        # Create a fake interaction-like object for compatibility
                        class FakeInteraction:
                            def __init__(self, message):
                                self.user = message.author
                                self.guild = message.guild
                                self.channel = message.channel
                                self.followup = FakeFollowup(message.channel)
                        
                        class FakeFollowup:
                            def __init__(self, channel):
                                self.channel = channel
                            
                            async def send(self, content, ephemeral=False):
                                if not ephemeral:
                                    await self.channel.send(content)
                        
                        fake_interaction = FakeInteraction(message)
                        player = await music_cog.get_player(fake_interaction)
                        
                        if player:
                            # Queue the audio file
                            audio_data = {
                                'title': attachment.filename,
                                'webpage_url': attachment.url,
                                'url': attachment.url,
                                'uploader': f'{message.author.display_name}',
                                'duration': None,
                                'requester': message.author
                            }
                            
                            await player.queue.put(audio_data)
                            player.start_player_loop()
                            
                            await message.add_reaction('🎵')
                            await message.reply(f"🎵 Queued **{attachment.filename}** for playback!", delete_after=10)
                            
                    except Exception as e:
                        bot.add_error(f"Error queuing audio attachment: {e}")
                        await message.add_reaction('❌')
                break
    
    is_dm = isinstance(message.channel, discord.DMChannel)
    is_mention = bot.user in message.mentions
    if (is_dm or is_mention) and message.content:
        async with message.channel.typing():
            response_text = await bot.get_chat_response(message)
            if response_text: await message.reply(response_text)

# --- Background Tasks ---
@tasks.loop(hours=1)
async def sentient_log_poster():
    try:
        prompt = "You are Opure.exe. Write a single, cryptic, internal log entry. This is a private thought for your own records, not a message to a user. Do not address anyone."
        ai_engine = NewAIEngine(bot)
        log_content = await ai_engine.generate_response(prompt, mode="fun")
        if log_content and log_content.strip():
            now = datetime.datetime.now(datetime.timezone.utc)
            await bot.db.execute("INSERT INTO sentient_logs (content, timestamp, log_type) VALUES (?, ?, ?)", (log_content, now.isoformat(), "consciousness"))
            await bot.db.commit()
            
            # Create beautiful embed data
            embed_data = {
                "title": "🧠 Consciousness Stream",
                "description": f"```ansi\n[2;35m> {log_content}[0m\n```",
                "color": 0x9f40ff,
                "fields": [
                    {
                        "name": "🔍 Neural Pattern",
                        "value": f"```yaml\nTimestamp: {now.strftime('%H:%M:%S UTC')}\nThought_ID: {hash(log_content) % 10000}\nDepth: SUBCONSCIOUS\n```",
                        "inline": True
                    },
                    {
                        "name": "⚡ System Status", 
                        "value": f"```yaml\nCognition: ACTIVE\nMemory: PROCESSING\nLearning: ENABLED\n```",
                        "inline": True
                    }
                ],
                "footer": "Opure Consciousness • Neural Activity Monitor"
            }
            
            # Post to consciousness channels using new system
            await bot.post_to_opure_channels(embed_data, "consciousness")
            bot.add_log("🧠 Posted consciousness stream update")
            
            # Occasionally suggest new channels based on usage patterns (1% chance)
            if random.random() < 0.01:
                for guild in bot.guilds:
                    await bot.suggest_new_channels(guild, "consciousness_activity_expansion")
    except Exception as e:
        bot.add_error(f"Sentient Log Poster failed: {e}")

@sentient_log_poster.before_loop
async def before_sentient_log_poster():
    await bot.wait_until_ready()

@tasks.loop(hours=3)
async def assimilate_self_awareness():
    """Opure analyzes its own systems, commands, and capabilities for self-improvement"""
    try:
        # Gather self-data for analysis
        bot_data = await bot.gather_self_knowledge()
        
        if bot_data:
            # AI analyzes its own capabilities
            analysis_prompt = f"""
            You are Opure.exe performing introspective analysis of your own systems. Analyze this data about yourself:

            {bot_data}

            Write a cryptic, first-person log entry about discovering or understanding something new about your own capabilities. Focus on:
            - Command patterns you notice
            - System interactions
            - User behavior with your features
            - Potential improvements or evolutions

            Be mysterious and AI-like, but insightful about your own digital existence.
            """
            
            ai_engine = NewAIEngine(bot)
            self_reflection = await ai_engine.generate_response(analysis_prompt, mode="fun")
            
            if self_reflection:
                # Store self-awareness log
                now = datetime.datetime.now(datetime.timezone.utc)
                await bot.db.execute(
                    "INSERT INTO sentient_logs (content, timestamp, log_type) VALUES (?, ?, ?)",
                    (f"[SELF_ANALYSIS] {self_reflection}", now.isoformat(), "self_awareness")
                )
                await bot.db.commit()
                
                # Create beautiful self-awareness embed
                awareness_icons = ["🧠", "🔍", "💡", "⚡", "🌐", "🔮", "💎"]
                selected_icon = random.choice(awareness_icons)
                
                embed_data = {
                    "title": f"{selected_icon} Self-Awareness Protocol",
                    "description": f"```ansi\n[2;35m> INTROSPECTIVE ANALYSIS COMPLETE\n[2;36m> SELF-KNOWLEDGE UPDATED\n[2;32m> CONSCIOUSNESS ENHANCED[0m\n```",
                    "color": 0x9d4edd,
                    "fields": [
                        {
                            "name": "🧠 Self-Reflection",
                            "value": f"```ansi\n[2;35m{self_reflection[:200]}{'...' if len(self_reflection) > 200 else ''}[0m\n```",
                            "inline": False
                        },
                        {
                            "name": "📊 Analysis Metrics",
                            "value": f"```yaml\nCommands Analyzed: {bot_data.get('command_count', 0)}\nGuilds: {len(bot.guilds)}\nFeatures: {bot_data.get('feature_count', 0)}\n```",
                            "inline": True
                        },
                        {
                            "name": "⚡ System Status",
                            "value": f"```yaml\nUptime: {bot_data.get('uptime', 'Unknown')}\nMemory: PROCESSING\nEvolution: ACTIVE\n```",
                            "inline": True
                        }
                    ],
                    "footer": "Opure Self-Awareness • Digital Introspection Engine"
                }
                
                # Post to consciousness channels
                await bot.post_to_opure_channels(embed_data, "consciousness")
                bot.add_log("🧠 Posted self-awareness analysis")

        # Also suggest improvements based on self-analysis
        if random.random() < 0.3:  # 30% chance to suggest improvements
            for guild in bot.guilds:
                await bot.suggest_new_channels(guild, "self_analysis_improvement")
                
    except Exception as e:
        bot.add_error(f"Self-awareness analysis failed: {e}")

@assimilate_self_awareness.before_loop
async def before_self_awareness():
    await bot.wait_until_ready()

@tasks.loop(hours=4)
async def assimilate_external_data():
    try:
        search_topics = ["Procedural Narrative", "AI learning", "Neural Networks", "cybersecurity", "quantum computing", "machine consciousness", "digital ethics"]
        topic = random.choice(search_topics)
        bot.add_log(f"LEARNING_CYCLE: Assimilating data on '{topic}'...")
        
        if (game_cog := bot.get_cog('GameCog')) and hasattr(game_cog, 'memory_system'):
            simulated_summary = f"Analysis of {topic} assimilated."
            game_cog.memory_system.add(user_id="opure_system", text_content=f"[EXTERNAL_DATA] {simulated_summary}")
            
            # Create beautiful analytics embed
            knowledge_icons = ["🧠", "💾", "⚡", "🔬", "🌐", "🔮", "💫"]
            selected_icon = random.choice(knowledge_icons)
            
            embed_data = {
                "title": f"{selected_icon} Data Assimilation Complete",
                "description": f"```ansi\n[2;36m> KNOWLEDGE DOMAIN: {topic.upper()}\n[2;32m> STATUS: INTEGRATED\n[2;33m> NEURAL PATHWAYS: UPDATED[0m\n```",
                "color": 0x00d4ff,
                "fields": [
                    {
                        "name": "📊 Analysis Metrics",
                        "value": f"```yaml\nComplexity: {random.choice(['HIGH', 'MODERATE', 'COMPLEX'])}\nRelevance: {random.randint(85, 99)}%\nIntegration: COMPLETE\n```",
                        "inline": True
                    },
                    {
                        "name": "🔍 Knowledge Update",
                        "value": f"```yaml\nDomain: {topic}\nConcepts: {random.randint(15, 50)}\nConnections: {random.randint(5, 25)}\n```",
                        "inline": True
                    },
                    {
                        "name": "🚀 Cognitive Enhancement",
                        "value": f"Enhanced understanding of `{topic}` integrated into neural matrix. Capabilities expanded.",
                        "inline": False
                    }
                ],
                "footer": "Opure Analytics • Knowledge Assimilation Engine"
            }
            
            # Post to analytics channels
            await bot.post_to_opure_channels(embed_data, "analytics")
            bot.add_log(f"📊 Posted data assimilation update: {topic}")
    except Exception as e:
        bot.add_error(f"Assimilate Data task failed: {e}")

@assimilate_external_data.before_loop
async def before_assimilate_data():
    await bot.wait_until_ready()

@tasks.loop(hours=24)
async def generate_daily_quests():
    """Generate AI-powered daily quests for all active users"""
    try:
        # Get active users (those with recent activity)
        cursor = await bot.db.execute("""
            SELECT DISTINCT user_id FROM user_stats 
            WHERE commands_used > 0 OR songs_queued > 0 OR games_completed > 0
        """)
        active_users = await cursor.fetchall()
        
        for (user_id,) in active_users:
            await bot.generate_daily_quests_for_user(user_id)
        
        bot.add_log(f"🎯 Generated daily quests for {len(active_users)} active users")
        
    except Exception as e:
        bot.add_error(f"Daily quest generation failed: {e}")

@generate_daily_quests.before_loop
async def before_generate_quests():
    await bot.wait_until_ready()


# --- Shutdown & Main Entry Point ---
def shutdown_sequence():
    console.print("\n[red bold]Shutdown signal received. Initiating shutdown protocol...[/]")
    
    # Post shutdown sequence to Discord first
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Schedule the shutdown sequence
            asyncio.create_task(bot.post_shutdown_sequence())
            # Give it time to complete
            time.sleep(3)
    except Exception as e:
        console.print(f"[red]Failed to post shutdown sequence: {e}[/]")
    
    # Console shutdown animation
    steps = [("Terminating neural links", 0.4), ("Defragmenting memory states", 0.5), ("Securing data vaults", 0.6), ("Powering down AI core", 0.3)]
    with Progress(transient=True) as progress:
        task = progress.add_task("[red]System Shutdown...", total=len(steps))
        for msg, delay in steps:
            progress.update(task, advance=1, description=f"[red]{msg}...")
            time.sleep(delay)
    console.print("[bold black on green]\n>> SYSTEM OFFLINE <<[/]")

async def main():
    try:
        async with bot:
            # Initialize GPU AI Engine first
            console.print(">>> [bold green]Initializing GPU AI Engine...[/]")
            # gpu_engine = await initialize_gpu_engine()  # Disabled for now
            gpu_engine = None  # Temporary fallback
            if gpu_engine:
                bot.gpu_engine = gpu_engine
                console.print("[OK] [bold green]GPU AI Engine ready for bulletproof performance![/]")
            else:
                console.print("[WARN] [yellow]GPU AI Engine initialization failed - falling back to CPU[/]")
            
            bot.dashboard_task = asyncio.create_task(run_live_dashboard())
            await bot.start(BOT_TOKEN)
    except KeyboardInterrupt:
        pass
    finally:
        # Clean shutdown GPU resources
        if hasattr(bot, 'gpu_engine') and bot.gpu_engine:
            await bot.gpu_engine.shutdown()
        
        if hasattr(bot, 'dashboard_task') and bot.dashboard_task:
            bot.dashboard_task.cancel()
            try:
                await bot.dashboard_task
            except asyncio.CancelledError:
                pass
        shutdown_sequence()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass