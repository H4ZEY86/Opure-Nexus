# core/realtime_sync_system.py - Real-Time Data Synchronization Architecture

import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import weakref
from collections import deque
import threading
import websockets

class EventPriority(Enum):
    CRITICAL = 1    # Immediate broadcast (AI responses, commands)
    HIGH = 2        # Near real-time (economy transactions, achievements)
    MEDIUM = 3      # Regular updates (user stats, music queue)
    LOW = 4         # Background sync (analytics, logs)

class SyncEventType(Enum):
    # Discord Bot Events
    COMMAND_EXECUTED = "command_executed"
    AI_RESPONSE_GENERATED = "ai_response_generated"
    USER_INTERACTION = "user_interaction"
    
    # Hub System Events
    HUB_OPENED = "hub_opened"
    HUB_NAVIGATION = "hub_navigation"
    CONTEXT_MENU_USED = "context_menu_used"
    
    # Economy & Gaming Events
    FRAGMENT_TRANSACTION = "fragment_transaction"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    QUEST_PROGRESS = "quest_progress"
    GAME_SESSION_START = "game_session_start"
    
    # AI & Memory Events
    PERSONALITY_CHANGED = "personality_changed"
    MEMORY_STORED = "memory_stored"
    AI_LEARNING_UPDATE = "ai_learning_update"
    
    # System Performance Events
    PERFORMANCE_METRIC = "performance_metric"
    ERROR_OCCURRED = "error_occurred"
    SYSTEM_STATUS_CHANGE = "system_status_change"
    
    # Music & Media Events
    MUSIC_QUEUED = "music_queued"
    NOW_PLAYING_CHANGED = "now_playing_changed"
    PLAYLIST_UPDATED = "playlist_updated"

@dataclass
class SyncEvent:
    event_type: SyncEventType
    priority: EventPriority
    data: Dict[str, Any]
    timestamp: float
    source_system: str
    user_id: Optional[int] = None
    guild_id: Optional[int] = None
    session_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'event_type': self.event_type.value,
            'priority': self.priority.value,
            'data': self.data,
            'timestamp': self.timestamp,
            'source_system': self.source_system,
            'user_id': self.user_id,
            'guild_id': self.guild_id,
            'session_id': self.session_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SyncEvent':
        return cls(
            event_type=SyncEventType(data['event_type']),
            priority=EventPriority(data['priority']),
            data=data['data'],
            timestamp=data['timestamp'],
            source_system=data['source_system'],
            user_id=data.get('user_id'),
            guild_id=data.get('guild_id'),
            session_id=data.get('session_id')
        )

class RealTimeSyncManager:
    """Central hub for real-time data synchronization across all bot systems"""
    
    def __init__(self, bot):
        self.bot = bot
        self.websocket_connections: Dict[str, weakref.ref] = {}
        self.event_queue = asyncio.Queue()
        self.priority_queues = {
            EventPriority.CRITICAL: deque(maxlen=100),
            EventPriority.HIGH: deque(maxlen=500),
            EventPriority.MEDIUM: deque(maxlen=1000),
            EventPriority.LOW: deque(maxlen=2000)
        }
        
        # Performance metrics
        self.events_processed = 0
        self.sync_latency = deque(maxlen=100)
        self.error_count = 0
        
        # Event subscribers
        self.event_subscribers: Dict[SyncEventType, List[Callable]] = {}
        
        # Background tasks
        self.sync_task = None
        self.performance_monitor_task = None
        self.cleanup_task = None
        
        self._running = False
        
    async def start(self):
        """Start the real-time synchronization system"""
        if self._running:
            return
            
        self._running = True
        
        # Start background tasks
        self.sync_task = asyncio.create_task(self._process_event_queue())
        self.performance_monitor_task = asyncio.create_task(self._monitor_performance())
        self.cleanup_task = asyncio.create_task(self._cleanup_connections())
        
        self.bot.add_log("✅ Real-time synchronization system started")
        
        # Register built-in event handlers
        await self._register_core_handlers()
    
    async def stop(self):
        """Stop the synchronization system gracefully"""
        self._running = False
        
        # Cancel background tasks
        if self.sync_task:
            self.sync_task.cancel()
        if self.performance_monitor_task:
            self.performance_monitor_task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
            
        # Close WebSocket connections
        await self._close_all_connections()
        
        self.bot.add_log("🛑 Real-time synchronization system stopped")
    
    def register_websocket(self, connection_id: str, websocket) -> None:
        """Register a WebSocket connection for real-time updates"""
        self.websocket_connections[connection_id] = weakref.ref(websocket)
        self.bot.add_log(f"📡 WebSocket connection registered: {connection_id}")
    
    def unregister_websocket(self, connection_id: str) -> None:
        """Unregister a WebSocket connection"""
        if connection_id in self.websocket_connections:
            del self.websocket_connections[connection_id]
            self.bot.add_log(f"📡 WebSocket connection unregistered: {connection_id}")
    
    def subscribe_to_event(self, event_type: SyncEventType, handler: Callable) -> None:
        """Subscribe to specific event types"""
        if event_type not in self.event_subscribers:
            self.event_subscribers[event_type] = []
        self.event_subscribers[event_type].append(handler)
    
    async def emit_event(self, event: SyncEvent) -> None:
        """Emit a synchronization event to all systems"""
        start_time = time.time()
        
        try:
            # Add to priority queue for processing
            self.priority_queues[event.priority].append(event)
            
            # Add to main queue for WebSocket broadcast
            await self.event_queue.put(event)
            
            # Call registered subscribers
            if event.event_type in self.event_subscribers:
                for handler in self.event_subscribers[event.event_type]:
                    try:
                        if asyncio.iscoroutinefunction(handler):
                            await handler(event)
                        else:
                            handler(event)
                    except Exception as e:
                        self.bot.add_error(f"Event subscriber error: {e}")
            
            # Track performance
            latency = (time.time() - start_time) * 1000
            self.sync_latency.append(latency)
            self.events_processed += 1
            
        except Exception as e:
            self.error_count += 1
            self.bot.add_error(f"Failed to emit sync event: {e}")
    
    async def _process_event_queue(self):
        """Background task to process events and broadcast to WebSocket clients"""
        while self._running:
            try:
                # Get event from queue with timeout
                try:
                    event = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Broadcast to WebSocket clients
                await self._broadcast_to_websockets(event)
                
                # Mark task done
                self.event_queue.task_done()
                
            except Exception as e:
                self.error_count += 1
                self.bot.add_error(f"Event queue processing error: {e}")
                await asyncio.sleep(0.1)
    
    async def _broadcast_to_websockets(self, event: SyncEvent):
        """Broadcast event to all connected WebSocket clients"""
        if not self.websocket_connections:
            return
        
        event_data = json.dumps(event.to_dict())
        dead_connections = []
        
        for connection_id, websocket_ref in self.websocket_connections.items():
            websocket = websocket_ref()
            
            if websocket is None:
                dead_connections.append(connection_id)
                continue
            
            try:
                await websocket.send(event_data)
            except Exception as e:
                dead_connections.append(connection_id)
                self.bot.add_log(f"Failed to send to {connection_id}: {e}")
        
        # Clean up dead connections
        for connection_id in dead_connections:
            self.unregister_websocket(connection_id)
    
    async def _monitor_performance(self):
        """Monitor sync system performance and emit metrics"""
        while self._running:
            try:
                await asyncio.sleep(30)  # Monitor every 30 seconds
                
                # Calculate performance metrics
                avg_latency = sum(self.sync_latency) / len(self.sync_latency) if self.sync_latency else 0
                events_per_minute = self.events_processed / (time.time() / 60)
                
                # Create performance event
                performance_event = SyncEvent(
                    event_type=SyncEventType.PERFORMANCE_METRIC,
                    priority=EventPriority.LOW,
                    data={
                        'avg_sync_latency_ms': round(avg_latency, 2),
                        'events_per_minute': round(events_per_minute, 2),
                        'total_events_processed': self.events_processed,
                        'error_count': self.error_count,
                        'active_connections': len(self.websocket_connections),
                        'queue_sizes': {
                            priority.name: len(queue) 
                            for priority, queue in self.priority_queues.items()
                        }
                    },
                    timestamp=time.time(),
                    source_system='sync_manager'
                )
                
                await self.emit_event(performance_event)
                
            except Exception as e:
                self.bot.add_error(f"Performance monitoring error: {e}")
    
    async def _cleanup_connections(self):
        """Periodically clean up dead WebSocket connections"""
        while self._running:
            try:
                await asyncio.sleep(60)  # Cleanup every minute
                
                dead_connections = []
                for connection_id, websocket_ref in self.websocket_connections.items():
                    if websocket_ref() is None:
                        dead_connections.append(connection_id)
                
                for connection_id in dead_connections:
                    self.unregister_websocket(connection_id)
                    
            except Exception as e:
                self.bot.add_error(f"Connection cleanup error: {e}")
    
    async def _close_all_connections(self):
        """Close all WebSocket connections gracefully"""
        for connection_id, websocket_ref in list(self.websocket_connections.items()):
            websocket = websocket_ref()
            if websocket:
                try:
                    await websocket.close()
                except:
                    pass
        
        self.websocket_connections.clear()
    
    async def _register_core_handlers(self):
        """Register built-in event handlers for system integration"""
        
        # Database sync handler for critical events
        async def database_sync_handler(event: SyncEvent):
            if event.priority in [EventPriority.CRITICAL, EventPriority.HIGH]:
                try:
                    # Update database with event data for persistence
                    await self.bot.db.execute(
                        "INSERT INTO sync_events (event_type, data, timestamp) VALUES (?, ?, ?)",
                        (event.event_type.value, json.dumps(event.data), event.timestamp)
                    )
                    await self.bot.db.commit()
                except Exception as e:
                    self.bot.add_error(f"Database sync handler error: {e}")
        
        # Register for all event types
        for event_type in SyncEventType:
            self.subscribe_to_event(event_type, database_sync_handler)
        
        self.bot.add_log("✅ Core sync handlers registered")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        avg_latency = sum(self.sync_latency) / len(self.sync_latency) if self.sync_latency else 0
        
        return {
            'events_processed': self.events_processed,
            'average_latency_ms': round(avg_latency, 2),
            'error_count': self.error_count,
            'active_connections': len(self.websocket_connections),
            'queue_sizes': {
                priority.name: len(queue) 
                for priority, queue in self.priority_queues.items()
            },
            'is_running': self._running
        }

# Convenience functions for easy event emission
async def emit_command_event(sync_manager: RealTimeSyncManager, command_name: str, user_id: int, guild_id: int, success: bool):
    """Emit command execution event"""
    event = SyncEvent(
        event_type=SyncEventType.COMMAND_EXECUTED,
        priority=EventPriority.HIGH,
        data={
            'command_name': command_name,
            'success': success,
            'execution_time': time.time()
        },
        timestamp=time.time(),
        source_system='discord_bot',
        user_id=user_id,
        guild_id=guild_id
    )
    await sync_manager.emit_event(event)

async def emit_ai_response_event(sync_manager: RealTimeSyncManager, user_id: int, prompt: str, response: str, mode: str):
    """Emit AI response generation event"""
    event = SyncEvent(
        event_type=SyncEventType.AI_RESPONSE_GENERATED,
        priority=EventPriority.CRITICAL,
        data={
            'prompt_length': len(prompt),
            'response_length': len(response),
            'personality_mode': mode,
            'generation_time': time.time()
        },
        timestamp=time.time(),
        source_system='ai_engine',
        user_id=user_id
    )
    await sync_manager.emit_event(event)

async def emit_economy_event(sync_manager: RealTimeSyncManager, user_id: int, transaction_type: str, amount: int, new_balance: int):
    """Emit economy transaction event"""
    event = SyncEvent(
        event_type=SyncEventType.FRAGMENT_TRANSACTION,
        priority=EventPriority.HIGH,
        data={
            'transaction_type': transaction_type,
            'amount': amount,
            'new_balance': new_balance
        },
        timestamp=time.time(),
        source_system='economy_system',
        user_id=user_id
    )
    await sync_manager.emit_event(event)

# Global sync manager instance
_sync_manager = None

def initialize_sync_manager(bot) -> RealTimeSyncManager:
    """Initialize the global sync manager"""
    global _sync_manager
    _sync_manager = RealTimeSyncManager(bot)
    return _sync_manager

def get_sync_manager() -> Optional[RealTimeSyncManager]:
    """Get the global sync manager"""
    return _sync_manager