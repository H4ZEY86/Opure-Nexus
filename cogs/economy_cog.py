# cogs/economy_cog.py

import discord
from discord import app_commands
from discord.ext import commands, tasks
import os
import random
import datetime
import math
import json
import re

from .constants import (
    FRAGMENTS_EMOJI, LOGKEY_EMOJI, ARTIFACT_EMOJI, LEADER_EMOJI,
    STREAK_EMOJI, LIVES_EMOJI, SHOP_EMOJI, LEVEL_EMOJI, XP_EMOJI
)

# --- Shop UI ---
class ShopView(discord.ui.View):
    def __init__(self, bot, author, initial_fragments):
        super().__init__(timeout=180)
        self.bot = bot
        self.author = author
        self.current_category = next(iter(self.bot.shop_items), "Consumables")
        self.selected_item = None
        self.quantity = 1
        self.current_fragments = initial_fragments
        self.build_view()

    def build_embed(self):
        """Builds the main shop embed."""
        embed = discord.Embed(
            title=f"{SHOP_EMOJI} Black Market Terminal",
            description=f"💰 **Your Balance:** `{self.current_fragments}` {FRAGMENTS_EMOJI}",
            color=0x5865F2
        )
        embed.set_author(name=f"{self.author.display_name}'s Shop", icon_url=self.author.display_avatar.url)
        if self.selected_item:
            embed.add_field(name=f"{self.selected_item.get('emoji','')} {self.selected_item['name']}", value=self.selected_item['description'], inline=False)
            total_cost = self.selected_item['price'] * self.quantity
            embed.add_field(name="Total Cost", value=f"`{total_cost}` {FRAGMENTS_EMOJI} for `{self.quantity}`x", inline=False)
        else:
            embed.description += "\nSelect a category and an item to view its details."
        
        return embed

    def build_view(self):
        """Clears and rebuilds the view with updated components."""
        self.clear_items()
        
        # Row 0: Category Selector
        self.add_item(self.build_category_select())

        # Row 1: Item Selector (will be disabled if no items)
        current_items = self.bot.shop_items.get(self.current_category, [])
        self.add_item(self.build_item_select(current_items))

        # Rows 2 & 3: Action buttons
        if self.selected_item:
            self.add_item(self.build_quantity_button("-", "quantity_decr", discord.ButtonStyle.secondary, 2, self.quantity == 1))
            self.add_item(self.build_quantity_button("+", "quantity_incr", discord.ButtonStyle.secondary, 2))
            self.add_item(self.build_quantity_button("Max", "quantity_max", discord.ButtonStyle.secondary, 2))
            self.add_item(self.build_purchase_button(row=3))

    def build_category_select(self):
        options = [discord.SelectOption(label=cat) for cat in self.bot.shop_items.keys()]
        if not options:
            return discord.ui.Select(placeholder="Shop is currently empty...", disabled=True)
            
        select = discord.ui.Select(placeholder="Select a category...", options=options, custom_id="cat_select", row=0)
        async def callback(interaction: discord.Interaction):
            if interaction.user.id != self.author.id: return await interaction.response.defer()
            self.current_category = interaction.data['values'][0]
            self.selected_item = None
            self.quantity = 1
            self.build_view()
            await interaction.response.edit_message(embed=self.build_embed(), view=self)
        select.callback = callback
        return select

    def build_item_select(self, items: list):
        # If the category is empty, return a disabled placeholder. This prevents the crash.
        if not items:
            return discord.ui.Select(placeholder="No items in this category today.", disabled=True, row=1)

        options = []
        for item in items:
            emoji = item.get('emoji')
            # Validate emoji - only use if it's a valid unicode emoji or Discord custom emoji format
            if emoji and (len(emoji) <= 2 or (emoji.startswith('<:') and emoji.endswith('>'))):
                try:
                    options.append(discord.SelectOption(
                        label=item['name'], 
                        value=item['id'], 
                        description=f"Price: {item['price']}", 
                        emoji=emoji
                    ))
                except:
                    # If emoji fails, create option without emoji
                    options.append(discord.SelectOption(
                        label=item['name'], 
                        value=item['id'], 
                        description=f"Price: {item['price']}"
                    ))
            else:
                # No emoji or invalid emoji
                options.append(discord.SelectOption(
                    label=item['name'], 
                    value=item['id'], 
                    description=f"Price: {item['price']}"
                ))
        select = discord.ui.Select(placeholder="Select an item...", options=options, custom_id="item_select", row=1)
        
        async def callback(interaction: discord.Interaction):
            if interaction.user.id != self.author.id: return await interaction.response.defer()
            item_id = interaction.data['values'][0]
            self.selected_item = next((item for item in self.bot.shop_items[self.current_category] if item['id'] == item_id), None)
            self.quantity = 1
            self.build_view()
            await interaction.response.edit_message(embed=self.build_embed(), view=self)
        select.callback = callback
        return select

    def build_quantity_button(self, label: str, custom_id: str, style: discord.ButtonStyle, row: int, disabled: bool = False):
        button = discord.ui.Button(label=label, style=style, custom_id=custom_id, row=row, disabled=disabled)
        async def callback(interaction: discord.Interaction):
            if interaction.user.id != self.author.id: return await interaction.response.defer()
            if custom_id == "quantity_decr": self.quantity = max(1, self.quantity - 1)
            elif custom_id == "quantity_incr": self.quantity += 1
            elif custom_id == "quantity_max":
                if self.selected_item and self.selected_item['price'] > 0:
                    max_buy = self.current_fragments // self.selected_item['price']
                    self.quantity = max(1, max_buy)
                else: self.quantity = 1
            self.build_view()
            await interaction.response.edit_message(embed=self.build_embed(), view=self)
        button.callback = callback
        return button

    def build_purchase_button(self, row: int):
        total_cost = self.selected_item['price'] * self.quantity
        can_afford = self.current_fragments >= total_cost
        button = discord.ui.Button(label=f"Buy for {total_cost}", style=discord.ButtonStyle.green if can_afford else discord.ButtonStyle.danger, custom_id="buy_item", row=row, disabled=not can_afford, emoji=SHOP_EMOJI)
        async def callback(interaction: discord.Interaction):
            if interaction.user.id != self.author.id: return await interaction.response.defer()
            if self.current_fragments < total_cost: return await interaction.response.send_message("You can no longer afford this.", ephemeral=True)
            
            await self.bot.db.execute("UPDATE players SET fragments = fragments - ? WHERE user_id = ?", (total_cost, self.author.id))
            await self.bot.db.execute("INSERT INTO player_items (user_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + ?", (self.author.id, self.selected_item['id'], self.quantity, self.quantity))
            await self.bot.db.commit()
            
            self.current_fragments -= total_cost
            original_item_name, original_quantity = self.selected_item['name'], self.quantity
            
            self.selected_item = None
            self.quantity = 1
            self.build_view()
            
            await interaction.response.edit_message(embed=self.build_embed(), view=self)
            await interaction.followup.send(f"Purchase successful! You bought **{original_quantity}x {original_item_name}**.", ephemeral=True)
        button.callback = callback
        return button

class EconomyCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.shop_items = {"Consumables": [], "Utilities": [], "Black Market": [], "Exotics": []} 
        # Initialize shop with some default items to prevent empty shop
        self._initialize_default_shop()

    def _initialize_default_shop(self):
        """Initialize shop with default items to prevent empty shop issues"""
        default_items = {
            "Consumables": [
                {"id": "health_stim", "name": "Health Stimulant", "emoji": "💉", "price": 150, "rarity": "Common", "description": "Restores health in missions", "game_effect": "Restores player health by 50 points"},
                {"id": "energy_drink", "name": "Neural Booster", "emoji": "⚡", "price": 100, "rarity": "Common", "description": "Increases focus temporarily", "game_effect": "Gives +1 to next puzzle attempt"},
            ],
            "Utilities": [
                {"id": "scanner", "name": "Data Scanner", "emoji": "📱", "price": 300, "rarity": "Uncommon", "description": "Reveals hidden information", "game_effect": "Shows hints for current puzzle"},
            ],
            "Black Market": [
                {"id": "bypass_key", "name": "Security Bypass", "emoji": "🔓", "price": 500, "rarity": "Rare", "description": "Skips security checks", "game_effect": "Automatically solves current challenge"},
            ],
            "Exotics": [
                {"id": "time_crystal", "name": "Temporal Fragment", "emoji": "💎", "price": 1000, "rarity": "Rare", "description": "Manipulates time flow", "game_effect": "Gives extra time to solve puzzles"},
            ]
        }
        self.bot.shop_items.update(default_items)

    def cog_unload(self):
        self.refresh_shop_task.cancel()

    async def get_player(self, user_id: int):
        async with self.bot.db.execute("SELECT * FROM players WHERE user_id = ?", (user_id,)) as cursor:
            player_data = await cursor.fetchone()
        if not player_data:
            await self.bot.db.execute("INSERT INTO players (user_id) VALUES (?)", (user_id,))
            await self.bot.db.commit()
            async with self.bot.db.execute("SELECT * FROM players WHERE user_id = ?", (user_id,)) as cursor:
                player_data = await cursor.fetchone()
        return player_data

    async def refresh_shop_items(self):
        """Manual shop refresh method that can be called on demand"""
        self.bot.add_log("[yellow]SHOP REFRESH: Generating new items...[/]")
        new_shop_items = {"Consumables": [], "Utilities": [], "Black Market": [], "Exotics": []}
        generated_item_names = set()
        generated_emojis = set()

        for category, count in [("Consumables", 3), ("Utilities", 2), ("Black Market", 2), ("Exotics", 1)]:
            attempts = 0
            while len(new_shop_items[category]) < count and attempts < count * 3: # Safety break
                item = await self.generate_shop_item(category, existing_names=generated_item_names, existing_emojis=generated_emojis)
                if item and item['name'] not in generated_item_names and item['emoji'] not in generated_emojis:
                    new_shop_items[category].append(item)
                    generated_item_names.add(item['name'])
                    generated_emojis.add(item['emoji'])
                attempts += 1
        
        self.bot.shop_items = new_shop_items
        self.bot.add_log("[green]✓ Shop inventory has been refreshed with AI-generated items.[/]")

    @tasks.loop(hours=24)
    async def refresh_shop_task(self):
        await self.refresh_shop_items()

    @refresh_shop_task.before_loop
    async def before_refresh_shop(self):
        await self.bot.wait_until_ready()

    async def generate_shop_item(self, category: str, existing_names: set, existing_emojis: set) -> dict | None:
        prompt = f"""
        Design a single new item for a shop in a cyberpunk text-based RPG.
        The item must fit the category: "{category}".
        The item name MUST NOT be one of these: {list(existing_names)}.
        The item emoji MUST NOT be one of these: {list(existing_emojis)}.

        Your response MUST be a single, valid JSON object and nothing else.
        Your response MUST contain ONLY the following keys: "name", "emoji", "price", "rarity", "description", "game_effect".
        Do NOT include an "id" key.

        - "name": a cool, thematic name
        - "emoji": a single unicode emoji (like 🔧, 💊, 🔋, ⚡, 🛡️, 🗡️, 💎, 🔮)
        - "price": an integer
        - "rarity": "Common", "Uncommon", or "Rare"
        - "description": a one-sentence description
        - "game_effect": a clear, one-sentence description of its mechanical effect for the game master AI.
        
        IMPORTANT: Use only standard unicode emojis, not text or symbols.
        """
        try:
            response = await self.bot.ollama_client.generate(model='mistral', prompt=prompt, format='json')
            item_data = json.loads(response['response'])
            
            if all(key in item_data for key in ["name", "price", "description", "game_effect", "rarity", "emoji"]):
                # Validate emoji - ensure it's a valid unicode emoji (1-2 characters)
                emoji = item_data.get('emoji', '')
                if not emoji or len(emoji) > 2 or emoji.isascii():
                    # Use a fallback emoji based on category
                    fallback_emojis = {
                        "Consumables": ["💊", "🧪", "🍎", "🔋"],
                        "Utilities": ["🔧", "⚡", "🛠️", "🔩"],
                        "Black Market": ["🗡️", "💰", "🔫", "💀"],
                        "Exotics": ["💎", "🔮", "⭐", "🌟"]
                    }
                    item_data['emoji'] = random.choice(fallback_emojis.get(category, ["📦"]))
                
                sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '', item_data['name'].lower().replace(' ', '_'))
                item_data['id'] = f"{sanitized_name}_{random.randint(1000, 9999)}"
                return item_data

            self.bot.add_error(f"AI generated invalid item JSON: {item_data}")
            return None
        except Exception as e:
            self.bot.add_error(f"Failed to generate or parse shop item: {e}")
            return None

    @app_commands.command(name="daily", description="Claim your daily data fragments.")
    async def daily(self, interaction: discord.Interaction):
        await interaction.response.defer()
        player = await self.get_player(interaction.user.id)
        user_id, _, _, last_daily_str, daily_streak, _, _, _, _ = player
        today = datetime.date.today()
        
        if last_daily_str:
            last_daily = datetime.date.fromisoformat(last_daily_str)
            if last_daily == today:
                return await interaction.followup.send("You have already claimed your daily fragments for today.")
            if last_daily < today - datetime.timedelta(days=1):
                daily_streak = 0
                
        base_reward, streak_bonus = random.randint(250, 500), daily_streak * 50
        total_reward, new_streak = base_reward + streak_bonus, daily_streak + 1
        
        await self.bot.db.execute("UPDATE players SET fragments = fragments + ?, last_daily = ?, daily_streak = ? WHERE user_id = ?", (total_reward, today.isoformat(), new_streak, user_id))
        await self.bot.db.commit()
        
        embed = discord.Embed(
            title=f"{STREAK_EMOJI} Daily Fragments Claimed!", 
            color=0xFEE75C,
            description=f"🎉 **{interaction.user.mention}** claimed their daily reward!"
        )
        embed.add_field(name="Total Reward", value=f"**`{total_reward}`** {FRAGMENTS_EMOJI}", inline=False)
        embed.set_footer(text=f"Your new streak is {new_streak} days. Come back tomorrow!")
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="profile", description="Check your balance, level, and other stats.")
    async def profile(self, interaction: discord.Interaction):
        await interaction.response.defer()
        player = await self.get_player(interaction.user.id)
        embed = discord.Embed(
            title=f"👤 {interaction.user.display_name}'s Profile", 
            color=interaction.user.color or 0x5865F2,
            description=f"🔍 **Profile for {interaction.user.mention}**"
        )
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        embed.add_field(name="Core Stats", value=f"{LEVEL_EMOJI} Level: `{player[7]}`\n{XP_EMOJI} XP: `{player[8]}`\n{LIVES_EMOJI} Lives: `{player[6]}`", inline=True)
        embed.add_field(name="Currency", value=f"{FRAGMENTS_EMOJI} Fragments: `{player[1]}`\n{LOGKEY_EMOJI} Log-Keys: `{player[5]}`", inline=True)
        embed.add_field(name="Daily Streak", value=f"{STREAK_EMOJI} Current Streak: `{player[4]}` days", inline=True)
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="inventory", description="View your inventory items.")
    @app_commands.describe(inventory_type="Choose between economy items or RPG items")
    @app_commands.choices(inventory_type=[
        app_commands.Choice(name="Economy Items", value="economy"),
        app_commands.Choice(name="RPG Items", value="rpg")
    ])
    async def inventory(self, interaction: discord.Interaction, inventory_type: str = "economy"):
        await interaction.response.defer(ephemeral=True)
        
        if inventory_type == "rpg":
            # RPG Inventory functionality
            # Check if player exists
            async with self.bot.db.execute("SELECT * FROM rpg_players WHERE user_id = ?", (interaction.user.id,)) as cursor:
                player = await cursor.fetchone()
            
            if not player:
                return await interaction.followup.send("❌ You don't have a character yet! Use `/create_character` to get started.", ephemeral=True)
            
            # Get inventory items
            async with self.bot.db.execute("""
                SELECT i.item_id, i.quantity, i.is_equipped, s.name, s.type, s.rarity, s.description 
                FROM rpg_inventory i
                JOIN rpg_seasonal_items s ON i.item_id = s.item_id
                WHERE i.user_id = ?
                ORDER BY s.rarity DESC, s.name
            """, (interaction.user.id,)) as cursor:
                inventory_items = await cursor.fetchall()
            
            embed = discord.Embed(
                title=f"🎒 {player[1]}'s RPG Inventory",
                color=0x1DB954
            )
            embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
            
            if not inventory_items:
                embed.description = "Your inventory is empty. Go on adventures to find items!"
            else:
                equipped_items = []
                unequipped_items = []
                
                for item_id, quantity, is_equipped, name, item_type, rarity, description in inventory_items:
                    rarity_emoji = {"common": "⚪", "uncommon": "🟢", "rare": "🔵", "epic": "🟣", "legendary": "🟡"}.get(rarity, "⚪")
                    equipped_text = " **[EQUIPPED]**" if is_equipped else ""
                    item_text = f"{rarity_emoji} **{name}** ({item_type}) x{quantity}{equipped_text}"
                    
                    if is_equipped:
                        equipped_items.append(item_text)
                    else:
                        unequipped_items.append(item_text)
                
                if equipped_items:
                    embed.add_field(name="⚔️ Equipped Items", value="\n".join(equipped_items), inline=False)
                if unequipped_items:
                    embed.add_field(name="📦 Items", value="\n".join(unequipped_items), inline=False)
        
        else:
            # Economy Inventory functionality (original)
            async with self.bot.db.execute("SELECT item_id, quantity FROM player_items WHERE user_id = ?", (interaction.user.id,)) as cursor:
                items = await cursor.fetchall()
            if not items:
                return await interaction.followup.send("Your inventory is empty.", ephemeral=True)
            
            description = ""
            for item_id, quantity in items:
                item_data = next((item for cat in self.bot.shop_items.values() for item in cat if item['id'] == item_id), None)
                if item_data:
                    description += f"{item_data.get('emoji', '📦')} **{item_data['name']}** `(x{quantity})`\n"
            
            embed = discord.Embed(
                title=f"🎒 {interaction.user.display_name}'s Economy Inventory", 
                description=f"📦 **Inventory for {interaction.user.mention}**\n\n{description or '`No items found in inventory`'}",
                color=0x57F287
            )
            embed.set_thumbnail(url=interaction.user.display_avatar.url)
        
        await interaction.followup.send(embed=embed, ephemeral=True)

    @app_commands.command(name="shop", description="Access the shop to purchase items and upgrades.")
    @app_commands.describe(shop_type="Choose between economy items or RPG seasonal items")
    @app_commands.choices(shop_type=[
        app_commands.Choice(name="Economy Items", value="economy"),
        app_commands.Choice(name="RPG Seasonal Items", value="rpg")
    ])
    async def shop(self, interaction: discord.Interaction, shop_type: str = "economy"):
        await interaction.response.defer(ephemeral=True)
        
        try:
            if shop_type == "rpg":
                # RPG Shop functionality
                # Get current shop items
                async with self.bot.db.execute("""
                    SELECT s.item_id, s.price, s.stock, i.name, i.description, i.rarity, i.type
                    FROM rpg_shop s
                    JOIN rpg_seasonal_items i ON s.item_id = i.item_id
                    ORDER BY i.rarity, s.price
                """) as cursor:
                    shop_items = await cursor.fetchall()
                
                if not shop_items:
                    return await interaction.followup.send("🏪 The RPG shop is currently restocking. Check back later!")
                
                embed = discord.Embed(
                    title="🏪 RPG Item Shop",
                    description="Welcome to the Crystal Spire Emporium!",
                    color=0x1DB954
                )
                
                for item_id, price, stock, name, description, rarity, item_type in shop_items[:10]:  # Show first 10 items
                    rarity_emoji = {"common": "⚪", "uncommon": "🟢", "rare": "🔵", "epic": "🟣", "legendary": "🟡"}.get(rarity, "⚪")
                    embed.add_field(
                        name=f"{rarity_emoji} {name} ({item_type})",
                        value=f"{description}\n💰 **{price}** gold | 📦 **{stock}** in stock",
                        inline=False
                    )
                
                if len(shop_items) > 10:
                    embed.set_footer(text=f"Showing 10 of {len(shop_items)} items available")
                
                await interaction.followup.send(embed=embed)
            
            else:
                # Economy Shop functionality (original)
                player = await self.get_player(interaction.user.id)
                
                # Check if shop items exist and are populated
                total_items = sum(len(category) for category in self.bot.shop_items.values())
                if total_items == 0:
                    # Force refresh shop if empty
                    self.bot.add_log("Shop empty, forcing refresh...")
                    await self.refresh_shop_items()
                    total_items = sum(len(category) for category in self.bot.shop_items.values())
                    
                    if total_items == 0:
                        return await interaction.followup.send("The shop is currently restocking. Please try again in a moment.", ephemeral=True)
                
                view = ShopView(self.bot, interaction.user, player[1])
                await interaction.followup.send(embed=view.build_embed(), view=view, ephemeral=True)
            
        except Exception as e:
            self.bot.add_error(f"Shop command error: {e}")
            await interaction.followup.send("There was an error accessing the shop. Please try again.", ephemeral=True)

    @app_commands.command(name="refreshshop", description="Manually refresh the shop inventory.")
    async def refresh_shop_command(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        try:
            await self.refresh_shop_items()
            total_items = sum(len(category) for category in self.bot.shop_items.values())
            await interaction.followup.send(f"✅ Shop refreshed! Generated {total_items} new items.", ephemeral=True)
        except Exception as e:
            self.bot.add_error(f"Manual shop refresh error: {e}")
            await interaction.followup.send("❌ Failed to refresh shop. Please try again.", ephemeral=True)

    @app_commands.command(name="leaderboard", description="Shows the leaderboard for economy or achievements.")
    @app_commands.describe(leaderboard_type="Choose between economy leaderboard or achievement leaderboard")
    @app_commands.choices(leaderboard_type=[
        app_commands.Choice(name="Economy (Level/XP)", value="economy"),
        app_commands.Choice(name="Achievements", value="achievements")
    ])
    async def leaderboard(self, interaction: discord.Interaction, leaderboard_type: str = "economy"):
        await interaction.response.defer()
        
        if leaderboard_type == "achievements":
            # Achievement leaderboard
            cursor = await self.bot.db.execute("""
                SELECT user_id, COUNT(*) as achievement_count,
                       SUM(fragments_reward) as total_fragments,
                       COUNT(CASE WHEN rarity = 'MYTHIC' THEN 1 END) as mythic_count,
                       COUNT(CASE WHEN rarity = 'LEGENDARY' THEN 1 END) as legendary_count
                FROM achievements 
                GROUP BY user_id 
                ORDER BY achievement_count DESC, total_fragments DESC 
                LIMIT 10
            """)
            leaderboard_data = await cursor.fetchall()
            
            embed = discord.Embed(
                title=f"🏆 Achievement Leaderboard",
                description="```ansi\n[2;33m> TOP ACHIEVERS IN OPURE'S DIGITAL REALM\n[2;36m> RANKED BY ACHIEVEMENTS UNLOCKED[0m\n```",
                color=0xf39c12,
                timestamp=datetime.datetime.now()
            )
            
            if not leaderboard_data:
                embed.add_field(
                    name="📊 No Data Available",
                    value="No achievements have been unlocked yet!\nStart exploring and unlock your first achievement!",
                    inline=False
                )
            else:
                leaderboard_text = ""
                for i, (user_id, count, fragments, mythic, legendary) in enumerate(leaderboard_data):
                    user = interaction.guild.get_member(user_id)
                    if not user:
                        continue
                    
                    rank_medals = {1: "🥇", 2: "🥈", 3: "🥉"}
                    rank_medal = rank_medals.get(i + 1, f"{i + 1}.")
                    
                    special_badges = ""
                    if mythic > 0:
                        special_badges += f"⭐{mythic} "
                    if legendary > 0:
                        special_badges += f"🔥{legendary} "
                    
                    leaderboard_text += f"`{rank_medal}` **{user.display_name}** - {count} achievements\n"
                    leaderboard_text += f"   💎 {fragments or 0} fragments {special_badges}\n\n"
                
                embed.add_field(
                    name="🎯 Top Achievers",
                    value=leaderboard_text,
                    inline=False
                )
            
            embed.set_footer(text="🏆 Keep exploring to climb the leaderboard!")
        
        else:
            # Economy leaderboard (original)
            async with self.bot.db.execute("SELECT user_id, level, xp FROM players ORDER BY level DESC, xp DESC LIMIT 10") as cursor:
                top_players = await cursor.fetchall()
                
            if not top_players:
                return await interaction.followup.send("There are no players on the leaderboard yet.")
                
            embed = discord.Embed(
                title=f"{LEADER_EMOJI} Opure.exe's Economy Leaderboard", 
                color=0xFEE75C,
                description=f"🏆 **Top players by level and XP**"
            )
            embed.set_author(name=f"Requested by {interaction.user.display_name}", icon_url=interaction.user.display_avatar.url)
            
            description = ""
            for i, (user_id, level, xp) in enumerate(top_players):
                rank = i + 1
                user = interaction.guild.get_member(user_id)
                user_display = user.display_name if user else f"User ID: {user_id}"
                rank_emoji = ""
                if rank == 1: rank_emoji = "🥇"
                elif rank == 2: rank_emoji = "🥈"
                elif rank == 3: rank_emoji = "🥉"
                else: rank_emoji = f"`{rank}`"

                description += f"{rank_emoji} **{user_display}** - {LEVEL_EMOJI} Level `{level}` ({XP_EMOJI} `{xp}` XP)\n"
                
            embed.description = description
        
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="level", description="Check your level progress and see how much XP you need to level up.")
    async def level(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        player = await self.get_player(interaction.user.id)
        
        current_level = player[7]
        current_xp = player[8]
        xp_in_level = current_xp % 100
        xp_needed = 100 - xp_in_level
        next_level = current_level + 1
        
        # XP Progress bar
        progress_bar = self.create_xp_bar(xp_in_level, 100)
        
        embed = discord.Embed(
            title=f"⚡ {interaction.user.display_name}'s Level Progress",
            description=f"🎯 **Player:** {interaction.user.mention}",
            color=0xFEE75C
        )
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        
        embed.add_field(
            name="📊 Current Status",
            value=f"{LEVEL_EMOJI} **Level:** `{current_level}`\n{XP_EMOJI} **Total XP:** `{current_xp}`\n📈 **Progress:** `{xp_in_level}/100` XP",
            inline=True
        )
        embed.add_field(
            name="🎯 Next Level",
            value=f"{LEVEL_EMOJI} **Target:** Level `{next_level}`\n⏰ **XP Needed:** `{xp_needed}` more\n🚀 **Progress:** {progress_bar}",
            inline=True
        )
        
        # Calculate how many missions needed (assuming 20-40 XP per mission)
        missions_needed = max(1, xp_needed // 30)
        embed.add_field(
            name="🎮 Level Up Tips",
            value=f"🎯 Complete ~`{missions_needed}` missions\n💾 Use `/extract` for bonus XP\n🎵 Play `/opure` missions",
            inline=False
        )
        
        embed.set_footer(text="🤖 Keep grinding to unlock new abilities!", icon_url=self.bot.user.display_avatar.url)
        await interaction.followup.send(embed=embed, ephemeral=True)

    def create_xp_bar(self, current: int, maximum: int, length: int = 20) -> str:
        """Create XP progress bar."""
        percentage = min(1.0, max(0.0, current / maximum))
        filled_length = int(length * percentage)
        empty_length = length - filled_length
        
        bar = "🟨" * filled_length + "⬛" * empty_length
        return f"`{bar}` {current}/{maximum}"

    async def check_level_up(self, user_id: int, old_xp: int, new_xp: int) -> bool:
        """Check if user leveled up and handle level-up rewards."""
        old_level = old_xp // 100 + 1
        new_level = new_xp // 100 + 1
        
        if new_level > old_level:
            # Level up rewards
            fragments_bonus = new_level * 50  # 50 fragments per level
            await self.bot.db.execute(
                "UPDATE players SET level = ?, fragments = fragments + ? WHERE user_id = ?",
                (new_level, fragments_bonus, user_id)
            )
            await self.bot.db.commit()
            
            # Send level up message using new embed system
            user = self.bot.get_user(user_id)
            if user:
                # Create beautiful level-up embed data
                embed_data = {
                    "title": "🎉 Fragment Core Upgrade",
                    "description": f"```ansi\n[2;33m> USER: {user.display_name}\n[2;32m> LEVEL ACHIEVED: {new_level}\n[2;36m> FRAGMENTS EARNED: {fragments_bonus}[0m\n```",
                    "color": 0xFEE75C,
                    "fields": [
                        {
                            "name": "🚀 Progression Status",
                            "value": f"```yaml\nPrevious: Level {new_level-1}\nCurrent: Level {new_level}\nNext Goal: Level {new_level+1}\n```",
                            "inline": True
                        },
                        {
                            "name": "💎 Rewards Granted",
                            "value": f"```yaml\nFragments: +{fragments_bonus}\nBonus Rate: {min(new_level * 10, 200)}%\nAccess: Enhanced\n```",
                            "inline": True
                        },
                        {
                            "name": "🎮 Achievement Unlocked",
                            "value": f"**{user.mention}** has ascended to **Level {new_level}**!\nDigital evolution continues...",
                            "inline": False
                        }
                    ],
                    "footer": f"Opure Economy • Level System • {user.display_name}"
                }
                
                # Post to economy channels
                await self.bot.post_to_opure_channels(embed_data, "economy")
                self.bot.add_log(f"💎 Posted level-up for {user.display_name} → Level {new_level}")
            
            return True
        return False

    async def generate_shop_items(self):
        """Generate shop items using Mistral AI for all categories."""
        categories = ["Consumables", "Upgrades", "Artifacts", "Tools"]
        self.bot.shop_items = {}
        
        for category in categories:
            try:
                prompt = f"""
                Generate exactly 5 cyberpunk-themed shop items for the category "{category}".
                
                **Category Guidelines:**
                - Consumables: Health potions, energy drinks, temporary buffs, data packets
                - Upgrades: Permanent stat boosts, skill enhancements, system improvements  
                - Artifacts: Rare collectible items, unique gear, mysterious objects
                - Tools: Utility items, hacking devices, exploration equipment
                
                **Return format (JSON array):**
                [
                    {{
                        "id": "unique_id_1",
                        "name": "Item Name",
                        "description": "Brief cyberpunk description (1-2 sentences)",
                        "price": 150,
                        "emoji": "💊"
                    }},
                    ...
                ]
                
                **Guidelines:**
                - Prices should range 50-500 fragments
                - Use appropriate cyberpunk emojis
                - Keep descriptions concise and thematic
                - Make items sound valuable and interesting
                
                Return ONLY the JSON array, no other text.
                """
                
                response = await self.bot.ollama_client.generate(model='mistral', prompt=prompt)
                items_text = response['response'].strip()
                
                # Try to parse JSON
                try:
                    items = json.loads(items_text)
                    if isinstance(items, list) and len(items) > 0:
                        self.bot.shop_items[category] = items
                    else:
                        # Fallback items if parsing fails
                        self.bot.shop_items[category] = self.get_fallback_items(category)
                except json.JSONDecodeError:
                    self.bot.add_error(f"Failed to parse shop items JSON for {category}: {items_text}")
                    self.bot.shop_items[category] = self.get_fallback_items(category)
                    
            except Exception as e:
                self.bot.add_error(f"Error generating {category} items: {e}")
                self.bot.shop_items[category] = self.get_fallback_items(category)
        
        self.bot.add_log(f"✅ Generated shop items for {len(self.bot.shop_items)} categories")

    def get_fallback_items(self, category: str) -> list:
        """Provide fallback items if AI generation fails."""
        fallback_items = {
            "Consumables": [
                {"id": "neural_stim", "name": "Neural Stimulant", "description": "Boosts cognitive function temporarily.", "price": 75, "emoji": "💊"},
                {"id": "data_fragment", "name": "Data Fragment", "description": "Raw digital currency.", "price": 50, "emoji": "💾"},
                {"id": "energy_cell", "name": "Energy Cell", "description": "Restores system power.", "price": 100, "emoji": "🔋"},
                {"id": "cipher_key", "name": "Cipher Key", "description": "Unlocks encrypted data.", "price": 150, "emoji": "🔑"},
                {"id": "nano_repair", "name": "Nano Repair Kit", "description": "Self-repairing nanobots.", "price": 200, "emoji": "🔧"}
            ],
            "Upgrades": [
                {"id": "mem_boost", "name": "Memory Boost", "description": "Permanently increases data storage.", "price": 300, "emoji": "🧠"},
                {"id": "speed_chip", "name": "Speed Chip", "description": "Enhances processing speed.", "price": 250, "emoji": "⚡"},
                {"id": "firewall_pro", "name": "Firewall Pro", "description": "Advanced security protocols.", "price": 400, "emoji": "🛡️"},
                {"id": "quantum_core", "name": "Quantum Core", "description": "Next-gen processing unit.", "price": 500, "emoji": "💎"},
                {"id": "neural_link", "name": "Neural Link", "description": "Direct brain-computer interface.", "price": 350, "emoji": "🔗"}
            ],
            "Artifacts": [
                {"id": "ghost_protocol", "name": "Ghost Protocol", "description": "Legendary stealth algorithm.", "price": 450, "emoji": "👻"},
                {"id": "zero_day", "name": "Zero Day Exploit", "description": "Rare vulnerability data.", "price": 500, "emoji": "💀"},
                {"id": "ai_fragment", "name": "AI Fragment", "description": "Piece of sentient code.", "price": 350, "emoji": "🤖"},
                {"id": "data_crystal", "name": "Data Crystal", "description": "Crystallized information.", "price": 300, "emoji": "💎"},
                {"id": "void_key", "name": "Void Key", "description": "Opens impossible locks.", "price": 400, "emoji": "🔮"}
            ],
            "Tools": [
                {"id": "scanner", "name": "Digital Scanner", "description": "Reveals hidden data patterns.", "price": 175, "emoji": "📡"},
                {"id": "probe", "name": "System Probe", "description": "Deep system analysis tool.", "price": 200, "emoji": "🔍"},
                {"id": "bypass", "name": "Security Bypass", "description": "Circumvents basic security.", "price": 225, "emoji": "🔓"},
                {"id": "tracer", "name": "Data Tracer", "description": "Tracks information flows.", "price": 150, "emoji": "📊"},
                {"id": "jammer", "name": "Signal Jammer", "description": "Disrupts enemy communications.", "price": 250, "emoji": "📴"}
            ]
        }
        return fallback_items.get(category, [])

async def setup(bot: commands.Bot):
    GUILD_ID_STR = os.getenv("GUILD_ID", "")
    cog = EconomyCog(bot)
    
    # Initialize shop items with fallback data first
    if not hasattr(bot, 'shop_items'):
        bot.shop_items = {}
        categories = ["Consumables", "Upgrades", "Artifacts", "Tools"]
        for category in categories:
            bot.shop_items[category] = cog.get_fallback_items(category)
    
    if not GUILD_ID_STR:
        bot.add_log("WARNING: GUILD_ID not found in .env. EconomyCog will be loaded globally.")
        await bot.add_cog(cog)
    else:
        GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
        await bot.add_cog(cog, guilds=[discord.Object(id=gid) for gid in GUILD_IDS])
        bot.add_log(f"Cog 'EconomyCog' loaded for Guild IDs: {GUILD_IDS}")
    
    # Start the shop refresh task after cog is loaded
    try:
        cog.refresh_shop_task.start()
        bot.add_log("🛒 Shop refresh task started")
    except RuntimeError as e:
        if "already started" in str(e).lower():
            bot.add_log("🛒 Shop refresh task already running")
        else:
            bot.add_error(f"Failed to start shop refresh task: {e}")