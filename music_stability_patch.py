# music_stability_patch.py
"""
Music Stability Patch for Opure.exe
Fixes disconnection issues during playback
"""

# Add these lines to your music_cog.py to fix disconnection issues

# 1. INCREASE IDLE TIMEOUT (Line ~2184)
# Change from 900.0 (15 minutes) to 3600.0 (1 hour)
MUSIC_IDLE_TIMEOUT = 3600.0  # 1 hour instead of 15 minutes

# 2. DISABLE AUTO-LEAVE ON EMPTY QUEUE (Line ~2335-2343)
# Add this configuration at the top of MusicCog class
DISABLE_AUTO_LEAVE = True  # Set to True to prevent auto-leave

# 3. IMPROVED RECONNECTION LOGIC
# Replace the reconnection logic around line 2269-2294

async def improved_reconnect_logic(self, voice_channel):
    """Improved reconnection with multiple retry attempts and better error handling."""
    max_attempts = 5
    base_delay = 1.0
    
    for attempt in range(max_attempts):
        try:
            self.bot.add_log(f"🔄 Reconnection attempt {attempt + 1}/{max_attempts} to {voice_channel.name}")
            
            # Clean disconnect first
            if self.voice_client:
                try:
                    await asyncio.wait_for(self.voice_client.disconnect(force=True), timeout=5.0)
                except:
                    pass
            
            # Wait with exponential backoff
            if attempt > 0:
                delay = base_delay * (2 ** (attempt - 1))
                await asyncio.sleep(min(delay, 10.0))  # Max 10 second delay
            
            # Attempt reconnection
            self.voice_client = await asyncio.wait_for(
                voice_channel.connect(self_deaf=True, reconnect=True), 
                timeout=20.0
            )
            
            # Verify connection
            await asyncio.sleep(0.5)
            if self.voice_client and self.voice_client.is_connected():
                self.bot.add_log(f"✅ Successfully reconnected to {voice_channel.name}")
                return True
                
        except asyncio.TimeoutError:
            self.bot.add_error(f"⏰ Reconnection timeout (attempt {attempt + 1})")
        except Exception as e:
            self.bot.add_error(f"❌ Reconnection failed (attempt {attempt + 1}): {e}")
    
    self.bot.add_error(f"💀 Failed to reconnect after {max_attempts} attempts")
    return False

# 4. ENHANCED VOICE STATE UPDATE HANDLER
# Replace the on_voice_state_update method around line 3327

async def enhanced_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
    """Enhanced voice state handling with better disconnection management."""
    
    # Handle bot disconnection
    if member.bot and member.id == self.bot.user.id:
        if after.channel is None and before.channel:
            # Bot was disconnected
            instance = self.instances.get(before.channel.id)
            if instance:
                self.bot.add_log(f"🔌 Bot disconnected from {before.channel.name} - attempting graceful recovery")
                
                # Try to reconnect if users are still in the channel
                remaining_users = [m for m in before.channel.members if not m.bot]
                if remaining_users and instance.queue and not instance.queue.empty():
                    self.bot.add_log(f"🔄 Users still present, attempting reconnection...")
                    
                    # Try to reconnect
                    reconnected = await self.improved_reconnect_logic(instance, before.channel)
                    if not reconnected:
                        self.bot.add_log(f"💀 Reconnection failed, stopping instance")
                        await instance.stop_player()
                else:
                    self.bot.add_log(f"ℹ️ No users remaining or empty queue, stopping instance")
                    await instance.stop_player()
        return
    
    # Continue with existing logic for member changes...
    # (Keep the rest of the original method)

# 5. QUEUE TIMEOUT PREVENTION
# Add this method to MusicInstance class

async def keep_alive(self):
    """Send keep-alive signals to prevent timeout disconnections."""
    while not self.bot.is_closed() and self.voice_client and self.voice_client.is_connected():
        try:
            # Send a small packet to keep connection alive
            if hasattr(self.voice_client, 'ws') and self.voice_client.ws:
                await self.voice_client.ws.ping()
            await asyncio.sleep(300)  # Every 5 minutes
        except Exception as e:
            self.bot.add_log(f"Keep-alive failed: {e}")
            break

# 6. ERROR RECOVERY MECHANISM
# Add this to handle errors during playback

async def error_recovery(self, error, context="playback"):
    """Attempt to recover from playback errors."""
    self.bot.add_error(f"🔧 Attempting error recovery for {context}: {error}")
    
    try:
        # Check if voice client is still connected
        if not self.voice_client or not self.voice_client.is_connected():
            # Try to reconnect
            if hasattr(self, 'voice_channel') and self.voice_channel:
                reconnected = await self.improved_reconnect_logic(self, self.voice_channel)
                if not reconnected:
                    return False
        
        # If we have a current song, try to restart it
        if hasattr(self, 'current_song') and self.current_song:
            try:
                # Stop current playback
                if self.voice_client.is_playing() or self.voice_client.is_paused():
                    self.voice_client.stop()
                    await asyncio.sleep(1.0)
                
                # Restart the song
                self.voice_client.play(
                    self.current_song,
                    after=lambda e: self.play_next() if e else None
                )
                
                self.bot.add_log("✅ Successfully recovered from error")
                return True
                
            except Exception as recovery_error:
                self.bot.add_error(f"Recovery attempt failed: {recovery_error}")
                return False
        
        return True
        
    except Exception as e:
        self.bot.add_error(f"Error recovery mechanism failed: {e}")
        return False

# 7. APPLY PATCHES TO EXISTING CODE
"""
To apply these patches to your existing music_cog.py:

1. Change line ~2184:
   FROM: next_song_data = await asyncio.wait_for(self.queue.get(), timeout=900.0)
   TO:   next_song_data = await asyncio.wait_for(self.queue.get(), timeout=3600.0)

2. Around line 2335-2343, modify the auto-leave condition:
   FROM: should_auto_leave = (self.queue.empty() and not self.loop and ...)
   TO:   should_auto_leave = False  # Disable auto-leave

3. Replace the voice state update method with enhanced_voice_state_update

4. Add the improved_reconnect_logic method to MusicInstance class

5. Add error_recovery and keep_alive methods to MusicInstance class

6. In the player loop, wrap playback in try-except with error recovery
"""

print("🔧 Music Stability Patch loaded - apply manually to music_cog.py")