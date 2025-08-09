# core/sync_integration.py - Integration Layer for Real-Time Synchronization

import asyncio
import time
from typing import Dict, Any, Optional
from .realtime_sync_system import (
    RealTimeSyncManager, SyncEvent, SyncEventType, EventPriority,
    emit_command_event, emit_ai_response_event, emit_economy_event
)

class SyncIntegrationLayer:
    """Integration layer that connects the sync system with all bot components"""
    
    def __init__(self, bot, sync_manager: RealTimeSyncManager):
        self.bot = bot
        self.sync_manager = sync_manager
        self.integration_hooks = {}
        
    async def initialize(self):
        """Initialize all sync integrations"""
        await self._setup_bot_hooks()
        await self._setup_hub_hooks()
        await self._setup_ai_hooks()
        await self._setup_economy_hooks()
        await self._setup_performance_hooks()
        
        self.bot.add_log("🔗 Sync integration layer initialized")
    
    async def _setup_bot_hooks(self):
        """Set up hooks for Discord bot events"""
        
        # Override bot's track_command_usage to emit sync events
        original_track_command_usage = self.bot.track_command_usage
        
        async def track_command_usage_with_sync(interaction, command_name):
            start_time = time.time()
            success = True
            
            try:
                await original_track_command_usage(interaction, command_name)
            except Exception as e:
                success = False
                raise e
            finally:
                # Emit command execution event
                await emit_command_event(
                    self.sync_manager,
                    command_name,
                    interaction.user.id,
                    interaction.guild_id or 0,
                    success
                )
                
                # Emit performance metrics
                execution_time = (time.time() - start_time) * 1000
                await self._emit_performance_event('command_execution', {
                    'command': command_name,
                    'execution_time_ms': execution_time,
                    'success': success
                })
        
        # Replace the method
        self.bot.track_command_usage = track_command_usage_with_sync
        
        # Hook into error reporting
        original_add_error = self.bot.add_error
        
        def add_error_with_sync(message: str):
            original_add_error(message)
            
            # Emit error event asynchronously
            asyncio.create_task(self.sync_manager.emit_event(SyncEvent(
                event_type=SyncEventType.ERROR_OCCURRED,
                priority=EventPriority.HIGH,
                data={
                    'error_message': message,
                    'component': 'discord_bot'
                },
                timestamp=time.time(),
                source_system='discord_bot'
            )))
        
        self.bot.add_error = add_error_with_sync
    
    async def _setup_hub_hooks(self):
        """Set up hooks for hub system events"""
        
        # Hook into hub interactions
        def create_hub_hook(hub_category):
            async def on_hub_interaction(interaction, view_name):
                await self.sync_manager.emit_event(SyncEvent(
                    event_type=SyncEventType.HUB_NAVIGATION,
                    priority=EventPriority.MEDIUM,
                    data={
                        'hub_category': hub_category,
                        'view_name': view_name,
                        'user_display_name': interaction.user.display_name
                    },
                    timestamp=time.time(),
                    source_system='hub_system',
                    user_id=interaction.user.id,
                    guild_id=interaction.guild_id
                ))
            return on_hub_interaction
        
        # Store hooks for hub cogs to use
        self.integration_hooks['music_hub'] = create_hub_hook('music')
        self.integration_hooks['ai_hub'] = create_hub_hook('ai')
        self.integration_hooks['economy_hub'] = create_hub_hook('economy')
        self.integration_hooks['gaming_hub'] = create_hub_hook('gaming')
    
    async def _setup_ai_hooks(self):
        """Set up hooks for AI system events"""
        
        # Hook into AI response generation
        async def on_ai_response(user_id: int, prompt: str, response: str, mode: str, generation_time: float):
            await emit_ai_response_event(
                self.sync_manager,
                user_id,
                prompt,
                response,
                mode
            )
            
            # Also emit performance metrics
            await self._emit_performance_event('ai_generation', {
                'generation_time_ms': generation_time * 1000,
                'prompt_tokens': len(prompt.split()),
                'response_tokens': len(response.split()),
                'personality_mode': mode
            })
        
        self.integration_hooks['ai_response'] = on_ai_response
        
        # Hook into personality mode changes
        async def on_personality_change(user_id: int, old_mode: str, new_mode: str):
            await self.sync_manager.emit_event(SyncEvent(
                event_type=SyncEventType.PERSONALITY_CHANGED,
                priority=EventPriority.MEDIUM,
                data={
                    'old_mode': old_mode,
                    'new_mode': new_mode
                },
                timestamp=time.time(),
                source_system='ai_engine',
                user_id=user_id
            ))
        
        self.integration_hooks['personality_change'] = on_personality_change
    
    async def _setup_economy_hooks(self):
        """Set up hooks for economy system events"""
        
        # Hook into fragment transactions
        async def on_fragment_transaction(user_id: int, transaction_type: str, amount: int, new_balance: int):
            await emit_economy_event(
                self.sync_manager,
                user_id,
                transaction_type,
                amount,
                new_balance
            )
        
        self.integration_hooks['fragment_transaction'] = on_fragment_transaction
        
        # Hook into achievement unlocks
        async def on_achievement_unlock(user_id: int, achievement_name: str, fragment_reward: int):
            await self.sync_manager.emit_event(SyncEvent(
                event_type=SyncEventType.ACHIEVEMENT_UNLOCKED,
                priority=EventPriority.HIGH,
                data={
                    'achievement_name': achievement_name,
                    'fragment_reward': fragment_reward,
                    'unlock_time': time.time()
                },
                timestamp=time.time(),
                source_system='achievement_system',
                user_id=user_id
            ))
        
        self.integration_hooks['achievement_unlock'] = on_achievement_unlock
    
    async def _setup_performance_hooks(self):
        """Set up system performance monitoring"""
        
        # Start performance monitoring task
        asyncio.create_task(self._monitor_system_performance())
        
    async def _monitor_system_performance(self):
        """Background task to monitor and emit system performance"""
        import psutil
        
        while True:
            try:
                # Get system metrics
                cpu_percent = psutil.cpu_percent()
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                # Get bot-specific metrics
                bot_latency = self.bot.latency * 1000 if self.bot.is_ready() else 0
                guild_count = len(self.bot.guilds) if self.bot.is_ready() else 0
                user_count = len(self.bot.users) if self.bot.is_ready() else 0
                
                # Emit performance event
                await self.sync_manager.emit_event(SyncEvent(
                    event_type=SyncEventType.SYSTEM_STATUS_CHANGE,
                    priority=EventPriority.LOW,
                    data={
                        'cpu_percent': cpu_percent,
                        'memory_percent': memory.percent,
                        'disk_percent': (disk.used / disk.total) * 100,
                        'bot_latency_ms': bot_latency,
                        'guild_count': guild_count,
                        'user_count': user_count,
                        'bot_ready': self.bot.is_ready()
                    },
                    timestamp=time.time(),
                    source_system='system_monitor'
                ))
                
                await asyncio.sleep(10)  # Update every 10 seconds
                
            except Exception as e:
                self.bot.add_error(f"Performance monitoring error: {e}")
                await asyncio.sleep(30)  # Wait longer on error
    
    async def _emit_performance_event(self, metric_type: str, data: Dict[str, Any]):
        """Emit a performance metric event"""
        await self.sync_manager.emit_event(SyncEvent(
            event_type=SyncEventType.PERFORMANCE_METRIC,
            priority=EventPriority.LOW,
            data={
                'metric_type': metric_type,
                **data
            },
            timestamp=time.time(),
            source_system='performance_monitor'
        ))
    
    def get_hook(self, hook_name: str):
        """Get an integration hook by name"""
        return self.integration_hooks.get(hook_name)
    
    async def emit_user_interaction(self, interaction_type: str, user_id: int, guild_id: Optional[int], data: Dict[str, Any]):
        """Emit a user interaction event"""
        await self.sync_manager.emit_event(SyncEvent(
            event_type=SyncEventType.USER_INTERACTION,
            priority=EventPriority.MEDIUM,
            data={
                'interaction_type': interaction_type,
                **data
            },
            timestamp=time.time(),
            source_system='discord_bot',
            user_id=user_id,
            guild_id=guild_id
        ))
    
    async def emit_music_event(self, event_type: str, user_id: int, data: Dict[str, Any]):
        """Emit music-related events"""
        sync_event_type = {
            'queued': SyncEventType.MUSIC_QUEUED,
            'now_playing': SyncEventType.NOW_PLAYING_CHANGED,
            'playlist_updated': SyncEventType.PLAYLIST_UPDATED
        }.get(event_type, SyncEventType.USER_INTERACTION)
        
        await self.sync_manager.emit_event(SyncEvent(
            event_type=sync_event_type,
            priority=EventPriority.MEDIUM,
            data=data,
            timestamp=time.time(),
            source_system='music_system',
            user_id=user_id
        ))
    
    async def emit_gaming_event(self, event_type: str, user_id: int, data: Dict[str, Any]):
        """Emit gaming-related events"""
        await self.sync_manager.emit_event(SyncEvent(
            event_type=SyncEventType.GAME_SESSION_START if event_type == 'game_start' else SyncEventType.USER_INTERACTION,
            priority=EventPriority.HIGH,
            data={
                'gaming_event': event_type,
                **data
            },
            timestamp=time.time(),
            source_system='gaming_system',
            user_id=user_id
        ))

# Integration helper functions for cogs
async def sync_hub_interaction(bot, interaction, hub_category: str, view_name: str):
    """Helper to sync hub interactions"""
    if hasattr(bot, 'sync_integration'):
        hook = bot.sync_integration.get_hook(f'{hub_category}_hub')
        if hook:
            await hook(interaction, view_name)

async def sync_ai_response(bot, user_id: int, prompt: str, response: str, mode: str, generation_time: float):
    """Helper to sync AI responses"""
    if hasattr(bot, 'sync_integration'):
        hook = bot.sync_integration.get_hook('ai_response')
        if hook:
            await hook(user_id, prompt, response, mode, generation_time)

async def sync_economy_transaction(bot, user_id: int, transaction_type: str, amount: int, new_balance: int):
    """Helper to sync economy transactions"""
    if hasattr(bot, 'sync_integration'):
        hook = bot.sync_integration.get_hook('fragment_transaction')
        if hook:
            await hook(user_id, transaction_type, amount, new_balance)

async def sync_achievement_unlock(bot, user_id: int, achievement_name: str, fragment_reward: int):
    """Helper to sync achievement unlocks"""
    if hasattr(bot, 'sync_integration'):
        hook = bot.sync_integration.get_hook('achievement_unlock')
        if hook:
            await hook(user_id, achievement_name, fragment_reward)