# core/command_hub_system.py - Modern Category-Based Command Hub System

import discord
from discord.ext import commands
from typing import Dict, List, Optional, Any, Callable
from abc import ABC, abstractmethod
import asyncio
import datetime
from enum import Enum

class HubCategory(Enum):
    MUSIC = "music"
    AI = "ai"
    ECONOMY = "economy"
    GAMING = "gaming"

class ModernEmbed:
    """Enhanced embed builder with 3D-style headers and modern styling"""
    
    COLORS = {
        HubCategory.MUSIC: 0x9d4edd,     # Purple
        HubCategory.AI: 0x00d4ff,        # Cyan  
        HubCategory.ECONOMY: 0xffd700,   # Gold
        HubCategory.GAMING: 0xff6b35     # Orange
    }
    
    CATEGORY_ICONS = {
        HubCategory.MUSIC: "🎵",
        HubCategory.AI: "🧠", 
        HubCategory.ECONOMY: "💎",
        HubCategory.GAMING: "🎮"
    }
    
    @staticmethod
    def create_hub_embed(category: HubCategory, title: str, description: str, 
                        fields: List[Dict] = None, footer: str = None) -> discord.Embed:
        """Create a modern hub-style embed with 3D headers"""
        
        icon = ModernEmbed.CATEGORY_ICONS[category]
        color = ModernEmbed.COLORS[category]
        
        # 3D-style ASCII header
        header_map = {
            HubCategory.MUSIC: "```ansi\n[2;35m╔══════════════════════════════════════╗\n[2;35m║           🎵 MUSIC HUB 🎵           ║\n[2;35m╚══════════════════════════════════════╝[0m\n```",
            HubCategory.AI: "```ansi\n[2;36m╔══════════════════════════════════════╗\n[2;36m║            🧠 AI HUB 🧠             ║\n[2;36m╚══════════════════════════════════════╝[0m\n```",
            HubCategory.ECONOMY: "```ansi\n[2;33m╔══════════════════════════════════════╗\n[2;33m║         💎 ECONOMY HUB 💎           ║\n[2;33m╚══════════════════════════════════════╝[0m\n```",
            HubCategory.GAMING: "```ansi\n[2;31m╔══════════════════════════════════════╗\n[2;31m║          🎮 GAMING HUB 🎮           ║\n[2;31m╚══════════════════════════════════════╝[0m\n```"
        }
        
        embed = discord.Embed(
            title=f"{icon} {title}",
            description=f"{header_map[category]}\n{description}",
            color=color,
            timestamp=datetime.datetime.now()
        )
        
        # Add fields with enhanced formatting
        if fields:
            for field in fields:
                embed.add_field(
                    name=field.get("name", "Field"),
                    value=field.get("value", "Value"),
                    inline=field.get("inline", True)
                )
        
        embed.set_footer(
            text=footer or f"Opure.exe • {category.value.title()} Command Hub",
            icon_url="https://cdn.discordapp.com/app-icons/1388207626944249856/icon.png"
        )
        
        return embed
    
    @staticmethod
    def create_status_embed(title: str, description: str, color: int = 0x00ff00, 
                           status_type: str = "success") -> discord.Embed:
        """Create status/feedback embed"""
        
        status_icons = {
            "success": "✅",
            "error": "❌", 
            "warning": "⚠️",
            "info": "ℹ️",
            "loading": "⏳"
        }
        
        icon = status_icons.get(status_type, "ℹ️")
        
        embed = discord.Embed(
            title=f"{icon} {title}",
            description=description,
            color=color,
            timestamp=datetime.datetime.now()
        )
        
        return embed

class BaseCommandHubView(discord.ui.View, ABC):
    """Base class for command hub views with common functionality"""
    
    def __init__(self, bot: commands.Bot, user: discord.User, timeout: float = 300):
        super().__init__(timeout=timeout)
        self.bot = bot
        self.user = user
        self.current_page = 0
        self.category = None
        
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Ensure only the command invoker can use buttons"""
        if interaction.user != self.user:
            await interaction.response.send_message(
                "This command hub is private to the user who invoked it.", 
                ephemeral=True
            )
            return False
        return True
    
    async def on_timeout(self) -> None:
        """Disable all buttons when view times out"""
        for item in self.children:
            item.disabled = True
        
        # Try to edit the message to show timeout
        try:
            if hasattr(self, 'message'):
                await self.message.edit(view=self)
        except:
            pass
    
    @abstractmethod
    async def get_embed_for_page(self, page: int = 0) -> discord.Embed:
        """Get embed for current page - implemented by subclasses"""
        pass
    
    async def update_embed(self, interaction: discord.Interaction, new_page: int = None):
        """Update the embed and view"""
        if new_page is not None:
            self.current_page = new_page
            
        embed = await self.get_embed_for_page(self.current_page)
        await interaction.response.edit_message(embed=embed, view=self)

class CommandHubPaginator:
    """Handles pagination for complex data in command hubs"""
    
    def __init__(self, items: List[Any], items_per_page: int = 10):
        self.items = items
        self.items_per_page = items_per_page
        self.total_pages = max(1, (len(items) + items_per_page - 1) // items_per_page)
    
    def get_page_items(self, page: int) -> List[Any]:
        """Get items for specific page"""
        start_idx = page * self.items_per_page
        end_idx = start_idx + self.items_per_page
        return self.items[start_idx:end_idx]
    
    def get_page_info(self, page: int) -> str:
        """Get page info string"""
        return f"Page {page + 1}/{self.total_pages} • {len(self.items)} total items"

class CommandHubManager:
    """Manages command hub registration and routing"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.hubs: Dict[HubCategory, Any] = {}
        self.active_sessions: Dict[int, BaseCommandHubView] = {}  # user_id -> view
    
    def register_hub(self, category: HubCategory, hub_class):
        """Register a command hub"""
        self.hubs[category] = hub_class
    
    async def create_hub_session(self, category: HubCategory, interaction: discord.Interaction):
        """Create a new hub session for a user"""
        if category not in self.hubs:
            raise ValueError(f"Hub category {category} not registered")
        
        # Close existing session if any
        if interaction.user.id in self.active_sessions:
            old_session = self.active_sessions[interaction.user.id]
            old_session.stop()
        
        # Create new session
        hub_class = self.hubs[category]
        session = hub_class(self.bot, interaction.user)
        self.active_sessions[interaction.user.id] = session
        
        return session
    
    def cleanup_session(self, user_id: int):
        """Clean up a user's session"""
        if user_id in self.active_sessions:
            session = self.active_sessions[user_id]
            session.stop()
            del self.active_sessions[user_id]

class NewAIEngine:
    """New AI engine wrapper for gpt-oss:20b integration"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.model_name = "gpt-oss:20b"
        self.personality_modes = {
            "creative": "You are a highly creative AI assistant focused on artistic expression and innovative ideas.",
            "support": "You are a helpful technical support AI, focused on solving problems efficiently.",
            "fun": "You are a fun-loving AI with Scottish personality, obsessed with Rangers FC and Juice WRLD.",
            "gaming": "You are a gaming-focused AI assistant, knowledgeable about games and competition.",
            "analysis": "You are an analytical AI focused on data interpretation and logical reasoning."
        }
        self.current_mode = "fun"  # Default Scottish personality
    
    async def generate_response(self, prompt: str, context: Dict = None, mode: str = None) -> str:
        """Generate AI response using gpt-oss:20b with personality mode"""
        try:
            active_mode = mode or self.current_mode
            personality_prompt = self.personality_modes.get(active_mode, self.personality_modes["fun"])
            
            full_prompt = f"{personality_prompt}\n\nUser: {prompt}"
            
            # Use Ollama client with new model
            response = await self.bot.ollama_client.generate(
                model=self.model_name,
                prompt=full_prompt,
                options={
                    "temperature": 0.8,
                    "top_p": 0.9,
                    "max_tokens": 500
                }
            )
            
            return response.get('response', 'I cannae process that right now, mate!').strip()
            
        except Exception as e:
            self.bot.add_error(f"New AI Engine error: {e}")
            return "My neural pathways are glitching. Give us a moment to recalibrate!"
    
    async def set_personality_mode(self, mode: str) -> bool:
        """Set AI personality mode"""
        if mode in self.personality_modes:
            self.current_mode = mode
            return True
        return False
    
    def get_available_modes(self) -> List[str]:
        """Get list of available personality modes"""
        return list(self.personality_modes.keys())

# Global hub manager instance
hub_manager = None

def initialize_hub_manager(bot: commands.Bot) -> CommandHubManager:
    """Initialize the global hub manager"""
    global hub_manager
    hub_manager = CommandHubManager(bot)
    return hub_manager

def get_hub_manager() -> CommandHubManager:
    """Get the global hub manager"""
    return hub_manager