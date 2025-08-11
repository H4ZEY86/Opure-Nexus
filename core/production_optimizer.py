# core/production_optimizer.py - RTX 5070 Ti Gaming Performance Optimizer

import psutil
import asyncio
import os
import time
from typing import Dict, Optional, List
import threading

class ProductionOptimizer:
    """RTX 5070 Ti optimized production system for zero gaming impact"""
    
    def __init__(self, bot):
        self.bot = bot
        self.cpu_threshold = 15.0  # Keep CPU usage under 15% for gaming
        self.memory_threshold = 70.0  # Keep memory under 70%
        self.monitoring_active = False
        self.performance_data = []
        self.optimization_active = False
        
    async def start_optimization(self):
        """Start RTX 5070 Ti gaming-optimized monitoring"""
        self.monitoring_active = True
        self.optimization_active = True
        
        # Start background monitoring
        asyncio.create_task(self.monitor_performance())
        asyncio.create_task(self.optimize_resources())
        
        self.bot.add_log("🎮 RTX 5070 Ti Gaming Optimizer: ACTIVE")
        self.bot.add_log("⚡ Zero gaming impact mode enabled")
    
    async def stop_optimization(self):
        """Stop optimization monitoring"""
        self.monitoring_active = False
        self.optimization_active = False
        self.bot.add_log("🛑 RTX 5070 Ti Gaming Optimizer: STOPPED")
    
    async def monitor_performance(self):
        """Monitor system performance for gaming compatibility"""
        while self.monitoring_active:
            try:
                # Collect system metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                
                # GPU monitoring (RTX 5070 Ti specific)
                gpu_data = self.get_gpu_metrics()
                
                performance_sample = {
                    'timestamp': time.time(),
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_available_gb': memory.available / (1024**3),
                    'gpu_load': gpu_data.get('load', 0),
                    'gpu_memory_used': gpu_data.get('memory_used', 0),
                    'gpu_temperature': gpu_data.get('temperature', 0)
                }
                
                self.performance_data.append(performance_sample)
                
                # Keep only last 100 samples
                if len(self.performance_data) > 100:
                    self.performance_data.pop(0)
                
                # Check for gaming impact
                if cpu_percent > self.cpu_threshold:
                    await self.trigger_gaming_protection()
                
                # Sleep for 5 seconds between checks
                await asyncio.sleep(5)
                
            except Exception as e:
                self.bot.add_error(f"Performance monitoring error: {e}")
                await asyncio.sleep(10)
    
    def get_gpu_metrics(self) -> Dict:
        """Get RTX 5070 Ti specific metrics"""
        try:
            # Try to get GPU info using GPUtil
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                
                if gpus:
                    gpu = gpus[0]  # Assume RTX 5070 Ti is primary
                    return {
                        'load': gpu.load * 100,
                        'memory_used': gpu.memoryUsed,
                        'memory_total': gpu.memoryTotal,
                        'temperature': gpu.temperature,
                        'name': gpu.name
                    }
            except ImportError:
                pass
            
            # Fallback to nvidia-ml-py if available
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                
                # Get GPU utilization
                utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                
                # Get memory info
                memory_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                
                # Get temperature
                temperature = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                
                return {
                    'load': utilization.gpu,
                    'memory_used': memory_info.used / (1024**2),  # MB
                    'memory_total': memory_info.total / (1024**2),  # MB
                    'temperature': temperature
                }
                
            except ImportError:
                pass
            
        except Exception as e:
            self.bot.add_error(f"GPU metrics collection failed: {e}")
        
        # Return empty data if GPU monitoring unavailable
        return {'load': 0, 'memory_used': 0, 'temperature': 0}
    
    async def trigger_gaming_protection(self):
        """Activate gaming protection mode when high CPU detected"""
        if not self.optimization_active:
            return
            
        self.bot.add_log("🎮 GAMING PROTECTION ACTIVATED - High CPU detected")
        
        # Reduce bot activity to minimum for gaming
        await self.reduce_bot_activity()
        
        # Wait for CPU to normalize
        await asyncio.sleep(30)
        
        # Check if still high CPU after wait
        current_cpu = psutil.cpu_percent(interval=1)
        if current_cpu < self.cpu_threshold:
            self.bot.add_log("✅ Gaming protection: CPU normalized, resuming normal operation")
            await self.restore_bot_activity()
        else:
            self.bot.add_log("⚠️ Gaming protection: CPU still high, maintaining reduced activity")
    
    async def reduce_bot_activity(self):
        """Reduce bot resource usage for gaming compatibility"""
        try:
            # Pause non-essential background tasks
            for task_name in ['sentient_log_poster', 'assimilate_self_awareness', 'assimilate_external_data']:
                task = getattr(self.bot, task_name, None)
                if task and not task.is_cancelled():
                    task.cancel()
                    self.bot.add_log(f"⏸️ Gaming mode: Paused {task_name}")
            
            # Reduce WebSocket update frequency
            if hasattr(self.bot, 'dashboard_ws'):
                self.bot.dashboard_ws.update_interval = 60  # Reduce to 1 minute updates
            
            # Limit database operations
            if hasattr(self.bot, 'db_operations_per_minute'):
                self.bot.db_operations_per_minute = 10  # Reduce database load
            
            self.bot.add_log("🎮 Bot activity reduced for zero gaming impact")
            
        except Exception as e:
            self.bot.add_error(f"Failed to reduce bot activity: {e}")
    
    async def restore_bot_activity(self):
        """Restore normal bot activity after gaming session"""
        try:
            # Restart essential background tasks
            if hasattr(self.bot, 'sentient_log_poster'):
                self.bot.sentient_log_poster.start()
            if hasattr(self.bot, 'assimilate_self_awareness'):
                self.bot.assimilate_self_awareness.start()
            if hasattr(self.bot, 'assimilate_external_data'):
                self.bot.assimilate_external_data.start()
            
            # Restore normal WebSocket updates
            if hasattr(self.bot, 'dashboard_ws'):
                self.bot.dashboard_ws.update_interval = 30  # Back to 30 second updates
            
            # Restore database operations
            if hasattr(self.bot, 'db_operations_per_minute'):
                self.bot.db_operations_per_minute = 60  # Normal database load
            
            self.bot.add_log("✅ Normal bot activity restored")
            
        except Exception as e:
            self.bot.add_error(f"Failed to restore bot activity: {e}")
    
    async def optimize_resources(self):
        """Continuously optimize resources for RTX 5070 Ti gaming"""
        while self.optimization_active:
            try:
                # Set process priority to below normal for gaming compatibility
                try:
                    process = psutil.Process()
                    if process.nice() != 10:  # Below normal priority
                        process.nice(10)
                except:
                    pass
                
                # Optimize memory usage
                await self.optimize_memory()
                
                # Check for resource-heavy operations
                await self.monitor_resource_usage()
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.bot.add_error(f"Resource optimization error: {e}")
                await asyncio.sleep(60)
    
    async def optimize_memory(self):
        """Optimize memory usage for gaming"""
        try:
            import gc
            
            # Run garbage collection if memory usage is high
            memory = psutil.virtual_memory()
            if memory.percent > self.memory_threshold:
                gc.collect()
                self.bot.add_log(f"🧹 Memory cleanup: {memory.percent:.1f}% → {psutil.virtual_memory().percent:.1f}%")
                
        except Exception as e:
            self.bot.add_error(f"Memory optimization error: {e}")
    
    async def monitor_resource_usage(self):
        """Monitor for resource-heavy operations that might impact gaming"""
        try:
            process = psutil.Process()
            
            # Check for high I/O operations
            io_counters = process.io_counters()
            if hasattr(self, '_last_io_check'):
                read_delta = io_counters.read_bytes - self._last_io_read
                write_delta = io_counters.write_bytes - self._last_io_write
                
                # If high I/O detected (>50MB/s), warn about gaming impact
                if (read_delta + write_delta) > 50 * 1024 * 1024:  # 50 MB
                    self.bot.add_log("⚠️ High I/O detected - potential gaming impact")
            
            self._last_io_read = io_counters.read_bytes
            self._last_io_write = io_counters.write_bytes
            self._last_io_check = time.time()
            
        except Exception as e:
            pass  # Non-critical monitoring
    
    def get_performance_stats(self) -> Dict:
        """Get current performance statistics"""
        if not self.performance_data:
            return {
                'status': 'no_data',
                'message': 'Performance monitoring not active'
            }
        
        latest = self.performance_data[-1]
        
        # Calculate averages over last 10 samples
        recent_samples = self.performance_data[-10:]
        avg_cpu = sum(s['cpu_percent'] for s in recent_samples) / len(recent_samples)
        avg_memory = sum(s['memory_percent'] for s in recent_samples) / len(recent_samples)
        
        gaming_impact = "ZERO" if avg_cpu < self.cpu_threshold else "POTENTIAL"
        
        return {
            'status': 'active' if self.monitoring_active else 'inactive',
            'current_cpu': latest['cpu_percent'],
            'current_memory': latest['memory_percent'],
            'average_cpu': round(avg_cpu, 1),
            'average_memory': round(avg_memory, 1),
            'gaming_impact': gaming_impact,
            'optimization_active': self.optimization_active,
            'gpu_load': latest.get('gpu_load', 0),
            'gpu_memory': latest.get('gpu_memory_used', 0),
            'gpu_temperature': latest.get('gpu_temperature', 0),
            'samples_collected': len(self.performance_data)
        }

def setup_production_optimizer(bot):
    """Initialize RTX 5070 Ti optimized production system"""
    try:
        optimizer = ProductionOptimizer(bot)
        bot.production_optimizer = optimizer
        
        # Start optimization
        asyncio.create_task(optimizer.start_optimization())
        
        bot.add_log("🎮 RTX 5070 Ti Production Optimizer initialized")
        bot.add_log("⚡ Gaming performance protection: ENABLED")
        
        return optimizer
        
    except Exception as e:
        bot.add_error(f"Production optimizer setup failed: {e}")
        return None