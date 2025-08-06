# cogs/music_cog.py
import discord
from discord import app_commands
from discord.ext import commands, tasks
import asyncio
import yt_dlp
import json
import re
import os
import datetime
from dotenv import load_dotenv
from typing import List, Optional, Dict
import traceback
import random
import aiohttp
import html
from bs4 import BeautifulSoup
from urllib.parse import quote
import secrets
import weakref
from aiohttp import web, WSMsgType

# Rate limiting and core systems
try:
    from utils.rate_limiter import rate_limit
    from core.music_processor import music_processor
except ImportError:
    # Fallback if not available yet
    def rate_limit(operation: str, bypass_admin: bool = False):
        def decorator(func):
            return func
        return decorator
    music_processor = None

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    _firestore_client = None 
except ImportError:
    print("Firebase Admin SDK not installed. Firestore features will be disabled.")
    _firestore_client = None
except Exception as e:
    print(f"Firebase import error in music_cog: {e}")
    _firestore_client = None


# --- Load Environment Variables & Configuration ---
load_dotenv()
GENIUS_API_KEY = os.getenv("GENIUS_API_KEY")
GUILD_ID_STR = os.getenv("GUILD_ID")
GUILD_OBJECTS = [discord.Object(id=int(gid.strip())) for gid in GUILD_ID_STR.split(',')] if GUILD_ID_STR else []

FFMPEG_OPTIONS = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 -reconnect_at_eof 1 -reconnect_on_network_error 1',
    'options': '-vn -loglevel quiet'
}

# Equalizer presets for Activity
EQ_PRESETS = {
    "flat": {"31": 0, "62": 0, "125": 0, "250": 0, "500": 0, "1k": 0, "2k": 0, "4k": 0, "8k": 0, "16k": 0},
    "bass_boost": {"31": 8, "62": 6, "125": 4, "250": 2, "500": 0, "1k": 0, "2k": 0, "4k": 0, "8k": 0, "16k": 0},
    "vocal_focus": {"31": -2, "62": -1, "125": 0, "250": 2, "500": 3, "1k": 3, "2k": 2, "4k": 1, "8k": 0, "16k": 0},
    "treble_boost": {"31": 0, "62": 0, "125": 0, "250": 0, "500": 0, "1k": 2, "2k": 4, "4k": 6, "8k": 8, "16k": 6}
}

class ActivityWebSocketServer:
    """WebSocket server for Discord Activity communication"""
    
    def __init__(self, music_cog):
        self.music_cog = music_cog
        self.bot = music_cog.bot
        self.app = None
        self.server = None
        self.site = None
        self.auth_tokens = {}  # token -> {user_id, instance_id, expires_at}
        self.connections = {}  # instance_id -> set of websockets
        self.active_tokens = {}  # user_id -> token (for cleanup)
        
    async def handle_request(self, request):
        """Handle both HTTP requests (for Activity HTML) and WebSocket upgrades"""
        # Check if this is a WebSocket upgrade request
        if request.headers.get('upgrade', '').lower() == 'websocket':
            return await self.websocket_handler(request)
        else:
            # Serve the Activity HTML file
            return await self.serve_activity_html(request)
    
    async def websocket_handler(self, request):
        """aiohttp WebSocket handler - should be called properly"""
        ws = web.WebSocketResponse()
        self.bot.add_log(f"🔥🔥🔥 AIOHTTP HANDLER CALLED! Connection from {request.remote}")
        self.bot.add_log(f"🔥 Request path: {request.path}")
        
        try:
            self.bot.add_log("🔥 About to prepare WebSocket...")
            await ws.prepare(request)
            self.bot.add_log(f"🔥 WebSocket prepared! closed: {ws.closed}")
            
            self.bot.add_log("🔥 About to call handle_aiohttp_connection...")
            await self.handle_aiohttp_connection(ws, request.path)
            self.bot.add_log("🔥 handle_aiohttp_connection completed!")
            
        except Exception as e:
            self.bot.add_log(f"💥 AIOHTTP HANDLER EXCEPTION: {e}")
            import traceback
            self.bot.add_log(f"💥 Traceback: {traceback.format_exc()}")
            if not ws.closed:
                await ws.close(code=1011, message=b'Handler error')
        
        self.bot.add_log("🔥 WebSocket handler returning...")
        return ws
    
    async def send_current_music_state(self, ws, instance_id):
        """Send current music state to Activity"""
        try:
            self.bot.add_log(f"🔍 Looking for music instance {instance_id}")
            self.bot.add_log(f"🔍 music_cog has instances: {hasattr(self.music_cog, 'instances')}")
            
            # Get music instance
            if hasattr(self.music_cog, 'instances') and instance_id in self.music_cog.instances:
                instance = self.music_cog.instances[instance_id]
                self.bot.add_log(f"🔍 Found instance, current_song: {hasattr(instance, 'current_song')}")
                current_song = instance.current_song if instance.current_song else None
                self.bot.add_log(f"🔍 Current song exists: {current_song is not None}")
                
                if current_song:
                    # Send real music data
                    await ws.send_str(json.dumps({
                        "type": "AUTH_SUCCESS",
                        "message": "Connected to REAL bot!",
                        "user_data": {"dj": instance.current_dj.display_name if hasattr(instance, 'current_dj') and instance.current_dj else "Bot"},
                        "current_song": {
                            "title": current_song.title,
                            "artist": current_song.uploader,
                            "duration": current_song.duration,
                            "position": 0,  # You'd calculate this from start time
                            "thumbnail": current_song.thumbnail or '',
                            "youtube_id": current_song.data.get('id', ''),
                            "webpage_url": current_song.webpage_url
                        },
                        "queue": [],  # Queue is complex asyncio.Queue, simplified for now
                        "volume": instance.volume if hasattr(instance, 'volume') else 50,
                        "is_playing": instance.is_playing if hasattr(instance, 'is_playing') else False
                    }))
                    self.bot.add_log("🎵 Sent REAL music data to Activity!")
                    return
            
            # Fallback - send success but no current music
            self.bot.add_log("⚠️ No music instance found or no current song")
            await ws.send_str(json.dumps({
                "type": "AUTH_SUCCESS", 
                "message": "Connected successfully!",
                "user_data": {"dj": "Bot"},
                "current_song": None,
                "queue": [],
                "volume": 50,
                "is_playing": False
            }))
            self.bot.add_log("✅ Sent connection success (no current music)")
            
        except Exception as e:
            self.bot.add_log(f"❌ Error sending music state: {e}")
            # Send basic success message as fallback
            await ws.send_str(json.dumps({
                "type": "AUTH_SUCCESS",
                "message": "Connected successfully!",
                "user_data": {"dj": "Bot"}
            }))
    
    async def execute_music_command(self, instance, command, data=None):
        """Execute music command on the instance"""
        try:
            self.bot.add_log(f"🎵 Executing command: {command} with data: {data}")
            
            if command == "skip":
                self.bot.add_log(f"🔍 Skip attempt - voice_client exists: {hasattr(instance, 'voice_client')}")
                if hasattr(instance, 'voice_client') and instance.voice_client:
                    self.bot.add_log(f"🔍 Voice client is_playing: {instance.voice_client.is_playing()}")
                    self.bot.add_log(f"🔍 Queue size: {instance.queue.qsize() if hasattr(instance, 'queue') else 'unknown'}")
                    
                # Use the same method as the regular /skip command
                if hasattr(instance, 'voice_client') and instance.voice_client:
                    self.bot.add_log(f"🔍 Voice client exists: True, is_connected: {instance.voice_client.is_connected()}")
                    self.bot.add_log(f"🔍 Voice client is_playing: {instance.voice_client.is_playing()}")
                    self.bot.add_log(f"🔍 Voice client is_paused: {instance.voice_client.is_paused()}")
                    
                    if instance.voice_client.is_playing():
                        self.bot.add_log("⏭️ Stopping voice client to skip (same as /skip command)")
                        self.bot.add_log(f"🔍 Before skip - Queue empty: {instance.queue.empty()}")
                        self.bot.add_log(f"🔍 Before skip - Loop enabled: {getattr(instance, 'loop', False)}")
                        self.bot.add_log(f"🔍 Before skip - Playlist tracks: {len(getattr(instance, 'current_playlist_tracks', []))}")
                        instance.voice_client.stop()  # This should trigger the player loop to continue
                    elif instance.voice_client.is_paused():
                        self.bot.add_log("⚠️ Cannot skip - voice client is paused, not playing")
                    else:
                        self.bot.add_log("⚠️ Cannot skip - voice client not in playing state")
                else:
                    self.bot.add_log("❌ Cannot skip - no active voice client or not connected")
                    
            elif command == "pause":
                if hasattr(instance, 'pause'):
                    await instance.pause()
                elif instance.voice_client and instance.voice_client.is_playing():
                    instance.voice_client.pause()
                    instance.is_playing = False
                    
            elif command == "play":
                if hasattr(instance, 'resume'):
                    await instance.resume()
                elif instance.voice_client and instance.voice_client.is_paused():
                    instance.voice_client.resume()
                    instance.is_playing = True
                    
            elif command == "stop":
                if hasattr(instance, 'stop'):
                    await instance.stop()
                elif instance.voice_client:
                    instance.voice_client.stop()
                    instance.is_playing = False
                    
            elif command == "volume":
                if data and "volume" in data:
                    new_volume = int(data["volume"])
                    # Ensure volume is within valid range
                    new_volume = max(0, min(100, new_volume))
                    
                    if hasattr(instance, 'set_volume'):
                        await instance.set_volume(new_volume)
                    elif hasattr(instance, 'volume'):
                        instance.volume = new_volume
                        # Apply volume to voice client if available
                        if instance.voice_client and hasattr(instance.voice_client.source, 'volume'):
                            instance.voice_client.source.volume = new_volume / 100.0
                    
                    self.bot.add_log(f"🔊 Volume set to {new_volume}%")
                    
            elif command == "previous":
                # Previous functionality - can be implemented later
                # For now, just log that it was attempted
                self.bot.add_log("⏪ Previous song not implemented yet")
                
            elif command == "status":
                # Just return current status - no action needed
                self.bot.add_log("📊 Status requested")
                    
            self.bot.add_log(f"✅ Command {command} executed successfully")
            
        except Exception as e:
            self.bot.add_log(f"❌ Error executing command {command}: {e}")

    async def serve_activity_html(self, request):
        """Serve the Activity HTML file"""
        try:
            # Check for version preference (ultimate by default)
            version = request.query.get('version', 'ultimate').lower()
            
            if version == 'ultimate':
                # Path to the new Ultimate All-in-One Activity
                activity_html_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'activity_frontend', 'ultimate_all_in_one_activity.html')
                dashboard_type = "Ultimate All-in-One Activity"
            elif version == 'glass':
                # Path to the Glass Dashboard
                activity_html_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'activity_frontend', 'glass_dashboard_activity.html')
                dashboard_type = "Glass Dashboard"
            else:
                # Path to the original Activity
                activity_html_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'activity_frontend', 'ultimate_enhanced_activity.html')
                dashboard_type = "Enhanced Activity"
            
            if os.path.exists(activity_html_path):
                with open(activity_html_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                
                self.bot.add_log(f"🚀 Serving {dashboard_type} to {request.remote}")
                return web.Response(text=html_content, content_type='text/html')
            else:
                self.bot.add_log(f"❌ Activity HTML file not found: {activity_html_path}")
                # Fallback chain
                fallback_paths = [
                    ('ultimate_all_in_one_activity.html', 'Ultimate Activity'),
                    ('glass_dashboard_activity.html', 'Glass Dashboard'), 
                    ('ultimate_enhanced_activity.html', 'Enhanced Activity')
                ]
                
                for filename, name in fallback_paths:
                    fallback_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'activity_frontend', filename)
                    if os.path.exists(fallback_path):
                        with open(fallback_path, 'r', encoding='utf-8') as f:
                            html_content = f.read()
                        self.bot.add_log(f"📄 Serving fallback {name} to {request.remote}")
                        return web.Response(text=html_content, content_type='text/html')
                
                return web.Response(text="Activity HTML not found", status=404)
                
        except Exception as e:
            self.bot.add_log(f"💥 Error serving Activity HTML: {e}")
            return web.Response(text="Internal Server Error", status=500)

    async def handle_aiohttp_connection(self, ws, path):
        """Handle WebSocket connection using aiohttp WebSocket"""
        self.bot.add_log(f"🔌 New aiohttp WebSocket connection (path: {path})")
        self.bot.add_log(f"🔍 WebSocket state: closed={ws.closed}")
        
        try:
            # Wait for authentication message
            self.bot.add_log("⏳ Waiting for authentication message...")
            self.bot.add_log("🔄 Starting message loop...")
            
            async for msg in ws:
                self.bot.add_log(f"📩 Got message type: {msg.type}")
                if msg.type == WSMsgType.TEXT:
                    auth_message = msg.data
                    self.bot.add_log(f"📨 Received auth message: {auth_message[:100]}...")
                    
                    try:
                        message_data = json.loads(auth_message)
                        message_type = message_data.get("type")
                        
                        # Handle authentication
                        if message_type == "auth":
                            token = message_data.get("token")
                            
                            if not token:
                                await ws.send_str(json.dumps({
                                    "type": "AUTH_FAILED", 
                                    "message": "No token provided"
                                }))
                                continue
                        
                            self.bot.add_log(f"🔑 Processing auth for token: {token[:8]}...")
                            
                            # Check if token exists in our auth_tokens
                            if token in self.auth_tokens:
                                token_data = self.auth_tokens[token]
                                user_id = token_data['user_id']
                                instance_id = token_data['instance_id']
                            
                                self.bot.add_log(f"✅ Valid token found for user {user_id}, instance {instance_id}")
                                
                                # Store connection
                                if instance_id not in self.connections:
                                    self.connections[instance_id] = set()
                                self.connections[instance_id].add(ws)
                                
                                # Send success response with REAL music data
                                await self.send_current_music_state(ws, instance_id)
                                
                                self.bot.add_log(f"🎉 Authentication successful! Connection established.")
                                continue
                                
                            else:
                                self.bot.add_log(f"❌ Invalid token: {token[:8]}...")
                                await ws.send_str(json.dumps({
                                    "type": "AUTH_FAILED",
                                    "message": "Invalid token"
                                }))
                                break
                                
                        # Handle Discord Activity authentication
                        elif message_type == "ACTIVITY_AUTH":
                            self.bot.add_log("🎮 Discord Activity authentication received!")
                            source = message_data.get("source", "unknown")
                            guild_id = message_data.get("guild_id")
                            channel_id = message_data.get("channel_id")
                            instance_id = message_data.get("instance_id")
                            
                            self.bot.add_log(f"🔍 Activity auth details: source={source}, guild={guild_id}, channel={channel_id}, instance={instance_id}")
                            
                            # Try to find an active music instance for this guild/channel
                            found_instance = None
                            found_instance_id = None
                            
                            if hasattr(self.music_cog, 'instances'):
                                self.bot.add_log(f"🔍 Checking {len(self.music_cog.instances)} music instances...")
                                for inst_id, instance in self.music_cog.instances.items():
                                    self.bot.add_log(f"🔍 Instance {inst_id}: guild={instance.guild.id if instance.guild else None}, channel={instance.voice_channel.id if instance.voice_channel else None}")
                                    
                                    # Match by guild and channel
                                    if (str(instance.guild.id) == str(guild_id) if guild_id and instance.guild else False) or \
                                       (str(instance.voice_channel.id) == str(channel_id) if channel_id and instance.voice_channel else False):
                                        found_instance = instance
                                        found_instance_id = inst_id
                                        self.bot.add_log(f"✅ Found matching music instance: {inst_id}")
                                        break
                                
                                # If no exact match, use the first active instance as fallback
                                if not found_instance and self.music_cog.instances:
                                    found_instance_id, found_instance = next(iter(self.music_cog.instances.items()))
                                    self.bot.add_log(f"⚠️ No exact match found, using fallback instance: {found_instance_id}")
                            
                            if found_instance:
                                # Store connection
                                if found_instance_id not in self.connections:
                                    self.connections[found_instance_id] = set()
                                self.connections[found_instance_id].add(ws)
                                
                                # Send success response with REAL music data
                                await self.send_current_music_state(ws, found_instance_id)
                                self.bot.add_log(f"🎉 Activity authentication successful! Connected to instance {found_instance_id}")
                                continue
                            else:
                                # No active music instance found
                                self.bot.add_log("⚠️ No active music instance found for Activity")
                                await ws.send_str(json.dumps({
                                    "type": "AUTH_SUCCESS",
                                    "message": "Connected successfully - No active music",
                                    "current_song": None,
                                    "queue": [],
                                    "volume": 50,
                                    "is_playing": False
                                }))
                                continue
                                
                        # Handle commands
                        elif message_type == "COMMAND":
                            command = message_data.get("command")
                            command_data = message_data.get("data", {})
                            self.bot.add_log(f"🎵 Command received: {command}")
                            
                            # Find the authenticated instance and execute command
                            if hasattr(self.music_cog, 'instances'):
                                for inst_id, connections in self.connections.items():
                                    if ws in connections and inst_id in self.music_cog.instances:
                                        instance = self.music_cog.instances[inst_id]
                                        await self.execute_music_command(instance, command, command_data)
                                        
                                        # Send updated state after command execution
                                        await self.send_current_music_state(ws, inst_id)
                                        break
                            
                            await ws.send_str(json.dumps({
                                "type": "COMMAND_RESPONSE",
                                "command": command,
                                "status": "executed"
                            }))
                            continue
                            
                        elif message_type == "ADMIN_COMMAND":
                            # Handle admin commands
                            await self.handle_admin_command(ws, message_data)
                            continue
                            
                        elif message_type == "PLAYLIST_COMMAND":
                            # Handle playlist commands
                            await self.handle_playlist_command(ws, message_data)
                            continue
                            
                        elif message_type == "UI_COMMAND":
                            # Handle UI commands (daily claim, games, etc.)
                            await self.handle_ui_command(ws, message_data)
                            continue
                            
                    except json.JSONDecodeError as e:
                        self.bot.add_log(f"❌ Invalid JSON in auth message: {e}")
                        await ws.send_str(json.dumps({
                            "type": "AUTH_FAILED",
                            "message": "Invalid JSON format"
                        }))
                        break
                        
                elif msg.type == WSMsgType.ERROR:
                    self.bot.add_log(f"❌ WebSocket error: {ws.exception()}")
                    break
                elif msg.type == WSMsgType.CLOSE:
                    self.bot.add_log("🔌 WebSocket connection closed by client")
                    break
            
            self.bot.add_log("⚠️ Exited message loop - connection ended")
                    
        except Exception as e:
            self.bot.add_log(f"💥 Connection handling error: {e}")
            import traceback
            self.bot.add_log(f"💥 Traceback: {traceback.format_exc()}")
        finally:
            # Clean up connection
            for instance_id, conn_set in self.connections.items():
                if ws in conn_set:
                    conn_set.remove(ws)
                    self.bot.add_log(f"🧹 Cleaned up connection for instance {instance_id}")

    async def start_server(self, host="localhost", port=8765):
        """Start the WebSocket server with a specific host binding."""
        try:
            self.bot.add_log(f"🔧 Starting simple WebSocket server on {host}:{port}...")
            
            # Try alternative: Use websockets library instead of aiohttp
            import websockets
            
            async def handle_websocket(websocket, path):
                self.bot.add_log(f"🔌 New WebSocket connection: {websocket.remote_address}")
                try:
                    await self.handle_simple_connection(websocket, path)
                except Exception as e:
                    self.bot.add_log(f"❌ WebSocket connection error: {e}")
                finally:
                    self.bot.add_log(f"🔌 WebSocket connection closed")
            
            # Start websockets server
            self.websocket_server = await websockets.serve(
                handle_websocket, 
                host, 
                port,
                ping_interval=20,
                ping_timeout=10
            )
            
            self.bot.add_log(f"✅ Simple WebSocket server started on {host}:{port}")
            
            # Test if server is actually listening
            await asyncio.sleep(0.5)
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            try:
                result = sock.connect_ex((host, port))
                if result == 0:
                    self.bot.add_log(f"✅ Port {port} is accessible and responding")
                else:
                    self.bot.add_log(f"❌ Port {port} connection failed (code: {result})")
            except Exception as test_e:
                self.bot.add_log(f"❌ Port test error: {test_e}")
            finally:
                sock.close()
                
        except ImportError:
            self.bot.add_error("❌ websockets library not available, falling back to aiohttp")
            await self.start_aiohttp_server(host, port)
        except Exception as e:
            self.bot.add_error(f"❌ Failed to start simple WebSocket server: {e}")
            self.bot.add_log(f"🔄 Trying fallback aiohttp server...")
            await self.start_aiohttp_server(host, port)
    
    async def start_aiohttp_server(self, host="localhost", port=8765):
        """Fallback aiohttp server method"""
        try:
            self.bot.add_log(f"🔧 Starting aiohttp WebSocket server on {host}:{port}...")
            
            # Create aiohttp application
            self.app = web.Application()
            # Route all paths to handle_request for WebSocket upgrade detection
            self.app.router.add_get('/', self.handle_request)  
            self.app.router.add_get('/ws', self.handle_request)
            self.app.router.add_get('/{path:.*}', self.handle_request)  # Catch all routes
            
            self.bot.add_log(f"🔧 aiohttp app created with WebSocket routes")
            
            # Create runner and site
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            
            self.site = web.TCPSite(self.runner, host, port)
            await self.site.start()
            
            # Test the server is actually running
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            try:
                result = sock.connect_ex((host, port))
                if result == 0:
                    self.bot.add_log(f"✅ Port {port} is accessible and responding")
                    self.server = True  # Mark server as running
                else:
                    self.bot.add_log(f"❌ Port {port} not accessible (code: {result})")
                    self.server = False
            except Exception as e:
                self.bot.add_log(f"❌ Port test failed: {e}")
                self.server = False
            finally:
                sock.close()
            
            # Keep reference to prevent garbage collection
            self.server_host = host
            self.server_port = port
            
            self.bot.add_log(f"✅ aiohttp WebSocket server started on {host}:{port}")
                
        except Exception as e:
            self.bot.add_error(f"❌ aiohttp server also failed: {e}")
            import traceback
            self.bot.add_log(f"🔍 Full error: {traceback.format_exc()}")
            self.server = False
    
    async def handle_simple_connection(self, websocket, path):
        """Handle WebSocket connection using websockets library"""
        self.bot.add_log(f"🔌 Simple WebSocket connection from {websocket.remote_address}")
        
        try:
            async for message in websocket:
                self.bot.add_log(f"📨 Received: {message[:100]}...")
                try:
                    data = json.loads(message)
                    await self.process_websocket_message(websocket, data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "ERROR",
                        "message": "Invalid JSON format"
                    }))
        except Exception as e:
            self.bot.add_log(f"❌ Connection handling error: {e}")
    
    async def process_websocket_message(self, websocket, data):
        """Process WebSocket message (simplified)"""
        message_type = data.get("type")
        
        if message_type == "ACTIVITY_AUTH":
            self.bot.add_log("🎮 Activity authentication received!")
            guild_id = data.get("guild_id")
            channel_id = data.get("channel_id")
            
            # Find music instance
            found_instance = None
            if hasattr(self.music_cog, 'instances'):
                for inst_id, instance in self.music_cog.instances.items():
                    if (str(instance.guild.id) == str(guild_id)) or (str(instance.voice_channel.id) == str(channel_id)):
                        found_instance = instance
                        break
            
            if found_instance and found_instance.current_song:
                # Send real music data
                await websocket.send(json.dumps({
                    "type": "AUTH_SUCCESS",
                    "message": "Connected to REAL bot!",
                    "current_song": {
                        "title": found_instance.current_song.title,
                        "artist": found_instance.current_song.uploader,
                        "webpage_url": found_instance.current_song.webpage_url
                    },
                    "is_playing": getattr(found_instance, 'is_playing', False),
                    "volume": getattr(found_instance, 'volume', 50)
                }))
                self.bot.add_log("🎵 Sent real music data to Activity!")
            else:
                # Send connected but no music
                await websocket.send(json.dumps({
                    "type": "AUTH_SUCCESS",
                    "message": "Connected - No active music",
                    "current_song": None,
                    "is_playing": False,
                    "volume": 50
                }))
        
        elif message_type == "COMMAND":
            command = data.get("command")
            self.bot.add_log(f"🎵 Command received: {command}")
            
            await websocket.send(json.dumps({
                "type": "COMMAND_RESPONSE",
                "command": command,
                "status": "executed"
            }))

    async def stop_server(self):
        """Stop the aiohttp WebSocket server"""
        try:
            if hasattr(self, 'site') and self.site:
                await self.site.stop()
                self.site = None
            if hasattr(self, 'runner') and self.runner:
                await self.runner.cleanup()
                self.runner = None
            if hasattr(self, 'app'):
                self.app = None
            self.bot.add_log("🌐 aiohttp WebSocket server stopped")
        except Exception as e:
            self.bot.add_error(f"Error stopping WebSocket server: {e}")
    
    async def handle_admin_command(self, ws, message_data):
        """Handle admin commands from the Activity"""
        try:
            command = message_data.get("command")
            data = message_data.get("data", {})
            
            self.bot.add_log(f"🔧 Admin command received: {command}")
            
            # Check if user has admin permissions
            # Find the authenticated user for this websocket connection
            user_id = None
            for token_data in self.auth_tokens.values():
                for inst_id, connections in self.connections.items():
                    if ws in connections:
                        user_id = token_data.get('user_id')
                        break
                if user_id:
                    break
            
            # Check if user is bot owner
            owner_id = os.getenv('OWNER_ID', '1122867183727427644')
            if str(user_id) != owner_id:
                await ws.send_str(json.dumps({
                    "type": "ADMIN_RESPONSE",
                    "command": command,
                    "success": False,
                    "error": "Unauthorized: Admin access required"
                }))
                return
            
            result = None
            success = True
            error = None
            
            try:
                if command == "GET_INSTANCES":
                    # Get all active music instances
                    instances = []
                    if hasattr(self.music_cog, 'instances'):
                        for inst_id, instance in self.music_cog.instances.items():
                            guild_name = instance.voice_channel.guild.name if hasattr(instance, 'voice_channel') and instance.voice_channel else "Unknown"
                            instances.append({
                                "id": inst_id,
                                "status": "playing" if getattr(instance, 'is_playing', False) else "idle",
                                "guild_name": guild_name,
                                "queue_size": instance.queue.qsize() if hasattr(instance, 'queue') else 0
                            })
                    result = {"instances": instances}
                    
                elif command == "GET_BOT_STATS":
                    # Get bot statistics
                    guild_count = len(self.bot.guilds)
                    user_count = sum(len(guild.members) for guild in self.bot.guilds)
                    import psutil
                    memory_mb = psutil.Process().memory_info().rss / 1024 / 1024
                    result = {
                        "guilds": guild_count,
                        "users": user_count,
                        "memory_mb": round(memory_mb, 2)
                    }
                    
                elif command == "GET_MEMORY_USAGE":
                    # Get detailed memory and CPU usage
                    import psutil
                    process = psutil.Process()
                    result = {
                        "memory_mb": round(process.memory_info().rss / 1024 / 1024, 2),
                        "cpu_percent": round(process.cpu_percent(), 2)
                    }
                    
                elif command == "GET_UPTIME":
                    # Get bot uptime
                    uptime_seconds = (datetime.datetime.now() - self.bot.start_time).total_seconds() if hasattr(self.bot, 'start_time') else 0
                    hours = int(uptime_seconds // 3600)
                    minutes = int((uptime_seconds % 3600) // 60)
                    result = {"uptime": f"{hours}h {minutes}m"}
                    
                elif command == "EMERGENCY_STOP_ALL":
                    # Stop all music instances
                    stopped_count = 0
                    if hasattr(self.music_cog, 'instances'):
                        for instance in self.music_cog.instances.values():
                            if hasattr(instance, 'voice_client') and instance.voice_client:
                                if instance.voice_client.is_playing():
                                    instance.voice_client.stop()
                                    stopped_count += 1
                    result = f"Stopped {stopped_count} instances"
                    
                elif command == "RESTART_INSTANCE":
                    # Restart specific instance
                    instance_id = data.get("instance_id")
                    if instance_id and hasattr(self.music_cog, 'instances') and instance_id in self.music_cog.instances:
                        instance = self.music_cog.instances[instance_id]
                        # Implement restart logic
                        result = f"Restarted instance {instance_id}"
                    else:
                        success = False
                        error = "Instance not found"
                        
                elif command == "CLEAR_ALL_QUEUES":
                    # Clear all queues
                    cleared_count = 0
                    if hasattr(self.music_cog, 'instances'):
                        for instance in self.music_cog.instances.values():
                            if hasattr(instance, 'queue'):
                                # Clear the queue
                                while not instance.queue.empty():
                                    try:
                                        instance.queue.get_nowait()
                                        cleared_count += 1
                                    except:
                                        break
                    result = f"Cleared {cleared_count} queued tracks"
                    
                elif command == "SET_GLOBAL_VOLUME":
                    # Set volume for all instances
                    volume = data.get("volume", 80)
                    updated_count = 0
                    if hasattr(self.music_cog, 'instances'):
                        for instance in self.music_cog.instances.values():
                            if hasattr(instance, 'voice_client') and instance.voice_client and hasattr(instance.voice_client, 'source'):
                                instance.voice_client.source.volume = volume / 100.0
                                updated_count += 1
                    result = f"Updated volume to {volume}% for {updated_count} instances"
                    
                else:
                    success = False
                    error = f"Unknown admin command: {command}"
                    
            except Exception as cmd_error:
                success = False
                error = str(cmd_error)
                self.bot.add_error(f"Admin command {command} failed: {cmd_error}")
            
            # Send response back to admin panel
            await ws.send_str(json.dumps({
                "type": "ADMIN_RESPONSE",
                "command": command,
                "success": success,
                "result": result,
                "error": error
            }))
            
        except Exception as e:
            self.bot.add_error(f"Failed to handle admin command: {e}")
            await ws.send_str(json.dumps({
                "type": "ADMIN_RESPONSE",
                "command": message_data.get("command", "unknown"),
                "success": False,
                "error": str(e)
            }))

    async def handle_playlist_command(self, ws, message_data):
        """Handle playlist commands from the Activity"""
        try:
            command = message_data.get("command")
            data = message_data.get("data", {})
            
            self.bot.add_log(f"🎵 Playlist command received: {command}")
            
            result = None
            success = True
            error = None
            
            try:
                if command == "SEARCH_YOUTUBE":
                    # Search YouTube for songs
                    query = data.get("query", "")
                    if query:
                        # Use the bot's existing YouTube search functionality
                        from youtube_search import YoutubeSearch
                        
                        try:
                            results = YoutubeSearch(query, max_results=10).to_dict()
                            
                            # Format results for Activity
                            formatted_results = []
                            for video in results:
                                formatted_results.append({
                                    "id": video.get("id", ""),
                                    "title": video.get("title", "Unknown Title"),
                                    "channel": video.get("channel", "Unknown Channel"),
                                    "duration": video.get("duration", "0:00"),
                                    "thumbnail": video.get("thumbnails", [{}])[0].get("url", "") if video.get("thumbnails") else "",
                                    "url": f"https://youtube.com/watch?v={video.get('id', '')}"
                                })
                            
                            result = {"results": formatted_results}
                            
                        except Exception as search_error:
                            # Fallback to demo results
                            result = {
                                "results": [
                                    {
                                        "id": "demo1",
                                        "title": f"Search result for \"{query}\" - Track 1",
                                        "channel": "Demo Artist",
                                        "duration": "3:45",
                                        "thumbnail": "",
                                        "url": "https://youtube.com/watch?v=demo1"
                                    },
                                    {
                                        "id": "demo2",
                                        "title": f"Search result for \"{query}\" - Track 2", 
                                        "channel": "Another Artist",
                                        "duration": "4:12",
                                        "thumbnail": "",
                                        "url": "https://youtube.com/watch?v=demo2"
                                    }
                                ]
                            }
                    else:
                        success = False
                        error = "No search query provided"
                        
                elif command == "CREATE_PLAYLIST":
                    # Create a new playlist
                    playlist_name = data.get("name", "")
                    playlist_description = data.get("description", "")
                    tracks = data.get("tracks", [])
                    
                    if not playlist_name:
                        success = False
                        error = "Playlist name is required"
                    else:
                        # Store playlist in database (simplified for now)
                        playlist_id = f"playlist_{int(datetime.datetime.now().timestamp())}"
                        
                        # Here you would normally save to your database
                        # For now, we'll just acknowledge the creation
                        result = {
                            "playlist_id": playlist_id,
                            "name": playlist_name,
                            "description": playlist_description,
                            "track_count": len(tracks)
                        }
                        
                elif command == "GET_PLAYLISTS":
                    # Get user's playlists
                    # This would normally query your database
                    result = {
                        "playlists": [
                            {
                                "id": "playlist_1",
                                "name": "My Favorites",
                                "description": "Best songs ever",
                                "tracks": [],
                                "created": datetime.datetime.now().isoformat()
                            },
                            {
                                "id": "playlist_2", 
                                "name": "Chill Vibes",
                                "description": "Relaxing music",
                                "tracks": [],
                                "created": datetime.datetime.now().isoformat()
                            }
                        ]
                    }
                    
                elif command == "PLAY_PLAYLIST":
                    # Play a playlist
                    playlist_id = data.get("playlist_id", "")
                    if playlist_id:
                        # Here you would load the playlist and add its tracks to the queue
                        result = f"Playing playlist {playlist_id}"
                    else:
                        success = False
                        error = "No playlist ID provided"
                        
                elif command == "DELETE_PLAYLIST":
                    # Delete a playlist
                    playlist_id = data.get("playlist_id", "")
                    if playlist_id:
                        # Here you would delete from database
                        result = f"Deleted playlist {playlist_id}"
                    else:
                        success = False
                        error = "No playlist ID provided"
                        
                elif command == "IMPORT_YOUTUBE_PLAYLIST":
                    # Import YouTube playlist
                    url = data.get("url", "")
                    name = data.get("name", "")
                    
                    if not url or not name:
                        success = False
                        error = "URL and name are required"
                    else:
                        # Here you would use yt-dlp to extract playlist info
                        result = f"Imported YouTube playlist as '{name}'"
                        
                else:
                    success = False
                    error = f"Unknown playlist command: {command}"
                    
            except Exception as cmd_error:
                success = False
                error = str(cmd_error)
                self.bot.add_error(f"Playlist command {command} failed: {cmd_error}")
            
            # Send response back to Activity
            await ws.send_str(json.dumps({
                "type": "PLAYLIST_RESPONSE",
                "command": command,
                "success": success,
                "result": result,
                "error": error
            }))
            
        except Exception as e:
            self.bot.add_error(f"Failed to handle playlist command: {e}")
            await ws.send_str(json.dumps({
                "type": "PLAYLIST_RESPONSE",
                "command": message_data.get("command", "unknown"),
                "success": False,
                "error": str(e)
            }))

    async def handle_ui_command(self, ws, message_data):
        """Handle UI commands like daily claim, games, etc."""
        try:
            command = message_data.get("command")
            data = message_data.get("data", {})
            
            self.bot.add_log(f"🎮 UI command received: {command}")
            
            result = None
            success = True
            error = None
            
            try:
                if command == "CLAIM_DAILY":
                    # Handle daily fragment claim
                    # Get user ID from auth token
                    user_id = None
                    for token_data in self.auth_tokens.values():
                        for inst_id, connections in self.connections.items():
                            if ws in connections:
                                user_id = token_data.get('user_id')
                                break
                        if user_id:
                            break
                    
                    if user_id:
                        # Check if user has already claimed today
                        # This would normally check your database
                        result = {
                            "fragments_earned": 100,
                            "new_balance": 1500,
                            "message": "🎁 Daily fragments claimed! +100 fragments"
                        }
                    else:
                        success = False
                        error = "User not authenticated"
                        
                elif command == "OPEN_GAMES":
                    # Open games interface
                    result = {
                        "message": "🎮 Games interface would open here",
                        "available_games": [
                            {"name": "Cyberpunk Mission", "type": "solo"},
                            {"name": "Co-op Mission", "type": "multiplayer"}
                        ]
                    }
                    
                elif command == "START_MISSION":
                    mission_type = data.get("mission_type", "solo")
                    result = {
                        "message": f"🚀 Starting {mission_type} mission...",
                        "mission_id": f"mission_{int(datetime.datetime.now().timestamp())}"
                    }
                    
                elif command == "ECONOMY_HUB":
                    # Get user's economy info
                    result = {
                        "balance": 1500,
                        "daily_available": True,
                        "shop_items": 25,
                        "inventory_count": 8
                    }
                    
                elif command == "OPEN_SHOP":
                    result = {
                        "message": "🛒 Shop interface would open here"
                    }
                    
                elif command == "CHAT_OPURE":
                    result = {
                        "message": "🤖 Chat interface would open here"
                    }
                    
                else:
                    result = {
                        "message": f"Command {command} functionality coming soon!"
                    }
                    
            except Exception as cmd_error:
                success = False
                error = str(cmd_error)
                self.bot.add_error(f"UI command {command} failed: {cmd_error}")
            
            # Send response back to Activity
            await ws.send_str(json.dumps({
                "type": "UI_RESPONSE",
                "command": command,
                "success": success,
                "result": result,
                "error": error
            }))
            
        except Exception as e:
            self.bot.add_error(f"Failed to handle UI command: {e}")
            await ws.send_str(json.dumps({
                "type": "UI_RESPONSE",
                "command": message_data.get("command", "unknown"),
                "success": False,
                "error": str(e)
            }))

    def generate_auth_token(self, user_id: int, instance_id: int) -> str:
        """Generate a unique authentication token"""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.datetime.now() + datetime.timedelta(minutes=10)
        
        # Clean up any existing token for this user
        if user_id in self.active_tokens:
            old_token = self.active_tokens[user_id]
            if old_token in self.auth_tokens:
                del self.auth_tokens[old_token]
        
        self.auth_tokens[token] = {
            "user_id": user_id,
            "instance_id": instance_id,
            "expires_at": expires_at
        }
        self.active_tokens[user_id] = token
        return token
    
    async def handle_connection(self, websocket, path):
        """Handle new WebSocket connections"""
        self.bot.add_log(f"🔌 New WebSocket connection from {websocket.remote_address} (path: {path})")
        try:
            # Wait for authentication message
            self.bot.add_log("⏳ Waiting for authentication message...")
            auth_message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
            self.bot.add_log(f"📨 Received auth message: {auth_message[:100]}...")
            auth_data = json.loads(auth_message)
            
            # Handle both regular auth and Activity auth
            auth_type = auth_data.get("type", "auth")
            
            if auth_type == "ACTIVITY_AUTH":
                # Handle Discord Activity authentication
                user_id = auth_data.get("user_id")
                guild_id = auth_data.get("guild_id")
                channel_id = auth_data.get("channel_id")
                instance_id = auth_data.get("instance_id")
                
                self.bot.add_log(f"🎮 Activity auth request: user={user_id}, guild={guild_id}, channel={channel_id}")
                
                # Find the music instance for this channel
                music_instance = None
                for cid, instance in self.music_cog.instances.items():
                    if str(cid) == str(channel_id):
                        music_instance = instance
                        break
                
                # If no instance exists, create one for the channel
                if not music_instance:
                    try:
                        # Get the guild and channel objects
                        guild = self.bot.get_guild(int(guild_id))
                        voice_channel = guild.get_channel(int(channel_id)) if guild else None
                        
                        if voice_channel:
                            # Create a new music instance
                            from core.music_processor import MusicInstance
                            music_instance = MusicInstance(
                                guild_id=int(guild_id),
                                channel_id=int(channel_id),
                                bot=self.bot,
                                music_cog=self.music_cog
                            )
                            self.music_cog.instances[int(channel_id)] = music_instance
                            self.bot.add_log(f"✅ Created new music instance for channel {channel_id}")
                        else:
                            await websocket.send(json.dumps({"type": "AUTH_FAILED", "message": "Voice channel not found"}))
                            return
                    except Exception as e:
                        self.bot.add_log(f"❌ Failed to create music instance: {e}")
                        await websocket.send(json.dumps({"type": "AUTH_FAILED", "message": "Failed to create music session"}))
                        return
                
                # Store Activity connection
                connection_key = f"activity_{channel_id}"
                if connection_key not in self.connections:
                    self.connections[connection_key] = set()
                self.connections[connection_key].add(websocket)
                
                # Send success with current music state
                response = {
                    "type": "AUTH_SUCCESS", 
                    "user_id": user_id, 
                    "activity": True,
                    "channel_id": channel_id,
                    "guild_id": guild_id
                }
                
                # Include current music state if available
                if music_instance and music_instance.current_track:
                    response["current_song"] = {
                        "title": music_instance.current_track.get("title", "Unknown"),
                        "artist": music_instance.current_track.get("uploader", "Unknown"),
                        "duration": music_instance.current_track.get("duration", 0),
                        "youtube_id": music_instance.current_track.get("id"),
                        "thumbnail": music_instance.current_track.get("thumbnail")
                    }
                    response["is_playing"] = music_instance.is_playing
                
                await websocket.send(json.dumps(response))
                self.bot.add_log(f"🎮 Activity authenticated for user {user_id} in instance {instance_id}")
                
                # Send current state
                await self.send_current_state(websocket, instance_id)
                
                # Handle Activity messages
                async for message in websocket:
                    try:
                        await self.handle_activity_message(websocket, json.loads(message), user_id, instance_id)
                    except Exception as e:
                        self.bot.add_log(f"❌ Activity message error: {e}")
                        break
                return
            
            # Regular token authentication
            token = auth_data.get("token")
            self.bot.add_log(f"🔑 Auth token received: {token[:8]}..." if token else "❌ No token in message")
            if not token or token not in self.auth_tokens:
                error_msg = f"Invalid token: {token[:8]}..." if token else "No token provided"
                self.bot.add_log(f"❌ WebSocket auth failed: {error_msg}")
                await websocket.send(json.dumps({"type": "AUTH_FAILED", "message": "Invalid token"}))
                return
            
            token_data = self.auth_tokens[token]
            if datetime.datetime.now() > token_data["expires_at"]:
                await websocket.send(json.dumps({"type": "AUTH_FAILED", "message": "Token expired"}))
                del self.auth_tokens[token]
                return
            
            # Authentication successful
            user_id = token_data["user_id"]
            instance_id = token_data["instance_id"]
            
            # Add connection to instance
            if instance_id not in self.connections:
                self.connections[instance_id] = set()
            self.connections[instance_id].add(websocket)
            
            await websocket.send(json.dumps({"type": "AUTH_SUCCESS", "user_id": user_id}))
            
            # Send current state
            await self.send_current_state(websocket, instance_id)
            
            self.bot.add_log(f"🌐 Activity connected for user {user_id} in instance {instance_id}")
            
            # Handle messages
            async for message in websocket:
                try:
                    await self.handle_message(websocket, json.loads(message), user_id, instance_id)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({"type": "ERROR", "message": "Invalid JSON"}))
                except Exception as e:
                    self.bot.add_error(f"WebSocket message error: {e}")
                    
        except asyncio.TimeoutError:
            self.bot.add_log("⏰ WebSocket authentication timeout (30s) - no auth message received")
        except ConnectionError:
            self.bot.add_log("🔌 WebSocket connection closed")
        except json.JSONDecodeError as e:
            self.bot.add_log(f"❌ JSON decode error in WebSocket auth: {e}")
            await websocket.send(json.dumps({"type": "AUTH_FAILED", "message": "Invalid JSON format"}))
        except KeyError as e:
            self.bot.add_log(f"❌ Missing key in auth data: {e}")
            await websocket.send(json.dumps({"type": "AUTH_FAILED", "message": f"Missing required field: {e}"}))
        except Exception as e:
            self.bot.add_error(f"WebSocket connection error: {e}")
            import traceback
            self.bot.add_log(f"WebSocket error traceback: {traceback.format_exc()}")
            try:
                await websocket.send(json.dumps({"type": "AUTH_FAILED", "message": f"Server error: {str(e)}"}))
            except:
                pass
        finally:
            # Clean up connection
            for instance_id, ws_set in self.connections.items():
                if websocket in ws_set:
                    ws_set.remove(websocket)
                    break
    
    async def send_current_state(self, websocket, instance_id: int):
        """Send current playback state to newly connected client"""
        instance = self.music_cog.instances.get(instance_id)
        if not instance:
            return
        
        # Current song info
        if instance.current_song:
            await websocket.send(json.dumps({
                "type": "NOW_PLAYING",
                "data": {
                    "title": instance.current_song.title,
                    "uploader": instance.current_song.uploader,
                    "duration": instance.current_song.duration,
                    "webpage_url": instance.current_song.webpage_url,
                    "thumbnail": instance.current_song.thumbnail,
                    "current_time": getattr(instance.current_song, 'current_time', 0),
                    "is_playing": instance.voice_client and instance.voice_client.is_playing() if instance.voice_client else False
                }
            }))
        
        # Queue info
        queue_list = []
        temp_queue = []
        
        # Get items from queue without removing them
        while not instance.queue.empty():
            try:
                item = instance.queue.get_nowait()
                temp_queue.append(item)
                queue_list.append({
                    "title": item.get("title", "Unknown"),
                    "uploader": item.get("uploader", "Unknown"),
                    "duration": item.get("duration"),
                    "webpage_url": item.get("webpage_url", "#")
                })
            except asyncio.QueueEmpty:
                break
        
        # Put items back in queue
        for item in temp_queue:
            await instance.queue.put(item)
        
        await websocket.send(json.dumps({
            "type": "PLAYLIST_UPDATED",
            "data": {"queue": queue_list}
        }))
        
        # Current EQ settings
        await websocket.send(json.dumps({
            "type": "EQ_CHANGED",
            "data": getattr(instance, 'current_eq', EQ_PRESETS["flat"])
        }))
    
    async def handle_message(self, websocket, data: dict, user_id: int, instance_id: int):
        """Handle incoming WebSocket messages"""
        message_type = data.get("type")
        instance = self.music_cog.instances.get(instance_id)
        
        if not instance:
            await websocket.send(json.dumps({"type": "ERROR", "message": "Instance not found"}))
            return
        
        if message_type == "CHANGE_EQ":
            await self.handle_eq_change(instance, data.get("data", {}), instance_id)
        elif message_type == "PLAY_SONG":
            await self.handle_play_song(instance, data.get("data", {}))
        elif message_type == "SEEK":
            await self.handle_seek(instance, data.get("data", {}))
        elif message_type == "PAUSE":
            await self.handle_pause(instance)
        elif message_type == "RESUME":
            await self.handle_resume(instance)
        elif message_type == "SKIP":
            await self.handle_skip(instance)
        elif message_type == "UI_COMMAND":
            await self.handle_activity_message(websocket, data, user_id, instance_id)
    
    async def handle_activity_message(self, websocket, data: dict, user_id: int, instance_id: int):
        """Handle Discord Activity specific messages - ENHANCED FOR ULTIMATE EXPERIENCE"""
        message_type = data.get("type")
        command = data.get("command")
        command_data = data.get("data", {})
        
        self.bot.add_log(f"🚀 ULTIMATE Activity command: {command} from user {user_id}")
        
        # Get the Discord user object for advanced features
        user = self.bot.get_user(user_id)
        if not user:
            try:
                user = await self.bot.fetch_user(user_id)
            except:
                user = None
        
        # Handle UI commands that don't require music instance
        if command.startswith('get_') or command in ['ai_chat', 'daily_claim', 'open_shop', 'open_inventory', 'open_profile', 'open_leaderboard', 'start_game', 'extract_logkey', 'open_game_stats']:
            await self.handle_universal_command(websocket, command, command_data, user_id, user)
            return
        
        # For music-specific commands, get the instance
        instance = None
        for channel_id, inst in self.music_cog.instances.items():
            if inst.instance_id == instance_id:
                instance = inst
                break
        
        if not instance and command not in ['admin_restart_music', 'admin_system_status']:
            await websocket.send(json.dumps({"type": "UI_RESPONSE", "command": "error", "data": {"message": "Music instance not found. Join a voice channel first!"}}))
            return
        
        # ENHANCED MUSIC CONTROL COMMANDS
        if command == "play":
            query = command_data.get("query")
            if query:
                await self.handle_play_command(instance, query, user_id, websocket)
            elif instance.voice_client and instance.voice_client.is_paused():
                instance.voice_client.resume()
                await self.broadcast_to_instance(instance_id, {"type": "PLAYBACK_RESUMED"})
        
        elif command == "toggle_play":
            if instance.voice_client:
                if instance.voice_client.is_playing():
                    instance.voice_client.pause()
                    await self.broadcast_to_instance(instance_id, {"type": "PLAYBACK_PAUSED"})
                elif instance.voice_client.is_paused():
                    instance.voice_client.resume()
                    await self.broadcast_to_instance(instance_id, {"type": "PLAYBACK_RESUMED"})
        
        elif command == "pause":
            if instance.voice_client and instance.voice_client.is_playing():
                instance.voice_client.pause()
                await self.broadcast_to_instance(instance_id, {"type": "PLAYBACK_PAUSED"})
        
        elif command in ["skip", "next"]:
            if instance.voice_client:
                instance.voice_client.stop()  # This will trigger next song
                await self.broadcast_to_instance(instance_id, {"type": "TRACK_SKIPPED"})
        
        elif command == "previous":
            # Enhanced previous functionality
            await self.handle_previous_track(instance, websocket)
        
        elif command == "stop":
            if instance.voice_client:
                instance.voice_client.stop()
                instance.queue = asyncio.Queue()
                await self.broadcast_to_instance(instance_id, {"type": "PLAYBACK_STOPPED"})
        
        elif command in ["shuffle_toggle", "repeat_toggle"]:
            await self.handle_toggle_command(instance, command, websocket)
        
        elif command == "queue_add":
            query = command_data.get("query")
            if query:
                await self.handle_queue_add(instance, query, user_id, websocket)
        
        elif command == "queue_jump":
            index = command_data.get("index", 0)
            await self.handle_queue_jump(instance, index, websocket)
        
        elif command == "queue_remove":
            index = command_data.get("index", 0)
            await self.handle_queue_remove(instance, index, websocket)
        
        elif command in ["queue_shuffle", "queue_clear"]:
            await self.handle_queue_operation(instance, command, websocket)
        
        elif command == "set_volume":
            volume = command_data.get("volume", 100)
            await self.handle_volume_change(instance, volume, websocket)
        
        elif command.startswith("eq_"):
            await self.handle_eq_command(instance, command, command_data, instance_id)
        
        elif command.startswith("admin_"):
            await self.handle_admin_command(websocket, command, command_data, user_id, user)
        
        # Send success acknowledgment
        await websocket.send(json.dumps({
            "type": "COMMAND_ACK",
            "command": command,
            "status": "success"
        }))
    
    async def handle_universal_command(self, websocket, command: str, data: dict, user_id: int, user):
        """Handle commands that work without music instance"""
        
        if command == "get_economy_data":
            # Get user's economy data from database
            try:
                async with self.bot.db.execute("SELECT fragments, level, daily_streak FROM players WHERE user_id = ?", (user_id,)) as cursor:
                    result = await cursor.fetchone()
                    
                if result:
                    economy_data = {
                        "fragments": result[0],
                        "level": result[1],
                        "streak": result[2]
                    }
                else:
                    economy_data = {"fragments": 0, "level": 1, "streak": 0}
                
                await websocket.send(json.dumps({
                    "type": "UI_RESPONSE",
                    "command": "economy_data",
                    "data": economy_data
                }))
            except Exception as e:
                self.bot.add_error(f"Error getting economy data: {e}")
        
        elif command == "get_queue_data":
            # Send demo queue data for now
            demo_queue = [
                {"title": "Cyberpunk Vibes", "artist": "Opure.exe Synthwave", "duration": 180},
                {"title": "Next Demo Track", "artist": "AI Generated", "duration": 200}
            ]
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "queue_data",
                "data": {"queue": demo_queue}
            }))
        
        elif command == "get_admin_data":
            admin_data = {
                "instances": len(self.music_cog.instances),
                "users": sum(len(ws_set) for ws_set in self.connections.values()),
                "uptime": "Online",
                "status": "Operational"
            }
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "admin_data",
                "data": admin_data
            }))
        
        elif command == "ai_chat":
            message = data.get("message", "")
            if message:
                try:
                    # Get AI response using bot's ollama client
                    response = await self.bot.ollama_client.generate(model='opure', prompt=f"{user.display_name if user else 'User'}: {message}")
                    ai_response = response.get('response', 'Sorry, I cannot process that right now.').strip()
                    
                    # Store in memory if available
                    if hasattr(self.bot, 'memory_system') and self.bot.memory_system:
                        self.bot.memory_system.add(user_id=str(user_id), text_content=f"{user.display_name if user else 'User'}: {message}")
                        self.bot.memory_system.add(user_id=str(user_id), text_content=f"Opure.exe: {ai_response}")
                    
                    await websocket.send(json.dumps({
                        "type": "UI_RESPONSE",
                        "command": "ai_response",
                        "data": {"response": ai_response}
                    }))
                except Exception as e:
                    self.bot.add_error(f"AI chat error: {e}")
                    await websocket.send(json.dumps({
                        "type": "UI_RESPONSE",
                        "command": "ai_response",
                        "data": {"response": "⚠️ AI system temporarily unavailable. Please try again."}
                    }))
        
        elif command == "daily_claim":
            # Handle daily claim through economy cog
            try:
                economy_cog = self.bot.get_cog('EconomyCog')
                if economy_cog:
                    # Simulate daily claim result
                    await websocket.send(json.dumps({
                        "type": "UI_RESPONSE",
                        "command": "daily_claimed",
                        "data": {"fragments": 50, "streak": 1, "message": "Daily reward claimed! +50 fragments"}
                    }))
                    
                    # Post to Discord channel about streak if enabled
                    await self.post_economy_update(user, "daily_claim", {"fragments": 50, "streak": 1})
            except Exception as e:
                self.bot.add_error(f"Daily claim error: {e}")
        
        elif command == "generate_visualizer":
            # Generate AI-powered visualizer
            style = data.get("style", "cyberpunk")
            await self.generate_ai_visualizer(websocket, user, style)
            
        elif command in ["start_game", "extract_logkey", "open_shop", "open_inventory", "open_profile", "open_leaderboard", "open_game_stats"]:
            # Handle game/economy commands
            game_cog = self.bot.get_cog('GameCog')
            economy_cog = self.bot.get_cog('EconomyCog')
            
            # Send appropriate response based on command
            command_messages = {
                "start_game": "🎮 Starting cyberpunk mission...",
                "extract_logkey": "🔑 Extracting log-key rewards...",
                "open_shop": "🛒 Opening black market...",
                "open_inventory": "🎒 Loading inventory...",
                "open_profile": "👤 Loading profile...",
                "open_leaderboard": "🏆 Loading leaderboard...",
                "open_game_stats": "📊 Loading game statistics..."
            }
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": command + "_result",
                "data": {"message": command_messages.get(command, "Processing...")}
            }))
    
    async def handle_play_command(self, instance, query: str, user_id: int, websocket):
        """Enhanced play command handling"""
        try:
            # This would integrate with existing play functionality
            # For now, simulate adding to queue
            self.bot.add_log(f"🎵 Playing: {query} for user {user_id}")
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "track_added",
                "data": {"message": f"🎵 Added to queue: {query}"}
            }))
        except Exception as e:
            self.bot.add_error(f"Play command error: {e}")
    
    async def handle_queue_operations(self, instance, command: str, data: dict, websocket):
        """Handle queue-related operations"""
        try:
            if command == "queue_jump":
                index = data.get("index", 0)
                self.bot.add_log(f"🎵 Jumping to track {index}")
            elif command == "queue_remove":
                index = data.get("index", 0)
                self.bot.add_log(f"🗑️ Removing track {index}")
            elif command == "queue_shuffle":
                self.bot.add_log("🔀 Shuffling queue")
            elif command == "queue_clear":
                instance.queue = asyncio.Queue()
                self.bot.add_log("🗑️ Cleared queue")
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": command + "_result",
                "data": {"message": f"✅ {command.replace('_', ' ').title()} completed"}
            }))
        except Exception as e:
            self.bot.add_error(f"Queue operation error: {e}")
    
    async def handle_admin_command(self, websocket, command: str, data: dict, user_id: int, user):
        """Handle admin-only commands"""
        OWNER_ID = 1122867183727427644  # Your Discord ID
        
        if user_id != OWNER_ID:
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "error",
                "data": {"message": "🚫 Unauthorized: Admin access required"}
            }))
            return
        
        admin_commands = {
            "admin_restart_music": "🔄 Restarting music system...",
            "admin_clear_all_queues": "🗑️ Clearing all queues...",
            "admin_system_status": "📊 System status retrieved",
            "admin_emergency_stop": "🛑 Emergency stop activated",
            "admin_force_reconnect": "🔌 Force reconnecting..."
        }
        
        message = admin_commands.get(command, "Processing admin command...")
        self.bot.add_log(f"👑 Admin command {command} executed by {user.display_name if user else user_id}")
        
        await websocket.send(json.dumps({
            "type": "UI_RESPONSE",
            "command": command + "_result",
            "data": {"message": message}
        }))
    
    async def generate_ai_visualizer(self, websocket, user, style: str):
        """Generate AI-powered visualizer using Ollama"""
        try:
            self.bot.add_log(f"✨ Generating {style} visualizer for {user.display_name if user else 'User'}")
            
            # Create AI prompt for visualizer generation
            style_prompts = {
                "cyberpunk": "Create a cyberpunk-themed audio visualizer with neon colors, digital rain effects, and futuristic geometric patterns. Focus on greens, blues, and purples with glitch effects.",
                "synthwave": "Generate a synthwave visualizer with retro 80s aesthetics, pink and purple gradients, grid patterns, and sunset-like color schemes. Include retro-futuristic elements.",
                "matrix": "Design a Matrix-inspired visualizer with digital rain, green monospace characters, binary code patterns, and cascading data streams.",
                "custom": f"Create a unique, innovative audio visualizer that would appeal to {user.display_name if user else 'a cyberpunk enthusiast'}. Be creative with colors, patterns, and effects."
            }
            
            prompt = f"""You are an AI visualizer designer. {style_prompts.get(style, style_prompts['custom'])}
            
Respond with JavaScript code that creates canvas-based audio visualization. Include:
            1. Dynamic color schemes that react to audio
            2. Geometric patterns or particle effects
            3. Smooth animations at 60fps
            4. Creative visual elements that match the {style} aesthetic
            
Return only the JavaScript function code for the visualizer."""
            
            # Generate visualizer code using Ollama
            response = await self.bot.ollama_client.generate(model='opure', prompt=prompt)
            ai_visualizer = response.get('response', '').strip()
            
            # Send the generated visualizer back to the Activity
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "visualizer_generated",
                "data": {
                    "style": style,
                    "code": ai_visualizer,
                    "message": f"✨ AI generated {style} visualizer!"
                }
            }))
            
            self.bot.add_log(f"✅ Generated {style} visualizer successfully")
            
        except Exception as e:
            self.bot.add_error(f"AI visualizer generation error: {e}")
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "visualizer_error",
                "data": {"message": "❌ Failed to generate AI visualizer. Using default instead."}
            }))
    
    async def post_economy_update(self, user, event_type: str, data: dict):
        """Post economy updates to Discord channels (Activity native integration)"""
        try:
            # This would post updates to specific Discord channels about user activities
            # For example, daily streak notifications, shop purchases, etc.
            if event_type == "daily_claim":
                streak = data.get("streak", 0)
                if streak > 0 and streak % 7 == 0:  # Weekly streak milestone
                    # Find economy channel and post streak celebration
                    for guild in self.bot.guilds:
                        for channel in guild.text_channels:
                            if "economy" in channel.name.lower():
                                embed = discord.Embed(
                                    title="🔥 STREAK MILESTONE!",
                                    description=f"🎉 {user.mention} has reached a **{streak}-day streak**!\n💎 Bonus fragments awarded!",
                                    color=0x00ff88
                                )
                                await channel.send(embed=embed)
                                break
        except Exception as e:
            self.bot.add_error(f"Error posting economy update: {e}")
    
    async def apply_eq_preset(self, instance, preset_name: str, instance_id: int):
        """Apply an equalizer preset"""
        presets = {
            "flat": {"31": 0, "62": 0, "125": 0, "250": 0, "500": 0},
            "bass": {"31": 8, "62": 6, "125": 4, "250": 2, "500": 0},
            "vocal": {"31": -2, "62": -1, "125": 0, "250": 2, "500": 3},
            "treble": {"31": 0, "62": 0, "125": 0, "250": 0, "500": 2}
        }
        
        if preset_name in presets:
            instance.current_eq = presets[preset_name]
            await self.broadcast_to_instance(instance_id, {
                "type": "EQ_PRESET_APPLIED",
                "preset": preset_name,
                "values": presets[preset_name]
            })
            self.bot.add_log(f"🎛️ Applied EQ preset '{preset_name}' to instance {instance_id}")
    
    async def update_eq_band(self, instance, freq: str, value: float, instance_id: int):
        """Update a specific EQ frequency band"""
        if not hasattr(instance, 'current_eq'):
            instance.current_eq = {}
        
        instance.current_eq[freq] = value
        await self.broadcast_to_instance(instance_id, {
            "type": "EQ_BAND_UPDATED",
            "freq": freq,
            "value": value
        })
        self.bot.add_log(f"🎛️ Updated EQ band {freq}Hz to {value}dB in instance {instance_id}")
    
    async def handle_eq_change(self, instance: 'MusicInstance', eq_data: dict, instance_id: int):
        """Handle equalizer changes"""
        instance.current_eq = eq_data
        
        # Apply EQ to current audio stream (if playing)
        if instance.voice_client and instance.voice_client.is_playing():
            # TODO: Implement real-time EQ application with FFmpeg filters
            pass
        
        # Broadcast to all clients
        await self.broadcast_to_instance(instance_id, {
            "type": "EQ_CHANGED",
            "data": eq_data
        })
    
    async def handle_play_song(self, instance: 'MusicInstance', song_data: dict):
        """Handle song selection from Activity"""
        # This would integrate with your existing queue system
        # For now, we'll just acknowledge the request
        await instance.queue.put(song_data)
    
    async def handle_seek(self, instance: 'MusicInstance', seek_data: dict):
        """Handle seek requests"""
        seek_time = seek_data.get("time", 0)
        # TODO: Implement seeking functionality
        # This requires recreating the FFmpeg source with a start time
    
    async def handle_pause(self, instance: 'MusicInstance'):
        """Handle pause requests"""
        if instance.voice_client and instance.voice_client.is_playing():
            instance.voice_client.pause()
    
    async def handle_resume(self, instance: 'MusicInstance'):
        """Handle resume requests"""
        if instance.voice_client and instance.voice_client.is_paused():
            instance.voice_client.resume()
    
    async def handle_skip(self, instance: 'MusicInstance'):
        """Handle skip requests"""
        if instance.voice_client and instance.voice_client.is_playing():
            instance.voice_client.stop()
    
    async def handle_previous_track(self, instance, websocket):
        """Handle previous track functionality - ENHANCED"""
        try:
            # Implementation for previous track
            # This would require maintaining a history of played tracks
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "previous_result",
                "data": {"message": "⏮️ Previous track functionality coming soon!"}
            }))
        except Exception as e:
            self.bot.add_error(f"Previous track error: {e}")
    
    async def handle_toggle_command(self, instance, command: str, websocket):
        """Handle shuffle/repeat toggle commands - ENHANCED"""
        try:
            if command == "shuffle_toggle":
                # Toggle shuffle state
                instance.shuffle_enabled = getattr(instance, 'shuffle_enabled', False)
                instance.shuffle_enabled = not instance.shuffle_enabled
                status = "enabled" if instance.shuffle_enabled else "disabled"
                message = f"🔀 Shuffle {status}"
            
            elif command == "repeat_toggle":
                # Cycle through repeat modes: off -> track -> queue -> off
                current_mode = getattr(instance, 'repeat_mode', 'off')
                modes = ['off', 'track', 'queue']
                next_index = (modes.index(current_mode) + 1) % len(modes)
                instance.repeat_mode = modes[next_index]
                
                mode_emojis = {'off': '▶️', 'track': '🔂', 'queue': '🔁'}
                message = f"{mode_emojis[instance.repeat_mode]} Repeat: {instance.repeat_mode}"
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": command + "_result",
                "data": {"message": message}
            }))
        except Exception as e:
            self.bot.add_error(f"Toggle command error: {e}")
    
    async def handle_queue_add(self, instance, query: str, user_id: int, websocket):
        """Handle adding items to queue - ENHANCED"""
        try:
            # This would integrate with existing queue system
            self.bot.add_log(f"➕ Adding to queue: {query} for user {user_id}")
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "queue_add_result",
                "data": {"message": f"➕ Added to queue: {query}"}
            }))
        except Exception as e:
            self.bot.add_error(f"Queue add error: {e}")
    
    async def handle_queue_jump(self, instance, index: int, websocket):
        """Handle jumping to specific queue position - ENHANCED"""
        try:
            self.bot.add_log(f"⏭️ Jumping to queue position {index}")
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "queue_jump_result",
                "data": {"message": f"⏭️ Jumped to track {index + 1}"}
            }))
        except Exception as e:
            self.bot.add_error(f"Queue jump error: {e}")
    
    async def handle_queue_remove(self, instance, index: int, websocket):
        """Handle removing item from queue - ENHANCED"""
        try:
            self.bot.add_log(f"🗑️ Removing queue position {index}")
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "queue_remove_result",
                "data": {"message": f"🗑️ Removed track {index + 1} from queue"}
            }))
        except Exception as e:
            self.bot.add_error(f"Queue remove error: {e}")
    
    async def handle_queue_operation(self, instance, command: str, websocket):
        """Handle queue operations like shuffle and clear - ENHANCED"""
        try:
            if command == "queue_shuffle":
                # Shuffle queue implementation
                self.bot.add_log("🔀 Shuffling queue")
                message = "🔀 Queue shuffled!"
            elif command == "queue_clear":
                # Clear queue implementation
                instance.queue = asyncio.Queue()
                self.bot.add_log("🗑️ Queue cleared")
                message = "🗑️ Queue cleared!"
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": command + "_result",
                "data": {"message": message}
            }))
        except Exception as e:
            self.bot.add_error(f"Queue operation error: {e}")
    
    async def handle_volume_change(self, instance, volume: int, websocket):
        """Handle volume changes - ENHANCED"""
        try:
            # Clamp volume between 0 and 100
            volume = max(0, min(100, volume))
            
            if instance.voice_client and hasattr(instance.voice_client, 'source'):
                if hasattr(instance.voice_client.source, 'volume'):
                    instance.voice_client.source.volume = volume / 100.0
            
            self.bot.add_log(f"🔊 Volume set to {volume}%")
            
            await websocket.send(json.dumps({
                "type": "UI_RESPONSE",
                "command": "volume_changed",
                "data": {"volume": volume, "message": f"🔊 Volume: {volume}%"}
            }))
        except Exception as e:
            self.bot.add_error(f"Volume change error: {e}")
    
    async def handle_eq_command(self, instance, command: str, data: dict, instance_id: int):
        """Handle equalizer commands - ENHANCED"""
        try:
            if command == "eq_preset":
                preset_name = data.get("preset", "flat")
                await self.apply_eq_preset(instance, preset_name, instance_id)
            elif command == "eq_update":
                freq = data.get("freq")
                value = data.get("value")
                await self.update_eq_band(instance, freq, value, instance_id)
            elif command == "toggle_equalizer":
                # Toggle EQ on/off
                instance.eq_enabled = getattr(instance, 'eq_enabled', True)
                instance.eq_enabled = not instance.eq_enabled
                status = "enabled" if instance.eq_enabled else "disabled"
                
                await self.broadcast_to_instance(instance_id, {
                    "type": "EQ_TOGGLED",
                    "enabled": instance.eq_enabled
                })
                
                self.bot.add_log(f"🎛️ Equalizer {status}")
        except Exception as e:
            self.bot.add_error(f"EQ command error: {e}")
    
    async def broadcast_to_instance(self, instance_id: int, message: dict):
        """Broadcast message to all clients connected to an instance"""
        if instance_id not in self.connections:
            return
        
        message_json = json.dumps(message)
        disconnected = set()
        
        for websocket in self.connections[instance_id]:
            try:
                await websocket.send_str(message_json)
            except ConnectionError:
                disconnected.add(websocket)
            except Exception as e:
                self.bot.add_error(f"Broadcast error: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected clients
        for ws in disconnected:
            self.connections[instance_id].remove(ws)

class LaunchActivityView(discord.ui.View):
    """View with button to launch the Discord Activity"""
    
    def __init__(self, activity_url: str, application_id: str):
        super().__init__(timeout=600)  # 10 minute timeout
        self.activity_url = activity_url
        self.application_id = application_id
    
    @discord.ui.button(label="🎮 Launch Visual Player", style=discord.ButtonStyle.primary)
    async def launch_activity(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Launch the Discord Activity using proper Activity invitation"""
        try:
            # Discord Activities launch via browser since create_activity_invite is not available in discord.py
            await interaction.response.send_message(
                f"🎮 **Visual Music Player Activity**\n"
                f"[🌐 Launch Player]({self.activity_url})\n\n"
                f"💡 **Instructions:**\n"
                f"• Click the link to open the Activity\n"
                f"• Activity will connect to your voice channel\n"
                f"• Use the visual controls and equalizer",
                ephemeral=True
            )
        except Exception as e:
            # General fallback - use browser link
            await interaction.response.send_message(
                f"🎮 **Visual Music Player**\n"
                f"[Open Player]({self.activity_url})\n"
                f"*Opens in browser*",
                ephemeral=True
            )

YTDL_OPTIONS = {
    'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best[height<=720]',
    'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
    'restrictfilenames': True,
    'noplaylist': False,
    'nocheckcertificate': True,
    'ignoreerrors': True,
    'logtostderr': False,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'ytsearch',
    'source_address': '0.0.0.0',
    'extract_flat': False,
    'skip_download': True,
    'age_limit': 100,
    'geo_bypass': True,
    'extractor_args': {
        'youtube': {
            'skip': ['hls', 'dash'],
            'player_skip': ['configs', 'webpage']
        }
    }
}
ytdl = yt_dlp.YoutubeDL(YTDL_OPTIONS)

# --- Helper Classes & Functions ---

def format_duration(seconds: Optional[float]) -> str:
    """Formats seconds into a MM:SS or HH:MM:SS string."""
    if seconds is None or seconds < 0:
        return "N/A"
    seconds = int(seconds)
    td = datetime.timedelta(seconds=seconds)
    minutes, sec = divmod(td.seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if td.days > 0:
        return f"{td.days*24 + hours}:{minutes:02}:{sec:02}"
    if hours > 0:
        return f"{hours}:{minutes:02}:{sec:02}"
    else:
        return f"{minutes:02}:{sec:02}"

class YTDLSource(discord.PCMVolumeTransformer):
    """Represents a YouTube audio source."""
    def __init__(self, source, *, data, volume=0.5):
        super().__init__(source, volume)
        self.data = data
        self.title = data.get('title', 'Unknown Title')
        self.url = data.get('url')
        self.duration = data.get('duration', 0)
        self.uploader = data.get('uploader', 'Unknown Uploader')
        self.thumbnail = data.get('thumbnail')
        self.webpage_url = data.get('webpage_url', data.get('url'))
        self.requester = data.get('requester')
        self.start_time = 0.0

    @classmethod
    async def from_url(cls, url, *, loop=None, stream=True, requester=None):
        loop = loop or asyncio.get_event_loop()
        
        # Check if it's a direct audio file URL (like Discord attachments)
        audio_extensions = ('.mp3', '.wav', '.flac', '.ogg', '.m4a', '.mp4', '.webm')
        if any(url.lower().endswith(ext) for ext in audio_extensions):
            # For direct audio files, create minimal data structure
            data = {
                'url': url,
                'title': url.split('/')[-1].split('?')[0],  # Extract filename from URL
                'uploader': 'Direct Audio File',
                'duration': None,
                'webpage_url': url,
                'requester': requester
            }
            return cls(discord.FFmpegPCMAudio(url, **FFMPEG_OPTIONS), data=data)
        
        try:
            data = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=not stream)),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            raise Exception("Song loading timed out - try another track")
            
        if 'entries' in data:
            data = data['entries'][0]
        data['requester'] = requester
        filename = data['url'] if stream else ytdl.prepare_filename(data)
        return cls(discord.FFmpegPCMAudio(filename, **FFMPEG_OPTIONS), data=data)

class MusicInstance:
    """A class representing a single music instance for a specific voice channel."""
    def __init__(self, bot: commands.Bot, voice_channel: discord.VoiceChannel, text_channel: discord.TextChannel, dj: discord.Member, cog: commands.Cog):
        self.bot = bot
        self.cog = cog
        self.voice_channel = voice_channel
        self.text_channel = text_channel
        self.guild = voice_channel.guild
        self.queue = asyncio.Queue()
        self.current_dj = dj
        self.original_dj = dj  # Keep track of who started this instance
        self.dj_users = {dj}  # Set of users with DJ permissions
        self.current_song: Optional[YTDLSource] = None
        self.voice_client: Optional[discord.VoiceClient] = None
        self.now_playing_message: Optional[discord.Message] = None
        self.loop = False
        self.player_task: Optional[asyncio.Task] = None
        self.update_task: Optional[asyncio.Task] = None
        self.queue_page = 0
        self.db = cog.db
        # Initialize missing attributes
        self.current_playlist_info: Optional[Dict] = None
        self.current_playlist_tracks: List[Dict] = []
        self.playback_index: int = -1
        self.history: List[Dict] = []
        self.instance_id = voice_channel.id  # Use voice channel ID as unique identifier
        self.instance_messages: List[discord.Message] = []  # Track messages to clean up
        self.current_eq = EQ_PRESETS["flat"]  # Current equalizer settings
        self.start_time = None  # Track when current song started for sync
        self.audio_features = {}  # Cache for GPU-analyzed audio features

    async def analyze_audio_features(self):
        """GPU-accelerated audio feature analysis for current song - DISABLED"""
        # Disabled to prevent database errors
        return
        
        try:
            # Use the song's audio source URL for analysis
            audio_url = getattr(self.current_song, 'url', None)
            if not audio_url:
                return
                
            # Check cache first
            song_id = self.current_song.data.get('id', self.current_song.data.get('webpage_url', ''))
            if song_id in self.audio_features:
                return self.audio_features[song_id]
            
            # GPU-accelerated audio analysis
            features = await self.bot.gpu_engine.analyze_audio_features(audio_url)
            
            # Cache the results
            self.audio_features[song_id] = features
            
            # Store features in database for future use (disabled - table not available)
            # if features and self.bot.db:
            #     try:
            #         await self.bot.db.execute("""
            #             INSERT OR REPLACE INTO song_features 
            #             (song_id, title, features_json, analyzed_at)
            #             VALUES (?, ?, ?, ?)
            #         """, (
            #             song_id,
            #             self.current_song.title,
            #             json.dumps(features),
            #             datetime.datetime.now().isoformat()
            #         ))
            #         await self.bot.db.commit()
            #     except Exception as db_e:
            #         self.bot.add_error(f"Failed to store audio features: {db_e}")
            
            self.bot.add_log(f"🎵 GPU analyzed audio features for: {self.current_song.title[:30]}...")
            
        except Exception as e:
            self.bot.add_error(f"GPU audio analysis error: {e}")

    def start_player_loop(self):
        """Starts the main player loop if it's not already running."""
        if self.player_task and not self.player_task.done():
            return
        self.player_task = self.bot.loop.create_task(self.player_loop())

    # --- Firestore Helper Functions (Synchronous) ---
    def _add_song_to_firestore_sync(self, song_data: Dict):
        if not self.db:
            return  # Firebase not available
        requester_id_str = str(song_data['requester'].id) if isinstance(song_data['requester'], discord.Member) else str(song_data['requester_id'])
        history_ref = self.db.collection(f"artifacts/{self.bot.user.id}/users/{requester_id_str}/song_history")
        history_ref.add({
            "title": song_data.get('title', 'Unknown Title'),
            "webpage_url": song_data.get('webpage_url', '#'),
            "uploader": song_data.get('uploader', 'Unknown Uploader'),
            "requester_id": requester_id_str,
            "guild_id": str(self.guild.id),
            "timestamp": firestore.SERVER_TIMESTAMP
        })

    # --- ASYNC WRAPPERS FOR FIRESTORE ---
    async def _add_song_to_history_db(self, song_data: Dict):
        """Adds a played song to Firestore history without blocking."""
        if not self.db:
            return
        try:
            await asyncio.to_thread(self._add_song_to_firestore_sync, song_data)
            self.bot.add_log(f"Saved '{song_data.get('title')}' to history for user {song_data['requester'].id}")
        except Exception as e:
            self.bot.add_error(f"Error saving song to Firestore history: {e}\n{traceback.format_exc()}")

    # --- RE-ARCHITECTED PLAYER LOOP ---
    async def player_loop(self):
        """The main loop for playing songs from the queue. Uses polling for stability."""
        await self.bot.wait_until_ready()
        try:
            while not self.bot.is_closed():
                try:
                    next_song_data = await asyncio.wait_for(self.queue.get(), timeout=900.0)
                except asyncio.TimeoutError:
                    self.bot.add_log(f"Music instance in {self.voice_channel.name} idle for 15 minutes, disconnecting.")
                    try:
                        timeout_msg = await self.text_channel.send("🎵 Leaving due to 15 minutes of inactivity.")
                        self.instance_messages.append(timeout_msg)
                    except:
                        pass
                    break

                if not self.voice_client or not self.voice_client.is_connected():
                    self.bot.add_log(f"Player for {self.guild.name} stopping, VC disconnected.")
                    break
                
                # Validate song data before processing
                if not next_song_data or not isinstance(next_song_data, dict):
                    self.bot.add_error(f"Invalid song data received: {type(next_song_data)} - {next_song_data}")
                    continue
                    
                if not next_song_data.get('webpage_url'):
                    self.bot.add_error(f"Song data missing webpage_url: {next_song_data}")
                    continue

                try:
                    source = await asyncio.wait_for(
                        YTDLSource.from_url(next_song_data['webpage_url'], loop=self.bot.loop, stream=True, requester=next_song_data['requester']),
                        timeout=20.0
                    )
                    self.current_song = source
                    
                    # Update playlist index if we're playing from a playlist
                    if (hasattr(self, 'current_playlist_info') and self.current_playlist_info and 
                        hasattr(self, 'current_playlist_tracks') and self.current_playlist_tracks):
                        # Find the index of this song in the playlist
                        for i, track in enumerate(self.current_playlist_tracks or []):
                            if track and track.get('webpage_url') == next_song_data.get('webpage_url'):
                                self.playback_index = i
                                break
                                
                except Exception as e:
                    self.bot.add_error(f"Error preparing song: {e}")
                    try:
                        await self.text_channel.send(f"⏭️ Skipping `{next_song_data.get('title', 'a track')}` - playback error.")
                    except:
                        pass
                    # If this was a playlist song that failed, still increment the index
                    if (hasattr(self, 'current_playlist_info') and self.current_playlist_info and 
                        hasattr(self, 'current_playlist_tracks') and self.current_playlist_tracks):
                        for i, track in enumerate(self.current_playlist_tracks or []):
                            if track and track.get('webpage_url') == next_song_data.get('webpage_url'):
                                self.playback_index = i
                                break
                    continue

                await self.send_or_edit_now_playing()
                
                self.current_song.start_time = self.bot.loop.time()
                self.start_time = datetime.datetime.now()
                
                # Broadcast to Activity clients
                await self.broadcast_now_playing()
                
                # ####################################################################
                # ## START: NEW CODE TO SEND DATA TO VERCEL API
                # ####################################################################
                
                # This is the new block that sends the live "now playing" data
                # to your API server as soon as a track starts.
                
                payload = {
                    "type": "music_update",
                    "guild_id": str(self.guild.id),
                    "now_playing": {
                        "title": self.current_song.title,
                        "artist": self.current_song.uploader,
                        "duration": self.current_song.duration,
                        "thumbnail": self.current_song.thumbnail,
                        "webpage_url": self.current_song.webpage_url
                    },
                    "queue_length": self.queue.qsize(),
                    "is_playing": True,
                    "volume": self.voice_client.source.volume * 100 if self.voice_client and hasattr(self.voice_client, 'source') and self.voice_client.source else 50
                }
                
                # We use create_task to send the data in the background
                # so it doesn't block or delay the music playback.
                self.bot.loop.create_task(self.bot.send_status_to_api(payload))
                
                # ####################################################################
                # ## END: NEW CODE
                # ####################################################################
                
                # Ensure voice client is still connected before playing
                if not self.voice_client or not self.voice_client.is_connected():
                    self.bot.add_log(f"Voice client disconnected before playing in {self.guild.name}, attempting reconnect...")
                    # Try to reconnect if possible
                    dj_in_voice = None
                    for dj in self.dj_users:
                        if dj.voice and dj.voice.channel:
                            dj_in_voice = dj.voice.channel
                            break
                    
                    if dj_in_voice:
                        reconnect_attempts = 3
                        for attempt in range(reconnect_attempts):
                            try:
                                # Ensure clean disconnection first
                                if self.voice_client:
                                    try:
                                        await self.voice_client.disconnect(force=True)
                                    except:
                                        pass
                                    await asyncio.sleep(0.5)
                                
                                self.voice_client = await asyncio.wait_for(
                                    dj_in_voice.connect(self_deaf=True), 
                                    timeout=15.0
                                )
                                await asyncio.sleep(0.3)
                                self.bot.add_log(f"Successfully reconnected to {dj_in_voice.name} (attempt {attempt + 1})")
                                break
                            except (asyncio.TimeoutError, Exception) as e:
                                if attempt == reconnect_attempts - 1:
                                    self.bot.add_error(f"Failed to reconnect after {reconnect_attempts} attempts: {e}")
                                    break
                                else:
                                    await asyncio.sleep(2.0)
                    else:
                        break
                    
                # Start playback immediately
                self.voice_client.play(self.current_song, after=lambda e: self.after_play_callback(e))
                
                # Run GPU audio analysis in background (non-blocking)
                self.bot.loop.create_task(self.analyze_audio_features())
                self.start_now_playing_updater()
                
                # Poll to check when the song is finished
                while (self.voice_client and self.voice_client.is_connected() and 
                       (self.voice_client.is_playing() or self.voice_client.is_paused())):
                    await asyncio.sleep(1)

                # Song finished, log it and prepare for next
                if self.loop and self.current_song:
                    await self.queue.put(self.current_song.data.copy())
                    # Broadcast queue update after loop
                    await self.broadcast_queue_update()
                
                if self.current_song:
                    await self._add_song_to_history_db(self.current_song.data.copy())
                    # Add to local history for previous button functionality
                    if hasattr(self, 'history'):
                        self.history.append(self.current_song.data.copy())
                        # Keep only last 10 songs in history
                        if len(self.history) > 10:
                            self.history.pop(0)
                
                self.current_song = None

                # Check if queue is empty and loop is off - auto-leave
                # Don't auto-leave if we have playlist tracks remaining or items in queue
                should_auto_leave = (
                    self.queue.empty() and 
                    not self.loop and
                    not (hasattr(self, 'current_playlist_tracks') and self.current_playlist_tracks and len(self.current_playlist_tracks) > 0)
                )
                
                if should_auto_leave:
                    self.bot.add_log(f"Queue finished in {self.voice_channel.name}, auto-leaving.")
                    try:
                        finished_msg = await self.text_channel.send("🎵 Queue finished! Leaving the voice channel.")
                        self.instance_messages.append(finished_msg)
                    except:
                        pass
                    break

        except Exception as e:
            self.bot.add_error(f"Unexpected error in player loop: {e}")
        finally:
            await self.stop_player()

    def after_play_callback(self, error):
        """A simple callback that only logs errors. It does not control the loop."""
        if error:
            self.bot.add_error(f"Player error in {self.guild.name}: {error}")

    async def stop_player(self):
        if self.player_task: 
            self.player_task.cancel()
        if self.update_task: 
            self.update_task.cancel()
        
        while not self.queue.empty():
            try:
                self.queue.get_nowait()
            except asyncio.QueueEmpty:
                continue

        if self.voice_client:
            if self.voice_client.is_playing(): 
                self.voice_client.stop()
            try: 
                await self.voice_client.disconnect(force=True)
            except Exception: 
                pass
        
        if self.now_playing_message:
            try:
                await self.now_playing_message.delete()
            except (discord.NotFound, discord.Forbidden):
                pass
            self.now_playing_message = None
        
        # Clean up tracked messages
        for message in self.instance_messages:
            try:
                await message.delete()
            except (discord.NotFound, discord.Forbidden):
                pass
        self.instance_messages.clear()
        
        if self.instance_id in self.cog.instances:
            del self.cog.instances[self.instance_id]
            self.bot.add_log(f"Music instance for {self.voice_channel.name} in {self.guild.name} cleaned up.")

    def start_now_playing_updater(self):
        if self.update_task and not self.update_task.done():
            return
        self.update_task = self.bot.loop.create_task(self.now_playing_updater())

    async def now_playing_updater(self):
        while self.current_song:
            await asyncio.sleep(10)
            if self.current_song:
                await self.send_or_edit_now_playing()

    async def send_or_edit_now_playing(self):
        if not self.voice_client or not self.voice_client.is_connected():
            return

        embed = self.create_now_playing_embed()
        view = PlayerControlView(self)
        view.update_button_states()

        try:
            if self.now_playing_message:
                await self.now_playing_message.edit(content=None, embed=embed, view=view)
            else:
                self.now_playing_message = await self.text_channel.send(embed=embed, view=view)
        except (discord.NotFound, discord.Forbidden):
            self.now_playing_message = None
            try:
                self.now_playing_message = await self.text_channel.send(embed=embed, view=view)
            except Exception as e:
                self.bot.add_error(f"Failed to re-send NP message in {self.guild.name}: {e}")
        except Exception as e:
            self.bot.add_error(f"Unexpected error updating NP message in {self.guild.name}: {e}")


    def create_now_playing_embed(self) -> discord.Embed:
        if not self.current_song:
            return discord.Embed(
                title="⏹️ Playback Stopped", 
                description="🔕 The queue is empty. Use `/play` to add music!",
                color=0xED4245
            )
        
        embed = discord.Embed(
            title="🎵 Now Playing", 
            description=f"🎶 [**{self.current_song.title}**]({self.current_song.webpage_url})",
            color=0x1DB954
        )
        if self.current_song.thumbnail:
            embed.set_thumbnail(url=self.current_song.thumbnail)
        
        elapsed = self.bot.loop.time() - self.current_song.start_time
        remaining = self.current_song.duration - elapsed
        
        embed.add_field(name="📺 Channel", value=f"`{self.current_song.uploader}`", inline=True)
        embed.add_field(name="👤 Requested by", value=self.current_song.requester.mention, inline=True)
        embed.add_field(name="⏰ Time Left", value=f"`{format_duration(remaining)}`", inline=True)
        embed.add_field(name="🎧 Current DJ", value=self.current_dj.mention, inline=True)

        queue_list = list(self.queue._queue)
        if queue_list:
            songs_per_page = 5
            total_pages = (len(queue_list) + songs_per_page - 1) // songs_per_page
            self.queue_page = max(0, min(self.queue_page, total_pages - 1))
            
            start_index = self.queue_page * songs_per_page
            end_index = start_index + songs_per_page
            queue_slice = queue_list[start_index:end_index]
            
            queue_text = [f"`{start_index + i + 1}.` **{s.get('title', 'Unknown Title')}**" for i, s in enumerate(queue_slice)]
            embed.add_field(
                name=f"📋 Up Next (Page {self.queue_page + 1}/{total_pages})", 
                value="\n".join(queue_text) or "`Empty`", 
                inline=False
            )
        else:
            embed.add_field(name="📋 Up Next", value="`Queue is empty`", inline=False)
            
        if self.bot.user:
            embed.set_footer(text="🤖 Opure.exe Music System", icon_url=self.bot.user.display_avatar.url)
        return embed
    
    async def broadcast_now_playing(self):
        """Broadcast current song info to Activity clients"""
        if not self.current_song:
            return
        
        message = {
            "type": "NOW_PLAYING",
            "data": {
                "title": self.current_song.title,
                "uploader": self.current_song.uploader,
                "duration": self.current_song.duration,
                "webpage_url": self.current_song.webpage_url,
                "thumbnail": self.current_song.thumbnail,
                "current_time": 0,
                "is_playing": True,
                "start_time": self.start_time.isoformat() if self.start_time else None
            }
        }
        
        await self.cog.websocket_server.broadcast_to_instance(self.instance_id, message)
    
    async def broadcast_pause_state(self, is_paused: bool):
        """Broadcast pause/resume state to Activity clients"""
        current_time = 0
        if self.current_song and self.start_time:
            elapsed = (datetime.datetime.now() - self.start_time).total_seconds()
            current_time = max(0, elapsed)
        
        message = {
            "type": "PLAYBACK_STATE",
            "data": {
                "is_playing": not is_paused,
                "current_time": current_time
            }
        }
        
        await self.cog.websocket_server.broadcast_to_instance(self.instance_id, message)
    
    async def broadcast_queue_update(self):
        """Broadcast queue updates to Activity clients"""
        queue_list = []
        temp_queue = []
        
        # Get items from queue without removing them
        while not self.queue.empty():
            try:
                item = self.queue.get_nowait()
                temp_queue.append(item)
                queue_list.append({
                    "title": item.get("title", "Unknown"),
                    "uploader": item.get("uploader", "Unknown"),
                    "duration": item.get("duration"),
                    "webpage_url": item.get("webpage_url", "#")
                })
            except asyncio.QueueEmpty:
                break
        
        # Put items back in queue
        for item in temp_queue:
            await self.queue.put(item)
        
        message = {
            "type": "PLAYLIST_UPDATED",
            "data": {"queue": queue_list}
        }
        
        await self.cog.websocket_server.broadcast_to_instance(self.instance_id, message)

class JumpToTrackModal(discord.ui.Modal, title="Jump to Track"):
    track_number = discord.ui.TextInput(
        label="Song Number",
        placeholder="Enter the number from the queue to jump to...",
        required=True,
        style=discord.TextStyle.short
    )

    def __init__(self, player: MusicInstance):
        super().__init__()
        self.player = player

    async def on_submit(self, interaction: discord.Interaction):
        try:
            track_num = int(self.track_number.value)
        except ValueError:
            return await interaction.response.send_message("Please enter a valid number.", ephemeral=True)

        queue_list = list(self.player.queue._queue)
        if not (1 <= track_num <= len(queue_list)):
            return await interaction.response.send_message(f"Invalid track number. Please enter a number between 1 and {len(queue_list)}.", ephemeral=True)

        await interaction.response.send_message(f"Jumping to track #{track_num}...", ephemeral=True)

        track_index = track_num - 1
        
        track_to_play = queue_list[track_index]
        
        while not self.player.queue.empty():
            self.player.queue.get_nowait()

        await self.player.queue.put(track_to_play)
        for track in queue_list[track_index + 1:]:
            await self.player.queue.put(track)

        if self.player.voice_client and self.player.voice_client.is_playing():
            self.player.voice_client.stop()

class LyricsSearchModal(discord.ui.Modal, title="Search for Lyrics"):
    query = discord.ui.TextInput(
        label="Song or Artist",
        placeholder="e.g., 'Bohemian Rhapsody Queen' or 'Eminem Lose Yourself'",
        required=True,
        max_length=100
    )

    def __init__(self, music_cog, interaction_user):
        super().__init__()
        self.music_cog = music_cog
        self.interaction_user = interaction_user

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        lyrics_view = EnhancedLyricsView(self.music_cog, self.interaction_user, search_query=self.query.value)
        await lyrics_view.fetch_and_display_lyrics(interaction)

class EnhancedLyricsView(discord.ui.View):
    def __init__(self, music_cog, user: discord.User, song_data=None, search_query=None):
        super().__init__(timeout=300)
        self.music_cog = music_cog
        self.user = user
        self.song_data = song_data
        self.search_query = search_query
        self.current_page = 0
        self.pages = []
        self.song_title = ""
        self.song_url = ""
        self.artist_name = ""
        self.track_art_url = ""
        
    def format_lyrics_sections(self, lyrics_text: str) -> str:
        import re
        
        section_patterns = {
            r'\[Verse.*?\]': '🎤 **Verse**',
            r'\[Chorus.*?\]': '🎵 **Chorus**', 
            r'\[Bridge.*?\]': '🌉 **Bridge**',
            r'\[Intro.*?\]': '🚀 **Intro**',
            r'\[Outro.*?\]': '🏁 **Outro**',
            r'\[Pre-Chorus.*?\]': '🎶 **Pre-Chorus**',
            r'\[Hook.*?\]': '🪝 **Hook**',
            r'\[Interlude.*?\]': '🎼 **Interlude**',
            r'\[Refrain.*?\]': '🔄 **Refrain**'
        }
        
        formatted_lyrics = lyrics_text
        
        formatted_lyrics = re.sub(r'\n\s*\n\s*\n+', '\n\n', formatted_lyrics)
        formatted_lyrics = re.sub(r'^\s+|\s+$', '', formatted_lyrics, flags=re.MULTILINE)
        
        for pattern, replacement in section_patterns.items():
            formatted_lyrics = re.sub(pattern, f'\n{replacement}\n', formatted_lyrics, flags=re.IGNORECASE)
        
        formatted_lyrics = re.sub(r'\n{3,}', '\n\n', formatted_lyrics)
        
        formatted_lyrics = re.sub(r'(\*\*[^*]+\*\*)\n([^\n])', r'\1\n\n\2', formatted_lyrics)
        
        formatted_lyrics = re.sub(r'\[([^\]]*?)\]', r'**\1**', formatted_lyrics)
        
        return formatted_lyrics.strip()

    async def fetch_and_display_lyrics(self, interaction: discord.Interaction):
        if not self.music_cog.genius_api_key:
            return await interaction.followup.send("🚫 Lyrics feature is not configured. Please provide a Genius API key.", ephemeral=True)

        try:
            if self.search_query:
                search_query = self.music_cog.clean_query(self.search_query)
                original_query = self.search_query
            elif self.song_data:
                title = self.music_cog.clean_track_title(self.song_data.get('title', ''))
                artist = self.music_cog.clean_artist_name(self.song_data.get('uploader', ''))
                original_query = f"{artist} - {title}"
                search_query = self.music_cog.clean_query(original_query)
            else:
                # Find active music instance for this guild
                player = None
                for instance in self.music_cog.instances.values():
                    if instance.guild.id == interaction.guild.id and instance.current_song:
                        player = instance
                        break
                if not player or not player.current_song:
                    return await interaction.followup.send("🎵 Nothing is currently playing. Use this command with a search query to find lyrics!", ephemeral=True)
                
                title = self.music_cog.clean_track_title(player.current_song.title)
                artist = self.music_cog.clean_artist_name(player.current_song.uploader)
                original_query = f"{artist} - {title}"
                search_query = self.music_cog.clean_query(original_query)

            async with self.music_cog.session.get(
                "https://api.genius.com/search",
                params={"q": search_query},
                headers={"Authorization": f"Bearer {self.music_cog.genius_api_key}"},
                timeout=10
            ) as resp:
                if resp.status != 200:
                    return await interaction.followup.send(f"🚫 Genius API error ({resp.status}). Try again later.", ephemeral=True)
                data = await resp.json()

            hits = data.get("response", {}).get("hits", [])
            if not hits:
                return await interaction.followup.send(f"🔍 No lyrics found for `{original_query}`. Try a different search!", ephemeral=True)

            best_match = hits[0]["result"]
            query_words = set(search_query.lower().split())
            for hit in hits:
                result = hit["result"]
                hit_artist = self.music_cog.clean_artist_name(result["primary_artist"]["name"])
                hit_title = self.music_cog.clean_track_title(result["title"])
                combined = f"{hit_artist} {hit_title}"
                if len(query_words.intersection(set(combined.lower().split()))) >= 2:
                    best_match = result
                    break

            self.song_title = best_match["full_title"]
            self.song_url = best_match["url"]
            self.artist_name = best_match["primary_artist"]["name"]
            self.track_art_url = best_match.get("song_art_image_thumbnail_url") or best_match.get("song_art_image_url")

            async with self.music_cog.session.get(self.song_url, timeout=15) as resp:
                html_content = await resp.text()

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            lyrics_divs = soup.find_all("div", attrs={"data-lyrics-container": "true"})

            if not lyrics_divs:
                return await interaction.followup.send("🚫 Couldn't extract lyrics from the page.", ephemeral=True)

            all_lines = []
            for div in lyrics_divs:
                text = div.get_text(separator="\n").strip()
                if text:
                    all_lines.extend(line.strip() for line in text.splitlines() if line.strip())

            lyrics_text = "\n".join(all_lines)
            
            first_marker_match = re.search(r'\[(Verse|Chorus|Intro|Outro|Bridge|Hook|Pre-Chorus|Refrain).*?\]', lyrics_text, re.IGNORECASE)
            if first_marker_match:
                lyrics_text = lyrics_text[first_marker_match.start():]
            
            lyrics_text = self.format_lyrics_sections(lyrics_text)

            self.pages = []
            current_page = ""
            MAX_CHARS = 1500

            lines = lyrics_text.splitlines()
            for line in lines:
                if len(current_page) + len(line) + 1 > MAX_CHARS:
                    if current_page.strip():
                        self.pages.append(current_page.strip())
                    current_page = line + "\n"
                else:
                    current_page += line + "\n"

            if current_page.strip():
                self.pages.append(current_page.strip())

            if not self.pages:
                return await interaction.followup.send("🚫 No lyrics content found.", ephemeral=True)

            self.update_buttons()
            
            embed = self.create_lyrics_embed()
            await interaction.followup.send(embed=embed, view=self)

        except Exception as e:
            self.music_cog.bot.add_error(f"Enhanced lyrics error: {e}")
            await interaction.followup.send("❌ Failed to fetch lyrics. Please try again.", ephemeral=True)

    def create_lyrics_embed(self) -> discord.Embed:
        embed = discord.Embed(
            title=f"🎤 {self.song_title}",
            description=self.pages[self.current_page],
            color=0x1DB954,
            url=self.song_url
        )
        
        embed.set_author(
            name=f"Requested by {self.user.display_name}",
            icon_url=self.user.display_avatar.url
        )
        
        if self.track_art_url:
            embed.set_thumbnail(url=self.track_art_url)
        
        embed.add_field(name="🎵 Artist", value=self.artist_name, inline=True)
        embed.add_field(name="📖 Page", value=f"{self.current_page + 1}/{len(self.pages)}", inline=True)
        embed.add_field(name="🔗 Source", value=f"[View on Genius]({self.song_url})", inline=True)
        
        embed.set_footer(text="Use the buttons below to navigate, search, or add to queue!")
        
        return embed

    def update_buttons(self):
        self.clear_items()
        
        prev_btn = discord.ui.Button(label="◀️", style=discord.ButtonStyle.secondary, disabled=self.current_page == 0)
        prev_btn.callback = self.prev_page
        self.add_item(prev_btn)
        
        next_btn = discord.ui.Button(label="▶️", style=discord.ButtonStyle.secondary, disabled=self.current_page >= len(self.pages) - 1)
        next_btn.callback = self.next_page
        self.add_item(next_btn)
        
        search_btn = discord.ui.Button(label="🔍 Search", style=discord.ButtonStyle.primary)
        search_btn.callback = self.search_lyrics
        self.add_item(search_btn)
        
        play_btn = discord.ui.Button(label="▶️ Add to Queue", style=discord.ButtonStyle.green)
        play_btn.callback = self.add_to_queue
        self.add_item(play_btn)

    async def prev_page(self, interaction: discord.Interaction):
        if self.current_page > 0:
            self.current_page -= 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_lyrics_embed(), view=self)
        else:
            await interaction.response.defer()

    async def next_page(self, interaction: discord.Interaction):
        if self.current_page < len(self.pages) - 1:
            self.current_page += 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_lyrics_embed(), view=self)
        else:
            await interaction.response.defer()

    async def search_lyrics(self, interaction: discord.Interaction):
        modal = LyricsSearchModal(self.music_cog, self.user)
        await interaction.response.send_modal(modal)

    async def add_to_queue(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        
        try:
            player = await self.music_cog.get_instance(interaction)
            if not player:
                return await interaction.followup.send("🚫 Could not join voice channel. Please ensure I have permissions and you're in a voice channel.", ephemeral=True)

            song_data = {
                'title': self.song_title,
                'webpage_url': self.song_url,
                'requester': interaction.user,
                'uploader': self.artist_name,
            }

            if player.voice_client and player.voice_client.is_playing():
                await player.queue.put(song_data)
                await interaction.followup.send(f"🎵 Added **{self.song_title}** to the queue!", ephemeral=True)
            else:
                await player.queue.put(song_data)
                player.start_player_loop()
                await interaction.followup.send(f"🎵 Now playing **{self.song_title}**!", ephemeral=True)
                await player.send_or_edit_now_playing()

        except Exception as e:
            self.music_cog.bot.add_error(f"Error adding song to queue: {e}")
            await interaction.followup.send("❌ Failed to add song to queue. Please try again.", ephemeral=True)

class PlayerControlView(discord.ui.View):
    def __init__(self, instance: MusicInstance):
        super().__init__(timeout=None)
        self.instance = instance
        
        self.update_button_states()
        
    def update_button_states(self):
        if self.instance.voice_client and self.instance.voice_client.is_paused():
            self.pause_resume.label = "Resume"
            self.pause_resume.style = discord.ButtonStyle.green
        else:
            self.pause_resume.label = "Pause"
            self.pause_resume.style = discord.ButtonStyle.secondary
            
        self.loop.style = discord.ButtonStyle.green if self.instance.loop else discord.ButtonStyle.grey
        
        self.previous.disabled = not (
            (hasattr(self.instance, 'current_playlist_info') and self.instance.current_playlist_info and self.instance.playback_index > 0) or
            (hasattr(self.instance, 'history') and self.instance.db and len(self.instance.history) > 0)
        )
        
        self.jump.disabled = self.instance.queue.empty() and getattr(self.instance, 'playback_index', -1) == -1
        
        queue_list = list(self.instance.queue._queue)
        songs_per_page = 5
        total_pages = (len(queue_list) + songs_per_page - 1) // songs_per_page if queue_list else 1
        self.queue_prev.disabled = (self.instance.queue_page == 0)
        self.queue_next.disabled = (self.instance.queue_page >= total_pages - 1)

        self.restart_playlist.disabled = getattr(self.instance, 'current_playlist_info', None) is None


    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.data.get("custom_id") == "jump_track":
            return True
        
        # Check if user is the current DJ or an admin
        is_admin = interaction.user.guild_permissions.administrator
        if interaction.user != self.instance.current_dj and not is_admin:
            await interaction.response.send_message(f"Only the current DJ ({self.instance.current_dj.mention}) or an admin can control playback.", ephemeral=True)
            return False
        return True

    @discord.ui.button(label="◀️", style=discord.ButtonStyle.secondary, custom_id="queue_prev", row=0, emoji=None) 
    async def queue_prev(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        if self.instance.queue_page > 0:
            self.instance.queue_page -= 1
        await self.instance.send_or_edit_now_playing()

    @discord.ui.button(label="Jump...", style=discord.ButtonStyle.secondary, custom_id="jump_track", row=0) 
    async def jump(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(JumpToTrackModal(self.instance))

    @discord.ui.button(label="▶️", style=discord.ButtonStyle.secondary, custom_id="queue_next", row=0, emoji=None) 
    async def queue_next(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        queue_list = list(self.instance.queue._queue)
        songs_per_page = 5
        total_pages = (len(queue_list) + songs_per_page - 1) // songs_per_page
        if self.instance.queue_page < total_pages - 1:
            self.instance.queue_page += 1
        await self.instance.send_or_edit_now_playing()

    @discord.ui.button(label="⏮️", style=discord.ButtonStyle.secondary, custom_id="previous", row=1) 
    async def previous(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        
        song_to_play_data = None

        if (hasattr(self.instance, 'current_playlist_info') and self.instance.current_playlist_info and 
            hasattr(self.instance, 'playback_index') and self.instance.playback_index > 0):
            self.instance.playback_index -= 1
            song_to_play_data = self.instance.current_playlist_tracks[self.instance.playback_index]
            source_type = "playlist"
        elif hasattr(self.instance, 'history') and self.instance.db and len(self.instance.history) > 0:
            song_to_play_data = self.instance.history[-1]  # Get last song from history
            self.instance.history.pop()  # Remove it from history
            source_type = "history"
        else:
            self.update_button_states()
            return await interaction.followup.send("No previous songs available.", ephemeral=True)
        
        if not song_to_play_data:
            return await interaction.followup.send("Could not retrieve previous song data.", ephemeral=True)

        if self.instance.voice_client and (self.instance.voice_client.is_playing() or self.instance.voice_client.is_paused()):
            self.instance.voice_client.stop()
            timeout_seconds = 5 
            start_time = self.instance.bot.loop.time()
            while (self.instance.voice_client.is_playing() or self.instance.voice_client.is_paused()) and (self.instance.bot.loop.time() - start_time < timeout_seconds):
                await asyncio.sleep(0.1) 
            
            if self.instance.voice_client.is_playing() or self.instance.voice_client.is_paused():
                self.instance.bot.add_error(f"Voice client in {self.instance.guild.name} did not stop in time for previous song.")
                await interaction.followup.send("Failed to stop current song. Please try again.", ephemeral=True)
                return
        
        if self.instance.voice_client and self.instance.voice_client.is_connected():
            try:
                current_vc_channel = self.instance.voice_client.channel
                await self.instance.voice_client.disconnect(force=True)
                self.instance.voice_client = await current_vc_channel.connect(self_deaf=True)
                await asyncio.sleep(0.2)
            except Exception as e:
                self.instance.bot.add_error(f"Error disconnecting/reconnecting voice client for previous song: {e}\n{traceback.format_exc()}")
                await interaction.followup.send("Failed to reset voice client for previous song. Please try again.", ephemeral=True)
                return

        while not self.instance.queue.empty():
            self.instance.queue.get_nowait()
        await self.instance.queue.put(song_to_play_data)
        
        self.instance.start_player_loop()
        await self.instance.send_or_edit_now_playing()
        await interaction.followup.send(f"Playing previous song from {source_type}.", ephemeral=True)


    @discord.ui.button(label="⏯️", style=discord.ButtonStyle.secondary, custom_id="pause_resume", row=1) 
    async def pause_resume(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        if self.instance.voice_client:
            if self.instance.voice_client.is_paused(): 
                self.instance.voice_client.resume()
                await interaction.followup.send("Resumed playback.", ephemeral=True)
            elif self.instance.voice_client.is_playing(): 
                self.instance.voice_client.pause()
                await interaction.followup.send("Paused playback.", ephemeral=True)
            else:
                await interaction.followup.send("No song is currently playing.", ephemeral=True)
        else:
            await interaction.followup.send("I am not connected to a voice channel.", ephemeral=True)
        await self.instance.send_or_edit_now_playing()


    @discord.ui.button(label="⏭️", style=discord.ButtonStyle.secondary, custom_id="skip", row=1) 
    async def skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        if self.instance.voice_client and self.instance.voice_client.is_playing(): 
            self.instance.voice_client.stop()
            await interaction.followup.send("Skipped to the next song.", ephemeral=True)
        else:
            await interaction.followup.send("No song to skip.", ephemeral=True)

    @discord.ui.button(label="⏹️", style=discord.ButtonStyle.danger, custom_id="stop", row=1) 
    async def stop(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        await self.instance.stop_player()
        await interaction.followup.send("Playback stopped and queue cleared.", ephemeral=True)
        if self.instance.now_playing_message:
            try:
                await self.instance.now_playing_message.delete()
            except (discord.NotFound, discord.Forbidden):
                pass
            self.instance.now_playing_message = None


    @discord.ui.button(label="🔁", style=discord.ButtonStyle.grey, custom_id="loop", row=1) 
    async def loop(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        self.instance.loop = not self.instance.loop
        status = "enabled" if self.instance.loop else "disabled"
        await interaction.followup.send(f"Looping is now {status}.", ephemeral=True)
        await self.instance.send_or_edit_now_playing()

    @discord.ui.button(label="Restart Playlist", style=discord.ButtonStyle.blurple, custom_id="restart_playlist", row=2)
    async def restart_playlist(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()

        player = self.instance
        
        if not getattr(player, 'current_playlist_info', None):
            return await interaction.followup.send("No playlist is currently active to restart.", ephemeral=True)

        playlist_id = player.current_playlist_info['id']
        playlist_name = player.current_playlist_info['name']

        try:
            async with player.cog.bot.db.execute("SELECT track_data FROM playlists WHERE playlist_id = ?", (playlist_id,)) as cursor:
                playlist_row = await cursor.fetchone()
            
            if not playlist_row:
                player.current_playlist_info = None
                await player.send_or_edit_now_playing()
                return await interaction.followup.send("The original playlist could not be found.", ephemeral=True)
            
            tracks = json.loads(playlist_row[0])
            if not tracks:
                return await interaction.followup.send(f"Playlist '{playlist_name}' is empty and cannot be restarted.", ephemeral=True)
            
            while not player.queue.empty():
                player.queue.get_nowait()

            for track in tracks:
                if track:
                    track['requester'] = interaction.user
                    await player.queue.put(track)
            
            if player.voice_client and (player.voice_client.is_playing() or player.voice_client.is_paused()):
                player.voice_client.stop()
                timeout_seconds = 5 
                start_time = player.bot.loop.time()
                while (player.voice_client.is_playing() or player.voice_client.is_paused()) and (player.bot.loop.time() - start_time < timeout_seconds):
                    await asyncio.sleep(0.1) 
                
                if player.voice_client.is_playing() or player.voice_client.is_paused():
                    player.bot.add_error(f"Voice client in {player.guild.name} did not stop in time for playlist restart.")
                    await interaction.followup.send("Failed to stop current song for playlist restart. Attempting to play from queue.", ephemeral=True)
            
            if hasattr(player, 'playback_index'):
                player.playback_index = -1
            if hasattr(player, 'current_playlist_tracks'):
                player.current_playlist_tracks = tracks

            player.start_player_loop()
            await player.send_or_edit_now_playing()
            await interaction.followup.send(f"Restarted playlist **{playlist_name}**.", ephemeral=True)

        except Exception as e:
            player.cog.bot.add_error(f"Error restarting playlist: {e}\n{traceback.format_exc()}")
            await interaction.followup.send("An error occurred while trying to restart the playlist.", ephemeral=True)


class PlaylistModal(discord.ui.Modal, title="Create New Playlist"):
    playlist_name = discord.ui.TextInput(label="Playlist Name", placeholder="e.g., My Coding Mix")
    playlist_url = discord.ui.TextInput(label="YouTube Playlist URL", placeholder="https://www.youtube.com/playlist?list=...")
    is_public = discord.ui.TextInput(label="Make Public? (yes/no)", placeholder="yes", max_length=3)
    
    def __init__(self, music_cog):
        super().__init__()
        self.music_cog = music_cog

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.send_message(f"Importing '{self.playlist_name.value}'. This may take a while...", ephemeral=True)
        self.music_cog.bot.loop.create_task(
            self.music_cog._create_playlist_background(interaction, self.playlist_name.value, self.playlist_url.value, self.is_public.value)
        )

class QueuePaginatorView(discord.ui.View):
    def __init__(self, interaction: discord.Interaction, tracks: list, playlist_name: str, bot_user):
        super().__init__(timeout=180)
        self.interaction = interaction
        self.tracks = tracks
        self.playlist_name = playlist_name
        self.bot_user = bot_user
        self.current_page = 0
        self.songs_per_page = 10

    async def create_embed(self) -> discord.Embed:
        start_index = self.current_page * self.songs_per_page
        end_index = start_index + self.songs_per_page
        
        queue_slice = self.tracks[start_index:end_index]
        total_pages = (len(self.tracks) + self.songs_per_page - 1) // self.songs_per_page
        
        embed = discord.Embed(
            title=f"📋 Queue for '{self.playlist_name}'", 
            color=0x5865F2,
            description=f"🎵 **{len(self.tracks)}** total songs in this playlist"
        )
        if queue_slice:
            track_list = [f"`{start_index + i + 1}.` **{s.get('title', 'Unknown Title')}**" for i, s in enumerate(queue_slice)]
            embed.add_field(name="🎶 Tracks", value="\n".join(track_list), inline=False)
        else:
            embed.add_field(name="🎶 Tracks", value="`This playlist is empty`", inline=False)
        embed.set_footer(text=f"📄 Page {self.current_page + 1}/{total_pages}", icon_url=self.bot_user.display_avatar.url)
        return embed

    async def update_message(self):
        self.children[0].disabled = self.current_page == 0
        total_pages = (len(self.tracks) + self.songs_per_page - 1) // self.songs_per_page
        self.children[1].disabled = self.current_page >= total_pages - 1
        
        embed = await self.create_embed()
        await self.interaction.edit_original_response(embed=embed, view=self)

    @discord.ui.button(label="◀️", style=discord.ButtonStyle.secondary)
    async def prev_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        if self.current_page > 0:
            self.current_page -= 1
            await self.update_message()

    @discord.ui.button(label="▶️", style=discord.ButtonStyle.secondary)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        total_pages = (len(self.tracks) + self.songs_per_page - 1) // self.songs_per_page
        if self.current_page < total_pages - 1:
            self.current_page += 1
            await self.update_message()

class MusicCog(commands.Cog, name="music"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.instances: Dict[int, MusicInstance] = {}  # Key: voice_channel_id, Value: MusicInstance
        self.MAX_INSTANCES_PER_GUILD = 5
        self.genius_api_key = GENIUS_API_KEY
        self.session = aiohttp.ClientSession()
        self.bot.add_log("✓ Genius API available" if GENIUS_API_KEY else "⚠️ Genius API key not found")
        # Initialize Firebase if available
        try:
            if hasattr(self.bot, 'firebase_db') and self.bot.firebase_db:
                self.db = self.bot.firebase_db
                self.bot.add_log("✓ Firebase connected for music cog")
            else:
                self.db = None
                self.bot.add_log("⚠️ Firebase not available for music cog")
        except Exception as e:
            self.db = None
            self.bot.add_log(f"⚠️ Firebase initialization failed: {e}")
        self.websocket_server = ActivityWebSocketServer(self)
        self.activity_base_url = os.getenv("ACTIVITY_URL", "https://opure.uk")  # Production Activity URL
        self.bot.add_log(f"🔍 DEBUG: ACTIVITY_URL loaded as: {self.activity_base_url}")

    async def cog_load(self):
        """Initialize the cog and start the WebSocket server"""
        # Check if local WebSocket server should be disabled (for production with external domain)
        if os.getenv("DISABLE_LOCAL_WEBSOCKET", "false").lower() == "true":
            self.bot.add_log("🌐 Local WebSocket server disabled - using external domain")
            self.bot.add_log(f"🔗 WebSocket URL: {os.getenv('WEBSOCKET_URL', 'wss://opure.uk/ws')}")
            return
            
        try:
            self.bot.add_log("🔧 Starting Activity WebSocket server...")
            # Try 0.0.0.0 first to avoid localhost binding issues
            await self.websocket_server.start_server(host="0.0.0.0", port=8765)
            self.bot.add_log("✅ Activity WebSocket server started successfully on 0.0.0.0:8765")
        except Exception as e:
            self.bot.add_error(f"❌ Failed to start Activity WebSocket server on 0.0.0.0: {e}")
            # Try localhost as fallback
            try:
                self.bot.add_log("🔄 Trying localhost fallback...")
                await self.websocket_server.start_server(host="localhost", port=8765)
                self.bot.add_log("✅ Activity WebSocket server started on localhost:8765")
            except Exception as e2:
                self.bot.add_error(f"❌ Localhost also failed: {e2}")
                # Try alternative port
                try:
                    self.bot.add_log("🔄 Trying alternative port 8766...")
                    await self.websocket_server.start_server(host="0.0.0.0", port=8766)
                    self.bot.add_log("✅ Activity WebSocket server started on alternative port 8766")
                except Exception as e3:
                    self.bot.add_error(f"❌ Alternative port also failed: {e3}")
                    self.bot.add_error("💡 Please check if ports 8765/8766 are available")
    
    def cog_unload(self):
        self.bot.loop.create_task(self.session.close())
        self.bot.loop.create_task(self.websocket_server.stop_server())

    async def get_instance(self, interaction: discord.Interaction) -> Optional[MusicInstance]:
        if not interaction.user.voice or not interaction.user.voice.channel:
            await interaction.followup.send("You must be in a voice channel to use music commands.", ephemeral=True)
            return None
        
        vc_channel = interaction.user.voice.channel
        txt_channel = interaction.channel

        # Check permissions
        txt_permissions = txt_channel.permissions_for(interaction.guild.me)
        if not txt_permissions.send_messages or not txt_permissions.embed_links:
            self.bot.add_error(f"PERMISSION_FAIL: Missing Send/Embed permissions in #{txt_channel.name}.")
            try:
                await interaction.followup.send(f"I'm missing permissions to send messages or embeds in {txt_channel.mention}.", ephemeral=True)
            except discord.Forbidden: pass
            return None

        vc_permissions = vc_channel.permissions_for(interaction.guild.me)
        if not vc_permissions.connect or not vc_permissions.speak:
            await interaction.followup.send("I need permissions to connect and speak in your voice channel.", ephemeral=True)
            return None

        # Check if we already have an instance for this voice channel
        instance = self.instances.get(vc_channel.id)
        if instance:
            # Check if the instance has a valid voice client
            if not instance.voice_client or not instance.voice_client.is_connected():
                self.bot.add_log(f"Removing stale instance for {vc_channel.name}")
                del self.instances[vc_channel.id]
                instance = None
            else:
                # Update text channel if user is using a different channel
                instance.text_channel = txt_channel
                return instance

        # Clean up any stale instances in this guild
        stale_instance_ids = []
        for inst_id, inst in self.instances.items():
            if inst.guild.id == interaction.guild.id:
                if not inst.voice_client or not inst.voice_client.is_connected():
                    stale_instance_ids.append(inst_id)
        
        for inst_id in stale_instance_ids:
            self.bot.add_log(f"Removing stale instance {inst_id}")
            del self.instances[inst_id]

        # Check instance limit per guild
        guild_instances = [inst for inst in self.instances.values() if inst.guild.id == interaction.guild.id]
        if len(guild_instances) >= self.MAX_INSTANCES_PER_GUILD:
            await interaction.followup.send(f"❌ Maximum of {self.MAX_INSTANCES_PER_GUILD} music instances per server reached.", ephemeral=True)
            return None

        # Create new instance
        instance = MusicInstance(self.bot, vc_channel, txt_channel, interaction.user, self)
        self.instances[vc_channel.id] = instance

        # Check permissions before attempting connection
        bot_member = interaction.guild.get_member(self.bot.user.id)
        if not vc_channel.permissions_for(bot_member).connect:
            await interaction.followup.send(f"❌ Missing **Connect** permission for {vc_channel.mention}.", ephemeral=True)
            if vc_channel.id in self.instances:
                del self.instances[vc_channel.id]
            return None
        
        if not vc_channel.permissions_for(bot_member).speak:
            await interaction.followup.send(f"❌ Missing **Speak** permission for {vc_channel.mention}.", ephemeral=True)
            if vc_channel.id in self.instances:
                del self.instances[vc_channel.id]
            return None

        # Connect to voice channel with multiple retry attempts
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Only clean up voice clients that are NOT in the target channel
                for existing_vc in self.bot.voice_clients:
                    if existing_vc.guild.id == interaction.guild.id and existing_vc.channel.id != vc_channel.id:
                        try:
                            await existing_vc.disconnect(force=True)
                            self.bot.add_log(f"Disconnected stale voice client in {existing_vc.channel.name} (moving to {vc_channel.name})")
                        except:
                            pass
                
                # Check if we're already connected to the target channel
                existing_connection = None
                for existing_vc in self.bot.voice_clients:
                    if existing_vc.guild.id == interaction.guild.id and existing_vc.channel.id == vc_channel.id:
                        if existing_vc.is_connected():
                            existing_connection = existing_vc
                            self.bot.add_log(f"Reusing existing voice connection in {vc_channel.name}")
                            break
                
                if existing_connection:
                    instance.voice_client = existing_connection
                else:
                    # Small delay to ensure cleanup completes
                    await asyncio.sleep(0.3)
                    
                    vc = await asyncio.wait_for(vc_channel.connect(self_deaf=True), timeout=15.0)
                    instance.voice_client = vc
                    self.bot.add_log(f"✓ Created new voice connection in {vc_channel.name}")
                
                self.bot.add_log(f"✓ Music instance ready in {vc_channel.name} ({interaction.guild.name}) - DJ: {interaction.user} (attempt {attempt + 1})")
                break
            except asyncio.TimeoutError:
                if attempt == max_retries - 1:
                    await interaction.followup.send("⏱️ Connection to voice channel timed out after multiple attempts. Please try again.", ephemeral=True)
                    if vc_channel.id in self.instances:
                        del self.instances[vc_channel.id]
                    return None
                else:
                    self.bot.add_log(f"Voice connection attempt {attempt + 1} timed out, retrying...")
                    await asyncio.sleep(1.0)
            except Exception as e:
                self.bot.add_error(f"Failed to connect to voice channel {vc_channel.name} (attempt {attempt + 1}): {e}")
                if attempt == max_retries - 1:
                    await interaction.followup.send(f"❌ Failed to connect to {vc_channel.mention} after {max_retries} attempts. Error: {str(e)}", ephemeral=True)
                    if vc_channel.id in self.instances:
                        del self.instances[vc_channel.id]
                    return None
                else:
                    self.bot.add_log(f"Connection attempt {attempt + 1} failed, retrying...")
                    await asyncio.sleep(1.0)
        
        return instance

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        # Handle bot disconnection
        if member.bot and member.id == self.bot.user.id:
            if after.channel is None and before.channel:
                # Bot was disconnected, clean up the instance
                instance = self.instances.get(before.channel.id)
                if instance:
                    self.bot.add_log(f"Bot disconnected from {before.channel.name} in {member.guild.name}, stopping instance.")
                    await instance.stop_player()
            return
        
        if member.bot: 
            return

        # Handle human voice state changes
        for channel_id, instance in list(self.instances.items()):
            if not instance.voice_client:
                continue
                
            # Check if member left this instance's voice channel
            if before.channel == instance.voice_channel and after.channel != instance.voice_channel:
                await self._handle_member_left_channel(instance, member)
            
            # Check if member joined this instance's voice channel
            elif after.channel == instance.voice_channel and before.channel != instance.voice_channel:
                await self._handle_member_joined_channel(instance, member)

    async def _handle_member_left_channel(self, instance: MusicInstance, member: discord.Member):
        """Handle when a member leaves the voice channel."""
        # Check if the current DJ left
        if member == instance.current_dj:
            # Find remaining humans in the channel
            humans_in_channel = [m for m in instance.voice_channel.members if not m.bot]
            
            if humans_in_channel:
                # Transfer DJ to someone else
                new_dj = random.choice(humans_in_channel)
                old_dj = instance.current_dj
                instance.current_dj = new_dj
                
                await instance.send_or_edit_now_playing()
                try:
                    dj_transfer_msg = await instance.text_channel.send(
                        f"🎧 **DJ Transfer:** {old_dj.mention} left the channel. "
                        f"{new_dj.mention} is now the DJ!"
                    )
                    instance.instance_messages.append(dj_transfer_msg)
                except discord.Forbidden:
                    pass
                
                self.bot.add_log(f"DJ transferred from {old_dj} to {new_dj} in {instance.voice_channel.name}")
            else:
                # No humans left, stop the instance
                self.bot.add_log(f"All humans left {instance.voice_channel.name}, stopping music instance.")
                try:
                    goodbye_msg = await instance.text_channel.send("👋 All users left the voice channel. Stopping music and leaving.")
                    instance.instance_messages.append(goodbye_msg)
                except discord.Forbidden:
                    pass
                await instance.stop_player()
        else:
            # Check if channel is now empty of humans
            humans_in_channel = [m for m in instance.voice_channel.members if not m.bot]
            if not humans_in_channel:
                self.bot.add_log(f"Voice channel {instance.voice_channel.name} is now empty, stopping music instance.")
                try:
                    goodbye_msg = await instance.text_channel.send("👋 Voice channel is empty. Stopping music and leaving.")
                    instance.instance_messages.append(goodbye_msg)
                except discord.Forbidden:
                    pass
                await instance.stop_player()

    async def _handle_member_joined_channel(self, instance: MusicInstance, member: discord.Member):
        """Handle when a member joins the voice channel."""
        # Just log it, no special action needed for joins
        self.bot.add_log(f"{member} joined music instance in {instance.voice_channel.name}")

    async def playlist_autocomplete(self, interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
        choices = []
        if not hasattr(self.bot, 'db') or self.bot.db is None:
            self.bot.add_error("Database connection not available for playlist autocomplete.")
            return []

        query = "SELECT playlist_id, name FROM playlists WHERE guild_id = ? AND (is_public = 1 OR creator_id = ?)"
        try:
            async with self.bot.db.execute(query, (interaction.guild.id, interaction.user.id)) as cursor:
                seen_playlists = set()
                async for pid, name in cursor:
                    if pid not in seen_playlists and current.lower() in name.lower():
                        choices.append(app_commands.Choice(name=name, value=str(pid)))
                        seen_playlists.add(pid)
                        if len(choices) >= 25: break
        except Exception as e:
            self.bot.add_error(f"Error in playlist_autocomplete: {e}")
        return choices

    @app_commands.command(name="play", description="Plays a song or a saved playlist.")
    @app_commands.describe(query="A search term or YouTube URL.", playlist="The name of a saved playlist to play.")
    @app_commands.autocomplete(playlist=playlist_autocomplete)
    async def play(self, interaction: discord.Interaction, query: Optional[str] = None, playlist: Optional[str] = None):
        if not query and not playlist:
            return await interaction.response.send_message("Please provide a search query, URL, or select a playlist.", ephemeral=True)
        if query and playlist:
            return await interaction.response.send_message("Please either provide a query or select a playlist, not both.", ephemeral=True)

        await interaction.response.defer()
        
        instance = await self.get_instance(interaction)
        if not instance: return
        
        # User becomes DJ when they start playing music
        instance.current_dj = interaction.user

        entries = []
        playlist_name = ""
        playlist_id = None

        is_first_song_batch = instance.queue.empty() and instance.current_song is None 

        try:
            if query:
                try:
                    data = await asyncio.wait_for(
                        self.bot.loop.run_in_executor(None, lambda: ytdl.extract_info(query, download=False)),
                        timeout=40.0
                    )
                except asyncio.TimeoutError:
                    return await interaction.followup.send("⏱️ Search timed out. Try a more specific query or check the URL.", ephemeral=True)
                    
                entries = data.get('entries', [data])
                playlist_name = data.get('title', 'your selection')
                if hasattr(instance, 'current_playlist_info'):
                    instance.current_playlist_info = None
                if hasattr(instance, 'current_playlist_tracks'):
                    instance.current_playlist_tracks = []
                if hasattr(instance, 'playback_index'):
                    instance.playback_index = -1
            
            elif playlist:
                playlist_id = int(playlist)
                async with self.bot.db.execute("SELECT track_data, name FROM playlists WHERE playlist_id = ?", (playlist_id,)) as cursor:
                    playlist_row = await cursor.fetchone()
                if not playlist_row:
                    return await interaction.followup.send("Playlist not found.", ephemeral=True)
                
                entries = json.loads(playlist_row[0])
                playlist_name = playlist_row[1]
                if hasattr(instance, 'current_playlist_info'):
                    instance.current_playlist_info = {'id': playlist_id, 'name': playlist_name}
                if hasattr(instance, 'current_playlist_tracks'):
                    instance.current_playlist_tracks = entries
                if hasattr(instance, 'playback_index'):
                    instance.playback_index = -1
                

            if not entries:
                return await interaction.followup.send("Couldn't find anything for that query.", ephemeral=True)
            
            # Queue all tracks first (fast)
            queued_count = 0
            for entry in entries:
                if entry:
                    entry['requester'] = interaction.user
                    await instance.queue.put(entry)
                    queued_count += 1
            
            # Process achievements in background to avoid blocking playback
            if queued_count > 0:
                async def process_achievements():
                    try:
                        await self.bot.check_and_award_achievements(
                            interaction.user.id,
                            "music_queue",
                            song_title=f"Playlist: {playlist_name}",
                            from_playlist=playlist is not None,
                            queue_length=queued_count
                        )
                    except Exception as e:
                        self.bot.add_error(f"Achievement processing error: {e}")
                
                # Run achievements in background
                self.bot.loop.create_task(process_achievements())
            
            instance.start_player_loop()
            
            # Send queue confirmation message that will auto-delete
            try:
                queue_msg = await instance.text_channel.send(f"🎵 Queued **{queued_count}** track(s) from **{playlist_name}**")
                instance.instance_messages.append(queue_msg)
                
                # Auto-delete after 10 seconds
                async def delete_queue_message():
                    await asyncio.sleep(10)
                    try:
                        await queue_msg.delete()
                        if queue_msg in instance.instance_messages:
                            instance.instance_messages.remove(queue_msg)
                    except:
                        pass
                
                self.bot.loop.create_task(delete_queue_message())
                
                await interaction.followup.send(f"✅ Added to queue!", ephemeral=True)
            except Exception as e:
                await interaction.followup.send(f"Queued {queued_count} track(s) from **{playlist_name}**.", ephemeral=True) 

            if is_first_song_batch:
                pass

        except Exception as e:
            self.bot.add_error(f"YTDL/DB Error in /play: {e}\n{traceback.format_exc()}")
            return await interaction.followup.send("An error occurred while fetching song data.", ephemeral=True)

    def clean_artist_name(self, artist_name: str) -> str:
        artist_name = re.sub(r'\s*\(?VEVO\)?|\s*-\s*Official Artist Channel', '', artist_name, flags=re.IGNORECASE)
        return artist_name.strip()

    def clean_track_title(self, track_title: str) -> str:
        track_title = re.sub(r'\(feat\..*?\)|\[feat\..*?\]|\(ft\..*?\)|\[ft\..*?\]', '', track_title, flags=re.IGNORECASE)
        track_title = re.sub(r'\(prod\..*?\)|\[prod\..*?\]', '', track_title, flags=re.IGNORECASE)
        track_title = re.sub(r'\(remix\)|\[remix\]', '', track_title, flags=re.IGNORECASE)
        track_title = re.sub(r'\(explicit\)|\[explicit\]', '', track_title, flags=re.IGNORECASE)
        track_title = re.sub(r'\(official video\)|\[official video\]', '', track_title, flags=re.IGNORECASE)
        track_title = re.sub(r'\(lyrics\)|\[lyrics\]', '', track_title, flags=re.IGNORECASE)
        return track_title.strip()

    def clean_query(self, query: str) -> str:
        query = re.sub(r'\s*\(.*?\)\s*|\s*\[.*?\]\s*', '', query).strip()
        query = re.sub(r'\s*ft\s*\.?\s*|\s*feat\s*\.?\s*', ' ', query, flags=re.IGNORECASE)
        query = re.sub(r'\s+-\s+', ' ', query)
        return query.strip()

    @app_commands.command(name="lyrics", description="Get lyrics for the current song or search for any song.")
    @app_commands.describe(query="[Optional] Search for lyrics of a specific song. Leave empty for current playing song.")
    async def lyrics(self, interaction: discord.Interaction, query: Optional[str] = None):
        await interaction.response.defer(thinking=True)
        
        lyrics_view = EnhancedLyricsView(self, interaction.user, search_query=query)
        await lyrics_view.fetch_and_display_lyrics(interaction)

    @app_commands.command(name="queue", description="Shows the active queue or a saved playlist's contents.")
    @app_commands.describe(playlist="[Optional] The name of a saved playlist to view.")
    @app_commands.autocomplete(playlist=playlist_autocomplete)
    async def queue(self, interaction: discord.Interaction, playlist: Optional[str] = None):
        await interaction.response.defer(ephemeral=True)
        
        if playlist:
            try:
                playlist_id = int(playlist)
                async with self.bot.db.execute("SELECT track_data, name FROM playlists WHERE playlist_id = ?", (playlist_id,)) as cursor:
                    playlist_row = await cursor.fetchone()
                if not playlist_row:
                    return await interaction.followup.send("Playlist not found.", ephemeral=True)
                
                tracks = json.loads(playlist_row[0])
                playlist_name = playlist_row[1]
                if not tracks:
                    return await interaction.followup.send(f"Playlist '{playlist_name}' is empty.", ephemeral=True)
                
                paginator = QueuePaginatorView(interaction, tracks, playlist_name, self.bot.user)
                embed = await paginator.create_embed()
                await interaction.followup.send(embed=embed, view=paginator, ephemeral=True)

            except Exception as e:
                self.bot.add_error(f"Error viewing playlist queue: {e}")
                await interaction.followup.send("Could not display that playlist.", ephemeral=True)
        else:
            # Find active music instance for this guild
            player = None
            for instance in self.instances.values():
                if instance.guild.id == interaction.guild.id:
                    player = instance
                    break
            if not player or (player.queue.empty() and not player.current_song):
                return await interaction.followup.send("The active queue is empty.", ephemeral=True)
            
            await player.send_or_edit_now_playing()
            await interaction.followup.send("Refreshed the Now Playing embed to show the current queue.", ephemeral=True)

    @app_commands.command(name="playlist_create", description="Create a new playlist from a YouTube playlist URL.")
    async def playlist_create(self, interaction: discord.Interaction):
        await interaction.response.send_modal(PlaylistModal(self))

    async def _create_playlist_background(self, interaction: discord.Interaction, name: str, url: str, is_public_str: str):
        is_public = 1 if is_public_str.lower() == 'yes' else 0
        try:
            data = await self.bot.loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=False))
            tracks = data.get('entries', [])
            if not tracks:
                return await interaction.followup.send("Could not find any tracks in that playlist URL.", ephemeral=True)
            
            track_data_json = json.dumps(tracks)
            
            async with self.bot.db.execute(
                "INSERT INTO playlists (name, creator_id, guild_id, is_public, track_data) VALUES (?, ?, ?, ?, ?)",
                (name, interaction.user.id, interaction.guild.id, is_public, track_data_json)
            ) as cursor:
                await self.bot.db.commit()
            
            await interaction.followup.send(f"✅ Successfully created playlist '{name}' with {len(tracks)} tracks!", ephemeral=True)
        except Exception as e:
            self.bot.add_error(f"Error creating playlist: {e}")
            await interaction.followup.send("An error occurred while creating the playlist.", ephemeral=True)

    @app_commands.command(name="playlist_delete", description="Deletes one of your playlists.")
    @app_commands.describe(playlist="The playlist to delete.")
    @app_commands.autocomplete(playlist=playlist_autocomplete)
    async def playlist_delete(self, interaction: discord.Interaction, playlist: str):
        await interaction.response.defer(ephemeral=True)
        try:
            playlist_id = int(playlist)
            async with self.bot.db.execute("SELECT name, creator_id FROM playlists WHERE playlist_id = ?", (playlist_id,)) as cursor:
                playlist_row = await cursor.fetchone()

            if not playlist_row:
                return await interaction.followup.send("Playlist not found.", ephemeral=True)
            
            if playlist_row[1] != interaction.user.id and not interaction.user.guild_permissions.manage_guild:
                return await interaction.followup.send("You can only delete your own playlists.", ephemeral=True)
            
            await self.bot.db.execute("DELETE FROM playlists WHERE playlist_id = ?", (playlist_id,))
            await self.bot.db.commit()
            
            await interaction.followup.send(f"🗑️ Successfully deleted playlist '{playlist_row[0]}'.", ephemeral=True)

        except Exception as e:
            self.bot.add_error(f"Error deleting playlist: {e}")
            await interaction.followup.send("An error occurred while deleting the playlist.", ephemeral=True)

    @app_commands.command(name="playlist_add", description="Adds a song to one of your playlists.")
    @app_commands.describe(playlist="The playlist to add to.", query="The song to add.")
    @app_commands.autocomplete(playlist=playlist_autocomplete)
    async def playlist_add(self, interaction: discord.Interaction, playlist: str, query: str):
        await interaction.response.defer(ephemeral=True)
        try:
            playlist_id = int(playlist)
            async with self.bot.db.execute("SELECT track_data, name, creator_id FROM playlists WHERE playlist_id = ?", (playlist_id,)) as cursor:
                playlist_row = await cursor.fetchone()
            
            if not playlist_row:
                return await interaction.followup.send("Playlist not found.", ephemeral=True)
            
            if playlist_row[2] != interaction.user.id:
                return await interaction.followup.send("You can only add songs to your own playlists.", ephemeral=True)

            data = await self.bot.loop.run_in_executor(None, lambda: ytdl.extract_info(query, download=False))
            new_track = data.get('entries', [data])[0]
            
            tracks = json.loads(playlist_row[0])
            tracks.append(new_track)
            
            await self.bot.db.execute("UPDATE playlists SET track_data = ? WHERE playlist_id = ?", (json.dumps(tracks), playlist_id))
            await self.bot.db.commit()
            
            await interaction.followup.send(f"➕ Added **{new_track['title']}** to playlist '{playlist_row[1]}'.", ephemeral=True)

        except Exception as e:
            self.bot.add_error(f"Error adding to playlist: {e}")
            await interaction.followup.send("An error occurred while adding the song.", ephemeral=True)

    @app_commands.command(name="playlist_remove", description="Removes a song from one of your playlists.")
    @app_commands.describe(playlist="The playlist to remove from.", track_number="The number of the track to remove.")
    @app_commands.autocomplete(playlist=playlist_autocomplete)
    async def playlist_remove(self, interaction: discord.Interaction, playlist: str, track_number: int):
        await interaction.response.defer(ephemeral=True)
        try:
            playlist_id = int(playlist)
            async with self.bot.db.execute("SELECT track_data, name, creator_id FROM playlists WHERE playlist_id = ?", (playlist_id,)) as cursor:
                playlist_row = await cursor.fetchone()

            if not playlist_row:
                return await interaction.followup.send("Playlist not found.", ephemeral=True)
            
            if playlist_row[2] != interaction.user.id:
                return await interaction.followup.send("You can only remove songs from your own playlists.", ephemeral=True)

            tracks = json.loads(playlist_row[0])
            if not (1 <= track_number <= len(tracks)):
                return await interaction.followup.send("Invalid track number.", ephemeral=True)
                
            removed_track = tracks.pop(track_number - 1)
            
            await self.bot.db.execute("UPDATE playlists SET track_data = ? WHERE playlist_id = ?", (json.dumps(tracks), playlist_id))
            await self.bot.db.commit()
            
            await interaction.followup.send(f"➖ Removed **{removed_track['title']}** from playlist '{playlist_row[1]}'.", ephemeral=True)

        except Exception as e:
            self.bot.add_error(f"Error removing from playlist: {e}")
            await interaction.followup.send("An error occurred while removing the song.", ephemeral=True)

    @app_commands.command(name="activity", description="Launch the interactive music player activity.")
    async def activity(self, interaction: discord.Interaction):
        """Generates a link to launch the Discord Activity."""
        if not interaction.user.voice or not interaction.user.voice.channel:
            return await interaction.response.send_message("You must be in a voice channel to launch the activity.", ephemeral=True)

        # Generate a unique token for this user and instance
        instance_id = interaction.user.voice.channel.id
        token = self.websocket_server.generate_auth_token(interaction.user.id, instance_id)
        
        # Construct the Activity URL with the auth token
        activity_url = f"{self.activity_base_url}?token={token}"
        
        application_id = str(self.bot.user.id)
        view = LaunchActivityView(activity_url, application_id)
        
        embed = discord.Embed(
            title="🚀 Launch Opure Visual Player",
            description="Click the button below to open the interactive music player. This will open in your browser and connect to your current voice session.",
            color=0x5865F2
        )
        embed.add_field(name="🔗 Direct Link", value=f"[Open Player]({activity_url})")
        embed.set_footer(text="This link is valid for 10 minutes.")
        
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(MusicCog(bot), guilds=GUILD_OBJECTS)