# core/monitoring.py
# Comprehensive Monitoring Dashboard for Opure.bot

import asyncio
import psutil
import time
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json
import discord
from collections import deque, defaultdict

@dataclass
class SystemMetrics:
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    network_sent_mb: float
    network_recv_mb: float
    active_connections: int
    discord_latency: float

@dataclass
class BotMetrics:
    timestamp: float
    guilds_count: int
    users_count: int
    active_music_instances: int
    commands_per_minute: int
    errors_per_minute: int
    ai_requests_per_minute: int
    database_queries_per_minute: int
    cache_hit_rate: float
    avg_response_time: float
    juice_wrld_plays_today: int

@dataclass
class PerformanceAlert:
    id: str
    type: str  # "warning", "critical", "info"
    title: str
    description: str
    timestamp: float
    resolved: bool = False
    resolve_time: Optional[float] = None

class OpureMonitoringDashboard:
    """
    Comprehensive monitoring system for Opure.bot
    Tracks everything from system resources to Juice WRLD play counts!
    Pure dead brilliant monitoring, ken!
    """
    
    def __init__(self, bot, max_history: int = 1440):  # 24 hours of minute data
        self.bot = bot
        self.max_history = max_history
        self.running = False
        
        # Metrics storage
        self.system_metrics: deque = deque(maxlen=max_history)
        self.bot_metrics: deque = deque(maxlen=max_history)
        self.alerts: List[PerformanceAlert] = []
        
        # Real-time counters
        self.command_counter = defaultdict(int)
        self.error_counter = defaultdict(int)
        self.ai_request_counter = defaultdict(int)
        self.db_query_counter = defaultdict(int)
        self.response_times = deque(maxlen=100)
        
        # Network baseline
        self.network_baseline = None
        
        # Alert thresholds
        self.thresholds = {
            "cpu_warning": 70.0,
            "cpu_critical": 90.0,
            "memory_warning": 80.0,
            "memory_critical": 95.0,
            "disk_warning": 85.0,
            "disk_critical": 95.0,
            "response_time_warning": 2.0,
            "response_time_critical": 5.0,
            "error_rate_warning": 10,  # errors per minute
            "error_rate_critical": 30
        }
        
        # Tasks
        self.monitoring_task = None
        self.alert_task = None
        
    async def start(self):
        """Start the monitoring system"""
        if self.running:
            return
        
        self.running = True
        self.network_baseline = psutil.net_io_counters()
        
        # Start monitoring tasks
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        self.alert_task = asyncio.create_task(self._alert_loop())
        
        logging.info("📊 Monitoring dashboard started")
    
    async def stop(self):
        """Stop the monitoring system"""
        self.running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
        if self.alert_task:
            self.alert_task.cancel()
        
        logging.info("📊 Monitoring dashboard stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop - collects metrics every minute"""
        while self.running:
            try:
                # Collect system metrics
                system_metrics = await self._collect_system_metrics()
                self.system_metrics.append(system_metrics)
                
                # Collect bot metrics
                bot_metrics = await self._collect_bot_metrics()
                self.bot_metrics.append(bot_metrics)
                
                # Reset per-minute counters
                current_minute = int(time.time() // 60)
                self._reset_minute_counters(current_minute)
                
                await asyncio.sleep(60)  # Collect every minute
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(60)
    
    async def _alert_loop(self):
        """Alert checking loop - runs every 30 seconds"""
        while self.running:
            try:
                await self._check_alerts()
                await asyncio.sleep(30)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Alert loop error: {e}")
                await asyncio.sleep(30)
    
    async def _collect_system_metrics(self) -> SystemMetrics:
        """Collect system resource metrics"""
        # CPU and Memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        # Disk
        disk = psutil.disk_usage('/')
        
        # Network
        network = psutil.net_io_counters()
        network_sent_mb = 0
        network_recv_mb = 0
        
        if self.network_baseline:
            network_sent_mb = (network.bytes_sent - self.network_baseline.bytes_sent) / 1024 / 1024
            network_recv_mb = (network.bytes_recv - self.network_baseline.bytes_recv) / 1024 / 1024
        
        # Discord latency
        discord_latency = self.bot.latency * 1000 if self.bot.latency else 0
        
        return SystemMetrics(
            timestamp=time.time(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_gb=memory.used / 1024**3,
            memory_total_gb=memory.total / 1024**3,
            disk_percent=disk.percent,
            disk_used_gb=disk.used / 1024**3,
            disk_total_gb=disk.total / 1024**3,
            network_sent_mb=network_sent_mb,
            network_recv_mb=network_recv_mb,
            active_connections=len(psutil.net_connections()),
            discord_latency=discord_latency
        )
    
    async def _collect_bot_metrics(self) -> BotMetrics:
        """Collect bot-specific metrics"""
        # Basic bot stats
        guilds_count = len(self.bot.guilds)
        users_count = len(self.bot.users)
        
        # Music instances
        music_cog = self.bot.get_cog('music')
        active_music_instances = len(music_cog.instances) if music_cog else 0
        
        # Per-minute counters
        current_minute = int(time.time() // 60)
        commands_per_minute = self.command_counter.get(current_minute, 0)
        errors_per_minute = self.error_counter.get(current_minute, 0)
        ai_requests_per_minute = self.ai_request_counter.get(current_minute, 0)
        db_queries_per_minute = self.db_query_counter.get(current_minute, 0)
        
        # Response time
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        
        # Cache hit rate
        cache_hit_rate = 0.0
        if hasattr(self.bot, 'db') and hasattr(self.bot.db, 'pool'):
            stats = self.bot.db.pool.get_stats()
            total_requests = stats.cache_hits + stats.cache_misses
            cache_hit_rate = (stats.cache_hits / total_requests * 100) if total_requests > 0 else 0
        
        # Juice WRLD plays today
        juice_wrld_plays_today = await self._get_juice_plays_today()
        
        return BotMetrics(
            timestamp=time.time(),
            guilds_count=guilds_count,
            users_count=users_count,
            active_music_instances=active_music_instances,
            commands_per_minute=commands_per_minute,
            errors_per_minute=errors_per_minute,
            ai_requests_per_minute=ai_requests_per_minute,
            database_queries_per_minute=db_queries_per_minute,
            cache_hit_rate=cache_hit_rate,
            avg_response_time=avg_response_time,
            juice_wrld_plays_today=juice_wrld_plays_today
        )
    
    async def _get_juice_plays_today(self) -> int:
        """Get today's Juice WRLD play count"""
        try:
            if hasattr(self.bot, 'db'):
                cursor = await self.bot.db.execute("""
                    SELECT SUM(juice_wrld_tracks_played) 
                    FROM user_stats 
                    WHERE last_activity >= date('now')
                """)
                result = await cursor.fetchone()
                return result[0] if result and result[0] else 0
        except:
            pass
        return 0
    
    def _reset_minute_counters(self, current_minute: int):
        """Reset counters for minutes older than 5 minutes"""
        cutoff = current_minute - 5
        
        for minute in list(self.command_counter.keys()):
            if minute < cutoff:
                del self.command_counter[minute]
        
        for minute in list(self.error_counter.keys()):
            if minute < cutoff:
                del self.error_counter[minute]
        
        for minute in list(self.ai_request_counter.keys()):
            if minute < cutoff:
                del self.ai_request_counter[minute]
        
        for minute in list(self.db_query_counter.keys()):
            if minute < cutoff:
                del self.db_query_counter[minute]
    
    async def _check_alerts(self):
        """Check for alert conditions"""
        if not self.system_metrics or not self.bot_metrics:
            return
        
        latest_system = self.system_metrics[-1]
        latest_bot = self.bot_metrics[-1]
        
        # Check system alerts
        await self._check_system_alerts(latest_system)
        
        # Check bot alerts
        await self._check_bot_alerts(latest_bot)
        
        # Clean up old alerts
        self._cleanup_old_alerts()
    
    async def _check_system_alerts(self, metrics: SystemMetrics):
        """Check for system resource alerts"""
        # CPU alerts
        if metrics.cpu_percent >= self.thresholds["cpu_critical"]:
            await self._create_alert(
                "system_cpu_critical",
                "critical",
                "🔥 Critical CPU Usage",
                f"CPU usage at {metrics.cpu_percent:.1f}% - that's pure mental load!"
            )
        elif metrics.cpu_percent >= self.thresholds["cpu_warning"]:
            await self._create_alert(
                "system_cpu_warning",
                "warning",
                "⚠️ High CPU Usage",
                f"CPU usage at {metrics.cpu_percent:.1f}% - getting a bit stressed, ken!"
            )
        
        # Memory alerts
        if metrics.memory_percent >= self.thresholds["memory_critical"]:
            await self._create_alert(
                "system_memory_critical",
                "critical",
                "🔥 Critical Memory Usage",
                f"Memory usage at {metrics.memory_percent:.1f}% - need more RAM than Rangers need goals!"
            )
        elif metrics.memory_percent >= self.thresholds["memory_warning"]:
            await self._create_alert(
                "system_memory_warning",
                "warning",
                "⚠️ High Memory Usage",
                f"Memory usage at {metrics.memory_percent:.1f}% - getting full up here!"
            )
        
        # Disk alerts
        if metrics.disk_percent >= self.thresholds["disk_critical"]:
            await self._create_alert(
                "system_disk_critical",
                "critical",
                "🔥 Critical Disk Usage",
                f"Disk usage at {metrics.disk_percent:.1f}% - running out of space faster than Celtic runs out of excuses!"
            )
        elif metrics.disk_percent >= self.thresholds["disk_warning"]:
            await self._create_alert(
                "system_disk_warning",
                "warning",
                "⚠️ High Disk Usage",
                f"Disk usage at {metrics.disk_percent:.1f}% - might need some cleanup soon!"
            )
    
    async def _check_bot_alerts(self, metrics: BotMetrics):
        """Check for bot-specific alerts"""
        # Error rate alerts
        if metrics.errors_per_minute >= self.thresholds["error_rate_critical"]:
            await self._create_alert(
                "bot_errors_critical",
                "critical",
                "🔥 Critical Error Rate",
                f"{metrics.errors_per_minute} errors per minute - something's gone pure mental!"
            )
        elif metrics.errors_per_minute >= self.thresholds["error_rate_warning"]:
            await self._create_alert(
                "bot_errors_warning",
                "warning",
                "⚠️ High Error Rate",
                f"{metrics.errors_per_minute} errors per minute - need to investigate this!"
            )
        
        # Response time alerts
        if metrics.avg_response_time >= self.thresholds["response_time_critical"]:
            await self._create_alert(
                "bot_response_critical",
                "critical",
                "🔥 Critical Response Time",
                f"Average response time {metrics.avg_response_time:.2f}s - slower than Celtic's gameplay!"
            )
        elif metrics.avg_response_time >= self.thresholds["response_time_warning"]:
            await self._create_alert(
                "bot_response_warning",
                "warning",
                "⚠️ Slow Response Time",
                f"Average response time {metrics.avg_response_time:.2f}s - getting a bit sluggish!"
            )
        
        # Special Juice WRLD milestone alerts
        if metrics.juice_wrld_plays_today > 0 and metrics.juice_wrld_plays_today % 100 == 0:
            await self._create_alert(
                f"juice_milestone_{metrics.juice_wrld_plays_today}",
                "info",
                "💜 999 Milestone!",
                f"{metrics.juice_wrld_plays_today} Juice WRLD tracks played today - legends never die!"
            )
    
    async def _create_alert(self, alert_id: str, alert_type: str, title: str, description: str):
        """Create a new alert"""
        # Check if alert already exists and is not resolved
        for alert in self.alerts:
            if alert.id == alert_id and not alert.resolved:
                return  # Alert already exists
        
        alert = PerformanceAlert(
            id=alert_id,
            type=alert_type,
            title=title,
            description=description,
            timestamp=time.time()
        )
        
        self.alerts.append(alert)
        
        # Post to Discord if critical
        if alert_type == "critical":
            await self._post_alert_to_discord(alert)
        
        logging.warning(f"📊 Alert created: {title} - {description}")
    
    async def _post_alert_to_discord(self, alert: PerformanceAlert):
        """Post critical alerts to Discord"""
        try:
            # Find admin or log channel
            for guild in self.bot.guilds:
                for channel in guild.channels:
                    if "admin" in channel.name.lower() or "log" in channel.name.lower():
                        embed = discord.Embed(
                            title=alert.title,
                            description=alert.description,
                            color=0xe74c3c if alert.type == "critical" else 0xf39c12,
                            timestamp=datetime.fromtimestamp(alert.timestamp)
                        )
                        
                        embed.add_field(
                            name="🤖 System Status",
                            value="Opure's monitoring system detected this issue",
                            inline=False
                        )
                        
                        await channel.send(embed=embed)
                        return
        except Exception as e:
            logging.error(f"Failed to post alert to Discord: {e}")
    
    def _cleanup_old_alerts(self):
        """Clean up alerts older than 24 hours"""
        cutoff_time = time.time() - 86400  # 24 hours
        self.alerts = [alert for alert in self.alerts if alert.timestamp > cutoff_time]
    
    # Public API methods
    
    def record_command(self):
        """Record a command execution"""
        current_minute = int(time.time() // 60)
        self.command_counter[current_minute] += 1
    
    def record_error(self):
        """Record an error occurrence"""
        current_minute = int(time.time() // 60)
        self.error_counter[current_minute] += 1
    
    def record_ai_request(self):
        """Record an AI request"""
        current_minute = int(time.time() // 60)
        self.ai_request_counter[current_minute] += 1
    
    def record_db_query(self):
        """Record a database query"""
        current_minute = int(time.time() // 60)
        self.db_query_counter[current_minute] += 1
    
    def record_response_time(self, response_time: float):
        """Record a response time"""
        self.response_times.append(response_time)
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current system status"""
        if not self.system_metrics or not self.bot_metrics:
            return {"status": "initializing"}
        
        latest_system = self.system_metrics[-1]
        latest_bot = self.bot_metrics[-1]
        
        # Get active alerts
        active_alerts = [alert for alert in self.alerts if not alert.resolved]
        critical_alerts = [alert for alert in active_alerts if alert.type == "critical"]
        
        # Determine overall status
        if critical_alerts:
            status = "critical"
        elif len(active_alerts) > 0:
            status = "warning"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "system": asdict(latest_system),
            "bot": asdict(latest_bot),
            "active_alerts": len(active_alerts),
            "critical_alerts": len(critical_alerts),
            "uptime": time.time() - (self.system_metrics[0].timestamp if self.system_metrics else time.time())
        }
    
    def get_historical_data(self, hours: int = 1) -> Dict[str, List]:
        """Get historical metrics data"""
        cutoff_time = time.time() - (hours * 3600)
        
        # Filter metrics within time range
        system_data = [m for m in self.system_metrics if m.timestamp > cutoff_time]
        bot_data = [m for m in self.bot_metrics if m.timestamp > cutoff_time]
        
        return {
            "system_metrics": [asdict(m) for m in system_data],
            "bot_metrics": [asdict(m) for m in bot_data],
            "time_range_hours": hours
        }
    
    def get_alerts(self, include_resolved: bool = False) -> List[Dict]:
        """Get current alerts"""
        alerts = self.alerts if include_resolved else [a for a in self.alerts if not a.resolved]
        return [asdict(alert) for alert in alerts]
    
    def resolve_alert(self, alert_id: str) -> bool:
        """Manually resolve an alert"""
        for alert in self.alerts:
            if alert.id == alert_id and not alert.resolved:
                alert.resolved = True
                alert.resolve_time = time.time()
                return True
        return False

# Global monitoring instance
monitoring = OpureMonitoringDashboard(None)  # Will be initialized with bot later