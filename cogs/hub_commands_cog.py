# cogs/hub_commands_cog.py - ONLY 4 Hub Slash Commands System

import discord
from discord.ext import commands
from discord import app_commands
from typing import Optional

# Import hub views
from cogs.music_hub_cog import MusicHubView
from cogs.ai_hub_cog import AIHubView  
from cogs.economy_hub_cog import EconomyHubView
from cogs.gaming_hub_cog import GamingHubView

class HubCommandsCog(commands.Cog):
    """Main hub commands cog - ONLY 4 slash commands for the entire bot"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="music-hub", description="🎵 Access all music features through an interactive hub")
    async def music_hub(self, interaction: discord.Interaction):
        """Launch the Music Hub with all music commands accessible via buttons"""
        try:
            view = MusicHubView(self.bot, interaction.user)
            embed = await view.get_embed_for_page()
            await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(
                f"⚠️ Music Hub temporarily unavailable: {str(e)}", 
                ephemeral=True
            )
    
    @app_commands.command(name="ai-hub", description="🧠 Access all AI features through an interactive hub")  
    async def ai_hub(self, interaction: discord.Interaction):
        """Launch the AI Hub with all AI commands accessible via buttons"""
        try:
            view = AIHubView(self.bot, interaction.user)
            embed = await view.get_embed_for_page()
            await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(
                f"⚠️ AI Hub temporarily unavailable: {str(e)}", 
                ephemeral=True
            )
    
    @app_commands.command(name="economy-hub", description="💎 Access all economy features through an interactive hub")
    async def economy_hub(self, interaction: discord.Interaction):
        """Launch the Economy Hub with all economy commands accessible via buttons"""
        try:
            view = EconomyHubView(self.bot, interaction.user)
            embed = await view.get_embed_for_page()
            await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(
                f"⚠️ Economy Hub temporarily unavailable: {str(e)}", 
                ephemeral=True
            )
    
    @app_commands.command(name="gaming-hub", description="🎮 Access all gaming features through an interactive hub")
    async def gaming_hub(self, interaction: discord.Interaction):
        """Launch the Gaming Hub with all gaming commands accessible via buttons"""
        try:
            view = GamingHubView(self.bot, interaction.user)
            embed = await view.get_embed_for_page()
            await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(
                f"⚠️ Gaming Hub temporarily unavailable: {str(e)}", 
                ephemeral=True
            )

async def setup(bot):
    await bot.add_cog(HubCommandsCog(bot))