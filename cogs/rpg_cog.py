# cogs/rpg_cog.py - Living World RPG System

import discord
from discord import app_commands
from discord.ext import commands, tasks
import json
import asyncio
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uuid

# RPG Classes and Stats
CLASSES = {
    "warrior": {"strength": 15, "intellect": 8, "agility": 10, "vitality": 12},
    "mage": {"strength": 8, "intellect": 15, "agility": 10, "vitality": 10},
    "ranger": {"strength": 10, "intellect": 10, "agility": 15, "vitality": 10},
    "cleric": {"strength": 10, "intellect": 12, "agility": 8, "vitality": 15}
}

LOCATIONS = [
    "Shadowfen Swamps", "Crystal Spire", "Whispering Woods", "Iron Keep", 
    "Sunken Ruins", "Frost Peaks", "Desert of Echoes", "Blood Valley"
]

class RPGDatabase:
    """Handles all RPG-related database operations"""
    
    def __init__(self, bot):
        self.bot = bot
    
    async def initialize_tables(self):
        """Create all necessary tables for the RPG system"""
        
        # Players table - core character data
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_players (
                user_id INTEGER PRIMARY KEY,
                character_name TEXT NOT NULL,
                class TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                strength INTEGER DEFAULT 10,
                intellect INTEGER DEFAULT 10,
                agility INTEGER DEFAULT 10,
                vitality INTEGER DEFAULT 10,
                health INTEGER DEFAULT 100,
                max_health INTEGER DEFAULT 100,
                mana INTEGER DEFAULT 50,
                max_mana INTEGER DEFAULT 50,
                gold INTEGER DEFAULT 100,
                current_location TEXT DEFAULT 'Whispering Woods',
                selected_title TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Inventory system
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                item_id TEXT NOT NULL,
                quantity INTEGER DEFAULT 1,
                is_equipped BOOLEAN DEFAULT FALSE,
                obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES rpg_players (user_id)
            )
        """)
        
        # Quest system
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_quests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                quest_id TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                progress TEXT DEFAULT '{}',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES rpg_players (user_id)
            )
        """)
        
        # Achievements system
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                achievement_id TEXT NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES rpg_players (user_id)
            )
        """)
        
        # World state - persistent world events
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_world_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER,
                event_key TEXT NOT NULL,
                event_value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, event_key)
            )
        """)
        
        # Seasonal items pool
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_seasonal_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT UNIQUE NOT NULL,
                season_name TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                rarity TEXT NOT NULL,
                description TEXT NOT NULL,
                is_tradable BOOLEAN DEFAULT TRUE,
                stats TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Global shop
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_shop (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT NOT NULL,
                price INTEGER NOT NULL,
                stock INTEGER DEFAULT 1,
                refresh_cycle INTEGER NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Marketplace/Auction house
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_marketplace (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id TEXT UNIQUE NOT NULL,
                seller_id INTEGER NOT NULL,
                item_id TEXT NOT NULL,
                listing_type TEXT NOT NULL, -- 'auction' or 'fixed'
                price INTEGER DEFAULT NULL, -- buyout price for fixed sales
                current_bid INTEGER DEFAULT 0,
                highest_bidder INTEGER DEFAULT NULL,
                scope TEXT DEFAULT 'global', -- 'global' or 'local'
                guild_id INTEGER DEFAULT NULL, -- for local listings
                expires_at TIMESTAMP NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Party system
        await self.bot.db.execute("""
            CREATE TABLE IF NOT EXISTS rpg_parties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                party_id TEXT UNIQUE NOT NULL,
                leader_id INTEGER NOT NULL,
                members TEXT NOT NULL, -- JSON array of user_ids
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await self.bot.db.commit()
        self.bot.add_log("✓ RPG database tables initialized")

class GameMasterEngine:
    """AI-powered Game Master for dynamic storytelling"""
    
    def __init__(self, bot, db: RPGDatabase):
        self.bot = bot
        self.db = db
    
    async def create_gm_context(self, user_id: int, guild_id: int, action: str = None, party_members: List[int] = None) -> str:
        """Create a rich context block for the AI Game Master"""
        
        # Get player data
        async with self.bot.db.execute("SELECT * FROM rpg_players WHERE user_id = ?", (user_id,)) as cursor:
            player = await cursor.fetchone()
        
        if not player:
            return None
            
        # Get world state for this guild
        async with self.bot.db.execute(
            "SELECT event_key, event_value FROM rpg_world_state WHERE guild_id = ?", 
            (guild_id,)
        ) as cursor:
            world_events = {row[0]: row[1] async for row in cursor}
        
        # Get active quests
        async with self.bot.db.execute(
            "SELECT quest_id, progress FROM rpg_quests WHERE user_id = ? AND status = 'active'", 
            (user_id,)
        ) as cursor:
            active_quests = [{"quest_id": row[0], "progress": json.loads(row[1])} async for row in cursor]
        
        # Build party context if in party
        party_context = ""
        if party_members:
            party_data = []
            for member_id in party_members:
                async with self.bot.db.execute("SELECT * FROM rpg_players WHERE user_id = ?", (member_id,)) as cursor:
                    member = await cursor.fetchone()
                    if member:
                        party_data.append({
                            "name": member[1],
                            "class": member[2],
                            "level": member[3],
                            "health": f"{member[8]}/{member[9]}",
                            "location": member[12]
                        })
            
            if party_data:
                party_context = f"\n[PARTY MEMBERS]\n"
                for member in party_data:
                    party_context += f"- {member['name']}, {member['class']}, Level {member['level']}, Health: {member['health']}\n"
        
        # Build the complete GM context
        context = f"""[SYSTEM PREAMBLE]
You are Opure, a master Game Master for a dark fantasy RPG. Your goal is to describe the world, react to player actions, and present challenges. Narrate in the second person ("You see..."). Never break character. Be immersive and dramatic.

[WORLD STATE & SCENE]
Location: {player[12]}
Time: {self._get_game_time()}
Active World Events: {', '.join(world_events.keys()) if world_events else 'None'}
Current Season: Crystal Spire Season

[PLAYER CONTEXT]
- Character: {player[1]}, {player[2]}, Level {player[3]}
- Stats: STR {player[4]}, INT {player[5]}, AGI {player[6]}, VIT {player[7]}
- Health: {player[8]}/{player[9]}, Mana: {player[10]}/{player[11]}
- Active Quests: {', '.join([q['quest_id'] for q in active_quests]) if active_quests else 'None'}{party_context}

[PLAYER ACTION]
{action if action else "The player is exploring and awaiting your description of their surroundings."}

[YOUR TASK]
Describe the outcome vividly. What do they discover? Present new situations, challenges, or opportunities. If a mini-game would be appropriate (puzzle, memory game, riddle), declare it with [MINIGAME_START: game_type]. If they find loot, use [LOOT_FOUND: item_name]. For quest updates, use [QUEST_UPDATE: quest_id, progress].
"""
        return context
    
    def _get_game_time(self) -> str:
        """Get formatted game time"""
        hour = datetime.now().hour
        if 6 <= hour < 12:
            return "Morning"
        elif 12 <= hour < 18:
            return "Afternoon"  
        elif 18 <= hour < 22:
            return "Evening"
        else:
            return "Night"
    
    async def process_gm_response(self, response: str, user_id: int, guild_id: int) -> Dict[str, Any]:
        """Process AI response and extract special commands"""
        result = {
            "narrative": response,
            "minigame": None,
            "loot": [],
            "quest_updates": [],
            "world_updates": []
        }
        
        # Extract minigame triggers
        import re
        minigame_match = re.search(r'\\[MINIGAME_START: (\\w+)\\]', response)
        if minigame_match:
            result["minigame"] = minigame_match.group(1)
            result["narrative"] = re.sub(r'\\[MINIGAME_START: \\w+\\]', '', response).strip()
        
        # Extract loot
        loot_matches = re.findall(r'\\[LOOT_FOUND: ([^\\]]+)\\]', response)
        for loot in loot_matches:
            result["loot"].append(loot)
            result["narrative"] = re.sub(r'\\[LOOT_FOUND: [^\\]]+\\]', '', result["narrative"]).strip()
        
        # Extract quest updates
        quest_matches = re.findall(r'\\[QUEST_UPDATE: ([^,]+), ([^\\]]+)\\]', response)
        for quest_id, progress in quest_matches:
            result["quest_updates"].append({"quest_id": quest_id.strip(), "progress": progress.strip()})
            result["narrative"] = re.sub(r'\\[QUEST_UPDATE: [^\\]]+\\]', '', result["narrative"]).strip()
        
        return result

class BaseMinigame:
    """Base class for all mini-games"""
    
    def __init__(self, players: List[discord.Member], bot):
        self.players = players
        self.bot = bot
        self.state = "waiting"  # waiting, active, finished
        self.winner = None
        self.game_data = {}
    
    async def start_game(self, interaction: discord.Interaction) -> discord.ui.View:
        """Start the game and return the UI view"""
        self.state = "active"
        return await self.create_view(interaction)
    
    async def create_view(self, interaction: discord.Interaction) -> discord.ui.View:
        """Override this method to create game-specific UI"""
        raise NotImplementedError
    
    async def end_game(self, winner: discord.Member = None):
        """End the game and award rewards"""
        self.state = "finished"
        self.winner = winner
        if winner:
            # Award XP for winning mini-game
            await self._award_xp(winner.id, 25)
    
    async def _award_xp(self, user_id: int, amount: int):
        """Award XP to a player"""
        await self.bot.db.execute(
            "UPDATE rpg_players SET xp = xp + ? WHERE user_id = ?",
            (amount, user_id)
        )
        await self.bot.db.commit()

class RPGCog(commands.Cog, name="rpg"):
    """Living World RPG System"""
    
    def __init__(self, bot):
        self.bot = bot
        self.db = RPGDatabase(bot)
        self.gm_engine = GameMasterEngine(bot, self.db)
        self.active_minigames: Dict[int, BaseMinigame] = {}  # channel_id -> game
        
    async def cog_load(self):
        """Initialize the RPG system"""
        await self.db.initialize_tables()
        # Start background tasks
        self.shop_refresh_task.start()
        self.bot.add_log("✓ RPG system loaded successfully")
    
    def cog_unload(self):
        """Clean up when cog is unloaded"""
        self.shop_refresh_task.cancel()
    
    @tasks.loop(hours=6)
    async def shop_refresh_task(self):
        """Refresh the global shop every 6 hours"""
        try:
            # Clear current shop
            await self.bot.db.execute("DELETE FROM rpg_shop")
            
            # Get current seasonal items
            async with self.bot.db.execute(
                "SELECT item_id, name FROM rpg_seasonal_items ORDER BY RANDOM() LIMIT 8"
            ) as cursor:
                items = await cursor.fetchall()
            
            # Add items to shop with random prices
            cycle = int(datetime.now().timestamp() // (6 * 3600))  # 6-hour cycles
            for item_id, name in items:
                price = random.randint(50, 500)
                await self.bot.db.execute(
                    "INSERT INTO rpg_shop (item_id, price, refresh_cycle) VALUES (?, ?, ?)",
                    (item_id, price, cycle)
                )
            
            await self.bot.db.commit()
            self.bot.add_log(f"✓ Shop refreshed with {len(items)} items")
            
        except Exception as e:
            self.bot.add_error(f"Shop refresh failed: {e}")
    
    @shop_refresh_task.before_loop
    async def before_shop_refresh(self):
        await self.bot.wait_until_ready()
    
    # Character Creation and Management
    @app_commands.command(name="create_character", description="Create your RPG character")
    @app_commands.describe(
        name="Your character's name",
        character_class="Choose your class"
    )
    @app_commands.choices(character_class=[
        app_commands.Choice(name="Warrior - Strong melee fighter", value="warrior"),
        app_commands.Choice(name="Mage - Master of arcane arts", value="mage"),
        app_commands.Choice(name="Ranger - Agile archer and scout", value="ranger"),
        app_commands.Choice(name="Cleric - Divine healer and support", value="cleric")
    ])
    async def create_character(self, interaction: discord.Interaction, name: str, character_class: str):
        await interaction.response.defer()
        
        # Check if user already has a character
        async with self.bot.db.execute("SELECT user_id FROM rpg_players WHERE user_id = ?", (interaction.user.id,)) as cursor:
            existing = await cursor.fetchone()
        
        if existing:
            return await interaction.followup.send("❌ You already have a character! Use `/character` to view your stats.", ephemeral=True)
        
        # Validate inputs
        if len(name) < 2 or len(name) > 20:
            return await interaction.followup.send("❌ Character name must be between 2-20 characters.", ephemeral=True)
        
        if character_class not in CLASSES:
            return await interaction.followup.send("❌ Invalid character class.", ephemeral=True)
        
        # Create character with class-specific stats
        base_stats = CLASSES[character_class]
        max_health = base_stats["vitality"] * 8 + 20
        max_mana = base_stats["intellect"] * 5 + 25
        
        await self.bot.db.execute("""
            INSERT INTO rpg_players (
                user_id, character_name, class, strength, intellect, agility, vitality,
                health, max_health, mana, max_mana
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            interaction.user.id, name, character_class,
            base_stats["strength"], base_stats["intellect"], 
            base_stats["agility"], base_stats["vitality"],
            max_health, max_health, max_mana, max_mana
        ))
        await self.bot.db.commit()
        
        # Create welcome embed
        embed = discord.Embed(
            title="🎭 Character Created!",
            description=f"Welcome to the world, **{name}**!",
            color=0x00ff00
        )
        embed.add_field(name="Class", value=character_class.title(), inline=True)
        embed.add_field(name="Level", value="1", inline=True)
        embed.add_field(name="Location", value="Whispering Woods", inline=True)
        
        stats_text = f"💪 STR: {base_stats['strength']}\n🧠 INT: {base_stats['intellect']}\n⚡ AGI: {base_stats['agility']}\n❤️ VIT: {base_stats['vitality']}"
        embed.add_field(name="Stats", value=stats_text, inline=True)
        embed.add_field(name="Health", value=f"{max_health}/{max_health}", inline=True)
        embed.add_field(name="Mana", value=f"{max_mana}/{max_mana}", inline=True)
        
        embed.set_footer(text="Use /adventure to begin your journey!")
        
        await interaction.followup.send(embed=embed)
        self.bot.add_log(f"New character created: {name} ({character_class}) by {interaction.user}")

    @app_commands.command(name="character", description="View your character sheet")
    async def character(self, interaction: discord.Interaction):
        await interaction.response.defer()
        
        async with self.bot.db.execute("SELECT * FROM rpg_players WHERE user_id = ?", (interaction.user.id,)) as cursor:
            player = await cursor.fetchone()
        
        if not player:
            return await interaction.followup.send("❌ You don't have a character yet! Use `/create_character` to get started.", ephemeral=True)
        
        # Calculate next level XP requirement
        next_level_xp = player[3] * 100  # level * 100
        xp_progress = player[4] % 100  # current XP in this level
        
        embed = discord.Embed(
            title=f"📋 {player[1]}'s Character Sheet",
            color=0x1DB954
        )
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
        
        # Basic info
        embed.add_field(name="Class", value=player[2].title(), inline=True)
        embed.add_field(name="Level", value=str(player[3]), inline=True)
        embed.add_field(name="XP", value=f"{xp_progress}/100", inline=True)
        
        # Stats
        stats_text = f"💪 **Strength:** {player[4]}\n🧠 **Intellect:** {player[5]}\n⚡ **Agility:** {player[6]}\n❤️ **Vitality:** {player[7]}"
        embed.add_field(name="Stats", value=stats_text, inline=True)
        
        # Health and Mana
        health_text = f"❤️ **Health:** {player[8]}/{player[9]}\n🔵 **Mana:** {player[10]}/{player[11]}"
        embed.add_field(name="Resources", value=health_text, inline=True)
        
        # Location and Gold
        misc_text = f"📍 **Location:** {player[12]}\n💰 **Gold:** {player[13]}"
        if player[14]:  # selected title
            misc_text += f"\n🏆 **Title:** {player[14]}"
        embed.add_field(name="Status", value=misc_text, inline=True)
        
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="adventure", description="Begin or continue your adventure")
    @app_commands.describe(action="What do you want to do? (optional)")
    async def adventure(self, interaction: discord.Interaction, action: str = None):
        await interaction.response.defer()
        
        # Check if player exists
        async with self.bot.db.execute("SELECT * FROM rpg_players WHERE user_id = ?", (interaction.user.id,)) as cursor:
            player = await cursor.fetchone()
        
        if not player:
            return await interaction.followup.send("❌ You don't have a character yet! Use `/create_character` to get started.", ephemeral=True)
        
        # Update last played timestamp
        await self.bot.db.execute(
            "UPDATE rpg_players SET last_played = CURRENT_TIMESTAMP WHERE user_id = ?",
            (interaction.user.id,)
        )
        await self.bot.db.commit()
        
        # Create GM context and get AI response
        try:
            gm_context = await self.gm_engine.create_gm_context(
                interaction.user.id, 
                interaction.guild.id, 
                action
            )
            
            if not gm_context:
                return await interaction.followup.send("❌ Error creating game context.", ephemeral=True)
            
            # Get AI response
            response = await self.bot.ollama_client.generate(model='opure', prompt=gm_context)
            narrative = response.get('response', 'The world seems strangely quiet...')
            
            # Process the AI response for special commands
            result = await self.gm_engine.process_gm_response(
                narrative, interaction.user.id, interaction.guild.id
            )
            
            # Create adventure embed
            embed = discord.Embed(
                title=f"🗡️ Adventure - {player[12]}",
                description=result["narrative"],
                color=0x8B4513
            )
            embed.set_author(name=f"{player[1]} the {player[2].title()}", icon_url=interaction.user.display_avatar.url)
            
            # Add health/mana status
            status_text = f"❤️ {player[8]}/{player[9]} HP | 🔵 {player[10]}/{player[11]} MP | 💰 {player[13]} Gold"
            embed.set_footer(text=status_text)
            
            view = None
            
            # Handle special events
            if result["loot"]:
                loot_text = "\n🎁 **Items Found:** " + ", ".join(result["loot"])
                embed.description += loot_text
                # TODO: Add items to inventory
            
            if result["minigame"]:
                embed.add_field(
                    name="🎮 Challenge Detected!", 
                    value=f"A {result['minigame']} challenge awaits. Use the button below to accept!",
                    inline=False
                )
                view = AdventureView(self, interaction.user.id, result["minigame"])
            
            if result["quest_updates"]:
                for quest_update in result["quest_updates"]:
                    # TODO: Update quest progress in database
                    embed.add_field(
                        name="📜 Quest Update",
                        value=f"**{quest_update['quest_id']}:** {quest_update['progress']}",
                        inline=False
                    )
            
            await interaction.followup.send(embed=embed, view=view)
            
        except Exception as e:
            self.bot.add_error(f"Adventure command error: {e}")
            await interaction.followup.send("❌ The magical energies are unstable right now. Try again later.", ephemeral=True)

    @app_commands.command(name="challenge", description="Challenge another player to a minigame")
    @app_commands.describe(
        game_type="Type of game to play",
        opponent="Player to challenge"
    )
    @app_commands.choices(game_type=[
        app_commands.Choice(name="Tic-Tac-Toe", value="tictactoe"),
        app_commands.Choice(name="Memory Game", value="memory")
    ])
    async def challenge(self, interaction: discord.Interaction, game_type: str, opponent: discord.Member):
        await interaction.response.defer()
        
        if opponent.bot:
            return await interaction.followup.send("❌ You can't challenge bots!", ephemeral=True)
        
        if opponent.id == interaction.user.id:
            return await interaction.followup.send("❌ You can't challenge yourself!", ephemeral=True)
        
        # Check if both players have characters
        async with self.bot.db.execute("SELECT user_id FROM rpg_players WHERE user_id IN (?, ?)", (interaction.user.id, opponent.id)) as cursor:
            players_with_chars = [row[0] async for row in cursor]
        
        if interaction.user.id not in players_with_chars:
            return await interaction.followup.send("❌ You need a character first! Use `/create_character`.", ephemeral=True)
        
        if opponent.id not in players_with_chars:
            return await interaction.followup.send(f"❌ {opponent.mention} doesn't have a character yet!", ephemeral=True)
        
        # Create the game
        players = [interaction.user, opponent]
        
        if game_type == "tictactoe":
            game = TicTacToeGame(players, self.bot)
        elif game_type == "memory":
            game = MemoryGame(players, self.bot)
        else:
            return await interaction.followup.send("❌ Invalid game type!", ephemeral=True)
        
        # Store the game
        self.active_minigames[interaction.channel.id] = game
        
        # Create challenge embed
        embed = discord.Embed(
            title=f"🎮 {game_type.title()} Challenge!",
            description=f"{interaction.user.mention} has challenged {opponent.mention} to a game of {game_type}!",
            color=0xFF6B35
        )
        
        view = ChallengeView(game, interaction.user.id, opponent.id)
        await interaction.followup.send(embed=embed, view=view)

    @app_commands.command(name="generate_season", description="[ADMIN] Generate new seasonal items")
    async def generate_season(self, interaction: discord.Interaction):
        if not interaction.user.guild_permissions.administrator:
            return await interaction.response.send_message("❌ Admin only command!", ephemeral=True)
        
        await interaction.response.defer()
        
        try:
            season_name = f"Season of the Crystal Spire {datetime.now().year}"
            
            # AI prompt for item generation
            item_generation_prompt = f"""[SYSTEM PREAMBLE]
You are a master fantasy item creator. Generate exactly 50 unique items for the "{season_name}". 

Your response MUST be valid JSON containing an array of items. Each item must have:
- "name": string (unique name)
- "type": string (weapon, armor, consumable, accessory, material)
- "rarity": string (common, uncommon, rare, epic, legendary)
- "description": string (one sentence description)
- "is_tradable": boolean (true/false)
- "stats": object with stat bonuses like {{"strength": 5, "gold_value": 100}}

Make items thematic to a mystical crystal tower. Include various types and rarities.
Response format: {{"items": [...]}}"""
            
            response = await self.bot.ollama_client.generate(model='opure', prompt=item_generation_prompt)
            items_data = json.loads(response.get('response', '{"items": []}'))
            
            items = items_data.get('items', [])
            if not items:
                return await interaction.followup.send("❌ Failed to generate items.", ephemeral=True)
            
            # Clear old season items
            await self.bot.db.execute("DELETE FROM rpg_seasonal_items")
            
            # Insert new items
            added_count = 0
            for item in items:
                try:
                    item_id = str(uuid.uuid4())
                    await self.bot.db.execute("""
                        INSERT INTO rpg_seasonal_items 
                        (item_id, season_name, name, type, rarity, description, is_tradable, stats) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item_id, season_name, item['name'], item['type'], 
                        item['rarity'], item['description'], item['is_tradable'],
                        json.dumps(item.get('stats', {}))
                    ))
                    added_count += 1
                except Exception as e:
                    self.bot.add_error(f"Error adding item {item.get('name', 'unknown')}: {e}")
            
            await self.bot.db.commit()
            
            embed = discord.Embed(
                title="🔮 New Season Generated!",
                description=f"Successfully created **{added_count}** items for {season_name}",
                color=0x9D4EDD
            )
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            self.bot.add_error(f"Season generation error: {e}")
            await interaction.followup.send("❌ Failed to generate season. Check logs for details.", ephemeral=True)



    @app_commands.command(name="party", description="Manage your adventure party")
    @app_commands.describe(action="Party action to perform", member="Member to invite/kick (for invite/kick actions)")
    @app_commands.choices(action=[
        app_commands.Choice(name="Create Party", value="create"),
        app_commands.Choice(name="Join Party", value="join"),
        app_commands.Choice(name="Leave Party", value="leave"),
        app_commands.Choice(name="Invite Member", value="invite"),
        app_commands.Choice(name="Kick Member", value="kick"),
        app_commands.Choice(name="View Party", value="view")
    ])
    async def party(self, interaction: discord.Interaction, action: str, member: discord.Member = None):
        await interaction.response.defer()
        
        # Check if user has character
        async with self.bot.db.execute("SELECT user_id FROM rpg_players WHERE user_id = ?", (interaction.user.id,)) as cursor:
            player = await cursor.fetchone()
        
        if not player:
            return await interaction.followup.send("❌ You need a character first! Use `/create_character`.", ephemeral=True)
        
        if action == "create":
            # Check if already in party
            async with self.bot.db.execute("SELECT party_id FROM rpg_parties WHERE members LIKE ?", (f'%{interaction.user.id}%',)) as cursor:
                existing_party = await cursor.fetchone()
            
            if existing_party:
                return await interaction.followup.send("❌ You're already in a party! Leave your current party first.", ephemeral=True)
            
            # Create new party
            party_id = str(uuid.uuid4())
            members = json.dumps([interaction.user.id])
            
            await self.bot.db.execute("""
                INSERT INTO rpg_parties (party_id, leader_id, members) 
                VALUES (?, ?, ?)
            """, (party_id, interaction.user.id, members))
            await self.bot.db.commit()
            
            embed = discord.Embed(
                title="🎉 Party Created!",
                description=f"You've created a new party! Party ID: `{party_id[:8]}`",
                color=0x00FF00
            )
            await interaction.followup.send(embed=embed)
        
        elif action == "view":
            # Find user's party
            async with self.bot.db.execute("SELECT * FROM rpg_parties WHERE members LIKE ?", (f'%{interaction.user.id}%',)) as cursor:
                party = await cursor.fetchone()
            
            if not party:
                return await interaction.followup.send("❌ You're not in a party.", ephemeral=True)
            
            party_members = json.loads(party[2])
            
            embed = discord.Embed(
                title=f"👥 Party Info",
                description=f"Party ID: `{party[0][:8]}`",
                color=0x1DB954
            )
            
            member_info = []
            for member_id in party_members:
                user = self.bot.get_user(member_id)
                if user:
                    # Get character info
                    async with self.bot.db.execute("SELECT character_name, class, level FROM rpg_players WHERE user_id = ?", (member_id,)) as cursor:
                        char_data = await cursor.fetchone()
                    
                    if char_data:
                        leader_mark = " 👑" if member_id == party[1] else ""
                        member_info.append(f"• {char_data[0]} ({char_data[1]}, Lv.{char_data[2]}){leader_mark}")
            
            embed.add_field(name="Members", value="\n".join(member_info) if member_info else "No members found", inline=False)
            await interaction.followup.send(embed=embed)
        
        elif action == "invite":
            if not member:
                return await interaction.followup.send("❌ You must specify a member to invite!", ephemeral=True)
            
            # Check if user is party leader
            async with self.bot.db.execute("SELECT * FROM rpg_parties WHERE leader_id = ?", (interaction.user.id,)) as cursor:
                party = await cursor.fetchone()
            
            if not party:
                return await interaction.followup.send("❌ You're not a party leader!", ephemeral=True)
            
            # Check if member has character
            async with self.bot.db.execute("SELECT user_id FROM rpg_players WHERE user_id = ?", (member.id,)) as cursor:
                target_player = await cursor.fetchone()
            
            if not target_player:
                return await interaction.followup.send(f"❌ {member.mention} doesn't have a character yet!", ephemeral=True)
            
            # Check if already in party
            party_members = json.loads(party[2])
            if member.id in party_members:
                return await interaction.followup.send(f"❌ {member.mention} is already in your party!", ephemeral=True)
            
            # Add to party
            party_members.append(member.id)
            await self.bot.db.execute("UPDATE rpg_parties SET members = ? WHERE party_id = ?", (json.dumps(party_members), party[0]))
            await self.bot.db.commit()
            
            embed = discord.Embed(
                title="✅ Member Invited!",
                description=f"{member.mention} has been added to your party!",
                color=0x00FF00
            )
            await interaction.followup.send(embed=embed)
        
        else:
            await interaction.followup.send("❌ Invalid party action or feature not yet implemented.", ephemeral=True)

class ChallengeView(discord.ui.View):
    """View for game challenges"""
    
    def __init__(self, game: BaseMinigame, challenger_id: int, opponent_id: int):
        super().__init__(timeout=300)
        self.game = game
        self.challenger_id = challenger_id
        self.opponent_id = opponent_id
    
    @discord.ui.button(label="✅ Accept", style=discord.ButtonStyle.success)
    async def accept_challenge(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.opponent_id:
            return await interaction.response.send_message("Only the challenged player can accept!", ephemeral=True)
        
        # Start the game
        game_view = await self.game.start_game(interaction)
        
        embed = discord.Embed(
            title=f"🎮 Game Started!",
            description=f"Let the {type(self.game).__name__.replace('Game', '')} begin!",
            color=0x00FF00
        )
        
        await interaction.response.edit_message(embed=embed, view=game_view)
    
    @discord.ui.button(label="❌ Decline", style=discord.ButtonStyle.danger)
    async def decline_challenge(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.opponent_id:
            return await interaction.response.send_message("Only the challenged player can decline!", ephemeral=True)
        
        embed = discord.Embed(
            title="🚫 Challenge Declined",
            description=f"{interaction.user.mention} declined the challenge.",
            color=0xFF0000
        )
        
        await interaction.response.edit_message(embed=embed, view=None)

class AdventureView(discord.ui.View):
    """UI view for adventure interactions"""
    
    def __init__(self, cog, user_id: int, minigame_type: str = None):
        super().__init__(timeout=300)
        self.cog = cog
        self.user_id = user_id
        self.minigame_type = minigame_type
    
    @discord.ui.button(label="🎮 Accept Challenge", style=discord.ButtonStyle.primary)
    async def accept_challenge(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            return await interaction.response.send_message("This is not your adventure!", ephemeral=True)
        
        await interaction.response.send_message(f"🎮 Starting {self.minigame_type} challenge...", ephemeral=True)
        # TODO: Launch specific minigame based on self.minigame_type
    
    @discord.ui.button(label="🚶 Continue Exploring", style=discord.ButtonStyle.secondary)
    async def continue_exploring(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            return await interaction.response.send_message("This is not your adventure!", ephemeral=True)
        
        # Trigger another adventure action
        await interaction.response.defer()
        # Create a new adventure prompt
        new_interaction = interaction
        await self.cog.adventure(new_interaction, "I continue exploring the area carefully.")

# Specific Minigame Implementations
class MemoryGame(BaseMinigame):
    """Memory sequence game"""
    
    def __init__(self, players: List[discord.Member], bot):
        super().__init__(players, bot)
        self.sequence = []
        self.player_sequence = []
        self.current_length = 3
    
    async def create_view(self, interaction: discord.Interaction) -> discord.ui.View:
        self.sequence = [random.choice(['🔴', '🔵', '🟢', '🟡']) for _ in range(self.current_length)]
        return MemoryGameView(self, interaction.user.id)

class MemoryGameView(discord.ui.View):
    def __init__(self, game: MemoryGame, user_id: int):
        super().__init__(timeout=60)
        self.game = game
        self.user_id = user_id
        self.showing_sequence = True
        self.current_index = 0
    
    @discord.ui.button(label="🔴", style=discord.ButtonStyle.danger, disabled=True)
    async def red_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._handle_input(interaction, '🔴')
    
    @discord.ui.button(label="🔵", style=discord.ButtonStyle.primary, disabled=True)
    async def blue_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._handle_input(interaction, '🔵')
    
    @discord.ui.button(label="🟢", style=discord.ButtonStyle.success, disabled=True)
    async def green_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._handle_input(interaction, '🟢')
    
    @discord.ui.button(label="🟡", style=discord.ButtonStyle.secondary, disabled=True)
    async def yellow_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._handle_input(interaction, '🟡')
    
    async def _handle_input(self, interaction: discord.Interaction, color: str):
        if interaction.user.id != self.user_id:
            return await interaction.response.send_message("This is not your game!", ephemeral=True)
        
        self.game.player_sequence.append(color)
        
        if len(self.game.player_sequence) == len(self.game.sequence):
            # Check if sequence is correct
            if self.game.player_sequence == self.game.sequence:
                await self.game.end_game(interaction.user)
                await interaction.response.send_message("🎉 Perfect! You win 25 XP!", ephemeral=False)
            else:
                await self.game.end_game(None)
                await interaction.response.send_message("❌ Wrong sequence! Better luck next time.", ephemeral=False)
        else:
            await interaction.response.defer()

class TicTacToeGame(BaseMinigame):
    """Tic-tac-toe game"""
    
    def __init__(self, players: List[discord.Member], bot):
        super().__init__(players, bot)
        self.board = [['⬜'] * 3 for _ in range(3)]
        self.current_player = 0
        self.symbols = ['❌', '⭕']
    
    async def create_view(self, interaction: discord.Interaction) -> discord.ui.View:
        return TicTacToeView(self)

class TicTacToeView(discord.ui.View):
    def __init__(self, game: TicTacToeGame):
        super().__init__(timeout=300)
        self.game = game
        self._create_board_buttons()
    
    def _create_board_buttons(self):
        for row in range(3):
            for col in range(3):
                button = discord.ui.Button(
                    label=self.game.board[row][col],
                    style=discord.ButtonStyle.secondary,
                    custom_id=f"cell_{row}_{col}",
                    row=row
                )
                button.callback = self._make_move
                self.add_item(button)
    
    async def _make_move(self, interaction: discord.Interaction):
        if interaction.user not in self.game.players:
            return await interaction.response.send_message("You're not playing this game!", ephemeral=True)
        
        current_player_user = self.game.players[self.game.current_player]
        if interaction.user != current_player_user:
            return await interaction.response.send_message("It's not your turn!", ephemeral=True)
        
        # Parse button coordinates
        custom_id = interaction.data['custom_id']
        row, col = map(int, custom_id.split('_')[1:])
        
        if self.game.board[row][col] != '⬜':
            return await interaction.response.send_message("That cell is already taken!", ephemeral=True)
        
        # Make the move
        symbol = self.game.symbols[self.game.current_player]
        self.game.board[row][col] = symbol
        
        # Check for win
        if self._check_win(symbol):
            await self.game.end_game(current_player_user)
            await interaction.response.send_message(f"🎉 {current_player_user.mention} wins! +25 XP!", ephemeral=False)
            return
        
        # Check for draw
        if all(cell != '⬜' for row in self.game.board for cell in row):
            await self.game.end_game(None)
            await interaction.response.send_message("🤝 It's a draw! +10 XP for both players!", ephemeral=False)
            for player in self.game.players:
                await self.game._award_xp(player.id, 10)
            return
        
        # Switch turns
        self.game.current_player = 1 - self.game.current_player
        
        # Update the view
        self.clear_items()
        self._create_board_buttons()
        
        next_player = self.game.players[self.game.current_player]
        embed = discord.Embed(
            title="🎮 Tic-Tac-Toe",
            description=f"Current turn: {next_player.mention} ({self.game.symbols[self.game.current_player]})",
            color=0x1DB954
        )
        
        await interaction.response.edit_message(embed=embed, view=self)
    
    def _check_win(self, symbol):
        board = self.game.board
        # Check rows, columns, and diagonals
        for i in range(3):
            if all(board[i][j] == symbol for j in range(3)):  # Row
                return True
            if all(board[j][i] == symbol for j in range(3)):  # Column
                return True
        # Diagonals
        if all(board[i][i] == symbol for i in range(3)):
            return True
        if all(board[i][2-i] == symbol for i in range(3)):
            return True
        return False

# Add these commands to the RPGCog class
async def setup(bot):
    import os
    GUILD_ID_STR = os.getenv("GUILD_ID", "")
    GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
    
    if GUILD_IDS:
        await bot.add_cog(RPGCog(bot), guilds=[discord.Object(id=gid) for gid in GUILD_IDS])
        bot.add_log(f"✓ RPGCog loaded for Guild IDs: {GUILD_IDS}")
    else:
        await bot.add_cog(RPGCog(bot))
        bot.add_log("✓ RPGCog loaded globally (no guild IDs found)")