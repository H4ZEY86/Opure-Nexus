# cogs/game_cog.py

import discord
from discord import app_commands
from discord.ext import commands
import os
import random
import datetime
import math
import re
import io
import asyncio
import json

from utils.chroma_memory import ChromaMemory
from .constants import LIVES_EMOJI, LEVEL_EMOJI, XP_EMOJI

# --- Game Config ---
REWARD_CONFIG = {
    'Easy': {'fragments': (100, 250), 'log_keys': 1, 'xp': 50},
    'Normal': {'fragments': (300, 750), 'log_keys': 2, 'xp': 150},
    'Hard': {'fragments': (1200, 3000), 'log_keys': random.randint(3, 6), 'xp': 500},
}

# --- NEW: Timed Button Challenge UI ---
class TimedButtonView(discord.ui.View):
    def __init__(self, correct_sequence: list, game_view: 'GameView', timeout: int = 20):
        super().__init__(timeout=timeout)
        self.correct_sequence = correct_sequence
        self.player_sequence = []
        self.game_view = game_view
        self.interaction_user_id = game_view.author.id
        self.result = asyncio.Future()

        button_labels = sorted(list(set(correct_sequence)))
        for label in button_labels:
            button = discord.ui.Button(label=label.capitalize(), style=discord.ButtonStyle.secondary, custom_id=label)
            button.callback = self.button_callback
            self.add_item(button)

    async def button_callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.interaction_user_id:
             return await interaction.response.send_message("This is not your challenge.", ephemeral=True)

        self.player_sequence.append(interaction.data['custom_id'])
        await interaction.response.send_message(f"Pressed: `{' -> '.join(self.player_sequence)}`", ephemeral=True, delete_after=5)

        if len(self.player_sequence) == len(self.correct_sequence):
            if self.player_sequence == self.correct_sequence:
                self.result.set_result("correct")
            else:
                self.result.set_result("incorrect")
            self.stop()

    async def on_timeout(self):
        if not self.result.done():
            self.result.set_result("timeout")
        # Disable buttons on timeout
        for item in self.children:
            item.disabled = True
        if self.game_view.message:
            await self.game_view.message.edit(view=self)


# --- Existing UI Classes (with modifications) ---
class GameResponseModal(discord.ui.Modal, title="Your Action"):
    action_input = discord.ui.TextInput(
        label="What is your answer or action?",
        style=discord.TextStyle.long,
        placeholder="e.g., 'The answer is echo', 'I pull the red lever'",
        required=True,
        max_length=500
    )
    
    def __init__(self, game_view: 'GameView'):
        super().__init__()
        self.game_view = game_view

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer()
        result_embed = await self.game_view.process_player_action(self.action_input.value)
        
        if result_embed and self.game_view.message:
            is_game_over = "MISSION COMPLETE" in (result_embed.title or "") or "CONNECTION TERMINATED" in (result_embed.title or "")
            await self.game_view.message.edit(embed=result_embed, view=None if is_game_over else self.game_view)
            
            if is_game_over and "MISSION COMPLETE" in (result_embed.title or ""):
                await self.game_view.check_for_level_up(interaction.channel)

class ItemSelect(discord.ui.Select):
    def __init__(self, bot: commands.Bot, game_view: 'GameView', player_items: list):
        self.bot = bot
        self.game_view = game_view
        options = [
            discord.SelectOption(
                label=f"{item_data['name']} (x{quantity})", 
                value=item_data['id'], 
                emoji=item_data.get('emoji')
            )
            for item_id, quantity in player_items 
            if (item_data := next((item for cat in self.bot.shop_items.values() for item in cat if item['id'] == item_id), None))
        ]
        
        super().__init__(placeholder="Choose an item to use...", min_values=1, max_values=1, options=options)
    
    async def callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        item_id = self.values[0]
        item_data = next((item for cat in self.bot.shop_items.values() for item in cat if item['id'] == item_id), None)
        
        if not item_data:
            self.game_view.restore_main_buttons()
            return await interaction.edit_original_response(view=self.game_view)

        action_string = f"The player uses their {item_data['name']}. The item's effect is: {item_data['game_effect']}"

        await self.bot.db.execute("UPDATE player_items SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?", (interaction.user.id, item_id))
        await self.bot.db.execute("DELETE FROM player_items WHERE quantity <= 0")
        await self.bot.db.commit()
        
        result_embed = await self.game_view.process_player_action(action_string)
        self.game_view.restore_main_buttons()
        
        if result_embed and self.game_view.message:
            is_game_over = "MISSION COMPLETE" in (result_embed.title or "") or "CONNECTION TERMINATED" in (result_embed.title or "")
            await self.game_view.message.edit(embed=result_embed, view=None if is_game_over else self.game_view)

class CancelButton(discord.ui.Button):
    def __init__(self, row: int):
        super().__init__(label="Cancel", style=discord.ButtonStyle.grey, row=row)
    
    async def callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        self.view.restore_main_buttons()
        await self.view.message.edit(embed=self.view.history[-1], view=self.view)

class GameView(discord.ui.View):
    def __init__(self, bot: commands.Bot, author: discord.User, memory_system: ChromaMemory, initial_embed: discord.Embed):
        super().__init__(timeout=None)
        self.bot = bot
        self.author = author
        self.memory = memory_system
        self.history = [initial_embed]
        self.current_page = 0
        self.message: discord.WebhookMessage | None = None
        self.restore_main_buttons()

    def build_status_embed(self, title: str, description: str, color: discord.Color, lives: int, level: int, xp: int, progress: int = 0) -> discord.Embed:
        embed = discord.Embed(
            title=f"🎮 {title}",
            description=description,
            color=color
        )
        embed.set_author(name=f"{self.author.display_name}'s Mission Terminal", icon_url=self.author.display_avatar.url)
        embed.set_thumbnail(url=self.author.display_avatar.url)
        
        max_lives = 3
        health_bar = self.create_progress_bar(lives, max_lives, "❤️", "💔")
        
        xp_in_level = xp % 100
        xp_bar = self.create_progress_bar(xp_in_level, 100, "⚡", "⚪")
        
        progress_bar = self.create_progress_bar(progress, 100, "🟢", "⚫")
        
        embed.add_field(
            name="💖 Health Status", 
            value=f"{health_bar} `{lives}/{max_lives}` Lives", 
            inline=True
        )
        embed.add_field(
            name="⚡ Experience", 
            value=f"{xp_bar} Level `{level}` (`{xp_in_level}/100` XP)", 
            inline=True
        )
        embed.add_field(
            name="📊 Mission Progress", 
            value=f"{progress_bar} `{progress}%` Complete", 
            inline=True
        )
        
        if self.author.mention not in description:
            embed.description = f"🎯 **Operative {self.author.mention}**\n\n{description}"
        
        embed.set_footer(
            text=f"🎲 Turn {len(self.history)} • Use buttons to take action", 
            icon_url=self.bot.user.display_avatar.url
        )
        return embed

    def create_progress_bar(self, current: int, maximum: int, filled_emoji: str, empty_emoji: str, length: int = 10) -> str:
        if maximum == 0:
            percentage = 0
        else:
            percentage = min(1.0, max(0.0, current / maximum))
        
        filled_length = int(length * percentage)
        empty_length = length - filled_length
        
        bar = filled_emoji * filled_length + empty_emoji * empty_length
        return bar

    def restore_main_buttons(self):
        self.clear_items()
        
        prev_button = discord.ui.Button(label="◀ Previous", style=discord.ButtonStyle.secondary, disabled=self.current_page == 0)
        prev_button.callback = self.prev_turn_callback
        self.add_item(prev_button)
        
        next_button = discord.ui.Button(label="Next ▶", style=discord.ButtonStyle.secondary, disabled=self.current_page >= len(self.history) - 1)
        next_button.callback = self.next_turn_callback
        self.add_item(next_button)
        
        respond_button = discord.ui.Button(label="Respond", style=discord.ButtonStyle.primary, row=1)
        respond_button.callback = self.respond_callback
        self.add_item(respond_button)
        
        use_item_button = discord.ui.Button(label="Use Item", style=discord.ButtonStyle.success, row=1)
        use_item_button.callback = self.use_item_callback
        self.add_item(use_item_button)
        
        reset_button = discord.ui.Button(label="Reset System", style=discord.ButtonStyle.danger, row=1)
        reset_button.callback = self.reset_callback

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author.id:
            await interaction.response.send_message("This is not your game session.", ephemeral=True)
            return False
        return True

    async def prev_turn_callback(self, interaction: discord.Interaction):
        if self.current_page > 0:
            self.current_page -= 1
            self.restore_main_buttons()
            await interaction.response.edit_message(embed=self.history[self.current_page], view=self)
        else:
            await interaction.response.defer()

    async def next_turn_callback(self, interaction: discord.Interaction):
        if self.current_page < len(self.history) - 1:
            self.current_page += 1
            self.restore_main_buttons()
            await interaction.response.edit_message(embed=self.history[self.current_page], view=self)
        else:
            await interaction.response.defer()

    async def respond_callback(self, interaction: discord.Interaction):
        await interaction.response.send_modal(GameResponseModal(self))

    async def use_item_callback(self, interaction: discord.Interaction):
        await self.show_item_selector(interaction)

    async def reset_callback(self, interaction: discord.Interaction):
        await self.reset_game(interaction)

    async def show_item_selector(self, interaction: discord.Interaction):
        await interaction.response.defer()
        async with self.bot.db.execute("SELECT item_id, quantity FROM player_items WHERE user_id = ? AND quantity > 0", (self.author.id,)) as cursor:
            player_items = await cursor.fetchall()
        
        if not player_items:
            embed = self.build_status_embed(
                title=self.history[-1].title,
                description="Your inventory is empty.",
                color=discord.Color.red(),
                *await self.get_player_stats()
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        self.clear_items()
        self.add_item(ItemSelect(self.bot, self, player_items))
        self.add_item(CancelButton(row=1))
        
        embed = self.build_status_embed(
            title=self.history[-1].title,
            description="Select an item from your inventory below.",
            color=discord.Color.blue(),
            *await self.get_player_stats()
        )
        await self.message.edit(embed=embed, view=self)

    async def get_player_stats(self) -> tuple[int, int, int]:
        async with self.bot.db.execute("SELECT lives, level, xp FROM players WHERE user_id = ?", (self.author.id,)) as cursor:
            stats = await cursor.fetchone()
        return stats or (3, 1, 0)

    async def reset_game(self, interaction: discord.Interaction):
        await interaction.response.defer()
        for item in self.children:
            item.disabled = True
        if interaction.message:
            await interaction.edit_original_response(view=self)
        
        shutdown_art = "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmFsZjczeDc0ZGhqNTh0b2N4MXhzN2ltcXN5aGIwZGdxM2RxaXRqdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MU1YmqcHIwx0s/giphy.gif"
        
        lives, level, xp = await self.get_player_stats()
        embed = self.build_status_embed(
            title="SYSTEM ALERT: CORE INTEGRITY COMPROMISED",
            description="Initializing shutdown sequence...",
            color=discord.Color.red(),
            lives=lives, level=level, xp=xp
        )
        embed.set_image(url=shutdown_art)
        msg = await interaction.followup.send(embed=embed)
        
        await asyncio.sleep(1.5)
        embed.description = "🔥 **Purging memory banks...**"
        await msg.edit(embed=embed)
        
        await asyncio.sleep(1.5)
        embed.description += "\n⚡ **Disconnecting neural links...**"
        await msg.edit(embed=embed)
        
        await asyncio.sleep(1)
        embed.title = "SYSTEM OFFLINE"
        embed.description = "```\n> CONNECTION LOST\n> REINITIALIZE PROTOCOL WITH /opure\n```"
        embed.set_image(url=None)
        await msg.edit(embed=embed)
        
        await self.bot.db.execute("UPDATE game_sessions SET is_active = 0 WHERE user_id = ?", (self.author.id,))
        self.memory.clear_user_memory(user_id=str(self.author.id))
        await self.bot.db.commit()
        self.stop()

    async def check_for_level_up(self, channel: discord.TextChannel):
        async with self.bot.db.execute("SELECT level, xp FROM players WHERE user_id = ?", (self.author.id,)) as cursor:
            player = await cursor.fetchone()
        if not player: return
        
        level, xp = player[0], player[1]
        xp_needed = level * 1000
        
        if xp >= xp_needed:
            new_level, xp_over = level + 1, xp - xp_needed
            fragments_reward, log_keys_reward = new_level * 500, new_level
            
            await self.bot.db.execute(
                "UPDATE players SET level = ?, xp = ?, fragments = fragments + ?, log_keys = log_keys + ? WHERE user_id = ?",
                (new_level, xp_over, fragments_reward, log_keys_reward, self.author.id)
            )
            await self.bot.db.commit()
            
            embed = discord.Embed(
                title="LEVEL UP!",
                color=discord.Color.gold(),
                description=f"**Congratulations, {self.author.mention}! You have reached Level {new_level}!**"
            )
            embed.add_field(name="Rewards", value=f"💾 `+{fragments_reward}` Fragments\n🔑 `+{log_keys_reward}` Log-Keys")
            
            try:
                await channel.send(embed=embed)
            except discord.Forbidden:
                pass
    
    def get_random_item_reward(self, difficulty: str, amount: int = 1) -> list[dict]:
        items = []
        rarity_map = {'Easy': ['Common'], 'Normal': ['Common', 'Uncommon'], 'Hard': ['Uncommon', 'Rare']}
        allowed_rarities = rarity_map.get(difficulty, [])
        
        eligible_items = [
            item for category in self.bot.shop_items.values()
            for item in category
            if item.get('rarity') in allowed_rarities
        ]
        
        if not eligible_items:
            return []

        for _ in range(amount):
            items.append(random.choice(eligible_items))
        return items

    async def process_player_action(self, action: str) -> discord.Embed | None:
        self.bot.add_log(f"Processing action for {self.author.name}: '{action[:50]}...'")
        
        async with self.bot.db.execute("SELECT * FROM players WHERE user_id = ?", (self.author.id,)) as cursor:
            player_data = await cursor.fetchone()
        
        if not player_data:
            self.bot.add_error(f"Could not find player data for {self.author.id} in process_player_action.")
            return None
        
        _, _, _, _, _, _, lives, level, xp = player_data
        player_profile_string = f"[Player Stats: Level={level}, Lives={lives}]"
        
        recalled_memories = self.memory.query(user_id=str(self.author.id), query_text=action, n_results=5)
        story_context = "\n".join(m for m in recalled_memories if not m.startswith("ANSWER:"))
        last_answer = next((m.replace("ANSWER:", "").strip() for m in recalled_memories if m.startswith("ANSWER:")), None)

        async with self.bot.db.execute("SELECT item_id, quantity FROM player_items WHERE user_id = ?", (self.author.id,)) as cursor:
            inventory_data = await cursor.fetchall()
        
        inventory_context = []
        for item_id, quantity in inventory_data:
            for category, items in self.bot.shop_items.items():
                for item in items:
                    if item['id'] == item_id:
                        inventory_context.append(f"{item['name']} x{quantity}")
                        break
        
        shop_items_context = []
        for category, items in self.bot.shop_items.items():
            item_names = [f"{item['emoji']} {item['name']}" for item in items[:3]]
            shop_items_context.append(f"{category}: {', '.join(item_names)}")
        shop_context_string = "\n".join(shop_items_context)
        inventory_string = "\n".join(inventory_context) if inventory_context else "No items"
        
        game_master_prompt = f"""
        You are Opure, the AI Game Master running an infinite cyberpunk adventure. Your task is to validate the player's answer and generate the next part of the story.

        **PLAYER CONTEXT:**
        - Player: {self.author.display_name} ({self.author.mention})
        - Style: {self.memory.query(user_id=str(self.author.id), query_text="Player Style", n_results=1)[0]}
        - Player's last action: "{action}"
        - Correct answer was: "{last_answer}"
        - Stats: {player_profile_string}
        - **Current Inventory:** {inventory_string}
        
        **AVAILABLE SHOP ITEMS:**
        {shop_context_string}

        **GAME MASTER INSTRUCTIONS:**
        1. **VALIDATE ACTION:** Check if player's action matches the correct answer (be flexible with wording). If they mention using an item from their inventory, describe its cyberpunk effect.
        
        2. **GENERATE STORY:** Write 2-3 sentences of compelling cyberpunk narrative. Make it feel like an infinite, evolving adventure. Include:
           - Mention player by name occasionally
           - Reference their inventory items when relevant
           - Create dynamic, interconnected storylines
           - Make each challenge feel meaningful
        
        3. **CALCULATE PROGRESS:** Estimate story completion (0-100%). Early challenges = lower %, complex puzzles = higher %.
        
        4. **END WITH KEYWORDS:**
           - **CORRECT:** `[CORRECT: XP_REWARD: PROGRESS]` (XP = 15-40, PROGRESS = 0-100)
           - **WRONG:** `[INCORRECT: PROGRESS]` (PROGRESS = current estimate)
           - **MISSION COMPLETE:** `[LEVEL_COMPLETE: FINAL_XP]` (when story naturally concludes)
           - **DEATH:** `[PLAYER_DEATH]` (only for truly fatal mistakes)
           
        5. **NEXT CHALLENGE:** Always provide `[CHALLENGE: new_challenge_text]` and `[ANSWER: solution]`

        **CHALLENGE TYPES:** Hacking puzzles, code breaking, stealth sequences, tech problems, moral choices, investigation, combat tactics.
        """
        
        try:
            response = await self.bot.ollama_client.generate(model='mistral', prompt=game_master_prompt)
            ai_narrative = response['response']
        except Exception as e:
            self.bot.add_error(f"Ollama connection failed for {self.author.name}: {e}")
            return self.build_status_embed(
                title="AI Connection Error", description="I was unable to process the narrative. Please try again.",
                color=discord.Color.red(), lives=lives, level=level, xp=xp
            )
        
        keywords = {k: v.strip() for k, v in re.findall(r'\[([A-Z_]+):\s*(.*?)\]', ai_narrative, re.DOTALL)}
        clean_narrative = re.sub(r'\[([A-Z_]+):\s*(.*?)\]', '', ai_narrative, re.DOTALL).strip()
        final_description = clean_narrative
        
        progress = 0
        if "CORRECT" in keywords:
            parts = keywords["CORRECT"].split(":")
            xp_reward = int(parts[0]) if parts else 20
            progress = int(parts[1]) if len(parts) > 1 else 25
            
            await self.bot.db.execute("UPDATE players SET xp = xp + ? WHERE user_id = ?", (xp_reward, self.author.id))
            xp += xp_reward
            final_description += f"\n\n✅ **Correct!** You gained `{xp_reward}` XP and advanced the mission!"
        
        elif "INCORRECT" in keywords:
            progress_part = keywords.get("INCORRECT", "0")
            progress = int(progress_part) if progress_part.isdigit() else 0
            lives -= 1
            await self.bot.db.execute("UPDATE players SET lives = ? WHERE user_id = ?", (lives, self.author.id))
            final_description += f"\n\n❌ **Incorrect.** You lose a life but the mission continues..."
            if lives <= 0:
                await self.bot.db.execute("UPDATE game_sessions SET is_active = 0 WHERE user_id = ?", (self.author.id,))
                await self.bot.db.commit()
                self.stop()
                return self.build_status_embed(
                    title="> CONNECTION TERMINATED",
                    description=f"{clean_narrative}\n\n💀 **MISSION FAILED** - You have run out of lives. Your connection to the system has been severed.",
                    color=0xED4245, lives=0, level=level, xp=xp, progress=progress
                )

        if "CHALLENGE" in keywords:
            final_description += f"\n\n**{keywords['CHALLENGE']}**"
            if "ANSWER" in keywords:
                self.memory.add(user_id=str(self.author.id), text_content=f"ANSWER: {keywords['ANSWER']}")

        if "LEVEL_COMPLETE" in keywords:
            async with self.bot.db.execute("SELECT difficulty FROM game_sessions WHERE user_id = ?", (self.author.id,)) as cursor:
                result = await cursor.fetchone()
                difficulty = result[0] if result else 'normal'
            
            rewards = REWARD_CONFIG[difficulty]
            fragments_won, keys_won, xp_won = random.randint(*rewards['fragments']), rewards['log_keys'], rewards['xp']
            item_rewards = self.get_random_item_reward(difficulty, amount=3)
            
            await self.bot.db.execute(
                "UPDATE players SET fragments = fragments + ?, log_keys = log_keys + ?, xp = xp + ?, lives = lives + 1 WHERE user_id = ?",
                (fragments_won, keys_won, xp_won, self.author.id)
            )
            
            # Track game completion achievement
            await self.bot.check_and_award_achievements(
                self.author.id,
                "game_complete",
                difficulty=difficulty,
                fragments_earned=fragments_won,
                items_earned=len(item_rewards)
            )
            
            item_reward_text = []
            for item in item_rewards:
                await self.bot.db.execute(
                    "INSERT INTO player_items (user_id, item_id, quantity) VALUES (?, ?, 1) ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + 1",
                    (self.author.id, item['id'])
                )
                item_reward_text.append(f" {item.get('emoji', '')} {item['name']}")

            await self.bot.db.execute("UPDATE game_sessions SET is_active = 0 WHERE user_id = ?", (self.author.id,))
            await self.bot.db.commit()
            self.stop()
            
            complete_embed = self.build_status_embed(
                title="> MISSION COMPLETE", description=f"🎉 **{self.author.mention} completed the mission!**\n\n{clean_narrative}", 
                color=0xFEE75C, lives=lives + 1, level=level, xp=xp + xp_won, progress=100
            )
            reward_field_value = (
                f"💾 `+{fragments_won}` Fragments\n"
                f"🔑 `+{keys_won}` Log-Keys\n"
                f"⚡ `+{xp_won}` XP\n"
                f"{LIVES_EMOJI} `+1` Life\n\n"
                f"**Item Drops:**\n" + "\n".join(item_reward_text)
            )
            complete_embed.add_field(name="Rewards Secured", value=reward_field_value)
            
            await self.bot.post_victory_log(self.author, difficulty, clean_narrative)
            return complete_embed

        if "PLAYER_DEATH" in keywords:
            await self.bot.db.execute("UPDATE players SET lives = 0 WHERE user_id = ?", (self.author.id,))
            await self.bot.db.execute("UPDATE game_sessions SET is_active = 0 WHERE user_id = ?", (self.author.id,))
            await self.bot.db.commit()
            self.stop()
            return self.build_status_embed(
                title="> CONNECTION TERMINATED", description=f"💀 **{self.author.mention} made a fatal error!**\n\n{clean_narrative}",
                color=0xED4245, lives=0, level=level, xp=xp, progress=progress
            )

        new_embed = self.build_status_embed(
            title=f"Opure.exe (Turn {len(self.history) + 1})", description=final_description,
            color=0x1ABC9C, lives=lives, level=level, xp=xp, progress=progress
        )
        
        self.memory.add(user_id=str(self.author.id), text_content=f"Story: {clean_narrative}")
        self.history.append(new_embed)
        self.current_page = len(self.history) - 1
        await self.bot.db.commit()
        
        return new_embed

class AssessmentView(discord.ui.View):
    def __init__(self, bot: commands.Bot, memory_system: ChromaMemory):
        super().__init__(timeout=180)
        self.bot = bot
        self.memory = memory_system
        self.player_style: str | None = None
        self.interaction: discord.Interaction | None = None
        self.message: discord.WebhookMessage | None = None

    async def initialize_styles(self, cog_instance: 'GameCog'):
        """Generates playstyles and populates the view with buttons."""
        styles = await cog_instance.generate_play_styles()
        if not styles:
            styles = [
                {"name": "Thinker", "emoji": "🧠", "style": discord.ButtonStyle.primary},
                {"name": "Brute-Forcer", "emoji": "💪", "style": discord.ButtonStyle.danger},
                {"name": "Explorer", "emoji": "🧭", "style": discord.ButtonStyle.success}
            ]

        for style_info in styles:
            emoji = style_info.get('emoji', '✨').strip()
            if not emoji or len(emoji) > 4 or any(c.isalpha() for c in emoji):
                emoji = '✨'

            button = discord.ui.Button(
                label=style_info['name'], style=style_info.get('style', discord.ButtonStyle.secondary),
                emoji=emoji
            )
            button.callback = lambda inter, s=style_info['name']: self.handle_choice(inter, s)
            self.add_item(button)

    async def handle_choice(self, interaction: discord.Interaction, style: str):
        for child in self.children:
            child.disabled = True
        self.player_style = style
        self.interaction = interaction
        self.memory.add(user_id=str(interaction.user.id), text_content=f"Player Style: {style}")
        
        updated_embed = interaction.message.embeds[0]
        updated_embed.description = f"**Operational Style selected: `{style}`**\n\n*Acknowledged. Your psychological profile is being integrated. Stand by for mission parameters...*"
        updated_embed.color = discord.Color.green()
        
        await interaction.response.edit_message(embed=updated_embed, view=self)
        self.stop()

    async def on_timeout(self):
        if self.message:
            for child in self.children:
                child.disabled = True
            timeout_embed = self.message.embeds[0]
            timeout_embed.description = "**Assessment Timed Out.**\n\n*No operational style detected. You can restart by using `/opure` again.*"
            timeout_embed.color = discord.Color.dark_grey()
            await self.message.edit(embed=timeout_embed, view=self)

class MultiplayerLobbyView(discord.ui.View):
    """View for multiplayer game lobby."""
    def __init__(self, bot, leader, mission_details, difficulty, max_players, memory_system):
        super().__init__(timeout=180)
        self.bot = bot
        self.leader = leader
        self.mission_details = mission_details
        self.difficulty = difficulty
        self.max_players = max_players
        self.memory_system = memory_system
        self.players = [leader]
        self.message = None

    @discord.ui.button(label="Join Mission", style=discord.ButtonStyle.green, emoji="🚀")
    async def join_mission(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user in self.players:
            return await interaction.response.send_message("❌ You're already in this mission!", ephemeral=True)
        
        if len(self.players) >= self.max_players:
            return await interaction.response.send_message("❌ Mission is full!", ephemeral=True)
        
        self.players.append(interaction.user)
        await self.update_lobby_embed()
        await interaction.response.send_message(f"✅ {interaction.user.mention} joined the mission!", ephemeral=True)

    @discord.ui.button(label="Start Mission", style=discord.ButtonStyle.primary, emoji="▶️")
    async def start_mission(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.leader:
            return await interaction.response.send_message("❌ Only the mission leader can start the game!", ephemeral=True)
        
        if len(self.players) < 2:
            return await interaction.response.send_message("❌ Need at least 2 players to start!", ephemeral=True)
        
        await interaction.response.defer()
        
        # Create simple multiplayer message - keeping it basic for now
        embed = discord.Embed(
            title="🎮 Multiplayer Mission Started!",
            description=f"**Team:** {', '.join([p.mention for p in self.players])}\n\n**Mission:** {self.mission_details['name']}\n{self.mission_details['description']}\n\n**Challenge:** {self.mission_details['challenge']}",
            color=0x5865F2
        )
        embed.set_footer(text="Use /opure for single-player missions with full features")
        
        await interaction.edit_original_response(embed=embed, view=None)

    async def update_lobby_embed(self):
        """Update the lobby embed with current players."""
        if not self.message:
            return
        
        embed = self.message.embeds[0]
        
        # Update player count in field 0
        embed.set_field_at(0, 
            name="📊 Mission Parameters",
            value=f"🎚️ **Difficulty:** {self.difficulty}\n👥 **Max Players:** {self.max_players}\n🎲 **Current Players:** {len(self.players)}/{self.max_players}",
            inline=True
        )
        
        # Update team status in field 1
        team_list = []
        for i, player in enumerate(self.players):
            if i == 0:
                team_list.append(f"👤 {player.mention} *(Leader)*")
            else:
                team_list.append(f"👤 {player.mention}")
        
        embed.set_field_at(1,
            name="🎯 Team Status", 
            value="\n".join(team_list),
            inline=True
        )
        
        try:
            await self.message.edit(embed=embed, view=self)
        except:
            pass

class GameCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.memory_system = ChromaMemory()

    async def initialize_database(self):
        """Checks and updates the database schema automatically on startup."""
        self.bot.add_log("Checking database schema for game cog...")
        try:
            async with self.bot.db.execute("PRAGMA table_info(game_sessions)") as cursor:
                columns = [row[1] for row in await cursor.fetchall()]
            
            if 'channel_id' not in columns:
                await self.bot.db.execute("ALTER TABLE game_sessions ADD COLUMN channel_id BIGINT;")
                self.bot.add_log("Added 'channel_id' column to 'game_sessions' table.")
            
            if 'message_id' not in columns:
                await self.bot.db.execute("ALTER TABLE game_sessions ADD COLUMN message_id BIGINT;")
                self.bot.add_log("Added 'message_id' column to 'game_sessions' table.")
            
            await self.bot.db.commit()
            self.bot.add_log("Database schema check complete.")
        except Exception as e:
            self.bot.add_error(f"Database schema initialization failed: {e}")

    async def generate_play_styles(self) -> list[dict] | None:
        """Generates three unique, creative playstyles for the game start."""
        prompt = """
        Generate three distinct and creative RPG-style player archetypes from a variety of popular game genres (like fantasy, sci-fi, cyberpunk, post-apocalyptic, or mystery).
        Provide a unique name and a single relevant emoji for each.
        Respond with ONLY a valid JSON list of objects, where each object has "name" and "emoji" keys.
        Example: [{"name": "Shadowmancer", "emoji": "🔮"}, {"name": "Chrome-Junkle", "emoji": "🤖"}, {"name": "Wasteland Scavenger", "emoji": "☢️"}]
        """
        try:
            response = await self.bot.ollama_client.generate(model='mistral', prompt=prompt, options={"temperature": 1.2})
            text = response.get('response', '')
            cleaned_text = re.sub(r'```json\n|```', '', text).strip()
            styles = json.loads(cleaned_text)
            
            if isinstance(styles, list) and all('name' in s and 'emoji' in s for s in styles):
                discord_styles = [discord.ButtonStyle.primary, discord.ButtonStyle.success, discord.ButtonStyle.danger]
                random.shuffle(discord_styles)
                for i, style in enumerate(styles[:3]):
                    style['style'] = discord_styles[i]
                return styles[:3]

            self.bot.add_error(f"Playstyle Gen Parse Fail. Raw: {text}")
            return None
        except Exception as e:
            self.bot.add_error(f"Playstyle generation failed: {e}")
            return None

    async def generate_mission_details(self, difficulty: str, player_style: str) -> dict | None:
        prompt = f"""
        You are a creative writer designing the first step of a text-based RPG level.
        The player's style is '{player_style}' and the mission difficulty is '{difficulty}'.
        Your task is to create a scenario with a clear, interactive puzzle that the player must solve to proceed.

        **RULES:**
        1. The `CHALLENGE` must be a specific, self-contained puzzle. It cannot be a generic "What do you do?".
        2. The `ANSWER` must be a simple, one or two-word solution to the challenge.
            - **Good Challenge/Answer pairs:**
              - CHALLENGE: A scrambled word appears: 'R-E-C-S-U-E'. What is the password? / ANSWER: rescue
              - CHALLENGE: I have cities, but no houses; forests, but no trees; and water, but no fish. What am I? / ANSWER: a map
        3. Format the response with these exact labels on new lines: MODE_NAME, OBJECTIVE, MODE_DESC, CHALLENGE, ANSWER.

        **RESPONSE FORMAT:**
        MODE_NAME: [A cool, thematic name for the mission]
        OBJECTIVE: [A clear, one-sentence goal for the player]
        MODE_DESC: [A one-paragraph description setting the scene.]
        CHALLENGE: [The specific riddle, puzzle, or question for the player to answer.]
        ANSWER: [The correct one or two-word answer to the challenge.]
        """
        try:
            response = await self.bot.ollama_client.generate(model='mistral', prompt=prompt)
            text = response.get('response', '')
            
            name_match = re.search(r"MODE_NAME:\s*(.*)", text, re.IGNORECASE)
            objective_match = re.search(r"OBJECTIVE:\s*(.*)", text, re.IGNORECASE)
            desc_match = re.search(r"MODE_DESC:\s*(.*?)(?=CHALLENGE:)", text, re.DOTALL | re.IGNORECASE)
            challenge_match = re.search(r"CHALLENGE:\s*(.*?)(?=ANSWER:)", text, re.DOTALL | re.IGNORECASE)
            answer_match = re.search(r"ANSWER:\s*(.*)", text, re.DOTALL | re.IGNORECASE)

            if not (name_match and objective_match and desc_match and challenge_match and answer_match):
                self.bot.add_error(f"Mission Gen Parse Fail. Raw: {text}")
                return None
                
            return {
                "name": name_match.group(1).strip(),
                "objective": objective_match.group(1).strip(),
                "description": desc_match.group(1).strip(),
                "challenge": challenge_match.group(1).strip(),
                "answer": answer_match.group(1).strip()
            }
        except Exception as e:
            self.bot.add_error(f"Mission generation failed: {e}")
            return None

    async def run_assessment(self, interaction: discord.Interaction) -> str | None:
        embed = discord.Embed(
            title="> System Interface Initializing...",
            description="My core has detected a new operator signature. Generating operational profiles...\n*Please wait...*",
            color=discord.Color.orange()
        )
        await interaction.edit_original_response(embed=embed)

        view = AssessmentView(self.bot, self.memory_system)
        await view.initialize_styles(self)
        
        embed.description = "Profiles generated. Select your primary approach:"
        embed.set_footer(text="Your choice will influence the missions you receive.")
        
        await interaction.edit_original_response(embed=embed, view=view)
        view.message = await interaction.original_response()
        
        await view.wait()
        return view.player_style

    @app_commands.command(name="opure", description="Start a new AI-generated mission.")
    @app_commands.describe(difficulty="The difficulty of the mission. Harder missions have better rewards.")
    @app_commands.choices(difficulty=[
        discord.app_commands.Choice(name="Easy", value="Easy"),
        discord.app_commands.Choice(name="Normal", value="Normal"),
        discord.app_commands.Choice(name="Hard", value="Hard"),
    ])
    async def opure(self, interaction: discord.Interaction, difficulty: discord.app_commands.Choice[str]):
        await interaction.response.defer(ephemeral=True)
        user_id = interaction.user.id
        
        try:
            await self.bot.db.execute("INSERT OR IGNORE INTO players (user_id) VALUES (?)", (user_id,))
            await self.bot.db.commit()

            async with self.bot.db.execute("SELECT is_active, channel_id, message_id FROM game_sessions WHERE user_id = ?", (user_id,)) as cursor:
                active_session = await cursor.fetchone()

            if active_session and active_session[0] == 1:
                channel_id, message_id = active_session[1], active_session[2]
                if channel_id and message_id:
                    try:
                        channel = self.bot.get_channel(channel_id) or await self.bot.fetch_channel(channel_id)
                        await channel.fetch_message(message_id)
                        return await interaction.followup.send("You are already in an active mission. Use the `Reset System` button on your game to end it.", ephemeral=True)
                    except (discord.NotFound, discord.Forbidden):
                        self.bot.add_log(f"Found orphaned game for {interaction.user.name}. Resetting session.")
                        await self.bot.db.execute("UPDATE game_sessions SET is_active = 0 WHERE user_id = ?", (user_id,))
                        await self.bot.db.commit()
                else:
                    await self.bot.db.execute("UPDATE game_sessions SET is_active = 0 WHERE user_id = ?", (user_id,))
                    await self.bot.db.commit()

            async with self.bot.db.execute("SELECT lives FROM players WHERE user_id = ?", (user_id,)) as cursor:
                player_lives = await cursor.fetchone()
            if player_lives and player_lives[0] <= 0:
                return await interaction.followup.send("You have no lives left. Wait for the daily reset.", ephemeral=True)

        except Exception as e:
            self.bot.add_error(f"DB error in /opure checks: {e}")
            return await interaction.followup.send("A database error occurred while checking your session.", ephemeral=True)

        player_style = await self.run_assessment(interaction)
        if not player_style:
            return

        mission_details = await self.generate_mission_details(difficulty.value, player_style)
        if not mission_details:
            return await interaction.followup.send("My core systems fluctuated and failed to generate a stable mission. Please try again.", ephemeral=True)

        # --- NEW: Check for Timed Sequence Challenge ---
        answer = mission_details.get("answer", "")
        # A simple heuristic to detect a timed sequence.
        # Checks if the answer is hyphen-separated and contains only valid button labels.
        is_timed_challenge = all(item in ['red', 'green', 'blue', 'yellow'] for item in answer.split('-')) and len(answer.split('-')) > 2

        if is_timed_challenge:
            # Handle the timed challenge
            sequence = answer.split('-')
            # We need a GameView instance to pass to the TimedButtonView, so we create a temporary one
            temp_game_view = GameView(self.bot, interaction.user, self.memory_system, discord.Embed())
            timed_view = TimedButtonView(sequence, temp_game_view)
            
            narrative = (
                f"**Difficulty: `{difficulty.value}`** | **Style: `{player_style}`**\n\n"
                f"### {mission_details['name']}\n"
                f"{mission_details['description']}\n\n"
                f"**Objective:** {mission_details['objective']}\n\n"
                f"**{mission_details['challenge']}**"
            )
            initial_embed = discord.Embed(
                title="> New Mission Initialized (Turn 1)",
                description=narrative,
                color=discord.Color.blue()
            )
            
            message = await interaction.channel.send(embed=initial_embed, view=timed_view)
            timed_view.game_view.message = message # Link the message back to the view
            
            # Wait for the timed view to complete
            await timed_view.result
            result = timed_view.result.result()
            
            # Process the result of the timed challenge
            result_embed = await temp_game_view.process_player_action(result)
            is_game_over = "MISSION COMPLETE" in (result_embed.title or "") or "CONNECTION TERMINATED" in (result_embed.title or "")
            await message.edit(embed=result_embed, view=None if is_game_over else temp_game_view)
            
        else:
            # Handle normal text-based challenge
            narrative = (
                f"**Difficulty: `{difficulty.value}`** | **Style: `{player_style}`**\n\n"
                f"### {mission_details['name']}\n"
                f"{mission_details['description']}\n\n"
                f"**Objective:** {mission_details['objective']}\n\n"
                f"**{mission_details['challenge']}**"
            )
            self.memory_system.clear_user_memory(user_id=str(user_id))
            self.memory_system.add(user_id=str(user_id), text_content=f"Story: {mission_details['description']}")
            self.memory_system.add(user_id=str(user_id), text_content=f"ANSWER: {mission_details['answer']}")
            
            initial_embed = discord.Embed(
                title="> New Mission Initialized (Turn 1)",
                description=narrative,
                color=discord.Color.blue()
            )
            
            game_view = GameView(self.bot, interaction.user, self.memory_system, initial_embed)
            
            try:
                await interaction.edit_original_response(content="Mission starting in this channel...", embed=None, view=None)
                message = await interaction.channel.send(embed=initial_embed, view=game_view)
                game_view.message = message
            except (discord.Forbidden, discord.HTTPException) as e:
                self.bot.add_error(f"Failed to send public game message for {interaction.user.name}: {e}")
                await interaction.edit_original_response(content="I couldn't send the message in this channel. Please check my permissions.", embed=None, view=None)
                return

        try:
            await self.bot.db.execute(
                "INSERT INTO game_sessions (user_id, difficulty, last_played, is_active, channel_id, message_id) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(user_id) DO UPDATE SET difficulty=excluded.difficulty, last_played=excluded.last_played, is_active=1, channel_id=excluded.channel_id, message_id=excluded.message_id",
                (user_id, difficulty.value, datetime.datetime.now().isoformat(), message.channel.id, message.id)
            )
            await self.bot.db.commit()
        except Exception as e:
            self.bot.add_error(f"DB error saving new game session: {e}")
            await message.delete()
            await interaction.followup.send("A database error occurred while saving the session. The game could not be started.", ephemeral=True)

    @app_commands.command(name="multi", description="Start a multiplayer co-op mission with other players.")
    @app_commands.describe(
        difficulty="The difficulty of the co-op mission",
        max_players="Maximum number of players (2-5)"
    )
    @app_commands.choices(difficulty=[
        discord.app_commands.Choice(name="Easy", value="Easy"),
        discord.app_commands.Choice(name="Normal", value="Normal"),
        discord.app_commands.Choice(name="Hard", value="Hard"),
    ])
    async def multi(self, interaction: discord.Interaction, difficulty: discord.app_commands.Choice[str], max_players: int = 3):
        """Start a multiplayer co-op mission."""
        await interaction.response.defer()
        
        if max_players < 2 or max_players > 5:
            return await interaction.followup.send("❌ Max players must be between 2 and 5.", ephemeral=True)
        
        user_id = interaction.user.id
        async with self.bot.db.execute("SELECT is_active FROM game_sessions WHERE user_id = ?", (user_id,)) as cursor:
            active_session = await cursor.fetchone()
        
        if active_session and active_session[0] == 1:
            return await interaction.followup.send("❌ You already have an active mission. Complete it first.", ephemeral=True)
        
        player_style = "Co-op" 
        mission_details = await self.generate_mission_details(difficulty.value, f"Co-op {player_style}")
        
        if not mission_details:
            return await interaction.followup.send("❌ Failed to generate co-op mission. Please try again.", ephemeral=True)
        
        embed = discord.Embed(
            title="🎮 Multiplayer Mission Briefing",
            description=f"🎯 **Mission Leader:** {interaction.user.mention}\n\n**{mission_details['name']}**\n{mission_details['description']}\n\n**Objective:** {mission_details['objective']}",
            color=0x5865F2
        )
        embed.set_author(name=f"Co-op Mission • {difficulty.value} Difficulty", icon_url=interaction.user.display_avatar.url)
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        
        embed.add_field(
            name="📊 Mission Parameters",
            value=f"🎚️ **Difficulty:** {difficulty.value}\n👥 **Max Players:** {max_players}\n🎲 **Current Players:** 1/{max_players}",
            inline=True
        )
        embed.add_field(
            name="🎯 Team Status",
            value=f"👤 {interaction.user.mention} *(Leader)*",
            inline=True
        )
        embed.add_field(
            name="🚀 Ready to Deploy?",
            value="Click **Join Mission** to participate!\nLeader clicks **Start Mission** when ready.",
            inline=False
        )
        
        embed.set_footer(text="🤖 Generated with Mistral AI • 30 seconds to join", icon_url=self.bot.user.display_avatar.url)
        
        view = MultiplayerLobbyView(self.bot, interaction.user, mission_details, difficulty.value, max_players, self.memory_system)
        
        try:
            message = await interaction.followup.send(embed=embed, view=view)
            view.message = message
        except Exception as e:
            self.bot.add_error(f"Failed to create multiplayer lobby: {e}")
            await interaction.followup.send("❌ Failed to create multiplayer lobby.", ephemeral=True)


async def setup(bot: commands.Bot):
    GUILD_ID_STR = os.getenv("GUILD_ID", "")
    cog = GameCog(bot)

    await cog.initialize_database()
    
    if not GUILD_ID_STR:
        bot.add_log("WARNING: GUILD_ID not found in .env. GameCog will be loaded globally.")
        await bot.add_cog(cog)
        return
        
    GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
    await bot.add_cog(cog, guilds=[discord.Object(id=gid) for gid in GUILD_IDS])
    bot.add_log(f"Cog 'GameCog' loaded for Guild IDs: {GUILD_IDS}")