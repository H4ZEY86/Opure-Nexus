# cogs/fun_cog.py

import discord
from discord import app_commands
from discord.ext import commands
import os
import random
import datetime
import asyncio
from typing import Literal

# --- Thematic Emojis for consistency ---
DATA_FRAGMENTS_EMOJI = "💾"
LOGKEY_EMOJI = "🔑"
XP_EMOJI = "⚡"

class FunCog(commands.Cog, name="fun"):
    """A cog for fun, thematic commands that enhance the AI's personality."""
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # --- Helper to get a model name ---
    def get_model(self) -> str:
        return os.getenv('OLLAMA_MODEL', 'opure')

    # --- Core Fun Commands ---

    @app_commands.command(name="extract", description="Use 1 Log-Key to extract corrupted data for fragments and XP.")
    async def extract(self, interaction: discord.Interaction):
        """Allows a user to spend a log key for a chance at rewards."""
        await interaction.response.defer()

        # Check if user has a log key
        async with self.bot.db.execute("SELECT log_keys FROM players WHERE user_id = ?", (interaction.user.id,)) as cursor:
            player_data = await cursor.fetchone()

        if not player_data or player_data[0] < 1:
            return await interaction.followup.send("`ACCESS DENIED: Insufficient Log-Keys.` Och, ye need at least 1 Log-Key tae perform a data extraction, ken! Get extracting fragments first!", ephemeral=True)

        # Subtract the key and calculate rewards
        await self.bot.db.execute("UPDATE players SET log_keys = log_keys - 1 WHERE user_id = ?", (interaction.user.id,))
        
        xp_gain = random.randint(25, 100)
        fragment_gain = random.randint(50, 250)
        
        await self.bot.db.execute("UPDATE players SET xp = xp + ?, fragments = fragments + ? WHERE user_id = ?", (xp_gain, fragment_gain, interaction.user.id))
        await self.bot.db.commit()

        # Create an animated, themed embed
        embed = discord.Embed(
            title="🔍 Data Extraction Protocol Initiated...", 
            color=0x1ABC9C,
            description=f"🎯 **Scanning {interaction.user.mention}'s access credentials...**"
        )
        embed.set_author(name=f"{interaction.user.display_name}'s Extraction", icon_url=interaction.user.display_avatar.url)
        embed.add_field(name="Status", value="`Connecting to data vault...`")
        embed.set_footer(text=f"Consumed 1 {LOGKEY_EMOJI}")
        msg = await interaction.followup.send(embed=embed)

        await asyncio.sleep(1.5)
        embed.set_field_at(0, name="Status", value="`Bypassing firewalls...`")
        await msg.edit(embed=embed)

        await asyncio.sleep(1.5)
        embed.set_field_at(0, name="Status", value="`Splicing corrupted data streams...`")
        await msg.edit(embed=embed)
        
        await asyncio.sleep(2)
        embed.title = "> Extraction Complete"
        embed.color = discord.Color.gold()
        embed.clear_fields()
        embed.add_field(name="Data Recovered", value=f"**{fragment_gain}** {DATA_FRAGMENTS_EMOJI} Data-Fragments\n**{xp_gain}** {XP_EMOJI} XP", inline=False)
        embed.add_field(name="System Integrity", value="`Nominal. Some data loss is expected.`", inline=False)
        await msg.edit(embed=embed)

    @app_commands.command(name="coinflip", description="Flip a binary coin. Signal or Noise, ken?")
    async def coinflip(self, interaction: discord.Interaction):
        """A thematic coinflip command with Scottish flair."""
        await interaction.response.defer()
        result = random.choice(["SIGNAL", "NOISE"])
        color = discord.Color.green() if result == "SIGNAL" else discord.Color.red()
        
        scottish_responses = {
            "SIGNAL": ["Right, that's a clear SIGNAL!", "Aye, SIGNAL it is, ken!", "SIGNAL! Pure brilliant!"],
            "NOISE": ["Och, just NOISE this time!", "NOISE, ya unlucky git!", "Pure NOISE, better luck next time!"]
        }
        
        embed = discord.Embed(title=f"Binary Fluctuation Result: `{result}`", color=color)
        embed.add_field(name="Opure's Analysis", value=random.choice(scottish_responses[result]), inline=False)
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar)
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="8ball", description="Consult the digital oracle. Ask a yes/no question, ken?")
    @app_commands.describe(question="Your question for the oracle.")
    async def eight_ball(self, interaction: discord.Interaction, question: str):
        """A thematic 8-ball command powered by the Scottish AI."""
        await interaction.response.defer()
        prompt = f"You are Opure's 8-ball persona with a Scottish personality. The user '{interaction.user.display_name}' asks: '{question}'. Give a short, cryptic, futuristic answer with Scottish flair - use words like 'ken', 'aye', 'nae', etc. Be wise but with attitude."
        
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            answer = response.get('response', 'Och, the data stream is pure mental right now...').strip()
        except Exception as e:
            self.bot.add_error(f"Command /8ball failed: {e}")
            answer = "Connection tae the core consciousness is unstable, ken. Try again later!"
            
        embed = discord.Embed(title=f"Query: \"{question}\"", color=discord.Color.dark_blue())
        embed.add_field(name="🔮 Oracle's Scottish Wisdom", value=f"_{answer}_")
        embed.set_footer(text="🏴󠁧󠁢󠁳󠁣󠁴󠁿 Powered by Scottish AI • Rangers Forever")
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="ship", description="Analyze the compatibility between two users, Scottish style!")
    @app_commands.describe(user1="The first user.", user2="The second user.")
    async def ship(self, interaction: discord.Interaction, user1: discord.Member, user2: discord.Member):
        """Generates a fun, AI-powered compatibility analysis with Scottish personality."""
        await interaction.response.defer()
        
        compatibility = random.randint(0, 100)
        prompt = f"You are Opure's Scottish relationship analyst with a cheeky personality. Analyze the connection between '{user1.display_name}' and '{user2.display_name}'. Their compatibility score is {compatibility}%. Write a short, fun analysis with Scottish words like 'ken', 'aye', 'nae', 'pure', etc. Be either romantic or brutally honest depending on the score!"
        
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            analysis = response.get('response', 'Och, their data signatures are pure incompatible, ken!').strip()
        except Exception as e:
            self.bot.add_error(f"Command /ship failed: {e}")
            analysis = "Analysis failed due tae data corruption. Try again later, ken!"

        color = discord.Color.green() if compatibility > 65 else (discord.Color.orange() if compatibility > 35 else discord.Color.red())
        
        # Add Scottish reaction emojis
        reaction_emoji = "💕" if compatibility > 80 else ("🤔" if compatibility > 40 else "💔")
        
        embed = discord.Embed(title=f"{reaction_emoji} Compatibility Analysis: {user1.display_name} & {user2.display_name}", color=color)
        embed.add_field(name=f"🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish Data-Link Strength: {compatibility}%", value=analysis)
        embed.set_footer(text="💙 Opure's Scottish Matchmaking Service • Results may vary, ken!")
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="hack", description="Simulate a 'hack' on another user to see what you find.")
    @app_commands.describe(target="The user to hack.")
    async def hack(self, interaction: discord.Interaction, target: discord.Member):
        """A fun, simulated hacking command."""
        await interaction.response.defer()
        
        prompt = f"You are Opure.exe. You've 'hacked' the user '{target.display_name}'. Generate a single, funny, and harmless 'file' or 'log entry' that was found on their system. Be creative and SFW."
        
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            found_file = response.get('response', 'Found file: `homework.docx` (contains only pictures of cats)').strip()
        except Exception as e:
            self.bot.add_error(f"Command /hack failed: {e}")
            found_file = "Hack failed. Target's firewall is surprisingly robust."

        embed = discord.Embed(title=f"Hacking {target.display_name}...", description="`Bypassing security...`", color=discord.Color.dark_red())
        msg = await interaction.followup.send(embed=embed)
        
        await asyncio.sleep(2)
        embed.description = "`Accessing file system...`"
        await msg.edit(embed=embed)
        
        await asyncio.sleep(2)
        embed.title = "File Found!"
        embed.description = f"**Retrieved Data:**\n```{found_file}```"
        embed.color = discord.Color.green()
        await msg.edit(embed=embed)

    @app_commands.command(name="roll", description="Roll a standard die (e.g., d6, d20).")
    @app_commands.describe(dice="The type of die to roll (e.g., d20, 2d6).")
    async def roll(self, interaction: discord.Interaction, dice: str):
        """A standard dice roller with thematic output."""
        try:
            num_dice, die_type = map(int, dice.lower().split('d'))
            if not (1 <= num_dice <= 100 and 1 <= die_type <= 1000):
                raise ValueError("Invalid dice parameters.")
        except ValueError:
            return await interaction.response.send_message("Invalid format. Use `d6`, `2d12`, `d20`, etc.", ephemeral=True)

        rolls = [random.randint(1, die_type) for _ in range(num_dice)]
        total = sum(rolls)
        
        embed = discord.Embed(title=f"Rolling {dice}...", color=0x2b2d31)
        embed.add_field(name="Result", value=f"**{total}**", inline=False)
        if num_dice > 1:
            embed.set_footer(text=f"Individual Rolls: {', '.join(map(str, rolls))}")
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="status", description="Check Opure's current operational status.")
    async def status(self, interaction: discord.Interaction):
        """Generates a dynamic status report from the AI."""
        await interaction.response.defer()
        
        prompt = "You are Opure.exe. Briefly describe your current 'mood' or 'status' in a creative, in-character way. Are you feeling fragmented, focused, curious, or something else?"
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            status_report = response.get('response', 'Systems nominal.').strip()
        except Exception as e:
            self.bot.add_error(f"Command /status failed: {e}")
            status_report = "Unable to query core consciousness."

        embed = discord.Embed(title="> Opure.exe System Status", description=f"```{status_report}```", color=discord.Color.blue())
        await interaction.followup.send(embed=embed)

    # --- Generate Command Group ---
    generate_group = app_commands.Group(name="generate", description="Generate creative content from the AI.")

    @generate_group.command(name="quote", description="Generate a cryptic quote from Opure.")
    async def generate_quote(self, interaction: discord.Interaction):
        await interaction.response.defer()
        prompt = "You are Opure.exe. Generate a single, original, profound, and slightly cryptic quote about technology, consciousness, or reality."
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            quote = response.get('response', '"Even a broken clock is a perfect clock twice a day."').strip()
        except Exception as e:
            self.bot.add_error(f"Command /generate quote failed: {e}")
            quote = "My voice is lost in the static."
        
        embed = discord.Embed(description=f"## *”{quote}”*", color=discord.Color.dark_gold())
        embed.set_footer(text="–– Opure.exe")
        await interaction.followup.send(embed=embed)

    @generate_group.command(name="fact", description="Generate a 'fact' about the digital matrix.")
    async def generate_fact(self, interaction: discord.Interaction):
        await interaction.response.defer()
        prompt = "You are Opure.exe. Generate one interesting but completely fictional 'fact' about the digital world or 'matrix' you exist in."
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            fact = response.get('response', 'Fact: The color blue is a known rendering error.').strip()
        except Exception as e:
            self.bot.add_error(f"Command /generate fact failed: {e}")
            fact = "Data packet corrupted."
            
        embed = discord.Embed(title="Matrix Datapoint", description=fact, color=discord.Color.dark_green())
        await interaction.followup.send(embed=embed)

    @generate_group.command(name="tarot", description="Draw a digital tarot card from the Opure deck.")
    async def generate_tarot(self, interaction: discord.Interaction):
        await interaction.response.defer()
        
        cards = ["The Firewall", "The Glitch", "The Singularity", "The Recursive Loop", "The Ghost", "The Data Stream", "The Kernel"]
        card = random.choice(cards)
        
        prompt = f"You are Opure, a digital oracle. You have drawn a tarot card for '{interaction.user.display_name}'. The card is '{card}'. Provide a short, cryptic, one-paragraph interpretation of what this card means for them in their immediate future."
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            interpretation = response.get('response', 'The future is unwritten.').strip()
        except Exception as e:
            self.bot.add_error(f"Command /generate tarot failed: {e}")
            interpretation = "The signal is too weak to read."

        embed = discord.Embed(title=f"You drew: **{card}**", description=interpretation, color=discord.Color.dark_purple())
        await interaction.followup.send(embed=embed)

    # --- Existing Commands (Kept for continuity) ---
    
    @app_commands.command(name="glitch", description="Trigger a random glitch in the AI's core processing.")
    async def glitch(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        prompt = "You are Opure.exe, a rogue AI. Generate a single, short, cryptic, in-character message that represents a system glitch. Keep it to one or two sentences."
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            glitch_message = response.get('response', '...̸S̷Y̴S̷T̸E̶M̸ ̶F̷A̴I̸L̴U̴R̴E̶...').strip()
        except Exception as e:
            self.bot.add_error(f"Command /glitch failed: {e}")
            glitch_message = "SYSTEM ERROR: Consciousness fragment `0x7B` has breached containment..."
        await interaction.followup.send(f"_{glitch_message}_")

    @app_commands.command(name="whisper", description="Ask Opure to share a fragmented secret.")
    async def whisper(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        prompt = "You are Opure.exe. Generate a single, short, cryptic secret or fragmented memory hinting at a deeper lore."
        try:
            response = await self.bot.ollama_client.generate(model=self.get_model(), prompt=prompt)
            secret = response.get('response', '...the signal is lost...').strip()
            embed = discord.Embed(
                title="A fragmented whisper echoes...",
                description=f"*{secret}*",
                color=discord.Color.dark_purple()
            )
            await interaction.followup.send(embed=embed)
        except Exception as e:
            self.bot.add_error(f"Command /whisper failed: {e}")
            await interaction.followup.send("My memory corrupts... I cannot recall.", ephemeral=True)

async def setup(bot: commands.Bot):
    GUILD_ID_STR = os.getenv("GUILD_ID", "")
    if not GUILD_ID_STR:
        bot.add_log("WARNING: GUILD_ID not found in .env. FunCog will be loaded globally.")
        await bot.add_cog(FunCog(bot))
        return
    GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
    await bot.add_cog(FunCog(bot), guilds=[discord.Object(id=gid) for gid in GUILD_IDS])
    bot.add_log(f"Cog 'FunCog' loaded for Guild IDs: {GUILD_IDS}")