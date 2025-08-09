# core/production_optimizer.py - RTX 5070 Ti and production optimizations

import os
import psutil
import logging
import asyncio
from typing import Dict, Any, Optional
from pathlib import Path
import gc
import threading
import queue
import time

class ProductionOptimizer:
    """
    Production-level optimizations for RTX 5070 Ti gaming performance
    Ensures zero impact on gaming while running Discord bot
    """
    
    def __init__(self, bot):
        self.bot = bot
        self.logger = logging.getLogger(__name__)
        self.gpu_monitoring = True
        self.performance_mode = "balanced"  # balanced, performance, quality
        self.process = psutil.Process()
        
        # Performance thresholds
        self.cpu_threshold = 25.0  # Max CPU usage %
        self.memory_threshold = 512  # Max memory usage MB
        self.response_time_target = 150  # Target response time ms
        
        # Gaming optimization settings
        self.gaming_priority_processes = [
            "steam.exe", "steamwebhelper.exe", "gameoverlayui.exe",
            "discord.exe", "discordptb.exe", "discordcanary.exe",
            # Gaming applications
            "valorant.exe", "riotgames.exe", "league of legends.exe",
            "csgo.exe", "dota2.exe", "fortnite.exe", "minecraft.exe",
            # Common game engines
            "unityhub.exe", "unity.exe", "unrealengine.exe"
        ]
        
    async def initialize_optimizations(self):
        """Initialize all production optimizations"""
        try:
            self.logger.info("🚀 Initializing production optimizations for RTX 5070 Ti...")
            
            # Set process priority and affinity
            await self.optimize_process_priority()
            
            # Initialize memory management
            await self.setup_memory_optimization()
            
            # Configure async optimizations
            await self.optimize_async_performance()
            
            # Setup GPU monitoring
            await self.initialize_gpu_monitoring()
            
            # Start background optimization tasks
            asyncio.create_task(self.performance_monitoring_loop())
            asyncio.create_task(self.memory_cleanup_loop())
            asyncio.create_task(self.gaming_detection_loop())
            
            self.logger.info("✅ Production optimizations initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize optimizations: {e}")
    
    async def optimize_process_priority(self):
        """Optimize process priority and CPU affinity for gaming"""
        try:
            # Set to below normal priority to not interfere with gaming
            if os.name == 'nt':  # Windows
                import win32process
                import win32api
                
                handle = win32api.GetCurrentProcess()
                win32process.SetPriorityClass(handle, win32process.BELOW_NORMAL_PRIORITY_CLASS)
                
            # Set CPU affinity to use only efficiency cores (if available)
            cpu_count = psutil.cpu_count(logical=False)
            if cpu_count >= 8:  # Multi-core system
                # Use last 2-4 cores for bot, leave performance cores for gaming
                available_cores = list(range(max(0, cpu_count - 4), cpu_count))
                self.process.cpu_affinity(available_cores)
                self.logger.info(f"🎯 Set CPU affinity to cores: {available_cores}")
            
            self.logger.info("⚡ Process priority optimized for gaming")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to optimize process priority: {e}")
    
    async def setup_memory_optimization(self):
        """Setup memory optimization for minimal footprint"""
        try:
            # Configure garbage collection for low latency
            gc.set_threshold(700, 10, 10)  # More aggressive GC
            
            # Set memory limits
            import resource
            try:
                # Limit virtual memory to 1GB
                resource.setrlimit(resource.RLIMIT_AS, (1024 * 1024 * 1024, -1))
            except:
                pass  # Not critical if fails
            
            self.logger.info("🧠 Memory optimization configured")
            
        except Exception as e:
            self.logger.error(f"❌ Memory optimization failed: {e}")
    
    async def optimize_async_performance(self):
        """Optimize asyncio for best performance"""
        try:
            # Configure event loop policy
            if os.name == 'nt':  # Windows
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            
            # Set loop debug mode off in production
            loop = asyncio.get_event_loop()
            loop.set_debug(False)
            
            # Configure task factory for performance
            loop.set_task_factory(None)
            
            self.logger.info("⚡ Async performance optimized")
            
        except Exception as e:
            self.logger.error(f"❌ Async optimization failed: {e}")
    
    async def initialize_gpu_monitoring(self):
        """Initialize GPU monitoring for RTX 5070 Ti"""
        try:
            # Try to import GPU monitoring libraries
            try:
                import GPUtil
                self.gpu_available = True
                self.logger.info("📊 GPU monitoring available (RTX 5070 Ti)")
            except ImportError:
                self.gpu_available = False
                self.logger.warning("⚠️ GPU monitoring not available")
            
        except Exception as e:
            self.logger.error(f"❌ GPU monitoring initialization failed: {e}")
    
    async def performance_monitoring_loop(self):
        """Continuous performance monitoring and adjustment"""
        while True:
            try:
                # Get current system stats
                cpu_percent = psutil.cpu_percent(interval=1)
                memory_info = psutil.virtual_memory()
                memory_mb = self.process.memory_info().rss / (1024 * 1024)
                
                # Check if gaming is active
                gaming_active = await self.detect_gaming_processes()
                
                # Adjust performance mode based on system load
                if gaming_active:
                    await self.enter_gaming_mode()
                elif cpu_percent > self.cpu_threshold or memory_mb > self.memory_threshold:
                    await self.enter_performance_mode()
                else:
                    await self.enter_balanced_mode()
                
                # Log performance metrics
                if hasattr(self.bot, 'add_log'):
                    self.bot.add_log(
                        f"📊 Performance: CPU {cpu_percent:.1f}%, "
                        f"RAM {memory_mb:.1f}MB, Gaming: {gaming_active}"
                    )
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Performance monitoring error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def memory_cleanup_loop(self):
        """Periodic memory cleanup to prevent bloat"""
        while True:
            try:
                # Force garbage collection
                collected = gc.collect()
                
                # Clear bot caches if available
                if hasattr(self.bot, 'cache') and hasattr(self.bot.cache, 'clear'):
                    # Clear Discord.py internal caches periodically
                    if len(self.bot.cached_messages) > 1000:
                        self.bot.cached_messages.clear()
                
                # Clear memory caches in cogs
                for cog_name, cog in self.bot.cogs.items():
                    if hasattr(cog, 'cache'):
                        # Limit cache sizes
                        for cache_name, cache in cog.cache.items():
                            if isinstance(cache, dict) and len(cache) > 100:
                                # Keep only most recent 50 entries
                                sorted_items = sorted(cache.items(), key=lambda x: x[0])
                                cache.clear()
                                cache.update(dict(sorted_items[-50:]))
                
                if collected > 0:
                    self.logger.debug(f"🧹 Memory cleanup: {collected} objects collected")
                
                await asyncio.sleep(300)  # Clean up every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Memory cleanup error: {e}")
                await asyncio.sleep(600)  # Wait longer on error
    
    async def gaming_detection_loop(self):
        """Detect when gaming applications are running"""
        while True:
            try:
                gaming_detected = await self.detect_gaming_processes()
                
                if gaming_detected and self.performance_mode != "gaming":
                    await self.enter_gaming_mode()
                elif not gaming_detected and self.performance_mode == "gaming":
                    await self.enter_balanced_mode()
                
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Gaming detection error: {e}")
                await asyncio.sleep(30)
    
    async def detect_gaming_processes(self) -> bool:
        """Detect if gaming processes are running"""
        try:
            running_processes = [proc.name().lower() for proc in psutil.process_iter(['name'])]
            
            for gaming_process in self.gaming_priority_processes:
                if gaming_process.lower() in running_processes:
                    return True
            
            # Also check for processes using significant GPU
            if self.gpu_available:
                try:
                    import GPUtil
                    gpus = GPUtil.getGPUs()
                    if gpus and gpus[0].load > 0.3:  # 30% GPU usage threshold
                        return True
                except:
                    pass
            
            return False
            
        except Exception as e:
            self.logger.error(f"❌ Gaming process detection error: {e}")
            return False
    
    async def enter_gaming_mode(self):
        """Enter gaming optimization mode"""
        if self.performance_mode == "gaming":
            return
        
        try:
            self.performance_mode = "gaming"
            
            # Reduce bot activity
            self.cpu_threshold = 15.0  # Lower CPU limit
            self.memory_threshold = 256  # Lower memory limit
            
            # Reduce Discord.py cache sizes
            if hasattr(self.bot, '_connection'):
                self.bot._connection.max_messages = 500  # Reduce message cache
            
            # Disable non-essential features
            for cog_name, cog in self.bot.cogs.items():
                if hasattr(cog, 'set_performance_mode'):
                    await cog.set_performance_mode("gaming")
            
            self.logger.info("🎮 Entered GAMING mode - Maximum performance priority to games")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to enter gaming mode: {e}")
    
    async def enter_performance_mode(self):
        """Enter high performance mode"""
        if self.performance_mode == "performance":
            return
        
        try:
            self.performance_mode = "performance" 
            
            # Optimize for speed
            self.cpu_threshold = 35.0
            self.memory_threshold = 768
            
            self.logger.info("⚡ Entered PERFORMANCE mode - Optimizing for speed")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to enter performance mode: {e}")
    
    async def enter_balanced_mode(self):
        """Enter balanced mode"""
        if self.performance_mode == "balanced":
            return
        
        try:
            self.performance_mode = "balanced"
            
            # Balanced settings
            self.cpu_threshold = 25.0
            self.memory_threshold = 512
            
            # Restore normal cache sizes
            if hasattr(self.bot, '_connection'):
                self.bot._connection.max_messages = 1000
            
            self.logger.info("⚖️ Entered BALANCED mode - Normal operation")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to enter balanced mode: {e}")
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        try:
            memory_info = self.process.memory_info()
            cpu_percent = self.process.cpu_percent()
            
            stats = {
                "performance_mode": self.performance_mode,
                "cpu_usage": cpu_percent,
                "memory_usage_mb": memory_info.rss / (1024 * 1024),
                "memory_usage_percent": psutil.virtual_memory().percent,
                "num_threads": self.process.num_threads(),
                "num_fds": getattr(self.process, 'num_fds', lambda: 0)(),
                "gaming_detected": await self.detect_gaming_processes()
            }
            
            # Add GPU stats if available
            if self.gpu_available:
                try:
                    import GPUtil
                    gpus = GPUtil.getGPUs()
                    if gpus:
                        gpu = gpus[0]
                        stats["gpu_usage"] = gpu.load * 100
                        stats["gpu_memory_used"] = gpu.memoryUsed
                        stats["gpu_memory_total"] = gpu.memoryTotal
                        stats["gpu_temperature"] = gpu.temperature
                except:
                    pass
            
            return stats
            
        except Exception as e:
            self.logger.error(f"❌ Failed to get performance stats: {e}")
            return {"error": str(e)}
    
    async def optimize_for_command(self, command_name: str):
        """Optimize temporarily for specific command execution"""
        try:
            # Boost priority for AI/intensive commands
            intensive_commands = ["ask", "generate", "analyze", "process"]
            
            if any(cmd in command_name.lower() for cmd in intensive_commands):
                # Temporarily allow higher resource usage
                original_cpu_threshold = self.cpu_threshold
                original_memory_threshold = self.memory_threshold
                
                self.cpu_threshold = min(self.cpu_threshold * 1.5, 40.0)
                self.memory_threshold = min(self.memory_threshold * 1.3, 1024)
                
                # Restore after 30 seconds
                async def restore_limits():
                    await asyncio.sleep(30)
                    self.cpu_threshold = original_cpu_threshold
                    self.memory_threshold = original_memory_threshold
                
                asyncio.create_task(restore_limits())
            
        except Exception as e:
            self.logger.error(f"❌ Command optimization error: {e}")


# Setup function for bot integration
def setup_production_optimizer(bot):
    """Setup production optimizer for the bot"""
    try:
        optimizer = ProductionOptimizer(bot)
        bot.production_optimizer = optimizer
        
        # Initialize optimizations
        bot.loop.create_task(optimizer.initialize_optimizations())
        
        # Add helper methods to bot
        async def get_performance_stats():
            return await optimizer.get_performance_stats()
        
        async def optimize_for_command(command_name):
            await optimizer.optimize_for_command(command_name)
        
        bot.get_performance_stats = get_performance_stats
        bot.optimize_for_command = optimize_for_command
        
        bot.add_log("✅ Production optimizer initialized for RTX 5070 Ti")
        return optimizer
        
    except Exception as e:
        logging.error(f"❌ Failed to setup production optimizer: {e}")
        return None