# core/sync_integration.py - Integration layer for real-time synchronization

import asyncio
import json
import time
from typing import Dict, Any, Optional, List
from core.realtime_sync_system import SyncEvent, SyncEventType, EventPriority, RealTimeSyncManager

class SyncIntegrationLayer:
    """Integration layer that connects all bot systems with real-time sync"""
    
    def __init__(self, bot, sync_manager: RealTimeSyncManager):
        self.bot = bot
        self.sync_manager = sync_manager
        self.integration_handlers = {}
        self.last_sync_timestamps = {}
        
    async def initialize(self):
        """Initialize the sync integration layer"""
        try:
            # Register integration handlers for different system events
            await self.register_integration_handlers()
            
            # Start periodic sync health checks
            asyncio.create_task(self.sync_health_monitor())
            
            self.bot.add_log("✅ Sync integration layer initialized")
            
        except Exception as e:
            self.bot.add_error(f"Sync integration initialization failed: {e}")
    
    async def register_integration_handlers(self):
        """Register handlers for different system integrations"""
        
        # Music System Integration
        async def music_integration_handler(event: SyncEvent):
            if event.event_type in [SyncEventType.MUSIC_QUEUED, SyncEventType.NOW_PLAYING_CHANGED]:
                await self.sync_music_data(event.data, event.user_id)
        
        # Economy System Integration
        async def economy_integration_handler(event: SyncEvent):
            if event.event_type == SyncEventType.FRAGMENT_TRANSACTION:
                await self.sync_economy_data(event.data, event.user_id)
        
        # AI System Integration
        async def ai_integration_handler(event: SyncEvent):
            if event.event_type == SyncEventType.AI_RESPONSE_GENERATED:
                await self.sync_ai_data(event.data, event.user_id)
        
        # Gaming System Integration
        async def gaming_integration_handler(event: SyncEvent):
            if event.event_type in [SyncEventType.GAME_SESSION_START, SyncEventType.ACHIEVEMENT_UNLOCKED]:
                await self.sync_gaming_data(event.data, event.user_id)
        
        # Register handlers with sync manager
        self.sync_manager.subscribe_to_event(SyncEventType.MUSIC_QUEUED, music_integration_handler)
        self.sync_manager.subscribe_to_event(SyncEventType.NOW_PLAYING_CHANGED, music_integration_handler)
        self.sync_manager.subscribe_to_event(SyncEventType.FRAGMENT_TRANSACTION, economy_integration_handler)
        self.sync_manager.subscribe_to_event(SyncEventType.AI_RESPONSE_GENERATED, ai_integration_handler)
        self.sync_manager.subscribe_to_event(SyncEventType.GAME_SESSION_START, gaming_integration_handler)
        self.sync_manager.subscribe_to_event(SyncEventType.ACHIEVEMENT_UNLOCKED, gaming_integration_handler)
        
        self.bot.add_log("✅ Sync integration handlers registered")
    
    async def sync_music_data(self, music_data: Dict[str, Any], user_id: int):
        """Sync music system data across platforms"""
        try:
            # Update database with real-time music activity
            if 'track_title' in music_data:
                await self.bot.db.execute("""
                    INSERT INTO music_activity 
                    (user_id, track_title, artist, action, timestamp) 
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    user_id, 
                    music_data['track_title'],
                    music_data.get('artist', 'Unknown'),
                    music_data.get('action', 'queued'),
                    time.time()
                ))
                await self.bot.db.commit()
            
            # Broadcast to WebSocket clients (dashboard, activity)
            await self.broadcast_to_external_systems('music_update', {
                'user_id': user_id,
                'data': music_data,
                'timestamp': time.time()
            })
            
            # Send to API for Discord Activity
            if hasattr(self.bot, 'send_status_to_api'):
                await self.bot.send_status_to_api({
                    'type': 'music_activity',
                    'user_id': user_id,
                    'data': music_data
                })
            
        except Exception as e:
            self.bot.add_error(f"Music sync integration failed: {e}")
    
    async def sync_economy_data(self, economy_data: Dict[str, Any], user_id: int):
        """Sync economy system data across platforms"""
        try:
            # Real-time balance updates for dashboard and activity
            current_balance = economy_data.get('new_balance', 0)
            transaction_amount = economy_data.get('amount', 0)
            
            # Broadcast balance change immediately
            await self.broadcast_to_external_systems('economy_update', {
                'user_id': user_id,
                'balance': current_balance,
                'transaction_amount': transaction_amount,
                'transaction_type': economy_data.get('transaction_type', 'unknown'),
                'timestamp': time.time()
            })
            
            # Send to API for real-time Activity updates
            if hasattr(self.bot, 'send_status_to_api'):
                await self.bot.send_status_to_api({
                    'type': 'economy_transaction',
                    'user_id': user_id,
                    'data': economy_data
                })
            
            # Update user stats for achievements
            await self.bot.update_user_stats(user_id, 'economy_transaction', 
                                           amount=transaction_amount)
            
        except Exception as e:
            self.bot.add_error(f"Economy sync integration failed: {e}")
    
    async def sync_ai_data(self, ai_data: Dict[str, Any], user_id: int):
        """Sync AI system data across platforms"""
        try:
            # Track AI interactions for analytics
            await self.broadcast_to_external_systems('ai_interaction', {
                'user_id': user_id,
                'response_length': ai_data.get('response_length', 0),
                'personality_mode': ai_data.get('personality_mode', 'unknown'),
                'processing_time': ai_data.get('generation_time', 0),
                'timestamp': time.time()
            })
            
            # Update conversation stats
            await self.bot.update_user_stats(user_id, 'ai_conversation')
            
        except Exception as e:
            self.bot.add_error(f"AI sync integration failed: {e}")
    
    async def sync_gaming_data(self, gaming_data: Dict[str, Any], user_id: int):
        """Sync gaming system data across platforms"""
        try:
            # Real-time gaming updates for Activity
            await self.broadcast_to_external_systems('gaming_update', {
                'user_id': user_id,
                'data': gaming_data,
                'timestamp': time.time()
            })
            
            # Send to API for Discord Activity real-time updates
            if hasattr(self.bot, 'send_status_to_api'):
                await self.bot.send_status_to_api({
                    'type': 'gaming_activity',
                    'user_id': user_id,
                    'data': gaming_data
                })
            
            # Update gaming stats
            if gaming_data.get('action') == 'game_completed':
                await self.bot.update_user_stats(user_id, 'game_completion')
            
        except Exception as e:
            self.bot.add_error(f"Gaming sync integration failed: {e}")
    
    async def broadcast_to_external_systems(self, event_type: str, data: Dict[str, Any]):
        """Broadcast data to all connected external systems"""
        try:
            # WebSocket to dashboard
            if hasattr(self.bot, 'websocket_integration'):
                await self.bot.websocket_integration.broadcast({
                    'type': event_type,
                    'data': data
                })
            
            # WebSocket to activity clients (if different)
            if hasattr(self.bot, 'activity_websocket'):
                await self.bot.activity_websocket.broadcast({
                    'type': event_type,
                    'data': data
                })
                
        except Exception as e:
            self.bot.add_error(f"External system broadcast failed: {e}")
    
    async def sync_health_monitor(self):
        """Monitor sync system health and performance"""
        while True:
            try:
                # Check sync manager health
                if self.sync_manager:
                    metrics = self.sync_manager.get_performance_metrics()
                    
                    # Alert if sync is unhealthy
                    if metrics['error_count'] > 50:
                        self.bot.add_error(f"High sync error count: {metrics['error_count']}")
                    
                    if metrics['average_latency_ms'] > 1000:
                        self.bot.add_log(f"High sync latency: {metrics['average_latency_ms']}ms")
                    
                    # Log health status every 5 minutes
                    self.last_sync_timestamps['health_check'] = time.time()
                
                # Check database sync events cleanup
                await self.cleanup_old_sync_events()
                
                # Sleep for 5 minutes between health checks
                await asyncio.sleep(300)
                
            except Exception as e:
                self.bot.add_error(f"Sync health monitor error: {e}")
                await asyncio.sleep(60)
    
    async def cleanup_old_sync_events(self):
        """Clean up old sync events from database"""
        try:
            # Keep only last 24 hours of sync events
            cutoff_time = time.time() - (24 * 60 * 60)
            
            cursor = await self.bot.db.execute("""
                DELETE FROM sync_events WHERE timestamp < ?
            """, (cutoff_time,))
            
            deleted_count = cursor.rowcount
            await self.bot.db.commit()
            
            if deleted_count > 0:
                self.bot.add_log(f"🧹 Cleaned up {deleted_count} old sync events")
                
        except Exception as e:
            self.bot.add_error(f"Sync event cleanup failed: {e}")
    
    async def force_sync_user_data(self, user_id: int) -> Dict[str, Any]:
        """Force synchronization of all user data across systems"""
        try:
            # Collect user data from all systems
            user_data = {}
            
            # Economy data
            cursor = await self.bot.db.execute("""
                SELECT fragments, data_shards, level, xp, daily_streak 
                FROM players WHERE user_id = ?
            """, (user_id,))
            economy_data = await cursor.fetchone()
            
            if economy_data:
                user_data['economy'] = {
                    'fragments': economy_data[0],
                    'data_shards': economy_data[1], 
                    'level': economy_data[2],
                    'xp': economy_data[3],
                    'daily_streak': economy_data[4]
                }
            
            # User stats
            cursor = await self.bot.db.execute("""
                SELECT commands_used, songs_queued, achievements_earned, games_completed
                FROM user_stats WHERE user_id = ?
            """, (user_id,))
            stats_data = await cursor.fetchone()
            
            if stats_data:
                user_data['stats'] = {
                    'commands_used': stats_data[0],
                    'songs_queued': stats_data[1],
                    'achievements_earned': stats_data[2], 
                    'games_completed': stats_data[3]
                }
            
            # Create sync event for forced update
            sync_event = SyncEvent(
                event_type=SyncEventType.USER_INTERACTION,
                priority=EventPriority.HIGH,
                data=user_data,
                timestamp=time.time(),
                source_system='sync_integration',
                user_id=user_id
            )
            
            await self.sync_manager.emit_event(sync_event)
            
            return user_data
            
        except Exception as e:
            self.bot.add_error(f"Force sync user data failed: {e}")
            return {}
    
    async def sync_system_status(self):
        """Sync overall system status to external platforms"""
        try:
            # Collect bot system status
            status_data = {
                'bot_online': self.bot.is_ready(),
                'guilds': len(self.bot.guilds) if hasattr(self.bot, 'guilds') else 0,
                'users': sum(g.member_count for g in self.bot.guilds) if hasattr(self.bot, 'guilds') else 0,
                'uptime': time.time() - getattr(self.bot, 'start_time', time.time()),
                'sync_events_processed': self.sync_manager.events_processed,
                'sync_active_connections': len(self.sync_manager.websocket_connections),
                'timestamp': time.time()
            }
            
            # Broadcast system status
            await self.broadcast_to_external_systems('system_status', status_data)
            
            # Send to API
            if hasattr(self.bot, 'send_status_to_api'):
                await self.bot.send_status_to_api({
                    'type': 'system_status',
                    'data': status_data
                })
            
        except Exception as e:
            self.bot.add_error(f"System status sync failed: {e}")
    
    def get_integration_stats(self) -> Dict[str, Any]:
        """Get sync integration statistics"""
        return {
            'handlers_registered': len(self.integration_handlers),
            'last_health_check': self.last_sync_timestamps.get('health_check', 0),
            'sync_manager_active': self.sync_manager._running if self.sync_manager else False,
            'sync_events_processed': self.sync_manager.events_processed if self.sync_manager else 0,
            'integration_layer_active': True
        }