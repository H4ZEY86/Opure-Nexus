# core/music_processor.py
# Advanced Background Music Processing System

import asyncio
import yt_dlp
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum
import json
import hashlib
import os
from pathlib import Path

class ProcessingStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CACHED = "cached"

@dataclass
class MusicProcessingJob:
    id: str
    url: str
    requester_id: int
    guild_id: int
    status: ProcessingStatus
    priority: int = 1  # 1 = normal, 2 = high, 3 = urgent
    created_at: float = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Optional[Dict] = None
    error: Optional[str] = None
    callbacks: List[Callable] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()
        if self.callbacks is None:
            self.callbacks = []

class BackgroundMusicProcessor:
    """
    Advanced background music processor for Opure.bot
    Processes YouTube/music URLs without blocking the main bot
    Pure dead brilliant performance, ken!
    """
    
    def __init__(self, max_workers: int = 4, cache_size: int = 500):
        self.max_workers = max_workers
        self.cache_size = cache_size
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="MusicWorker")
        
        # Processing queues by priority
        self.high_priority_queue = asyncio.Queue()
        self.normal_priority_queue = asyncio.Queue()
        self.urgent_queue = asyncio.Queue()
        
        # Job tracking
        self.active_jobs: Dict[str, MusicProcessingJob] = {}
        self.completed_jobs: Dict[str, MusicProcessingJob] = {}
        self.cache: Dict[str, Dict] = {}
        
        # Worker tasks
        self.workers: List[asyncio.Task] = []
        self.running = False
        
        # Statistics
        self.stats = {
            "total_processed": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "failed_jobs": 0,
            "avg_processing_time": 0,
            "active_workers": 0
        }
        
        # YTDL options optimized for background processing
        self.ytdl_options = {
            'format': 'bestaudio/best',
            'noplaylist': False,
            'quiet': True,
            'no_warnings': True,
            'default_search': 'auto',
            'source_address': '0.0.0.0',
            'extract_flat': False,
            'skip_download': True,
            'socket_timeout': 30,
            'retries': 3,
            'fragment_retries': 3,
            'ignoreerrors': True,
            'no_color': True,
            'extractaudio': True,
            'audioformat': 'best',
            'prefer_ffmpeg': True,
        }
        
        self.ytdl = yt_dlp.YoutubeDL(self.ytdl_options)
        
        # Cache directory
        self.cache_dir = Path("cache/music")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    async def start(self):
        """Start the background processing workers"""
        if self.running:
            return
        
        self.running = True
        
        # Start worker tasks
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"Worker-{i}"))
            self.workers.append(worker)
        
        # Start cleanup task
        cleanup_task = asyncio.create_task(self._cleanup_task())
        self.workers.append(cleanup_task)
        
        logging.info(f"🎵 Music processor started with {self.max_workers} workers")
    
    async def stop(self):
        """Stop all workers and cleanup"""
        self.running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        
        # Shutdown executor
        self.executor.shutdown(wait=False)
        
        logging.info("🎵 Music processor stopped")
    
    def _generate_job_id(self, url: str, requester_id: int) -> str:
        """Generate unique job ID"""
        data = f"{url}_{requester_id}_{time.time()}"
        return hashlib.md5(data.encode()).hexdigest()[:12]
    
    def _get_cache_key(self, url: str) -> str:
        """Generate cache key for URL"""
        return hashlib.md5(url.encode()).hexdigest()
    
    async def queue_processing(self, url: str, requester_id: int, guild_id: int, 
                             priority: int = 1, callback: Optional[Callable] = None) -> str:
        """
        Queue a music URL for background processing
        
        Args:
            url: YouTube/music URL to process
            requester_id: Discord user ID who requested
            guild_id: Discord guild ID
            priority: 1=normal, 2=high, 3=urgent
            callback: Optional callback function when processing completes
        
        Returns:
            job_id: Unique identifier for this processing job
        """
        
        # Check cache first
        cache_key = self._get_cache_key(url)
        if cache_key in self.cache:
            self.stats["cache_hits"] += 1
            
            # Create fake job for cached result
            job_id = self._generate_job_id(url, requester_id)
            job = MusicProcessingJob(
                id=job_id,
                url=url,
                requester_id=requester_id,
                guild_id=guild_id,
                status=ProcessingStatus.CACHED,
                result=self.cache[cache_key],
                completed_at=time.time()
            )
            
            if callback:
                job.callbacks.append(callback)
                # Execute callback immediately for cached result
                try:
                    await callback(job.result, None)
                except Exception as e:
                    logging.error(f"Callback error for cached result: {e}")
            
            self.completed_jobs[job_id] = job
            return job_id
        
        self.stats["cache_misses"] += 1
        
        # Create new processing job
        job_id = self._generate_job_id(url, requester_id)
        job = MusicProcessingJob(
            id=job_id,
            url=url,
            requester_id=requester_id,
            guild_id=guild_id,
            status=ProcessingStatus.PENDING,
            priority=priority
        )
        
        if callback:
            job.callbacks.append(callback)
        
        # Add to appropriate queue based on priority
        if priority == 3:
            await self.urgent_queue.put(job)
        elif priority == 2:
            await self.high_priority_queue.put(job)
        else:
            await self.normal_priority_queue.put(job)
        
        self.active_jobs[job_id] = job
        
        logging.info(f"🎵 Queued music processing job {job_id} (priority: {priority})")
        return job_id
    
    async def _worker(self, worker_name: str):
        """Background worker that processes music jobs"""
        logging.info(f"🎵 {worker_name} started")
        
        while self.running:
            try:
                job = None
                
                # Check queues in priority order
                try:
                    job = await asyncio.wait_for(self.urgent_queue.get(), timeout=0.1)
                except asyncio.TimeoutError:
                    try:
                        job = await asyncio.wait_for(self.high_priority_queue.get(), timeout=0.1)
                    except asyncio.TimeoutError:
                        try:
                            job = await asyncio.wait_for(self.normal_priority_queue.get(), timeout=1.0)
                        except asyncio.TimeoutError:
                            continue
                
                if job is None:
                    continue
                
                self.stats["active_workers"] += 1
                await self._process_job(job, worker_name)
                self.stats["active_workers"] -= 1
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Worker {worker_name} error: {e}")
                if job:
                    await self._handle_job_error(job, str(e))
        
        logging.info(f"🎵 {worker_name} stopped")
    
    async def _process_job(self, job: MusicProcessingJob, worker_name: str):
        """Process a single music job"""
        job.status = ProcessingStatus.PROCESSING
        job.started_at = time.time()
        
        try:
            logging.info(f"🎵 {worker_name} processing {job.id}: {job.url[:50]}...")
            
            # Extract info in executor to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._extract_music_info,
                job.url
            )
            
            if result:
                job.result = result
                job.status = ProcessingStatus.COMPLETED
                job.completed_at = time.time()
                
                # Cache the result
                cache_key = self._get_cache_key(job.url)
                self.cache[cache_key] = result
                
                # Limit cache size
                if len(self.cache) > self.cache_size:
                    # Remove oldest 20% of cache
                    items_to_remove = list(self.cache.keys())[:self.cache_size // 5]
                    for key in items_to_remove:
                        del self.cache[key]
                
                # Execute callbacks
                for callback in job.callbacks:
                    try:
                        await callback(result, None)
                    except Exception as e:
                        logging.error(f"Callback error: {e}")
                
                # Update statistics
                processing_time = job.completed_at - job.started_at
                self.stats["total_processed"] += 1
                
                # Update average processing time
                current_avg = self.stats["avg_processing_time"]
                total_jobs = self.stats["total_processed"]
                self.stats["avg_processing_time"] = (current_avg * (total_jobs - 1) + processing_time) / total_jobs
                
                logging.info(f"✅ {worker_name} completed {job.id} in {processing_time:.2f}s")
                
            else:
                raise Exception("Failed to extract music information")
            
        except Exception as e:
            await self._handle_job_error(job, str(e))
        
        finally:
            # Move job to completed
            if job.id in self.active_jobs:
                del self.active_jobs[job.id]
            self.completed_jobs[job.id] = job
    
    def _extract_music_info(self, url: str) -> Optional[Dict]:
        """Extract music information using yt-dlp (runs in executor)"""
        try:
            # Enhanced extraction with Juice WRLD detection
            info = self.ytdl.extract_info(url, download=False)
            
            if not info:
                return None
            
            # Handle playlists
            if 'entries' in info:
                entries = []
                for entry in info['entries']:
                    if entry:
                        processed_entry = self._process_single_entry(entry)
                        if processed_entry:
                            entries.append(processed_entry)
                
                return {
                    'type': 'playlist',
                    'title': info.get('title', 'Unknown Playlist'),
                    'entries': entries,
                    'entry_count': len(entries),
                    'uploader': info.get('uploader', 'Unknown'),
                    'description': info.get('description', ''),
                    'webpage_url': info.get('webpage_url', url)
                }
            else:
                # Single track
                processed = self._process_single_entry(info)
                if processed:
                    processed['type'] = 'single'
                return processed
                
        except Exception as e:
            logging.error(f"Music extraction error: {e}")
            return None
    
    def _process_single_entry(self, entry: Dict) -> Optional[Dict]:
        """Process a single music entry with enhanced metadata"""
        try:
            title = entry.get('title', 'Unknown Title')
            uploader = entry.get('uploader', 'Unknown Artist')
            
            # Juice WRLD detection
            is_juice_wrld = self._is_juice_wrld_track(title, uploader)
            
            # Mood/genre estimation (basic)
            mood = self._estimate_mood(title, uploader)
            
            return {
                'title': title,
                'uploader': uploader,
                'duration': entry.get('duration', 0),
                'webpage_url': entry.get('webpage_url', ''),
                'url': entry.get('url', ''),
                'thumbnail': entry.get('thumbnail', ''),
                'description': entry.get('description', ''),
                'upload_date': entry.get('upload_date', ''),
                'view_count': entry.get('view_count', 0),
                'like_count': entry.get('like_count', 0),
                'is_juice_wrld': is_juice_wrld,
                'estimated_mood': mood,
                'processed_at': time.time()
            }
            
        except Exception as e:
            logging.error(f"Entry processing error: {e}")
            return None
    
    def _is_juice_wrld_track(self, title: str, artist: str) -> bool:
        """Check if track is by Juice WRLD"""
        juice_indicators = [
            "juice wrld", "juice world", "jarad higgins", "999",
            "juicewrld", "juice", "grad a productions"
        ]
        
        full_text = f"{title} {artist}".lower()
        return any(indicator in full_text for indicator in juice_indicators)
    
    def _estimate_mood(self, title: str, artist: str) -> str:
        """Basic mood estimation based on title/artist"""
        title_lower = title.lower()
        
        # Sad/emotional keywords
        sad_keywords = ["sad", "cry", "tear", "hurt", "pain", "lonely", "empty", "miss", "broken"]
        if any(keyword in title_lower for keyword in sad_keywords):
            return "sad"
        
        # Happy/energetic keywords  
        happy_keywords = ["happy", "party", "dance", "celebrate", "joy", "energy", "pump", "hype"]
        if any(keyword in title_lower for keyword in happy_keywords):
            return "happy"
        
        # Chill/relaxed keywords
        chill_keywords = ["chill", "relax", "calm", "peaceful", "slow", "ambient", "lo-fi", "lofi"]
        if any(keyword in title_lower for keyword in chill_keywords):
            return "chill"
        
        return "neutral"
    
    async def _handle_job_error(self, job: MusicProcessingJob, error: str):
        """Handle job processing error"""
        job.status = ProcessingStatus.FAILED
        job.error = error
        job.completed_at = time.time()
        
        self.stats["failed_jobs"] += 1
        
        # Execute callbacks with error
        for callback in job.callbacks:
            try:
                await callback(None, error)
            except Exception as e:
                logging.error(f"Error callback failed: {e}")
        
        logging.error(f"❌ Job {job.id} failed: {error}")
    
    async def _cleanup_task(self):
        """Periodic cleanup of old jobs and cache"""
        while self.running:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                current_time = time.time()
                old_job_threshold = current_time - 3600  # 1 hour
                
                # Clean up old completed jobs
                jobs_to_remove = []
                for job_id, job in self.completed_jobs.items():
                    if job.completed_at and job.completed_at < old_job_threshold:
                        jobs_to_remove.append(job_id)
                
                for job_id in jobs_to_remove:
                    del self.completed_jobs[job_id]
                
                if jobs_to_remove:
                    logging.info(f"🧹 Cleaned up {len(jobs_to_remove)} old music processing jobs")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Cleanup task error: {e}")
    
    def get_job_status(self, job_id: str) -> Optional[MusicProcessingJob]:
        """Get the status of a processing job"""
        if job_id in self.active_jobs:
            return self.active_jobs[job_id]
        elif job_id in self.completed_jobs:
            return self.completed_jobs[job_id]
        return None
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get current queue and processing statistics"""
        return {
            "urgent_queue_size": self.urgent_queue.qsize(),
            "high_priority_queue_size": self.high_priority_queue.qsize(),
            "normal_queue_size": self.normal_priority_queue.qsize(),
            "active_jobs": len(self.active_jobs),
            "completed_jobs": len(self.completed_jobs),
            "cache_size": len(self.cache),
            **self.stats
        }
    
    async def wait_for_job(self, job_id: str, timeout: float = 30.0) -> Optional[Dict]:
        """Wait for a job to complete and return the result"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            job = self.get_job_status(job_id)
            
            if job and job.status in [ProcessingStatus.COMPLETED, ProcessingStatus.CACHED]:
                return job.result
            elif job and job.status == ProcessingStatus.FAILED:
                raise Exception(f"Job failed: {job.error}")
            
            await asyncio.sleep(0.5)
        
        raise asyncio.TimeoutError(f"Job {job_id} did not complete within {timeout} seconds")

# Global music processor instance
music_processor = BackgroundMusicProcessor()