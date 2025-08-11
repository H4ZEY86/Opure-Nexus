# cogs/ai_hub_cog.py - AI Interaction Hub with gpt-oss:20b Integration

import discord
from discord.ext import commands
from core.command_hub_system import BaseCommandHubView, ModernEmbed, HubCategory, NewAIEngine
import asyncio
import datetime
from typing import Dict, List, Optional, Any
import json

class AIHubView(BaseCommandHubView):
    """AI Interaction hub with multiple personality modes"""
    
    def __init__(self, bot: commands.Bot, user: discord.User):
        super().__init__(bot, user)
        self.category = HubCategory.AI
        self.current_view = "main"  # main, personality, memory, chat, assimilate
        self.ai_engine = NewAIEngine(bot)
        
    async def get_embed_for_page(self, page: int = 0) -> discord.Embed:
        """Get embed based on current view state"""
        if self.current_view == "main":
            return await self._get_main_hub_embed()
        elif self.current_view == "personality":
            return await self._get_personality_embed()
        elif self.current_view == "memory":
            return await self._get_memory_embed()
        elif self.current_view == "chat":
            return await self._get_chat_embed()
        elif self.current_view == "assimilate":
            return await self._get_assimilate_embed()
        else:
            return await self._get_main_hub_embed()
    
    async def _get_main_hub_embed(self) -> discord.Embed:
        """Main AI hub embed"""
        current_mode = self.ai_engine.current_mode.title()
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.AI,
            title="AI Command Center",
            description="🧠 **Welcome to the AI interaction hub!**\n\nEngage with next-generation AI powered by gpt-oss:20b:",
            fields=[
                {
                    "name": "🤖 AI Status",
                    "value": f"```yaml\nModel: gpt-oss:20b\nPersonality: {current_mode}\nMemory: Active\nResponse Time: <1s\n```",
                    "inline": False
                },
                {
                    "name": "🧠 Capabilities",
                    "value": "• Natural Conversations\n• Multiple Personalities\n• Long-term Memory\n• Scottish Personality\n• Creative & Technical",
                    "inline": True
                },
                {
                    "name": "⚡ Features",
                    "value": "• Mention Detection\n• DM Support\n• Context Awareness\n• Learning Mode\n• Admin Controls",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_personality_embed(self) -> discord.Embed:
        """Personality configuration embed"""
        current_mode = self.ai_engine.get_user_personality_mode(self.user.id)
        available_modes = self.ai_engine.get_available_personality_modes()
        
        personality_list = []
        for mode, description in available_modes.items():
            marker = "🔹 **ACTIVE**" if mode == current_mode else "⚫"
            personality_list.append(f"{marker} **{mode.title()}**: {description}")
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.AI,
            title="Personality Configuration",
            description="🎭 **Configure Your AI Personality**\n\nChoose how the AI interacts with you:",
            fields=[
                {
                    "name": "🧠 Current Personality",
                    "value": f"```\n{current_mode.title()}\n```\n{available_modes[current_mode]}",
                    "inline": False
                },
                {
                    "name": "🎨 Available Personalities",
                    "value": "\n".join(personality_list),
                    "inline": False
                },
                {
                    "name": "💡 Tips",
                    "value": "• Personalities affect all AI interactions\n• Changes apply immediately\n• Each personality has unique traits",
                    "inline": False
                }
            ],
            footer="Select a personality mode below"
        )
        return embed
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.AI,
            title="AI Personality Modes",
            description="🎭 **Switch between different AI personalities**\n\nEach mode changes how I respond and interact:",
            fields=[
                {
                    "name": "🧠 Available Personalities",
                    "value": mode_list[:1024],  # Discord field limit
                    "inline": False
                },
                {
                    "name": "💡 Usage Tips",
                    "value": "• Different modes for different tasks\n• Personalities persist across conversations\n• Each mode has unique knowledge focus\n• Switch anytime during chat",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_memory_embed(self) -> discord.Embed:
        """AI memory management embed"""
        # Get memory stats from ChromaDB
        game_cog = self.bot.get_cog('GameCog')
        memory_stats = "No memory system available"
        
        if game_cog and hasattr(game_cog, 'memory_system'):
            try:
                # Get user-specific memory count
                user_memories = game_cog.memory_system.get_all_memories_for_user(str(self.user.id))
                memory_count = len(user_memories.get('documents', []))
                memory_stats = f"```yaml\nYour Memories: {memory_count} entries\nTotal System: {game_cog.memory_system.collection.count()} entries\nVector Database: ChromaDB\nSearch: Semantic similarity\n```"
            except:
                memory_stats = "```yaml\nStatus: Initializing...\nDatabase: ChromaDB\nSearch: Available\n```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.AI,
            title="AI Memory System",
            description="🧠 **Manage AI memory and knowledge**\n\nView and control what the AI remembers about conversations:",
            fields=[
                {
                    "name": "📊 Memory Statistics",
                    "value": memory_stats,
                    "inline": False
                },
                {
                    "name": "💾 Memory Features",
                    "value": "• Conversation Context\n• Long-term Learning\n• User Preferences\n• Semantic Search\n• Privacy Controls",
                    "inline": True
                },
                {
                    "name": "🔒 Privacy",
                    "value": "• User-specific isolation\n• Encrypted storage\n• Deletion options\n• Data portability\n• Clear controls",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_chat_embed(self) -> discord.Embed:
        """AI chat interface embed"""
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.AI,
            title="AI Chat Interface",
            description="💬 **Start a conversation with AI**\n\nUse the button below to send a message:",
            fields=[
                {
                    "name": "🎯 Chat Features",
                    "value": "• Natural conversation flow\n• Context-aware responses\n• Personality-driven replies\n• Memory integration\n• Scottish charm (in fun mode)",
                    "inline": False
                },
                {
                    "name": "💡 Pro Tips",
                    "value": "• Be specific in your questions\n• Mention @Opure.exe in channels\n• DM for private conversations\n• Ask about Rangers FC (fun mode)\n• Request technical help (support mode)",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_assimilate_embed(self) -> discord.Embed:
        """Admin data assimilation embed"""
        if not self.user.guild_permissions.administrator:
            embed = ModernEmbed.create_status_embed(
                "🔒 Access Denied",
                "Only administrators can access data assimilation controls.",
                color=0xff0000,
                status_type="error"
            )
            return embed
            
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.AI,
            title="Data Assimilation Control",
            description="🔬 **Administrator AI Training Interface**\n\nInject new knowledge into the AI system:",
            fields=[
                {
                    "name": "⚠️ Admin Only",
                    "value": "```yaml\nAccess Level: Administrator\nTraining Mode: Manual\nSafety: Active\nBackup: Enabled\n```",
                    "inline": False
                },
                {
                    "name": "📥 Data Types",
                    "value": "• Text Knowledge\n• Conversation Examples\n• Domain Expertise\n• Behavioral Patterns\n• Response Templates",
                    "inline": True
                },
                {
                    "name": "🛡️ Safety Features",
                    "value": "• Content Filtering\n• Admin Approval\n• Rollback Capability\n• Audit Logging\n• Secure Processing",
                    "inline": True
                }
            ]
        )
        return embed
    
    # Button interactions for main hub
    @discord.ui.button(label="💬 Chat with AI", style=discord.ButtonStyle.primary, row=0)
    async def chat_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Open chat modal"""
        modal = AIChatModal(self)
        await interaction.response.send_modal(modal)
    
    @discord.ui.button(label="🎭 Personality", style=discord.ButtonStyle.secondary, row=0)
    async def personality_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to personality selection view"""
        self.current_view = "personality"
        self._update_buttons_for_personality_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🧠 Memory", style=discord.ButtonStyle.secondary, row=0)
    async def memory_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to memory management view"""
        self.current_view = "memory"
        self._update_buttons_for_memory_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🔬 Assimilate", style=discord.ButtonStyle.danger, row=0)
    async def assimilate_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Admin data assimilation (admin only)"""
        if not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message(
                "🔒 Only administrators can access data assimilation.", 
                ephemeral=True
            )
            return
            
        self.current_view = "assimilate"
        self._update_buttons_for_assimilate_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1)
    async def home_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Return to main hub view"""
        self.current_view = "main"
        self._update_buttons_for_main_view()
        await self.update_embed(interaction)
    
    def _update_buttons_for_main_view(self):
        """Configure buttons for main view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="💬 Chat with AI", style=discord.ButtonStyle.primary, row=0, custom_id="chat"))
        self.add_item(discord.ui.Button(label="🎭 Personality", style=discord.ButtonStyle.secondary, row=0, custom_id="personality"))
        self.add_item(discord.ui.Button(label="🧠 Memory", style=discord.ButtonStyle.secondary, row=0, custom_id="memory"))
        self.add_item(discord.ui.Button(label="🔬 Assimilate", style=discord.ButtonStyle.danger, row=0, custom_id="assimilate"))
    
    def _update_buttons_for_personality_view(self):
        """Configure buttons for personality selection"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="🎨 Creative", style=discord.ButtonStyle.primary, row=0, custom_id="mode_creative"))
        self.add_item(discord.ui.Button(label="🛠️ Support", style=discord.ButtonStyle.primary, row=0, custom_id="mode_support"))
        self.add_item(discord.ui.Button(label="🏴󠁧󠁢󠁳󠁣󠁴󠁿 Fun", style=discord.ButtonStyle.success, row=0, custom_id="mode_fun"))
        self.add_item(discord.ui.Button(label="🎮 Gaming", style=discord.ButtonStyle.secondary, row=0, custom_id="mode_gaming"))
        self.add_item(discord.ui.Button(label="📊 Analysis", style=discord.ButtonStyle.secondary, row=1, custom_id="mode_analysis"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_memory_view(self):
        """Configure buttons for memory management"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="👁️ View Memories", style=discord.ButtonStyle.primary, row=0, custom_id="view_memories"))
        self.add_item(discord.ui.Button(label="🗑️ Clear My Data", style=discord.ButtonStyle.danger, row=0, custom_id="clear_memories"))
        self.add_item(discord.ui.Button(label="📊 Memory Stats", style=discord.ButtonStyle.secondary, row=0, custom_id="memory_stats"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_assimilate_view(self):
        """Configure buttons for data assimilation (admin only)"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="📥 Add Knowledge", style=discord.ButtonStyle.success, row=0, custom_id="add_knowledge"))
        self.add_item(discord.ui.Button(label="📋 View Training Data", style=discord.ButtonStyle.primary, row=0, custom_id="view_training"))
        self.add_item(discord.ui.Button(label="🔄 Retrain Model", style=discord.ButtonStyle.danger, row=0, custom_id="retrain"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))

class AIChatModal(discord.ui.Modal):
    """Modal for AI chat interaction"""
    
    def __init__(self, hub_view: AIHubView):
        super().__init__(title="💬 Chat with AI")
        self.hub_view = hub_view
        
        self.message_input = discord.ui.TextInput(
            label="Your Message",
            placeholder="Ask me anything! I'm in " + hub_view.ai_engine.current_mode + " mode.",
            style=discord.TextStyle.paragraph,
            required=True,
            max_length=1000
        )
        self.add_item(self.message_input)
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle AI chat request"""
        user_message = self.message_input.value.strip()
        
        # Show thinking embed
        thinking_embed = ModernEmbed.create_status_embed(
            "🤔 AI is thinking...",
            f"Processing your message in **{self.hub_view.ai_engine.current_mode}** mode...",
            status_type="loading"
        )
        
        await interaction.response.edit_message(embed=thinking_embed, view=None)
        
        try:
            # Generate AI response using new engine
            ai_response = await self.hub_view.ai_engine.generate_response(
                user_message,
                context={"user_id": interaction.user.id, "guild_id": interaction.guild_id}
            )
            
            # Create response embed
            response_embed = ModernEmbed.create_hub_embed(
                category=HubCategory.AI,
                title=f"🧠 AI Response ({self.hub_view.ai_engine.current_mode.title()} Mode)",
                description=f"**Your message:** {user_message}\n\n**AI Response:**\n{ai_response}",
                fields=[
                    {
                        "name": "💡 Continue Conversation",
                        "value": "Mention @Opure.exe in any channel or send a DM to continue chatting!",
                        "inline": False
                    }
                ]
            )
            
            await interaction.edit_original_response(embed=response_embed, view=None)
            
            # Store conversation in memory if available
            game_cog = self.hub_view.bot.get_cog('GameCog')
            if game_cog and hasattr(game_cog, 'memory_system'):
                try:
                    game_cog.memory_system.add(
                        user_id=str(interaction.user.id),
                        text_content=f"User: {user_message}"
                    )
                    game_cog.memory_system.add(
                        user_id=str(interaction.user.id),
                        text_content=f"AI: {ai_response}"
                    )
                except Exception as e:
                    self.hub_view.bot.add_error(f"Memory storage error: {e}")
            
        except Exception as e:
            # Show error embed
            error_embed = ModernEmbed.create_status_embed(
                "❌ AI Error",
                f"Sorry, I encountered an error processing your message:\n\n`{str(e)}`",
                color=0xff0000,
                status_type="error"
            )
            
            await interaction.edit_original_response(embed=error_embed, view=None)
            self.hub_view.bot.add_error(f"AI chat error: {e}")

class PersonalityModeSelect(discord.ui.Select):
    """Select menu for AI personality modes"""
    
    def __init__(self, hub_view: AIHubView):
        self.hub_view = hub_view
        
        options = [
            discord.SelectOption(
                label="Creative Mode",
                description="🎨 Artistic expression and innovation",
                value="creative",
                emoji="🎨"
            ),
            discord.SelectOption(
                label="Support Mode", 
                description="🛠️ Technical help and problem solving",
                value="support",
                emoji="🛠️"
            ),
            discord.SelectOption(
                label="Fun Mode",
                description="🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish personality with Rangers FC love",
                value="fun", 
                emoji="🏴󠁧󠁢󠁳󠁣󠁴󠁿",
                default=True
            ),
            discord.SelectOption(
                label="Gaming Mode",
                description="🎮 Gaming expertise and competitive spirit",
                value="gaming",
                emoji="🎮"
            ),
            discord.SelectOption(
                label="Analysis Mode",
                description="📊 Data analysis and logical reasoning", 
                value="analysis",
                emoji="📊"
            )
        ]
        
        super().__init__(placeholder="Select AI personality mode...", options=options)
    
    async def callback(self, interaction: discord.Interaction):
        """Handle personality mode selection"""
        selected_mode = self.values[0]
        
        # Update AI engine personality
        success = await self.hub_view.ai_engine.set_personality_mode(selected_mode)
        
        if success:
            embed = ModernEmbed.create_status_embed(
                "✅ Personality Updated",
                f"AI is now in **{selected_mode.title()}** mode!\n\nPersonality change will affect all future interactions.",
                status_type="success"
            )
        else:
            embed = ModernEmbed.create_status_embed(
                "❌ Mode Change Failed",
                f"Could not switch to {selected_mode} mode.",
                color=0xff0000,
                status_type="error"
            )
        
        await interaction.response.edit_message(embed=embed, view=None)

class AIHubCog(commands.Cog):
    """AI Interaction Hub Command System"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ai_engine = NewAIEngine(bot)
    
    @commands.hybrid_command(name="ai", description="🧠 Open the AI interaction hub")
    async def ai_hub(self, ctx: commands.Context):
        """Main AI hub command"""
        # Create hub view
        hub_view = AIHubView(self.bot, ctx.author)
        
        # Get initial embed
        embed = await hub_view.get_embed_for_page()
        
        # Send hub interface
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed, view=hub_view, ephemeral=False)
            hub_view.message = await ctx.interaction.original_response()
        else:
            message = await ctx.send(embed=embed, view=hub_view)
            hub_view.message = message
    
    @commands.hybrid_command(name="ask", description="🤔 Quick AI question")
    async def quick_ask(self, ctx: commands.Context, *, question: str):
        """Quick AI question without opening hub"""
        # Show thinking embed
        embed = ModernEmbed.create_status_embed(
            "🤔 AI is processing...",
            f"Question: `{question}`",
            status_type="loading"
        )
        
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed)
        else:
            message = await ctx.send(embed=embed)
        
        try:
            # Generate AI response
            ai_response = await self.ai_engine.generate_response(
                question,
                context={"user_id": ctx.author.id, "guild_id": ctx.guild.id if ctx.guild else None}
            )
            
            # Show response
            response_embed = ModernEmbed.create_hub_embed(
                category=HubCategory.AI,
                title="🧠 AI Response",
                description=f"**Q:** {question}\n\n**A:** {ai_response}",
                fields=[
                    {
                        "name": "💬 Continue",
                        "value": "Use `/ai` for the full AI hub interface!",
                        "inline": False
                    }
                ]
            )
            
            if ctx.interaction:
                await ctx.interaction.edit_original_response(embed=response_embed)
            else:
                await message.edit(embed=response_embed)
                
        except Exception as e:
            error_embed = ModernEmbed.create_status_embed(
                "❌ AI Error",
                f"Could not process question: {str(e)}",
                color=0xff0000,
                status_type="error"
            )
            
            if ctx.interaction:
                await ctx.interaction.edit_original_response(embed=error_embed)
            else:
                await message.edit(embed=error_embed)

async def setup(bot):
    """Setup function for the cog"""
    await bot.add_cog(AIHubCog(bot))