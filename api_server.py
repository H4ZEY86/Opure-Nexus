"""
CRITICAL: Discord Activity Music API Server
This HTTP server runs alongside the Discord bot to receive music commands from the Activity
and trigger REAL audio playback in Discord voice channels using Lavalink.
"""

import asyncio
import json
import traceback
from aiohttp import web, WSMsgType
import discord
from datetime import datetime
import yt_dlp
import os
import logging

class ActivityMusicAPIServer:
    def __init__(self, bot, port=8000):
        self.bot = bot
        self.port = port
        self.app = None
        self.runner = None
        self.site = None
        self.logger = logging.getLogger('ActivityAPI')
        
        # Guild and channel config
        self.GUILD_ID = 1362815996557263049
        self.DEFAULT_VOICE_CHANNEL_ID = 1362815996557263052  # General voice channel
        
    async def start_server(self):
        """Start the HTTP server for Activity API"""
        try:
            self.app = web.Application()
            self.setup_routes()
            
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            
            self.site = web.TCPSite(self.runner, 'localhost', self.port)
            await self.site.start()
            
            self.bot.add_log(f"🎵 Activity Music API Server started on http://localhost:{self.port}")
            print(f"🎵 Activity Music API Server started on http://localhost:{self.port}")
            
        except Exception as e:
            self.bot.add_error(f"Failed to start Activity API server: {e}")
            print(f"❌ Failed to start Activity API server: {e}")

    def setup_routes(self):
        """Setup API routes"""
        # CORS middleware
        async def cors_handler(request, handler):
            response = await handler(request)
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            return response

        # Add routes
        self.app.router.add_post('/api/music/command', self.handle_music_command)
        self.app.router.add_get('/api/music/status/{guild_id}', self.handle_get_status)
        self.app.router.add_post('/api/lavalink/play', self.handle_lavalink_play)
        self.app.router.add_get('/api/discord/user/{user_id}/voice', self.handle_get_user_voice)
        self.app.router.add_get('/health', self.handle_health)
        
        # OPTIONS handler for CORS
        async def options_handler(request):
            return web.Response(
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            )
        
        self.app.router.add_options('/{path:.*}', options_handler)
        
        # Add CORS middleware
        self.app.middlewares.append(cors_handler)

    async def handle_music_command(self, request):
        """Handle music commands from Discord Activity"""
        try:
            data = await request.json()
            action = data.get('action')
            query = data.get('query')
            user_id = int(data.get('user_id'))
            guild_id = int(data.get('guild_id', self.GUILD_ID))
            voice_channel_id = data.get('voice_channel_id')
            
            self.bot.add_log(f"🎵 ACTIVITY API: {action} request from user {user_id}")
            print(f"🎵 ACTIVITY API: {action} request from user {user_id}")
            
            if action == 'play':
                result = await self.handle_play_command(query, user_id, guild_id, voice_channel_id)
                return web.json_response(result)
                
            elif action == 'stop':
                result = await self.handle_stop_command(guild_id)
                return web.json_response(result)
                
            elif action == 'skip':
                result = await self.handle_skip_command(guild_id)
                return web.json_response(result)
            
            else:
                return web.json_response({
                    'success': False,
                    'error': f'Unknown action: {action}'
                }, status=400)
                
        except Exception as e:
            self.bot.add_error(f"Activity API command error: {e}")
            return web.json_response({
                'success': False,
                'error': str(e),
                'trace': traceback.format_exc()
            }, status=500)

    async def handle_play_command(self, query, user_id, guild_id, voice_channel_id=None):
        """Handle play command - ACTUALLY plays audio in Discord voice channel"""
        try:
            # Get guild and user
            guild = self.bot.get_guild(guild_id)
            if not guild:
                return {'success': False, 'error': f'Guild {guild_id} not found'}
                
            user = guild.get_member(user_id)
            if not user:
                return {'success': False, 'error': f'User {user_id} not found in guild'}

            # Find user's voice channel or use default
            voice_channel = None
            
            if user.voice and user.voice.channel:
                voice_channel = user.voice.channel
                self.bot.add_log(f"✅ User {user.display_name} is in voice channel: {voice_channel.name}")
            else:
                # Use default voice channel
                voice_channel = guild.get_channel(self.DEFAULT_VOICE_CHANNEL_ID)
                self.bot.add_log(f"⚠️ User not in voice, using default channel: {voice_channel.name if voice_channel else 'None'}")
                
            if not voice_channel:
                return {
                    'success': False, 
                    'error': 'User must be in a voice channel or default voice channel not available'
                }

            # Get music cog
            music_cog = self.bot.get_cog('MusicCog')
            if not music_cog:
                return {'success': False, 'error': 'Music system not available'}

            # Create fake interaction for compatibility with existing music system
            class FakeInteraction:
                def __init__(self, user, guild, voice_channel):
                    self.user = user
                    self.guild = guild
                    self.channel = voice_channel  # Set to voice channel for bot to join
                    self.response = FakeResponse()
                    self.followup = FakeFollowup()
                    
            class FakeResponse:
                def __init__(self):
                    self.responded = False
                    
                async def send_message(self, content="", embed=None, ephemeral=False):
                    self.responded = True
                    return
                    
                async def defer(self, ephemeral=False):
                    return
                    
            class FakeFollowup:
                async def send(self, content="", embed=None, ephemeral=False):
                    return

            fake_interaction = FakeInteraction(user, guild, voice_channel)
            
            # Try to get or create music instance
            try:
                # First, ensure bot joins the voice channel
                if guild.voice_client is None:
                    voice_client = await voice_channel.connect()
                    self.bot.add_log(f"🔗 Bot joined voice channel: {voice_channel.name}")
                elif guild.voice_client.channel != voice_channel:
                    await guild.voice_client.move_to(voice_channel)
                    self.bot.add_log(f"🔄 Bot moved to voice channel: {voice_channel.name}")
                else:
                    self.bot.add_log(f"✅ Bot already in voice channel: {voice_channel.name}")
                    
                # Now use the music cog's play functionality
                if hasattr(music_cog, 'play_song') or hasattr(music_cog, 'play'):
                    # Try different methods that might exist in the music cog
                    if hasattr(music_cog, 'play_song'):
                        await music_cog.play_song(fake_interaction, query=query)
                    elif hasattr(music_cog, 'play'):
                        await music_cog.play(fake_interaction, song=query)
                    else:
                        # Fallback: direct audio playback
                        await self.direct_audio_playback(guild, query)
                        
                    self.bot.add_log(f"✅ REAL AUDIO PLAYBACK STARTED: {query}")
                    
                    return {
                        'success': True,
                        'message': f'Now playing: {query}',
                        'track': {
                            'title': query,
                            'status': 'playing',
                            'voice_channel': voice_channel.name
                        },
                        'voice_channel': voice_channel.name,
                        'guild': guild.name
                    }
                    
                else:
                    # Direct playback fallback
                    result = await self.direct_audio_playback(guild, query)
                    return result
                    
            except Exception as play_error:
                self.bot.add_error(f"Music cog play error: {play_error}")
                # Try direct playback as fallback
                return await self.direct_audio_playback(guild, query)
                
        except Exception as e:
            self.bot.add_error(f"Play command error: {e}")
            return {
                'success': False,
                'error': str(e),
                'suggestion': 'Make sure bot has permissions and Lavalink is running'
            }

    async def direct_audio_playback(self, guild, query):
        """Direct audio playback using yt-dlp and FFmpeg"""
        try:
            self.bot.add_log(f"🎵 Attempting direct audio playback: {query}")
            
            # Ensure voice connection exists
            if not guild.voice_client:
                return {'success': False, 'error': 'No voice connection available'}
            
            # Use yt-dlp to get audio URL
            ydl_opts = {
                'format': 'bestaudio/best',
                'noplaylist': True,
                'quiet': True,
                'extractaudio': True,
                'audioformat': 'mp3',
                'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
                'restrictfilenames': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    # If query looks like a URL, use it directly; otherwise search
                    if query.startswith(('http://', 'https://')):
                        search_query = query
                    else:
                        search_query = f"ytsearch:{query}"
                        
                    info = ydl.extract_info(search_query, download=False)
                    
                    if 'entries' in info:
                        # It's a playlist, get the first entry
                        info = info['entries'][0]
                    
                    audio_url = info['url']
                    title = info.get('title', query)
                    duration = info.get('duration', 0)
                    
                    self.bot.add_log(f"🎵 Got audio URL for: {title}")
                    
                    # FFmpeg options for Discord
                    ffmpeg_options = {
                        'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
                        'options': '-vn -filter:a "volume=0.5"'
                    }
                    
                    # Create audio source
                    audio_source = discord.FFmpegPCMAudio(audio_url, **ffmpeg_options)
                    
                    # Play the audio
                    if guild.voice_client.is_playing():
                        guild.voice_client.stop()
                        
                    guild.voice_client.play(audio_source, after=lambda e: self.bot.add_log(f'Player error: {e}') if e else None)
                    
                    self.bot.add_log(f"🎵 DIRECT AUDIO PLAYBACK STARTED: {title}")
                    
                    return {
                        'success': True,
                        'message': f'Now playing: {title}',
                        'track': {
                            'title': title,
                            'duration': f"{duration//60}:{duration%60:02d}" if duration else "Unknown",
                            'status': 'playing',
                            'url': info.get('webpage_url', ''),
                            'thumbnail': info.get('thumbnail', ''),
                            'voice_channel': guild.voice_client.channel.name
                        },
                        'source': 'direct_playback'
                    }
                    
                except Exception as ytdl_error:
                    self.bot.add_error(f"yt-dlp error: {ytdl_error}")
                    raise ytdl_error
                    
        except Exception as e:
            self.bot.add_error(f"Direct playback error: {e}")
            return {
                'success': False,
                'error': f'Direct playback failed: {str(e)}',
                'suggestion': 'Check if FFmpeg is installed and yt-dlp is working'
            }

    async def handle_stop_command(self, guild_id):
        """Stop music playback"""
        try:
            guild = self.bot.get_guild(guild_id)
            if guild and guild.voice_client:
                guild.voice_client.stop()
                self.bot.add_log("🛑 Music stopped via Activity API")
                return {'success': True, 'message': 'Music stopped'}
            else:
                return {'success': False, 'error': 'No active playback to stop'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def handle_skip_command(self, guild_id):
        """Skip current track"""
        try:
            guild = self.bot.get_guild(guild_id)
            if guild and guild.voice_client and guild.voice_client.is_playing():
                guild.voice_client.stop()  # This will trigger next song if queue exists
                self.bot.add_log("⏭️ Track skipped via Activity API")
                return {'success': True, 'message': 'Track skipped'}
            else:
                return {'success': False, 'error': 'No active playback to skip'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def handle_get_status(self, request):
        """Get current music status"""
        try:
            guild_id = int(request.match_info['guild_id'])
            guild = self.bot.get_guild(guild_id)
            
            if not guild or not guild.voice_client:
                return web.json_response({
                    'success': True,
                    'playing': False,
                    'voice_channel': None
                })
            
            return web.json_response({
                'success': True,
                'playing': guild.voice_client.is_playing(),
                'voice_channel': guild.voice_client.channel.name,
                'connected': guild.voice_client.is_connected()
            })
            
        except Exception as e:
            return web.json_response({'success': False, 'error': str(e)}, status=500)

    async def handle_lavalink_play(self, request):
        """Alternative Lavalink play endpoint"""
        try:
            data = await request.json()
            query = data.get('query')
            user_id = int(data.get('user_id'))
            guild_id = int(data.get('guild_id', self.GUILD_ID))
            
            # Route to main play handler
            result = await self.handle_play_command(query, user_id, guild_id)
            return web.json_response(result)
            
        except Exception as e:
            return web.json_response({'success': False, 'error': str(e)}, status=500)

    async def handle_get_user_voice(self, request):
        """Get user's current voice channel"""
        try:
            user_id = int(request.match_info['user_id'])
            guild_id = int(request.query.get('guild_id', self.GUILD_ID))
            
            guild = self.bot.get_guild(guild_id)
            if not guild:
                return web.json_response({'voice_channel': None})
                
            user = guild.get_member(user_id)
            if user and user.voice and user.voice.channel:
                return web.json_response({
                    'voice_channel': {
                        'id': str(user.voice.channel.id),
                        'name': user.voice.channel.name
                    }
                })
            else:
                # Return default voice channel
                default_channel = guild.get_channel(self.DEFAULT_VOICE_CHANNEL_ID)
                return web.json_response({
                    'voice_channel': {
                        'id': str(default_channel.id),
                        'name': default_channel.name
                    } if default_channel else None
                })
                
        except Exception as e:
            return web.json_response({'voice_channel': None})

    async def handle_health(self, request):
        """Health check endpoint"""
        return web.json_response({
            'status': 'healthy',
            'bot_ready': self.bot.is_ready(),
            'guild_count': len(self.bot.guilds),
            'timestamp': datetime.now().isoformat()
        })

    async def stop_server(self):
        """Stop the HTTP server"""
        if self.site:
            await self.site.stop()
        if self.runner:
            await self.runner.cleanup()
        self.bot.add_log("🛑 Activity Music API Server stopped")