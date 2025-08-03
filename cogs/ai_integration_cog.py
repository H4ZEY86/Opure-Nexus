"""
AI Integration Cog - Enhanced Discord Bot AI Features
Leverages the AI Gateway for advanced AI capabilities
"""

import asyncio
import discord
from discord.ext import commands, tasks
import logging
import json
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import traceback
import os

# Local imports
from utils.ai_gateway_client import (
    AIGatewayClient, AIRequest, AIMessage, TokenEvaluation, 
    ContentType, Priority, ai_gateway_client, quick_ai_response,
    evaluate_content_quality, AIGatewayError
)

logger = logging.getLogger(__name__)

class AIIntegrationCog(commands.Cog):
    """Advanced AI integration using the local AI Gateway"""
    
    def __init__(self, bot):
        self.bot = bot
        self.gateway_client: Optional[AIGatewayClient] = None
        
        # Configuration
        self.gateway_url = os.getenv("AI_GATEWAY_URL", "http://localhost:3002")
        self.api_key = os.getenv("AI_GATEWAY_API_KEY")
        
        # Performance tracking
        self.ai_requests_count = 0
        self.ai_errors_count = 0
        self.token_evaluations_count = 0
        
        # Feature flags
        self.auto_quality_evaluation = True
        self.ai_moderation_enabled = True
        self.smart_responses_enabled = True
        
        # Start background tasks
        self.gateway_health_monitor.start()
        self.performance_sync.start()
        
    async def cog_load(self):
        """Initialize AI Gateway client when cog loads"""
        try:
            self.gateway_client = AIGatewayClient(
                gateway_url=self.gateway_url,
                api_key=self.api_key,
                timeout=30.0,
                enable_websocket=True
            )
            await self.gateway_client.initialize()
            
            # Setup WebSocket event handlers
            self.gateway_client.on_event('system:alert', self._handle_system_alert)
            self.gateway_client.on_event('performance:update', self._handle_performance_update)
            
            logger.info("AI Gateway client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize AI Gateway client: {e}")
            self.gateway_client = None
    
    async def cog_unload(self):
        """Cleanup when cog unloads"""
        self.gateway_health_monitor.stop()
        self.performance_sync.stop()
        
        if self.gateway_client:
            await self.gateway_client.close()
            
        logger.info("AI Integration cog unloaded")
    
    # Event Handlers
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Enhanced message processing with AI integration"""
        if message.author.bot or not message.guild:
            return
        
        # Auto-evaluate content quality for token rewards
        if self.auto_quality_evaluation and len(message.content) > 10:
            asyncio.create_task(self._auto_evaluate_message(message))
        
        # AI moderation
        if self.ai_moderation_enabled:
            asyncio.create_task(self._moderate_message(message))
        
        # Smart responses for mentions
        if self.smart_responses_enabled and self.bot.user in message.mentions:
            asyncio.create_task(self._handle_smart_mention(message))
    
    @commands.Cog.listener()
    async def on_message_edit(self, before: discord.Message, after: discord.Message):
        """Handle message edits for quality re-evaluation"""
        if after.author.bot or not after.guild:
            return
        
        # Re-evaluate edited content
        if self.auto_quality_evaluation and len(after.content) > 10:
            asyncio.create_task(self._auto_evaluate_message(after, is_edit=True))
    
    # Slash Commands
    
    @discord.slash_command(name="ai", description="Interact with the AI system")
    async def ai_command(self, ctx):
        """AI command group"""
        pass
    
    @ai_command.command(name="chat", description="Have a conversation with AI")
    async def ai_chat(
        self, 
        ctx: discord.ApplicationContext,
        message: discord.Option(str, "Your message to the AI", max_length=2000),
        model: discord.Option(
            str, 
            "AI model to use",
            choices=["opure-core", "opure-music", "opure-adventure", "opure-social"],
            default="opure-core"
        ),
        private: discord.Option(bool, "Make response private", default=False)
    ):
        """Chat with AI using specified model"""
        await ctx.defer(ephemeral=private)
        
        try:
            if not self.gateway_client:
                await ctx.followup.send("🚫 AI Gateway not available", ephemeral=True)
                return
            
            # Create AI request
            request = AIRequest(
                model=model,
                messages=[AIMessage(role="user", content=message)],
                priority=Priority.NORMAL,
                conversation_id=f"discord_{ctx.guild.id}_{ctx.user.id}",
                metadata={
                    "user_id": str(ctx.user.id),
                    "guild_id": str(ctx.guild.id),
                    "channel_id": str(ctx.channel.id),
                    "source": "discord_slash_command"
                }
            )
            
            # Generate response
            start_time = time.time()
            response = await self.gateway_client.generate_ai_response(request)
            response_time = time.time() - start_time
            
            self.ai_requests_count += 1
            
            if response.success:
                # Create embed for response
                embed = discord.Embed(
                    title=f"🤖 {model.title()} Response",
                    description=response.content[:4000],  # Discord embed limit
                    color=self._get_model_color(model),
                    timestamp=datetime.now()
                )
                
                embed.add_field(
                    name="⚡ Performance",
                    value=f"Response time: {response_time:.2f}s\nProcessing: {response.processing_time:.0f}ms",
                    inline=True
                )
                
                embed.add_field(
                    name="🎯 Model",
                    value=f"Used: {response.model}\nPriority: {request.priority.value}",
                    inline=True
                )
                
                embed.set_footer(text=f"Requested by {ctx.user.display_name}")
                
                await ctx.followup.send(embed=embed)
                
                # Log successful interaction
                logger.info(f"AI chat successful: {ctx.user.id} -> {model} ({response_time:.2f}s)")
                
            else:
                self.ai_errors_count += 1
                await ctx.followup.send(f"❌ AI Error: {response.error}", ephemeral=True)
                
        except Exception as e:
            self.ai_errors_count += 1
            logger.error(f"AI chat command error: {e}\n{traceback.format_exc()}")
            await ctx.followup.send(f"🚫 Unexpected error: {str(e)[:100]}", ephemeral=True)
    
    @ai_command.command(name="stream", description="Stream AI response in real-time")
    async def ai_stream(
        self,
        ctx: discord.ApplicationContext,
        message: discord.Option(str, "Your message to the AI", max_length=2000),
        model: discord.Option(
            str,
            "AI model to use", 
            choices=["opure-core", "opure-music", "opure-adventure"],
            default="opure-core"
        )
    ):
        """Stream AI response with real-time updates"""
        await ctx.defer()
        
        try:
            if not self.gateway_client or not self.gateway_client.ws_connected:
                await ctx.followup.send("🚫 Real-time streaming not available", ephemeral=True)
                return
            
            # Initial response message
            embed = discord.Embed(
                title=f"🔄 Streaming {model.title()} Response...",
                description="```\nGenerating response...\n```",
                color=discord.Color.blue()
            )
            
            response_msg = await ctx.followup.send(embed=embed)
            
            # Streaming variables
            content_chunks = []
            last_update = time.time()
            
            async def chunk_handler(chunk: str, progress: float):
                nonlocal content_chunks, last_update
                content_chunks.append(chunk)
                
                # Update every 1 second or at completion
                current_time = time.time()
                if current_time - last_update >= 1.0 or progress >= 1.0:
                    current_content = ''.join(content_chunks)
                    
                    embed = discord.Embed(
                        title=f"🤖 {model.title()} Response",
                        description=f"```\n{current_content[:3900]}\n```",
                        color=self._get_model_color(model)
                    )
                    
                    embed.add_field(
                        name="Progress",
                        value=f"{progress * 100:.1f}% complete",
                        inline=True
                    )
                    
                    try:
                        await response_msg.edit(embed=embed)
                        last_update = current_time
                    except discord.NotFound:
                        # Message was deleted
                        return
            
            # Create request and stream
            request = AIRequest(
                model=model,
                messages=[AIMessage(role="user", content=message)],
                conversation_id=f"stream_{ctx.guild.id}_{ctx.user.id}",
                metadata={"source": "discord_stream"}
            )
            
            response = await self.gateway_client.stream_ai_response(request, chunk_handler)
            
            if response.success:
                # Final update
                final_embed = discord.Embed(
                    title=f"✅ {model.title()} Response Complete",
                    description=response.content[:4000],
                    color=discord.Color.green(),
                    timestamp=datetime.now()
                )
                
                final_embed.add_field(
                    name="⚡ Performance",
                    value=f"Total time: {response.total_time:.0f}ms",
                    inline=True
                )
                
                await response_msg.edit(embed=final_embed)
            else:
                error_embed = discord.Embed(
                    title="❌ Streaming Failed",
                    description=f"Error: {response.error}",
                    color=discord.Color.red()
                )
                await response_msg.edit(embed=error_embed)
                
        except Exception as e:
            logger.error(f"AI stream error: {e}")
            error_embed = discord.Embed(
                title="🚫 Stream Error",
                description=f"Failed to stream response: {str(e)[:200]}",
                color=discord.Color.red()
            )
            try:
                await response_msg.edit(embed=error_embed)
            except:
                await ctx.followup.send(embed=error_embed)
    
    @ai_command.command(name="evaluate", description="Evaluate content quality for token rewards")
    async def ai_evaluate(
        self,
        ctx: discord.ApplicationContext,
        content: discord.Option(str, "Content to evaluate", max_length=5000),
        content_type: discord.Option(
            str,
            "Type of content",
            choices=["message", "marketplace_item", "game_action", "achievement", "other"],
            default="message"
        )
    ):
        """Evaluate content quality using AI"""
        await ctx.defer()
        
        try:
            if not self.gateway_client:
                await ctx.followup.send("🚫 AI Gateway not available", ephemeral=True)
                return
            
            # Evaluate content
            evaluation = TokenEvaluation(
                content=content,
                content_type=ContentType(content_type),
                metadata={
                    "user_id": str(ctx.user.id),
                    "manual_evaluation": True
                }
            )
            
            result = await self.gateway_client.evaluate_content_for_tokens(evaluation)
            self.token_evaluations_count += 1
            
            # Create detailed evaluation embed
            embed = discord.Embed(
                title="📊 Content Quality Evaluation",
                color=discord.Color.green() if result.approved else discord.Color.red(),
                timestamp=datetime.now()
            )
            
            # Status field
            status_emoji = "✅" if result.approved else "❌"
            embed.add_field(
                name=f"{status_emoji} Status",
                value=f"**Approved:** {result.approved}\n**Tokens:** {result.amount}",
                inline=True
            )
            
            # Quality metrics
            quality = result.quality
            quality_text = f"""
            **Overall:** {quality.get('overall', 0) * 100:.1f}%
            **Complexity:** {quality.get('complexity', 0) * 100:.1f}%
            **Originality:** {quality.get('originality', 0) * 100:.1f}%
            **Engagement:** {quality.get('engagement', 0) * 100:.1f}%
            **Grammar:** {quality.get('grammar', 0) * 100:.1f}%
            """
            
            embed.add_field(
                name="📈 Quality Metrics",
                value=quality_text.strip(),
                inline=True
            )
            
            # Fraud detection
            fraud = result.fraud
            fraud_text = f"""
            **Score:** {fraud.get('score', 0) * 100:.1f}%
            **Recommendation:** {fraud.get('recommendation', 'unknown').title()}
            **Confidence:** {fraud.get('confidence', 0) * 100:.1f}%
            """
            
            embed.add_field(
                name="🛡️ Fraud Detection",
                value=fraud_text.strip(),
                inline=True
            )
            
            # Add content preview
            preview = content[:200] + "..." if len(content) > 200 else content
            embed.add_field(
                name="📝 Content Preview",
                value=f"```\n{preview}\n```",
                inline=False
            )
            
            # Add tips for improvement if not approved
            if not result.approved:
                tips = []
                if quality.get('overall', 0) < 0.5:
                    tips.append("• Improve overall content quality")
                if quality.get('length', 0) < 0.3:
                    tips.append("• Add more detail and depth")
                if quality.get('originality', 0) < 0.4:
                    tips.append("• Make content more original and creative")
                if fraud.get('score', 0) > 0.5:
                    tips.append("• Content flagged by fraud detection")
                
                if tips:
                    embed.add_field(
                        name="💡 Improvement Tips",
                        value="\n".join(tips),
                        inline=False
                    )
            
            embed.set_footer(text=f"Evaluation type: {content_type}")
            
            await ctx.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"AI evaluate error: {e}")
            await ctx.followup.send(f"🚫 Evaluation failed: {str(e)[:100]}", ephemeral=True)
    
    @ai_command.command(name="status", description="Check AI Gateway status and performance")
    async def ai_status(self, ctx: discord.ApplicationContext):
        """Display AI Gateway status and performance metrics"""
        await ctx.defer()
        
        try:
            if not self.gateway_client:
                embed = discord.Embed(
                    title="🚫 AI Gateway Status",
                    description="AI Gateway client not initialized",
                    color=discord.Color.red()
                )
                await ctx.followup.send(embed=embed, ephemeral=True)
                return
            
            # Get health status
            health = await self.gateway_client.health_check()
            
            # Get model status
            models = await self.gateway_client.get_model_status()
            
            # Get client performance stats
            client_stats = self.gateway_client.get_performance_stats()
            
            # Create status embed
            embed = discord.Embed(
                title="🤖 AI Gateway Status",
                color=discord.Color.green() if health.get('status') == 'healthy' else discord.Color.orange(),
                timestamp=datetime.now()
            )
            
            # System status
            status_text = f"""
            **Gateway:** {health.get('status', 'unknown').title()}
            **Uptime:** {health.get('uptime', 0):.1f}s
            **WebSocket:** {'🟢 Connected' if client_stats['websocket_connected'] else '🔴 Disconnected'}
            """
            
            embed.add_field(
                name="🔧 System Status",
                value=status_text.strip(),
                inline=True
            )
            
            # Model status
            loaded_models = models.get('loadedModels', [])
            model_text = f"""
            **Loaded Models:** {len(loaded_models)}
            **Queue Length:** {models.get('queueLength', 0)}
            **Gaming Mode:** {'🎮 Active' if models.get('gamingMode') else '⚡ Normal'}
            """
            
            if loaded_models:
                model_text += f"\n**Active:** {', '.join(loaded_models[:3])}"
                if len(loaded_models) > 3:
                    model_text += f" +{len(loaded_models) - 3} more"
            
            embed.add_field(
                name="🧠 AI Models",
                value=model_text.strip(),
                inline=True
            )
            
            # Performance stats
            perf_text = f"""
            **Total Requests:** {self.ai_requests_count}
            **Success Rate:** {client_stats['success_rate']:.1f}%
            **Avg Response:** {client_stats['average_response_time']:.2f}s
            **Token Evaluations:** {self.token_evaluations_count}
            """
            
            embed.add_field(
                name="📊 Performance",
                value=perf_text.strip(),
                inline=True
            )
            
            # Resource usage
            resource_usage = models.get('resourceUsage', {})
            if resource_usage:
                usage_text = f"""
                **VRAM Usage:** {resource_usage.get('utilizationPercent', 0):.1f}%
                **Max VRAM:** {resource_usage.get('maxVRAM', 0)/1024:.1f}GB
                **Estimated Usage:** {resource_usage.get('estimatedVRAM', 0)/1024:.1f}GB
                """
                
                embed.add_field(
                    name="💾 Resource Usage",
                    value=usage_text.strip(),
                    inline=False
                )
            
            await ctx.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"AI status error: {e}")
            embed = discord.Embed(
                title="🚫 Status Check Failed",
                description=f"Failed to get AI Gateway status: {str(e)[:200]}",
                color=discord.Color.red()
            )
            await ctx.followup.send(embed=embed, ephemeral=True)
    
    # Background Tasks
    
    @tasks.loop(minutes=5)
    async def gateway_health_monitor(self):
        """Monitor AI Gateway health and reconnect if needed"""
        if not self.gateway_client:
            return
        
        try:
            health = await self.gateway_client.health_check()
            if health.get('status') != 'healthy':
                logger.warning(f"AI Gateway health warning: {health.get('status')}")
        
        except Exception as e:
            logger.error(f"AI Gateway health check failed: {e}")
            
            # Attempt to reconnect
            try:
                await self.gateway_client.close()
                await self.gateway_client.initialize()
                logger.info("AI Gateway reconnected successfully")
            except Exception as reconnect_error:
                logger.error(f"AI Gateway reconnection failed: {reconnect_error}")
    
    @tasks.loop(minutes=30)
    async def performance_sync(self):
        """Sync performance metrics with bot database"""
        if not self.gateway_client:
            return
        
        try:
            # Get analytics
            analytics = await self.gateway_client.get_analytics()
            
            # Update bot statistics
            # This could be integrated with the existing database
            logger.info(f"AI Performance sync: {self.ai_requests_count} requests, {self.ai_errors_count} errors")
            
        except Exception as e:
            logger.error(f"Performance sync error: {e}")
    
    # Private Methods
    
    async def _auto_evaluate_message(self, message: discord.Message, is_edit: bool = False):
        """Automatically evaluate message quality for token rewards"""
        try:
            if not self.gateway_client:
                return
            
            # Skip very short messages
            if len(message.content) < 20:
                return
            
            evaluation = TokenEvaluation(
                content=message.content,
                content_type=ContentType.MESSAGE,
                metadata={
                    "user_id": str(message.author.id),
                    "guild_id": str(message.guild.id),
                    "channel_id": str(message.channel.id),
                    "is_edit": is_edit,
                    "auto_evaluation": True
                }
            )
            
            result = await self.gateway_client.evaluate_content_for_tokens(evaluation)
            
            if result.approved and result.amount > 0:
                # Award tokens (integrate with existing economy system)
                if hasattr(self.bot, 'db') and self.bot.db:
                    try:
                        # Update user's fragment balance
                        await self.bot.db.execute(
                            "UPDATE players SET fragments = fragments + ? WHERE user_id = ?",
                            (result.amount, message.author.id)
                        )
                        await self.bot.db.commit()
                        
                        # React to indicate reward
                        await message.add_reaction("💎")
                        
                    except Exception as db_error:
                        logger.error(f"Database update error: {db_error}")
            
        except Exception as e:
            logger.error(f"Auto evaluation error: {e}")
    
    async def _moderate_message(self, message: discord.Message):
        """AI-powered message moderation"""
        try:
            if not self.gateway_client:
                return
            
            # Use AI to check for toxic content
            evaluation = TokenEvaluation(
                content=message.content,
                content_type=ContentType.MESSAGE,
                metadata={
                    "moderation_check": True,
                    "user_id": str(message.author.id)
                }
            )
            
            result = await self.gateway_client.evaluate_content_for_tokens(evaluation)
            
            # Check toxicity score
            toxicity = result.quality.get('toxicity', 0)
            
            if toxicity > 0.8:  # High toxicity threshold
                # Flag for moderator review
                logger.warning(f"High toxicity message detected: {message.author.id} in {message.guild.id}")
                
                # Could integrate with auto-moderation actions here
                
        except Exception as e:
            logger.error(f"AI moderation error: {e}")
    
    async def _handle_smart_mention(self, message: discord.Message):
        """Handle AI mentions with context-aware responses"""
        try:
            if not self.gateway_client:
                return
            
            # Clean mention from content
            content = message.content.replace(f'<@{self.bot.user.id}>', '').strip()
            if not content:
                return
            
            # Generate contextual response
            response_text = await quick_ai_response(
                content,
                model="opure-core",
                user_id=str(message.author.id),
                client=self.gateway_client
            )
            
            # Send response
            await message.reply(response_text[:2000])  # Discord message limit
            
        except Exception as e:
            logger.error(f"Smart mention error: {e}")
            await message.reply("I'm having trouble processing that request right now. 🤖")
    
    # WebSocket event handlers
    
    async def _handle_system_alert(self, data: Dict[str, Any]):
        """Handle system alerts from AI Gateway"""
        severity = data.get('severity', 'info')
        message = data.get('message', 'Unknown alert')
        component = data.get('component', 'system')
        
        logger.info(f"AI Gateway alert [{severity}] {component}: {message}")
        
        # Could send alerts to admin channels here
    
    async def _handle_performance_update(self, data: Dict[str, Any]):
        """Handle performance updates from AI Gateway"""
        # Could update bot status or metrics based on performance data
        gpu_usage = data.get('gpu', {}).get('utilization', 0)
        if gpu_usage > 90:
            logger.warning(f"High GPU usage detected: {gpu_usage}%")
    
    # Utility methods
    
    def _get_model_color(self, model: str) -> discord.Color:
        """Get color for AI model embeds"""
        colors = {
            "opure-core": discord.Color.blue(),
            "opure-music": discord.Color.purple(),
            "opure-adventure": discord.Color.green(),
            "opure-social": discord.Color.orange(),
            "opure-economy": discord.Color.gold(),
            "opure-analytics": discord.Color.dark_blue()
        }
        return colors.get(model, discord.Color.default())

async def setup(bot):
    """Setup function for cog loading"""
    await bot.add_cog(AIIntegrationCog(bot))