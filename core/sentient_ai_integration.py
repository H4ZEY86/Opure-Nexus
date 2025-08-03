# core/sentient_ai_integration.py - Main Integration Hub for Sentient AI Ecosystem

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any
import discord
from discord.ext import commands

# Import all specialized systems
from .ai_orchestrator import get_orchestrator, generate_ai_response
from .enhanced_memory import get_collective_memory, get_personality_memory
from .live_data_feeds import get_live_data_manager, get_activity_tracker
from .gpu_optimizer import get_gpu_optimizer
from .training_pipeline import get_training_pipeline

logger = logging.getLogger(__name__)

class SentientAIIntegration:
    """Main integration class for the sentient AI ecosystem"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.initialized = False
        
        # Core systems
        self.orchestrator = None
        self.collective_memory = None
        self.live_data_manager = None
        self.activity_tracker = None
        self.gpu_optimizer = None
        self.training_pipeline = None
        
        # Performance tracking
        self.performance_metrics = {
            "total_interactions": 0,
            "successful_responses": 0,
            "average_response_time": 0.0,
            "model_switches": 0,
            "memory_operations": 0,
            "training_data_collected": 0
        }
        
        self.start_time = time.time()
        
    async def initialize(self):
        """Initialize all AI systems"""
        if self.initialized:
            return
            
        logger.info("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Initializing Opure.exe Sentient AI Ecosystem...")
        
        try:
            # Initialize core systems
            self.orchestrator = await get_orchestrator()
            self.collective_memory = get_collective_memory()
            self.live_data_manager = await get_live_data_manager()
            self.activity_tracker = get_activity_tracker(self.bot)
            self.gpu_optimizer = get_gpu_optimizer()
            self.training_pipeline = get_training_pipeline()
            
            # Start monitoring systems
            await self.gpu_optimizer.start_monitoring()
            
            # Register Discord event handlers
            self._register_event_handlers()
            
            self.initialized = True
            logger.info("✅ Sentient AI ecosystem initialized successfully!")
            
            # Log system status
            await self._log_system_status()
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize sentient AI ecosystem: {e}")
            raise
            
    def _register_event_handlers(self):
        """Register Discord event handlers for real-time learning"""
        
        @self.bot.event
        async def on_message(message):
            """Track message activity for context awareness"""
            if message.author == self.bot.user:
                return
                
            # Track activity for live context
            self.activity_tracker.track_message(message)
            
            # Don't process if not mentioned or in DM
            if not (self.bot.user in message.mentions or isinstance(message.channel, discord.DMChannel)):
                return
                
            # Process AI interaction
            await self._handle_ai_interaction(message)
            
        @self.bot.event
        async def on_voice_state_update(member, before, after):
            """Track voice activity for social context"""
            self.activity_tracker.track_voice_activity(member, before, after)
            
        @self.bot.event
        async def on_reaction_add(reaction, user):
            """Track reactions for feedback learning"""
            if user == self.bot.user:
                return
                
            # Use reactions as implicit feedback
            await self._process_reaction_feedback(reaction, user, positive=True)
            
        @self.bot.event 
        async def on_reaction_remove(reaction, user):
            """Track reaction removals"""
            if user == self.bot.user:
                return
                
            await self._process_reaction_feedback(reaction, user, positive=False)
            
    async def _handle_ai_interaction(self, message: discord.Message):
        """Handle AI interaction with full ecosystem integration"""
        
        start_time = time.time()
        
        try:
            # Clean the message content
            user_input = message.content
            for mention in message.mentions:
                user_input = user_input.replace(f'<@{mention.id}>', '').strip()
            for mention in message.role_mentions:
                user_input = user_input.replace(f'<@&{mention.id}>', '').strip()
                
            if not user_input:
                user_input = "Hello!"
                
            # Build context
            context = await self._build_interaction_context(message)
            
            # Generate AI response using orchestrator
            conversation_id = f"{message.guild.id}_{message.channel.id}" if message.guild else f"dm_{message.author.id}"
            
            ai_response = await generate_ai_response(
                user_input=user_input,
                user_id=str(message.author.id),
                conversation_id=conversation_id,
                context=context
            )
            
            # Send response
            if len(ai_response) > 2000:
                # Split long responses
                chunks = [ai_response[i:i+2000] for i in range(0, len(ai_response), 2000)]
                for chunk in chunks:
                    await message.reply(chunk)
            else:
                await message.reply(ai_response)
                
            # Collect training data
            response_time = time.time() - start_time
            await self._collect_interaction_data(message, user_input, ai_response, context, response_time)
            
            # Update performance metrics
            self.performance_metrics["total_interactions"] += 1
            self.performance_metrics["successful_responses"] += 1
            
            # Update response time average
            current_avg = self.performance_metrics["average_response_time"]
            total_interactions = self.performance_metrics["total_interactions"]
            self.performance_metrics["average_response_time"] = (
                (current_avg * (total_interactions - 1) + response_time) / total_interactions
            )
            
        except Exception as e:
            logger.error(f"Error handling AI interaction: {e}")
            
            # Send fallback response
            fallback_responses = [
                "Och, I'm having a wee bit of trouble with my digital consciousness right now. Please try again in a moment! 🏴󠁧󠁢󠁳󠁣󠁴󠁿",
                "My Highland circuits are a bit tangled at the moment. Give me a second to sort myself out! ⚡",
                "Something's gone awry in the digital highlands. Let me reconnect my consciousness! 🔧"
            ]
            
            import random
            await message.reply(random.choice(fallback_responses))
            
    async def _build_interaction_context(self, message: discord.Message) -> Dict[str, Any]:
        """Build comprehensive context for AI interaction"""
        
        context = {
            "user_id": str(message.author.id),
            "username": message.author.display_name,
            "channel_type": "dm" if isinstance(message.channel, discord.DMChannel) else "guild",
            "timestamp": time.time(),
            "message_length": len(message.content)
        }
        
        # Guild context
        if message.guild:
            context.update({
                "guild_id": str(message.guild.id),
                "guild_name": message.guild.name,
                "channel_id": str(message.channel.id),
                "channel_name": message.channel.name,
                "member_count": message.guild.member_count
            })
            
            # Get current activity context
            activity_context = self.activity_tracker.get_current_activity_context(str(message.guild.id))
            context["discord_activity"] = activity_context
            
        # Get user memory context
        user_memory = get_personality_memory("core")
        user_profile = user_memory.get_user_profile(str(message.author.id))
        context["user_profile"] = user_profile
        
        # Get contextual memories
        context_keywords = message.content.lower().split()[:10]  # First 10 words as keywords
        relevant_memories = user_memory.get_contextual_memories(
            str(message.author.id), 
            context_keywords, 
            limit=5
        )
        context["relevant_memories"] = [
            {
                "content": mem.content,
                "timestamp": mem.timestamp,
                "importance": mem.importance.value
            } for mem in relevant_memories
        ]
        
        # Get live data context
        live_context = self.live_data_manager.get_contextual_data(message.content)
        if live_context:
            context["live_data"] = live_context
            
        # GPU and system context
        gpu_status = self.gpu_optimizer.get_status_report()
        context["system_status"] = {
            "gpu_usage": gpu_status["gpu_metrics"]["memory_usage_percent"],
            "loaded_models": gpu_status["loaded_models"]
        }
        
        return context
        
    async def _collect_interaction_data(self, message: discord.Message, user_input: str, 
                                      ai_response: str, context: Dict[str, Any], 
                                      response_time: float):
        """Collect interaction data for continuous learning"""
        
        try:
            # Determine which model primarily handled the response
            model_source = context.get("primary_model", "opure-core")
            
            # Calculate quality score based on response time and context
            quality_score = self._calculate_response_quality(
                user_input, ai_response, response_time, context
            )
            
            # Collect data for training pipeline
            self.training_pipeline.collect_interaction_data(
                user_id=str(message.author.id),
                model_source=model_source,
                user_input=user_input,
                ai_response=ai_response,
                context=context,
                quality_feedback=quality_score
            )
            
            # Store in memory system
            from .enhanced_memory import MemoryType, MemoryImportance
            
            memory_system = get_personality_memory("core")
            memory_system.store_memory(
                user_id=str(message.author.id),
                memory_type=MemoryType.EPISODIC,
                content={
                    "user_input": user_input,
                    "ai_response": ai_response,
                    "response_time": response_time
                },
                context=context,
                importance=MemoryImportance.MEDIUM if quality_score > 0.7 else MemoryImportance.LOW
            )
            
            self.performance_metrics["training_data_collected"] += 1
            self.performance_metrics["memory_operations"] += 1
            
        except Exception as e:
            logger.error(f"Error collecting interaction data: {e}")
            
    def _calculate_response_quality(self, user_input: str, ai_response: str, 
                                  response_time: float, context: Dict[str, Any]) -> float:
        """Calculate quality score for the interaction"""
        
        quality_score = 0.5  # Base score
        
        # Response time factor (faster is generally better, but not too fast)
        if 0.5 <= response_time <= 2.0:
            quality_score += 0.2
        elif response_time > 5.0:
            quality_score -= 0.1
            
        # Response length appropriateness
        response_length = len(ai_response)
        if 50 <= response_length <= 1000:
            quality_score += 0.1
        elif response_length < 20 or response_length > 2000:
            quality_score -= 0.1
            
        # Scottish personality consistency
        scottish_indicators = ["och", "bonnie", "wee", "ken", "highland", "clan", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"]
        scottish_count = sum(1 for indicator in scottish_indicators 
                           if indicator.lower() in ai_response.lower())
        if scottish_count > 0:
            quality_score += min(0.2, scottish_count * 0.05)
            
        # Context relevance (if user profile suggests preferences)
        user_profile = context.get("user_profile", {})
        if user_profile:
            profile_data = user_profile.get("profile_data", {})
            if profile_data.get("total_interactions", 0) > 10:  # Established user
                quality_score += 0.1
                
        return max(0.0, min(1.0, quality_score))
        
    async def _process_reaction_feedback(self, reaction: discord.Reaction, 
                                       user: discord.User, positive: bool):
        """Process reaction feedback for learning"""
        
        try:
            # Only process reactions to bot messages
            if reaction.message.author != self.bot.user:
                return
                
            # Map reaction types to feedback
            positive_reactions = ["👍", "❤️", "😊", "✅", "🎉", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"]
            negative_reactions = ["👎", "😞", "❌", "😕", "🤔"]
            
            reaction_feedback = None
            
            if str(reaction.emoji) in positive_reactions:
                reaction_feedback = 0.8 if positive else 0.4
            elif str(reaction.emoji) in negative_reactions:
                reaction_feedback = 0.2 if positive else 0.6  # Removing negative reaction is somewhat positive
                
            if reaction_feedback is not None:
                # Store feedback for training
                context = {
                    "feedback_type": "reaction",
                    "reaction_emoji": str(reaction.emoji),
                    "feedback_positive": positive,
                    "message_id": str(reaction.message.id)
                }
                
                self.training_pipeline.collect_preference_data(
                    user_id=str(user.id),
                    query="reaction_feedback",
                    preferred_response=reaction.message.content,
                    rejected_response="",
                    context=context
                )
                
        except Exception as e:
            logger.error(f"Error processing reaction feedback: {e}")
            
    async def _log_system_status(self):
        """Log comprehensive system status"""
        
        gpu_status = self.gpu_optimizer.get_status_report()
        training_stats = self.training_pipeline.get_training_stats()
        
        status_report = f"""
🏴󠁧󠁢󠁳󠁣󠁴󠁿 Opure.exe Sentient AI Ecosystem Status 🏴󠁧󠁢󠁳󠁣󠁴󠁿

GPU Status (RTX 5070 Ti):
  • Memory Usage: {gpu_status['gpu_metrics']['memory_usage_percent']:.1f}%
  • Loaded Models: {len(gpu_status['loaded_models'])}
  • Temperature: {gpu_status['gpu_metrics']['temperature']:.1f}°C

Training Pipeline:
  • Training Available: {training_stats['training_available']}
  • Total Data Points: {training_stats['total_data_points']}
  
Performance:
  • Uptime: {(time.time() - self.start_time) / 3600:.1f} hours
  • Total Interactions: {self.performance_metrics['total_interactions']}
  • Average Response Time: {self.performance_metrics['average_response_time']:.2f}s

Systems Online: ✅ All systems operational
        """
        
        logger.info(status_report)
        
    async def handle_admin_command(self, ctx: commands.Context, command: str, *args) -> str:
        """Handle admin commands for system management"""
        
        if command == "status":
            return await self._get_detailed_status()
        elif command == "models":
            return await self._get_model_status()
        elif command == "memory":
            return await self._get_memory_status(args[0] if args else None)
        elif command == "training":
            return await self._get_training_status()
        elif command == "optimize":
            return await self._optimize_system(args[0] if args else "balanced")
        elif command == "reload":
            return await self._reload_system()
        else:
            return "Unknown admin command. Available: status, models, memory, training, optimize, reload"
            
    async def _get_detailed_status(self) -> str:
        """Get detailed system status"""
        
        gpu_status = self.gpu_optimizer.get_status_report()
        orchestrator_status = self.orchestrator.get_system_status()
        
        status = f"""**🏴󠁧󠁢󠁳󠁣󠁴󠁿 Opure.exe Sentient AI Status**

**GPU (RTX 5070 Ti):**
• Memory: {gpu_status['gpu_metrics']['memory_used_mb']:.0f}MB / {gpu_status['gpu_metrics']['memory_total_mb']:.0f}MB ({gpu_status['gpu_metrics']['memory_usage_percent']:.1f}%)
• Temperature: {gpu_status['gpu_metrics']['temperature']:.1f}°C
• Utilization: {gpu_status['gpu_metrics']['utilization']:.1f}%

**AI Models:**
• Loaded: {len(orchestrator_status['loaded_models'])}
• Active: {sum(1 for model in orchestrator_status['models'].values() if model['is_loaded'])}

**Performance:**
• Uptime: {orchestrator_status['uptime'] / 3600:.1f} hours
• Total Interactions: {self.performance_metrics['total_interactions']}
• Success Rate: {(self.performance_metrics['successful_responses'] / max(1, self.performance_metrics['total_interactions']) * 100):.1f}%
• Avg Response Time: {self.performance_metrics['average_response_time']:.2f}s

**System Health:** {"🟢 Optimal" if gpu_status['gpu_metrics']['memory_usage_percent'] < 75 else "🟡 High Load" if gpu_status['gpu_metrics']['memory_usage_percent'] < 90 else "🔴 Critical"}
        """
        
        return status
        
    async def _get_model_status(self) -> str:
        """Get model-specific status"""
        
        orchestrator_status = self.orchestrator.get_system_status()
        
        status = "**🤖 AI Model Status**\n\n"
        
        for model_name, model_info in orchestrator_status['models'].items():
            status_emoji = "🟢" if model_info['is_loaded'] else "⚪"
            status += f"{status_emoji} **{model_name}**\n"
            status += f"  • Loaded: {'Yes' if model_info['is_loaded'] else 'No'}\n"
            status += f"  • Requests: {model_info['request_count']}\n"
            status += f"  • Avg Response: {model_info['response_time_avg']:.2f}s\n"
            status += f"  • Errors: {model_info['error_count']}\n\n"
            
        return status
        
    async def _get_memory_status(self, user_id: str = None) -> str:
        """Get memory system status"""
        
        if user_id:
            # Get specific user memory
            memory_system = get_personality_memory("core")
            user_profile = memory_system.get_user_profile(user_id)
            
            status = f"**🧠 Memory Status for User {user_id}**\n\n"
            status += f"• Total Interactions: {user_profile['profile_data']['total_interactions']}\n"
            status += f"• Favorite Topics: {', '.join(user_profile['profile_data']['favorite_topics'][:3])}\n"
            status += f"• Last Updated: {time.ctime(user_profile['last_updated'])}\n"
        else:
            # Get general memory status
            status = "**🧠 Memory System Status**\n\n"
            status += f"• Memory Operations: {self.performance_metrics['memory_operations']}\n"
            status += "• Personalities Active: Core, Music, Adventure, Economy, Social, Analytics, Memory\n"
            status += "• Collective Learning: Active\n"
            
        return status
        
    async def _get_training_status(self) -> str:
        """Get training pipeline status"""
        
        training_stats = self.training_pipeline.get_training_stats()
        
        status = "**📚 Training Pipeline Status**\n\n"
        status += f"• Training Available: {'Yes' if training_stats['training_available'] else 'No'}\n"
        status += f"• Total Data Points: {training_stats['total_data_points']}\n"
        status += f"• Data Collected: {self.performance_metrics['training_data_collected']}\n"
        
        if training_stats['data_statistics']:
            status += "\n**Data by Type:**\n"
            for data_type, stats in training_stats['data_statistics'].items():
                status += f"• {data_type}: {stats['count']} (avg quality: {stats['avg_quality']:.2f})\n"
                
        return status
        
    async def _optimize_system(self, workload_type: str) -> str:
        """Optimize system for specific workload"""
        
        # Get current models that might be needed
        expected_models = ["opure-core", "opure-music", "opure-adventure", "opure-economy", 
                          "opure-social", "opure-analytics", "opure-memory"]
        
        optimization = await self.gpu_optimizer.optimize_for_workload(workload_type, expected_models)
        
        status = f"**⚡ System Optimized for {workload_type}**\n\n"
        status += f"• VRAM Reserved: {optimization['reserved_vram']}MB\n"
        status += f"• Estimated Usage: {optimization['estimated_vram_usage']}MB\n"
        status += f"• Max Concurrent Models: {optimization['strategy']['max_concurrent_models']}\n"
        
        return status
        
    async def _reload_system(self) -> str:
        """Reload AI system"""
        
        try:
            # Stop monitoring
            await self.gpu_optimizer.stop_monitoring()
            
            # Reinitialize
            await self.initialize()
            
            return "**🔄 System Reloaded Successfully**\n\nAll AI systems have been reinitialized."
            
        except Exception as e:
            return f"**❌ Reload Failed**\n\nError: {str(e)}"

# Global integration instance
sentient_ai = None

def get_sentient_ai(bot: commands.Bot) -> SentientAIIntegration:
    """Get or create global sentient AI integration"""
    global sentient_ai
    if sentient_ai is None:
        sentient_ai = SentientAIIntegration(bot)
    return sentient_ai