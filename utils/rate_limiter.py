# utils/rate_limiter.py
# Advanced Rate Limiting System for Opure.bot

import time
import asyncio
from collections import defaultdict
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging

@dataclass
class RateLimit:
    max_requests: int
    window_seconds: int
    burst_limit: Optional[int] = None  # Allow burst above normal limit

class AdvancedRateLimiter:
    """
    Advanced rate limiter with different limits per operation type
    Scottish Opure doesn't appreciate spam, ken!
    """
    
    def __init__(self):
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.warnings: Dict[str, int] = defaultdict(int)
        
        # Rate limits for different operations
        self.limits = {
            # Music operations
            "music_queue": RateLimit(10, 60, burst_limit=15),    # 10 per minute, burst 15
            "music_skip": RateLimit(5, 30),                      # 5 skips per 30 seconds
            "playlist_import": RateLimit(2, 300),                # 2 playlists per 5 minutes
            
            # AI operations (expensive)
            "ai_achievement": RateLimit(20, 60),                 # 20 AI calls per minute
            "ai_quest": RateLimit(5, 86400),                     # 5 quest generations per day
            "ai_response": RateLimit(30, 60),                    # 30 AI responses per minute
            
            # Game operations
            "game_start": RateLimit(3, 300),                     # 3 games per 5 minutes
            "game_action": RateLimit(60, 60),                    # 60 actions per minute
            
            # Economy operations
            "shop_purchase": RateLimit(10, 60),                  # 10 purchases per minute
            "daily_claim": RateLimit(1, 86400),                  # 1 daily claim per day
            
            # Admin operations
            "admin_command": RateLimit(20, 60),                  # 20 admin commands per minute
            "gpu_optimization": RateLimit(3, 300),               # 3 GPU optimizations per 5 minutes
            
            # General commands
            "general_command": RateLimit(60, 60, burst_limit=100) # 60 per minute, burst 100
        }
    
    def _get_key(self, user_id: int, operation: str) -> str:
        """Generate unique key for user-operation combination"""
        return f"{user_id}_{operation}"
    
    def _cleanup_old_requests(self, key: str, window_seconds: int):
        """Remove requests outside the current time window"""
        now = time.time()
        self.requests[key] = [
            req_time for req_time in self.requests[key] 
            if now - req_time < window_seconds
        ]
    
    def is_allowed(self, user_id: int, operation: str, bypass_admin: bool = False) -> tuple[bool, str]:
        """
        Check if user is allowed to perform operation
        Returns (allowed: bool, message: str)
        """
        # Admin bypass
        if bypass_admin:
            return True, "Admin bypass enabled"
        
        # Get rate limit for operation
        limit = self.limits.get(operation, self.limits["general_command"])
        key = self._get_key(user_id, operation)
        
        # Clean up old requests
        self._cleanup_old_requests(key, limit.window_seconds)
        
        current_requests = len(self.requests[key])
        
        # Check burst limit first
        if limit.burst_limit and current_requests >= limit.burst_limit:
            self.warnings[key] += 1
            return False, f"Aye, slow down there! Burst limit exceeded ({limit.burst_limit} requests). That's pure mental usage!"
        
        # Check normal limit
        if current_requests >= limit.max_requests:
            self.warnings[key] += 1
            
            # Scottish Opure gets progressively more annoyed
            if self.warnings[key] <= 3:
                return False, f"Slow down, pal! {limit.max_requests} {operation.replace('_', ' ')} requests per {limit.window_seconds} seconds. Rangers didn't win by rushing!"
            elif self.warnings[key] <= 10:
                return False, f"Oi! You're being pure mental with the {operation.replace('_', ' ')} requests! Give it a rest, will ye?"
            else:
                return False, f"Right, that's enough! You're being banned from {operation.replace('_', ' ')} for a bit. Even Celtic fans have more patience than this!"
        
        # Allow the request
        self.requests[key].append(time.time())
        
        # Reset warnings on successful request
        if key in self.warnings:
            self.warnings[key] = max(0, self.warnings[key] - 1)
        
        return True, "Request allowed"
    
    def get_remaining_requests(self, user_id: int, operation: str) -> int:
        """Get remaining requests for user in current window"""
        limit = self.limits.get(operation, self.limits["general_command"])
        key = self._get_key(user_id, operation)
        
        self._cleanup_old_requests(key, limit.window_seconds)
        current_requests = len(self.requests[key])
        
        return max(0, limit.max_requests - current_requests)
    
    def get_reset_time(self, user_id: int, operation: str) -> float:
        """Get time until rate limit resets"""
        limit = self.limits.get(operation, self.limits["general_command"])
        key = self._get_key(user_id, operation)
        
        if not self.requests[key]:
            return 0
        
        oldest_request = min(self.requests[key])
        return max(0, (oldest_request + limit.window_seconds) - time.time())
    
    def get_user_stats(self, user_id: int) -> Dict[str, Dict]:
        """Get comprehensive rate limit stats for user"""
        stats = {}
        
        for operation, limit in self.limits.items():
            key = self._get_key(user_id, operation)
            self._cleanup_old_requests(key, limit.window_seconds)
            
            current_requests = len(self.requests[key])
            remaining = max(0, limit.max_requests - current_requests)
            reset_time = self.get_reset_time(user_id, operation)
            
            stats[operation] = {
                "current_requests": current_requests,
                "max_requests": limit.max_requests,
                "remaining": remaining,
                "window_seconds": limit.window_seconds,
                "reset_in_seconds": reset_time,
                "warnings": self.warnings.get(key, 0)
            }
        
        return stats
    
    async def cleanup_old_data(self):
        """Periodic cleanup of old rate limit data"""
        now = time.time()
        keys_to_remove = []
        
        for key, timestamps in self.requests.items():
            # Remove timestamps older than 24 hours
            recent_timestamps = [ts for ts in timestamps if now - ts < 86400]
            
            if recent_timestamps:
                self.requests[key] = recent_timestamps
            else:
                keys_to_remove.append(key)
        
        # Remove empty entries
        for key in keys_to_remove:
            del self.requests[key]
            if key in self.warnings:
                del self.warnings[key]
        
        logging.info(f"Rate limiter cleanup: removed {len(keys_to_remove)} old entries")

# Global rate limiter instance
rate_limiter = AdvancedRateLimiter()

# Decorator for easy rate limiting
def rate_limit(operation: str, bypass_admin: bool = False):
    """
    Decorator to add rate limiting to Discord commands
    Usage: @rate_limit("music_queue")
    """
    def decorator(func):
        async def wrapper(self, interaction, *args, **kwargs):
            user_id = interaction.user.id
            
            # Check if user is admin for bypass
            is_admin = bypass_admin and interaction.user.guild_permissions.administrator
            
            allowed, message = rate_limiter.is_allowed(user_id, operation, is_admin)
            
            if not allowed:
                return await interaction.response.send_message(f"⚠️ {message}", ephemeral=True)
            
            return await func(self, interaction, *args, **kwargs)
        return wrapper
    return decorator