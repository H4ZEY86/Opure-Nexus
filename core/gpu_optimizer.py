# core/gpu_optimizer.py - RTX 5070 Ti Optimization for Multi-AI System

import asyncio
import logging
import time
import psutil
import threading
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
import subprocess
import os

try:
    import GPUtil
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False
    logging.warning("GPUtil not available - GPU monitoring limited")

try:
    import nvidia_ml_py3 as nvml
    NVML_AVAILABLE = True
    nvml.nvmlInit()
except ImportError:
    NVML_AVAILABLE = False
    logging.warning("nvidia-ml-py not available - advanced GPU features disabled")

logger = logging.getLogger(__name__)

class ModelPriority(Enum):
    CRITICAL = 1    # Always keep in memory (Core)
    HIGH = 2        # High priority (Music, Adventure)
    MEDIUM = 3      # Medium priority (Economy, Social)
    LOW = 4         # Low priority (Analytics, Memory)

class GPUMemoryTier(Enum):
    VRAM_PRIMARY = "vram_primary"      # Fast VRAM (highest priority models)
    VRAM_SECONDARY = "vram_secondary"  # VRAM for secondary models
    SYSTEM_RAM = "system_ram"          # System RAM backup
    DISK_CACHE = "disk_cache"          # Disk-based caching

@dataclass
class ModelResourceProfile:
    """Resource profile for each AI model"""
    model_name: str
    priority: ModelPriority
    estimated_vram_mb: int
    estimated_system_ram_mb: int
    min_vram_mb: int
    load_time_estimate: float
    inference_time_avg: float
    context_window_size: int
    parameters_approx: int  # Approximate parameter count
    
@dataclass
class GPUMetrics:
    """Real-time GPU metrics"""
    gpu_utilization: float
    memory_used_mb: float
    memory_total_mb: float
    memory_free_mb: float
    temperature: float
    power_draw: float
    fan_speed: float
    clock_speed: int
    memory_clock: int

class RTX5070TiOptimizer:
    """Specialized optimizer for RTX 5070 Ti with 16GB VRAM"""
    
    def __init__(self):
        # RTX 5070 Ti specifications
        self.total_vram_mb = 16384  # 16GB VRAM
        self.safe_vram_limit_mb = 14336  # 88% of total (safe operating range)
        self.critical_vram_limit_mb = 15360  # 94% of total (emergency limit)
        
        self.system_ram_gb = psutil.virtual_memory().total // (1024**3)
        self.gpu_metrics = None
        self.monitoring_active = False
        
        # Model resource profiles (estimated for Mistral-based models)
        self.model_profiles = {
            "opure-core": ModelResourceProfile(
                model_name="opure-core",
                priority=ModelPriority.CRITICAL,
                estimated_vram_mb=2048,  # Always loaded
                estimated_system_ram_mb=1024,
                min_vram_mb=1536,
                load_time_estimate=15.0,
                inference_time_avg=0.3,
                context_window_size=4096,
                parameters_approx=7_000_000_000
            ),
            "opure-music": ModelResourceProfile(
                model_name="opure-music",
                priority=ModelPriority.HIGH,
                estimated_vram_mb=2048,
                estimated_system_ram_mb=1024,
                min_vram_mb=1536,
                load_time_estimate=12.0,
                inference_time_avg=0.4,
                context_window_size=6144,
                parameters_approx=7_000_000_000
            ),
            "opure-adventure": ModelResourceProfile(
                model_name="opure-adventure",
                priority=ModelPriority.HIGH,
                estimated_vram_mb=2304,  # Larger context for stories
                estimated_system_ram_mb=1024,
                min_vram_mb=1792,
                load_time_estimate=14.0,
                inference_time_avg=0.6,
                context_window_size=8192,
                parameters_approx=7_000_000_000
            ),
            "opure-economy": ModelResourceProfile(
                model_name="opure-economy",
                priority=ModelPriority.MEDIUM,
                estimated_vram_mb=1792,
                estimated_system_ram_mb=768,
                min_vram_mb=1280,
                load_time_estimate=10.0,
                inference_time_avg=0.5,
                context_window_size=6144,
                parameters_approx=7_000_000_000
            ),
            "opure-social": ModelResourceProfile(
                model_name="opure-social",
                priority=ModelPriority.MEDIUM,
                estimated_vram_mb=1792,
                estimated_system_ram_mb=768,
                min_vram_mb=1280,
                load_time_estimate=10.0,
                inference_time_avg=0.4,
                context_window_size=5120,
                parameters_approx=7_000_000_000
            ),
            "opure-analytics": ModelResourceProfile(
                model_name="opure-analytics",
                priority=ModelPriority.LOW,
                estimated_vram_mb=1536,
                estimated_system_ram_mb=1024,
                min_vram_mb=1024,
                load_time_estimate=8.0,
                inference_time_avg=0.6,
                context_window_size=7168,
                parameters_approx=7_000_000_000
            ),
            "opure-memory": ModelResourceProfile(
                model_name="opure-memory",
                priority=ModelPriority.LOW,
                estimated_vram_mb=1536,
                estimated_system_ram_mb=768,
                min_vram_mb=1024,
                load_time_estimate=8.0,
                inference_time_avg=0.5,
                context_window_size=8192,
                parameters_approx=7_000_000_000
            )
        }
        
        # Current model allocation
        self.loaded_models = {}  # model_name -> allocation_info
        self.allocation_history = []
        self.performance_metrics = {}
        
        self.lock = threading.RLock()
        
    async def start_monitoring(self):
        """Start GPU monitoring"""
        if self.monitoring_active:
            return
            
        self.monitoring_active = True
        asyncio.create_task(self._monitoring_loop())
        logger.info("RTX 5070 Ti monitoring started")
        
    async def stop_monitoring(self):
        """Stop GPU monitoring"""
        self.monitoring_active = False
        logger.info("RTX 5070 Ti monitoring stopped")
        
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                self.gpu_metrics = await self._collect_gpu_metrics()
                
                # Check for memory pressure
                if self.gpu_metrics.memory_used_mb > self.safe_vram_limit_mb:
                    await self._handle_memory_pressure()
                    
                # Update performance metrics
                await self._update_performance_metrics()
                
                await asyncio.sleep(5)  # Monitor every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in GPU monitoring loop: {e}")
                await asyncio.sleep(10)
                
    async def _collect_gpu_metrics(self) -> GPUMetrics:
        """Collect current GPU metrics"""
        try:
            if GPU_AVAILABLE:
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # RTX 5070 Ti
                    return GPUMetrics(
                        gpu_utilization=gpu.load * 100,
                        memory_used_mb=gpu.memoryUsed,
                        memory_total_mb=gpu.memoryTotal,
                        memory_free_mb=gpu.memoryFree,
                        temperature=gpu.temperature,
                        power_draw=0,  # Not available in GPUtil
                        fan_speed=0,   # Not available in GPUtil
                        clock_speed=0, # Not available in GPUtil
                        memory_clock=0 # Not available in GPUtil
                    )
                    
            elif NVML_AVAILABLE:
                handle = nvml.nvmlDeviceGetHandleByIndex(0)
                
                # Memory info
                memory_info = nvml.nvmlDeviceGetMemoryInfo(handle)
                
                # GPU utilization
                try:
                    util = nvml.nvmlDeviceGetUtilizationRates(handle)
                    gpu_util = util.gpu
                except:
                    gpu_util = 0
                    
                # Temperature
                try:
                    temp = nvml.nvmlDeviceGetTemperature(handle, nvml.NVML_TEMPERATURE_GPU)
                except:
                    temp = 0
                    
                # Power
                try:
                    power = nvml.nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert to watts
                except:
                    power = 0
                    
                return GPUMetrics(
                    gpu_utilization=gpu_util,
                    memory_used_mb=memory_info.used // (1024 * 1024),
                    memory_total_mb=memory_info.total // (1024 * 1024),
                    memory_free_mb=memory_info.free // (1024 * 1024),
                    temperature=temp,
                    power_draw=power,
                    fan_speed=0,
                    clock_speed=0,
                    memory_clock=0
                )
        except Exception as e:
            logger.error(f"Error collecting GPU metrics: {e}")
            
        # Fallback metrics
        return GPUMetrics(
            gpu_utilization=0,
            memory_used_mb=0,
            memory_total_mb=self.total_vram_mb,
            memory_free_mb=self.total_vram_mb,
            temperature=0,
            power_draw=0,
            fan_speed=0,
            clock_speed=0,
            memory_clock=0
        )
        
    def calculate_optimal_allocation(self, requested_models: List[str]) -> Dict[str, str]:
        """Calculate optimal model allocation strategy"""
        
        allocation = {}
        
        # Sort models by priority
        model_priority_list = []
        for model_name in requested_models:
            if model_name in self.model_profiles:
                profile = self.model_profiles[model_name]
                model_priority_list.append((profile.priority.value, model_name, profile))
                
        model_priority_list.sort()  # Sort by priority (lower number = higher priority)
        
        # Calculate allocations
        current_vram_usage = 0
        current_system_ram_usage = 0
        
        for priority, model_name, profile in model_priority_list:
            # Check if model can fit in VRAM
            if current_vram_usage + profile.estimated_vram_mb <= self.safe_vram_limit_mb:
                allocation[model_name] = GPUMemoryTier.VRAM_PRIMARY.value
                current_vram_usage += profile.estimated_vram_mb
                
            elif current_vram_usage + profile.min_vram_mb <= self.critical_vram_limit_mb:
                allocation[model_name] = GPUMemoryTier.VRAM_SECONDARY.value
                current_vram_usage += profile.min_vram_mb
                
            else:
                # Use system RAM or disk cache
                available_ram_gb = (psutil.virtual_memory().available // (1024**3))
                required_ram_gb = profile.estimated_system_ram_mb / 1024
                
                if available_ram_gb > required_ram_gb + 4:  # Keep 4GB free
                    allocation[model_name] = GPUMemoryTier.SYSTEM_RAM.value
                    current_system_ram_usage += profile.estimated_system_ram_mb
                else:
                    allocation[model_name] = GPUMemoryTier.DISK_CACHE.value
                    
        return allocation
        
    async def optimize_for_workload(self, workload_type: str, expected_models: List[str]) -> Dict[str, any]:
        """Optimize GPU allocation for specific workload"""
        
        optimization_strategies = {
            "gaming_session": {
                "vram_reservation": 2048,  # Reserve 2GB for game
                "max_concurrent_models": 2,
                "priority_boost": ["opure-core", "opure-social"]
            },
            "music_focus": {
                "vram_reservation": 512,
                "max_concurrent_models": 3,
                "priority_boost": ["opure-core", "opure-music", "opure-social"]
            },
            "adventure_session": {
                "vram_reservation": 1024,
                "max_concurrent_models": 3,
                "priority_boost": ["opure-core", "opure-adventure", "opure-memory"]
            },
            "analytics_heavy": {
                "vram_reservation": 1024,
                "max_concurrent_models": 4,
                "priority_boost": ["opure-core", "opure-analytics", "opure-memory"]
            },
            "balanced": {
                "vram_reservation": 1024,
                "max_concurrent_models": 3,
                "priority_boost": ["opure-core"]
            }
        }
        
        strategy = optimization_strategies.get(workload_type, optimization_strategies["balanced"])
        
        # Adjust VRAM limits based on strategy
        adjusted_safe_limit = self.safe_vram_limit_mb - strategy["vram_reservation"]
        
        # Calculate allocation with adjusted limits
        allocation = {}
        current_vram = 0
        loaded_count = 0
        
        # Prioritize models based on strategy
        prioritized_models = []
        boost_models = strategy["priority_boost"]
        
        for model in expected_models:
            if model in boost_models:
                prioritized_models.insert(0, model)
            else:
                prioritized_models.append(model)
                
        for model_name in prioritized_models:
            if loaded_count >= strategy["max_concurrent_models"]:
                allocation[model_name] = GPUMemoryTier.DISK_CACHE.value
                continue
                
            profile = self.model_profiles.get(model_name)
            if not profile:
                continue
                
            if current_vram + profile.estimated_vram_mb <= adjusted_safe_limit:
                allocation[model_name] = GPUMemoryTier.VRAM_PRIMARY.value
                current_vram += profile.estimated_vram_mb
                loaded_count += 1
            else:
                allocation[model_name] = GPUMemoryTier.SYSTEM_RAM.value
                
        return {
            "allocation": allocation,
            "strategy": strategy,
            "estimated_vram_usage": current_vram,
            "reserved_vram": strategy["vram_reservation"]
        }
        
    async def _handle_memory_pressure(self):
        """Handle GPU memory pressure situations"""
        logger.warning(f"GPU memory pressure detected: {self.gpu_metrics.memory_used_mb}MB used")
        
        # Find least important loaded model to unload
        unload_candidates = []
        
        for model_name, allocation_info in self.loaded_models.items():
            if allocation_info["tier"] in [GPUMemoryTier.VRAM_PRIMARY.value, GPUMemoryTier.VRAM_SECONDARY.value]:
                profile = self.model_profiles[model_name]
                last_used = allocation_info.get("last_used", 0)
                
                # Score for unloading (higher = more likely to unload)
                unload_score = (
                    profile.priority.value * 2 +  # Priority (higher priority = lower score)
                    (time.time() - last_used) / 3600 +  # Hours since last use
                    profile.estimated_vram_mb / 1024  # VRAM usage in GB
                )
                
                unload_candidates.append((unload_score, model_name))
                
        if unload_candidates:
            # Sort by unload score (highest first)
            unload_candidates.sort(reverse=True)
            
            # Unload the highest scoring model
            model_to_unload = unload_candidates[0][1]
            await self._unload_model(model_to_unload)
            
    async def _unload_model(self, model_name: str):
        """Unload a model from GPU memory"""
        try:
            if model_name in self.loaded_models:
                # Move to system RAM or disk cache
                profile = self.model_profiles[model_name]
                
                if psutil.virtual_memory().available > profile.estimated_system_ram_mb * 1024 * 1024 * 2:
                    new_tier = GPUMemoryTier.SYSTEM_RAM.value
                else:
                    new_tier = GPUMemoryTier.DISK_CACHE.value
                    
                self.loaded_models[model_name]["tier"] = new_tier
                self.loaded_models[model_name]["unloaded_at"] = time.time()
                
                logger.info(f"Moved model {model_name} to {new_tier}")
                
        except Exception as e:
            logger.error(f"Error unloading model {model_name}: {e}")
            
    async def _update_performance_metrics(self):
        """Update performance metrics"""
        if not self.gpu_metrics:
            return
            
        current_time = time.time()
        
        # Store historical metrics
        self.performance_metrics[current_time] = {
            "gpu_utilization": self.gpu_metrics.gpu_utilization,
            "memory_used_mb": self.gpu_metrics.memory_used_mb,
            "temperature": self.gpu_metrics.temperature,
            "loaded_models": list(self.loaded_models.keys())
        }
        
        # Keep only last hour of metrics
        cutoff_time = current_time - 3600
        self.performance_metrics = {
            t: metrics for t, metrics in self.performance_metrics.items() 
            if t > cutoff_time
        }
        
    def get_optimization_recommendations(self) -> Dict[str, any]:
        """Get optimization recommendations based on current state"""
        recommendations = {
            "status": "optimal",
            "suggestions": [],
            "warnings": [],
            "optimizations": []
        }
        
        if not self.gpu_metrics:
            recommendations["warnings"].append("GPU metrics not available")
            return recommendations
            
        # Memory usage analysis
        memory_usage_percent = (self.gpu_metrics.memory_used_mb / self.gpu_metrics.memory_total_mb) * 100
        
        if memory_usage_percent > 90:
            recommendations["status"] = "critical"
            recommendations["warnings"].append(f"High VRAM usage: {memory_usage_percent:.1f}%")
            recommendations["optimizations"].append("Consider unloading low-priority models")
            
        elif memory_usage_percent > 75:
            recommendations["status"] = "warning"
            recommendations["suggestions"].append(f"Moderate VRAM usage: {memory_usage_percent:.1f}%")
            recommendations["optimizations"].append("Monitor for memory pressure")
            
        # Temperature analysis
        if self.gpu_metrics.temperature > 80:
            recommendations["warnings"].append(f"High GPU temperature: {self.gpu_metrics.temperature}°C")
            recommendations["optimizations"].append("Consider reducing concurrent models")
            
        # Performance analysis
        if len(self.performance_metrics) > 10:
            recent_metrics = list(self.performance_metrics.values())[-10:]
            avg_utilization = sum(m["gpu_utilization"] for m in recent_metrics) / len(recent_metrics)
            
            if avg_utilization < 30:
                recommendations["suggestions"].append("Low GPU utilization - models may be underutilized")
                recommendations["optimizations"].append("Consider loading additional models")
                
        return recommendations
        
    def get_status_report(self) -> Dict[str, any]:
        """Get comprehensive status report"""
        return {
            "gpu_metrics": {
                "utilization": self.gpu_metrics.gpu_utilization if self.gpu_metrics else 0,
                "memory_used_mb": self.gpu_metrics.memory_used_mb if self.gpu_metrics else 0,
                "memory_total_mb": self.total_vram_mb,
                "memory_usage_percent": (self.gpu_metrics.memory_used_mb / self.total_vram_mb * 100) if self.gpu_metrics else 0,
                "temperature": self.gpu_metrics.temperature if self.gpu_metrics else 0
            },
            "loaded_models": self.loaded_models,
            "model_profiles": {name: {
                "priority": profile.priority.name,
                "estimated_vram_mb": profile.estimated_vram_mb,
                "load_time_estimate": profile.load_time_estimate
            } for name, profile in self.model_profiles.items()},
            "optimization_recommendations": self.get_optimization_recommendations(),
            "system_info": {
                "total_vram_mb": self.total_vram_mb,
                "safe_vram_limit_mb": self.safe_vram_limit_mb,
                "system_ram_gb": self.system_ram_gb,
                "cpu_usage": psutil.cpu_percent(),
                "system_ram_usage": psutil.virtual_memory().percent
            }
        }

# Global optimizer instance
gpu_optimizer = None

def get_gpu_optimizer() -> RTX5070TiOptimizer:
    """Get global GPU optimizer instance"""
    global gpu_optimizer
    if gpu_optimizer is None:
        gpu_optimizer = RTX5070TiOptimizer()
    return gpu_optimizer