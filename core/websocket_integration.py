# core/websocket_integration.py - Bot integration with WebSocket dashboard

import asyncio
import json
import logging
import websockets
from typing import Dict, Any, Optional
import datetime

class DashboardWebSocketClient:
    """WebSocket client for bot to communicate with dashboard"""
    
    def __init__(self, bot, uri: str = "ws://localhost:8001"):
        self.bot = bot
        self.uri = uri
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.connected = False
        self.reconnect_delay = 5
        self.logger = logging.getLogger(__name__)
        
    async def connect(self):
        """Connect to WebSocket server"""
        try:
            self.websocket = await websockets.connect(
                self.uri,
                ping_interval=30,
                ping_timeout=10
            )
            self.connected = True
            self.logger.info("✅ Connected to dashboard WebSocket")
            
            # Send initial bot status
            await self.send_bot_update()
            
        except Exception as e:
            self.logger.error(f"❌ WebSocket connection failed: {e}")
            self.connected = False
    
    async def disconnect(self):
        """Disconnect from WebSocket server"""
        self.connected = False
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
        self.logger.info("🔌 Disconnected from dashboard WebSocket")
    
    async def send_update(self, update_type: str, data: Dict[str, Any]):
        """Send update to dashboard"""
        if not self.connected or not self.websocket:
            return
        
        try:
            message = {
                "type": update_type,
                "data": data,
                "timestamp": int(datetime.datetime.now().timestamp() * 1000)
            }
            
            await self.websocket.send(json.dumps(message))
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send {update_type} update: {e}")
            self.connected = False
    
    async def send_bot_update(self):
        """Send bot status update"""
        try:
            # Get bot statistics
            guild_count = len(self.bot.guilds) if hasattr(self.bot, 'guilds') else 1
            user_count = sum(guild.member_count for guild in self.bot.guilds) if hasattr(self.bot, 'guilds') else 0
            
            # Get database stats
            commands_executed = 0
            try:
                cursor = await self.bot.db.execute("SELECT SUM(commands_used) FROM user_stats")
                result = await cursor.fetchone()
                commands_executed = result[0] if result and result[0] else 0
            except:
                pass
            
            bot_data = {
                "status": "online" if self.bot.is_ready() else "offline",
                "username": self.bot.user.name if self.bot.user else "Opure.exe",
                "guilds": guild_count,
                "users": user_count,
                "commands_executed": commands_executed,
                "uptime": getattr(self.bot, 'start_time', datetime.datetime.now()).timestamp(),
                "latency": round(self.bot.latency * 1000, 1) if hasattr(self.bot, 'latency') else 0
            }
            
            await self.send_update("bot_update", bot_data)
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send bot update: {e}")
    
    async def send_music_update(self, music_data: Dict[str, Any]):
        """Send music player update"""
        await self.send_update("music_update", music_data)
    
    async def send_ai_update(self, ai_data: Dict[str, Any]):
        """Send AI system update"""
        await self.send_update("ai_update", ai_data)
    
    async def send_gaming_update(self, gaming_data: Dict[str, Any]):
        """Send gaming hub update"""
        await self.send_update("gaming_update", gaming_data)
    
    async def send_economy_update(self, economy_data: Dict[str, Any]):
        """Send economy system update"""
        await self.send_update("economy_update", economy_data)
    
    async def send_command_executed(self, command_name: str, user_id: int, guild_id: int = None):
        """Send command execution event"""
        command_data = {
            "command": command_name,
            "user_id": user_id,
            "guild_id": guild_id,
            "timestamp": datetime.datetime.now().isoformat()
        }
        await self.send_update("command_executed", command_data)
    
    async def send_achievement_unlocked(self, user_id: int, achievement: Dict[str, Any]):
        """Send achievement unlock event"""
        achievement_data = {
            "user_id": user_id,
            "achievement": achievement,
            "timestamp": datetime.datetime.now().isoformat()
        }
        await self.send_update("achievement_unlocked", achievement_data)
    
    async def start_periodic_updates(self):
        """Start periodic status updates"""
        while True:
            try:
                if self.connected:
                    await self.send_bot_update()
                else:
                    # Try to reconnect
                    await self.connect()
                
                # Wait 30 seconds between updates
                await asyncio.sleep(30)
                
            except Exception as e:
                self.logger.error(f"❌ Periodic update error: {e}")
                self.connected = False
                await asyncio.sleep(self.reconnect_delay)


# Bot extension functions
def setup_websocket_integration(bot):
    """Set up WebSocket integration for the bot"""
    
    # Initialize WebSocket client
    bot.dashboard_ws = DashboardWebSocketClient(bot)
    
    # Add helper methods to bot
    async def notify_dashboard_command(command_name: str, user_id: int, guild_id: int = None):
        """Notify dashboard of command execution"""
        if hasattr(bot, 'dashboard_ws') and bot.dashboard_ws.connected:
            await bot.dashboard_ws.send_command_executed(command_name, user_id, guild_id)
    
    async def notify_dashboard_music(music_data: Dict[str, Any]):
        """Notify dashboard of music events"""
        if hasattr(bot, 'dashboard_ws') and bot.dashboard_ws.connected:
            await bot.dashboard_ws.send_music_update(music_data)
    
    async def notify_dashboard_ai(ai_data: Dict[str, Any]):
        """Notify dashboard of AI events"""
        if hasattr(bot, 'dashboard_ws') and bot.dashboard_ws.connected:
            await bot.dashboard_ws.send_ai_update(ai_data)
    
    async def notify_dashboard_gaming(gaming_data: Dict[str, Any]):
        """Notify dashboard of gaming events"""
        if hasattr(bot, 'dashboard_ws') and bot.dashboard_ws.connected:
            await bot.dashboard_ws.send_gaming_update(gaming_data)
    
    async def notify_dashboard_achievement(user_id: int, achievement: Dict[str, Any]):
        """Notify dashboard of achievement unlock"""
        if hasattr(bot, 'dashboard_ws') and bot.dashboard_ws.connected:
            await bot.dashboard_ws.send_achievement_unlocked(user_id, achievement)
    
    # Add methods to bot
    bot.notify_dashboard_command = notify_dashboard_command
    bot.notify_dashboard_music = notify_dashboard_music
    bot.notify_dashboard_ai = notify_dashboard_ai
    bot.notify_dashboard_gaming = notify_dashboard_gaming
    bot.notify_dashboard_achievement = notify_dashboard_achievement
    
    # Start WebSocket connection and periodic updates
    async def start_dashboard_integration():
        """Start dashboard integration"""
        try:
            await bot.dashboard_ws.connect()
            # Start periodic updates in background
            asyncio.create_task(bot.dashboard_ws.start_periodic_updates())
            bot.add_log("✅ Dashboard WebSocket integration started")
        except Exception as e:
            bot.add_error(f"❌ Dashboard WebSocket integration failed: {e}")
    
    # Add startup task
    bot.loop.create_task(start_dashboard_integration())
    
    return bot.dashboard_ws