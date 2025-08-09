# core/command_hub_base.py - Base class for modern command hub system

import discord
from discord import app_commands
from discord.ext import commands
from typing import Dict, List, Optional, Any, Callable
import datetime
import asyncio
from abc import ABC, abstractmethod

class ModernEmbedBuilder:
    """Modern 3D-style embed builder with consistent theming"""
    
    @staticmethod
    def create_hub_embed(
        title: str, 
        description: str, 
        color: discord.Color = discord.Color.blue(),
        category_icon: str = "🎯"
    ) -> discord.Embed:
        """Create a modern 3D-style hub embed"""
        embed = discord.Embed(
            title=f"{category_icon} {title}",
            description=f"```ansi\n[2;36m> {description}[0m\n```",
            color=color,
            timestamp=datetime.datetime.now()
        )
        
        # Add 3D-style header
        embed.add_field(
            name="📊 Hub Status",
            value="```yaml\nStatus: ONLINE\nFeatures: ACTIVE\nMode: INTERACTIVE\n```",
            inline=True
        )
        
        embed.add_field(
            name="⚡ Quick Actions",
            value="```yaml\nButtons: ENABLED\nNavigation: LIVE\nUpdates: REAL-TIME\n```",
            inline=True
        )
        
        return embed
    
    @staticmethod
    def create_feature_embed(
        title: str,
        feature_name: str,
        content: str,
        color: discord.Color = discord.Color.green(),
        icon: str = "⚡"
    ) -> discord.Embed:
        """Create a feature-specific embed"""
        embed = discord.Embed(
            title=f"{icon} {title}",
            description=f"```ansi\n[2;32m> FEATURE: {feature_name.upper()}[0m\n```",
            color=color,
            timestamp=datetime.datetime.now()
        )
        
        embed.add_field(
            name="📋 Details",
            value=content,
            inline=False
        )
        
        return embed
    
    @staticmethod
    def create_error_embed(
        title: str,
        error_message: str,
        suggestion: str = None
    ) -> discord.Embed:
        """Create a consistent error embed"""
        embed = discord.Embed(
            title=f"⚠️ {title}",
            description=f"```ansi\n[2;31m> ERROR: {error_message}[0m\n```",
            color=discord.Color.red(),
            timestamp=datetime.datetime.now()
        )
        
        if suggestion:
            embed.add_field(
                name="💡 Suggestion",
                value=suggestion,
                inline=False
            )
        
        embed.set_footer(text="Opure.exe • Error Handler")
        return embed

class HubButtonView(discord.ui.View):
    """Base view class for hub navigation with button management"""
    
    def __init__(self, hub_cog: 'CommandHubBase', user: discord.User):
        super().__init__(timeout=300)  # 5 minute timeout
        self.hub_cog = hub_cog
        self.user = user
        self.current_page = "main"
        self.message: Optional[discord.Message] = None
    
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Ensure only the command user can interact"""
        if interaction.user.id != self.user.id:
            await interaction.response.send_message(
                "This hub belongs to another user. Use the command yourself to get your own hub!",
                ephemeral=True
            )
            return False
        return True
    
    async def on_timeout(self):
        """Disable buttons on timeout"""
        if self.message:
            for item in self.children:
                item.disabled = True
            try:
                await self.message.edit(view=self)
            except discord.NotFound:
                pass
    
    async def update_embed(self, interaction: discord.Interaction, new_embed: discord.Embed):
        """Update the embed with new content"""
        try:
            await interaction.response.edit_message(embed=new_embed, view=self)
        except discord.InteractionResponded:
            await interaction.edit_original_response(embed=new_embed, view=self)

class CommandHubBase(commands.Cog, ABC):
    """Base class for all command hubs with modern UI patterns"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.embed_builder = ModernEmbedBuilder()
        self.active_sessions: Dict[int, HubButtonView] = {}
        
    @property
    @abstractmethod
    def hub_name(self) -> str:
        """Name of the hub (e.g., 'Music', 'AI', 'Economy')"""
        pass
    
    @property
    @abstractmethod
    def hub_description(self) -> str:
        """Description of the hub functionality"""
        pass
    
    @property
    @abstractmethod
    def hub_color(self) -> discord.Color:
        """Color theme for the hub"""
        pass
    
    @property
    @abstractmethod
    def hub_icon(self) -> str:
        """Icon emoji for the hub"""
        pass
    
    @abstractmethod
    async def get_hub_buttons(self) -> List[Dict[str, Any]]:
        """Return list of button configurations for the hub"""
        pass
    
    @abstractmethod
    async def handle_button_interaction(self, interaction: discord.Interaction, button_id: str, view: HubButtonView):
        """Handle button interactions for the hub"""
        pass
    
    async def create_hub_view(self, user: discord.User) -> HubButtonView:
        """Create the main hub view with buttons"""
        view = HubButtonView(self, user)
        
        # Get button configurations
        button_configs = await self.get_hub_buttons()
        
        # Add buttons to view
        for config in button_configs:
            button = discord.ui.Button(
                label=config.get("label", "Button"),
                emoji=config.get("emoji"),
                style=config.get("style", discord.ButtonStyle.secondary),
                custom_id=config.get("custom_id", "unknown")
            )
            
            # Create callback for this button
            async def button_callback(interaction: discord.Interaction, button_id=config.get("custom_id")):
                await self.handle_button_interaction(interaction, button_id, view)
            
            button.callback = button_callback
            view.add_item(button)
        
        return view
    
    async def get_ai_response(self, prompt: str, context: str = None) -> str:
        """Get AI response using the new gpt-oss:20b system"""
        try:
            # Use the new GPU AI engine if available
            if hasattr(self.bot, 'gpu_engine') and self.bot.gpu_engine:
                full_prompt = f"{context}\n\n{prompt}" if context else prompt
                response = await self.bot.gpu_engine.generate_response(
                    prompt=full_prompt,
                    model="gpt-oss:20b",
                    temperature=0.7
                )
                return response.strip()
            else:
                # Fallback to Ollama with new model
                full_prompt = f"{context}\n\n{prompt}" if context else prompt
                response = await self.bot.ollama_client.generate(
                    model='gpt-oss:20b', 
                    prompt=full_prompt
                )
                return response.get('response', 'AI system temporarily unavailable.').strip()
        except Exception as e:
            self.bot.add_error(f"AI response error in {self.hub_name} hub: {e}")
            return "AI processing encountered an error. Please try again."
    
    async def execute_background_command(self, command_name: str, **kwargs) -> Dict[str, Any]:
        """Execute background prefix commands for seamless UX"""
        try:
            # This would integrate with existing cog commands
            # For now, return a placeholder response
            return {
                "success": True,
                "data": f"Background command '{command_name}' executed",
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            self.bot.add_error(f"Background command error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def cleanup_session(self, user_id: int):
        """Clean up user session"""
        if user_id in self.active_sessions:
            del self.active_sessions[user_id]

class PaginationView(discord.ui.View):
    """Reusable pagination view for complex data displays"""
    
    def __init__(self, items: List[Any], items_per_page: int = 5, format_func: Callable = str):
        super().__init__(timeout=300)
        self.items = items
        self.items_per_page = items_per_page
        self.format_func = format_func
        self.current_page = 0
        self.total_pages = (len(items) + items_per_page - 1) // items_per_page
        
        # Update button states
        self.update_buttons()
    
    def update_buttons(self):
        """Update button states based on current page"""
        self.children[0].disabled = self.current_page == 0
        self.children[1].disabled = self.current_page >= self.total_pages - 1
    
    def get_page_content(self) -> str:
        """Get content for current page"""
        start = self.current_page * self.items_per_page
        end = start + self.items_per_page
        page_items = self.items[start:end]
        
        return "\n".join([self.format_func(item) for item in page_items])
    
    def create_embed(self, title: str, color: discord.Color = discord.Color.blue()) -> discord.Embed:
        """Create embed with current page content"""
        embed = discord.Embed(
            title=title,
            description=self.get_page_content(),
            color=color,
            timestamp=datetime.datetime.now()
        )
        embed.set_footer(text=f"Page {self.current_page + 1}/{self.total_pages}")
        return embed
    
    @discord.ui.button(label="◀ Previous", style=discord.ButtonStyle.secondary)
    async def previous_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page > 0:
            self.current_page -= 1
            self.update_buttons()
            # This would be overridden by the implementing class
            await interaction.response.defer()
    
    @discord.ui.button(label="Next ▶", style=discord.ButtonStyle.secondary)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page < self.total_pages - 1:
            self.current_page += 1
            self.update_buttons()
            # This would be overridden by the implementing class
            await interaction.response.defer()