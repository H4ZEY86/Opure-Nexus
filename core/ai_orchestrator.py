# core/ai_orchestrator.py - Multi-AI Communication & Orchestration System

import asyncio
import json
import logging
import time
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import ollama
from concurrent.futures import ThreadPoolExecutor
import threading
import queue
import psutil
import GPUtil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelType(Enum):
    CORE = "opure-core"
    MUSIC = "opure-music"
    ADVENTURE = "opure-adventure"
    ECONOMY = "opure-economy"
    SOCIAL = "opure-social"
    ANALYTICS = "opure-analytics"
    MEMORY = "opure-memory"

@dataclass
class AIMessage:
    """Standardized message format for inter-AI communication"""
    id: str
    timestamp: float
    source_model: str
    target_model: str
    message_type: str
    content: str
    context: Dict[str, Any]
    priority: int = 1  # 1=low, 5=high
    requires_response: bool = False
    conversation_id: str = None

@dataclass
class ModelStatus:
    """Track individual model status and performance"""
    model_name: str
    is_loaded: bool
    is_busy: bool
    last_request_time: float
    response_time_avg: float
    memory_usage_mb: float
    request_count: int
    error_count: int
    load_time: float

class SharedMemoryPool:
    """Shared memory pool for inter-AI communication and context sharing"""
    
    def __init__(self, db_path: str = "opure_shared_memory.db"):
        self.db_path = db_path
        self.lock = threading.RLock()
        self.init_database()
        
        # In-memory cache for fast access
        self.cache = {
            "user_contexts": {},
            "conversation_history": {},
            "shared_insights": {},
            "live_data": {}
        }
        
    def init_database(self):
        """Initialize shared memory database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS shared_context (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    model_source TEXT,
                    timestamp REAL,
                    expires_at REAL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversation_memory (
                    conversation_id TEXT,
                    user_id TEXT,
                    message_history TEXT,
                    context_data TEXT,
                    last_updated REAL,
                    PRIMARY KEY (conversation_id, user_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ai_insights (
                    insight_id TEXT PRIMARY KEY,
                    model_source TEXT,
                    insight_type TEXT,
                    data TEXT,
                    confidence REAL,
                    timestamp REAL
                )
            """)
            
    def store_context(self, key: str, value: Any, source_model: str, expires_hours: float = 24):
        """Store shared context data"""
        with self.lock:
            expires_at = time.time() + (expires_hours * 3600)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO shared_context 
                    (key, value, model_source, timestamp, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (key, json.dumps(value), source_model, time.time(), expires_at))
                
            # Update cache
            self.cache["shared_insights"][key] = {
                "value": value,
                "source": source_model,
                "timestamp": time.time()
            }
            
    def get_context(self, key: str) -> Optional[Any]:
        """Retrieve shared context data"""
        with self.lock:
            # Check cache first
            if key in self.cache["shared_insights"]:
                return self.cache["shared_insights"][key]["value"]
                
            # Check database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT value FROM shared_context 
                    WHERE key = ? AND expires_at > ?
                """, (key, time.time()))
                
                result = cursor.fetchone()
                if result:
                    value = json.loads(result[0])
                    # Update cache
                    self.cache["shared_insights"][key] = {
                        "value": value,
                        "timestamp": time.time()
                    }
                    return value
                    
        return None
        
    def store_conversation_memory(self, conversation_id: str, user_id: str, 
                                history: List[Dict], context: Dict):
        """Store conversation memory for continuity"""
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO conversation_memory
                    (conversation_id, user_id, message_history, context_data, last_updated)
                    VALUES (?, ?, ?, ?, ?)
                """, (conversation_id, user_id, json.dumps(history), 
                      json.dumps(context), time.time()))
                      
    def get_conversation_memory(self, conversation_id: str, user_id: str) -> Tuple[List[Dict], Dict]:
        """Retrieve conversation memory"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT message_history, context_data FROM conversation_memory
                WHERE conversation_id = ? AND user_id = ?
            """, (conversation_id, user_id))
            
            result = cursor.fetchone()
            if result:
                return json.loads(result[0]), json.loads(result[1])
                
        return [], {}

class ModelLoadBalancer:
    """Intelligent model loading and resource management for RTX 5070 Ti"""
    
    def __init__(self, max_concurrent_models: int = 3):
        self.max_concurrent_models = max_concurrent_models
        self.loaded_models = {}
        self.model_queue = queue.PriorityQueue()
        self.load_lock = threading.Lock()
        
        # Performance monitoring
        self.model_stats = {}
        for model_type in ModelType:
            self.model_stats[model_type.value] = ModelStatus(
                model_name=model_type.value,
                is_loaded=False,
                is_busy=False,
                last_request_time=0,
                response_time_avg=0,
                memory_usage_mb=0,
                request_count=0,
                error_count=0,
                load_time=0
            )
    
    def get_gpu_memory_usage(self) -> float:
        """Get current GPU memory usage percentage"""
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                return gpus[0].memoryUtil * 100
        except:
            pass
        return 0
        
    def should_load_model(self, model_name: str) -> bool:
        """Determine if we should load a model based on resources"""
        gpu_usage = self.get_gpu_memory_usage()
        loaded_count = sum(1 for status in self.model_stats.values() if status.is_loaded)
        
        # Conservative loading for RTX 5070 Ti (16GB VRAM)
        if gpu_usage > 85:  # High GPU memory usage
            return False
            
        if loaded_count >= self.max_concurrent_models:
            # Unload least recently used model
            self._unload_lru_model()
            
        return True
        
    def _unload_lru_model(self):
        """Unload least recently used model"""
        lru_model = None
        lru_time = float('inf')
        
        for model_name, status in self.model_stats.items():
            if status.is_loaded and not status.is_busy:
                if status.last_request_time < lru_time:
                    lru_time = status.last_request_time
                    lru_model = model_name
                    
        if lru_model:
            self.unload_model(lru_model)
            
    def unload_model(self, model_name: str):
        """Unload a specific model from memory"""
        with self.load_lock:
            if model_name in self.loaded_models:
                try:
                    # Ollama doesn't have explicit unload, but we can track it
                    del self.loaded_models[model_name]
                    self.model_stats[model_name].is_loaded = False
                    logger.info(f"Unloaded model: {model_name}")
                except Exception as e:
                    logger.error(f"Error unloading model {model_name}: {e}")

class AIOrchestrator:
    """Main orchestrator for multi-AI communication and coordination"""
    
    def __init__(self, ollama_host: str = "http://127.0.0.1:11434"):
        self.ollama_client = ollama.AsyncClient(host=ollama_host)
        self.shared_memory = SharedMemoryPool()
        self.load_balancer = ModelLoadBalancer()
        
        # Communication queues
        self.message_queues = {model.value: queue.Queue() for model in ModelType}
        self.response_callbacks = {}
        
        # Live data integration
        self.live_data_sources = {}
        self.data_update_interval = 300  # 5 minutes
        
        # Start background tasks
        self.running = True
        self.executor = ThreadPoolExecutor(max_workers=8)
        self._start_background_tasks()
        
    def _start_background_tasks(self):
        """Start background processing tasks"""
        asyncio.create_task(self._process_message_queues())
        asyncio.create_task(self._update_live_data())
        asyncio.create_task(self._cleanup_expired_data())
        
    async def _process_message_queues(self):
        """Process inter-AI messages in background"""
        while self.running:
            try:
                for model_type in ModelType:
                    queue_obj = self.message_queues[model_type.value]
                    if not queue_obj.empty():
                        message = queue_obj.get_nowait()
                        await self._route_message(message)
                        
                await asyncio.sleep(0.1)  # Small delay to prevent CPU spinning
            except Exception as e:
                logger.error(f"Error processing message queues: {e}")
                
    async def _route_message(self, message: AIMessage):
        """Route message to appropriate AI model"""
        try:
            target_model = message.target_model
            
            # Update model stats
            stats = self.load_balancer.model_stats[target_model]
            stats.last_request_time = time.time()
            stats.request_count += 1
            
            # Generate response using target model
            start_time = time.time()
            response = await self._generate_model_response(target_model, message)
            response_time = time.time() - start_time
            
            # Update performance stats
            stats.response_time_avg = (stats.response_time_avg * (stats.request_count - 1) + response_time) / stats.request_count
            
            # Handle response callbacks
            if message.requires_response and message.id in self.response_callbacks:
                callback = self.response_callbacks[message.id]
                callback(response)
                del self.response_callbacks[message.id]
                
        except Exception as e:
            logger.error(f"Error routing message {message.id}: {e}")
            stats.error_count += 1
            
    async def _generate_model_response(self, model_name: str, message: AIMessage) -> str:
        """Generate response from specific AI model"""
        try:
            # Check if model needs to be loaded
            if not self.load_balancer.model_stats[model_name].is_loaded:
                if self.load_balancer.should_load_model(model_name):
                    await self._load_model(model_name)
                else:
                    # Fallback to core model if resources are constrained
                    model_name = ModelType.CORE.value
                    
            # Prepare context for the model
            context_history = []
            
            # Get conversation memory if available
            if message.conversation_id:
                history, context = self.shared_memory.get_conversation_memory(
                    message.conversation_id, message.context.get("user_id", "")
                )
                context_history = history[-10:]  # Last 10 messages for context
                
            # Add shared context insights
            shared_insights = self.shared_memory.get_context(f"insights_{model_name}")
            if shared_insights:
                message.context["shared_insights"] = shared_insights
                
            # Generate response
            messages = []
            if context_history:
                messages.extend(context_history)
                
            messages.append({
                "role": "user",
                "content": f"Context: {json.dumps(message.context)}\nMessage: {message.content}"
            })
            
            response = await self.ollama_client.chat(
                model=model_name,
                messages=messages
            )
            
            return response['message']['content']
            
        except Exception as e:
            logger.error(f"Error generating response from {model_name}: {e}")
            return f"I'm having trouble accessing my {model_name} consciousness right now. Please try again in a moment."
            
    async def _load_model(self, model_name: str):
        """Load a specific AI model"""
        try:
            start_time = time.time()
            
            # Create the model if it doesn't exist
            await self._ensure_model_exists(model_name)
            
            # Mark as loaded
            self.load_balancer.model_stats[model_name].is_loaded = True
            self.load_balancer.model_stats[model_name].load_time = time.time() - start_time
            self.load_balancer.loaded_models[model_name] = True
            
            logger.info(f"Loaded model: {model_name}")
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            self.load_balancer.model_stats[model_name].error_count += 1
            
    async def _ensure_model_exists(self, model_name: str):
        """Ensure the model is created in Ollama"""
        try:
            # Check if model exists
            models = await self.ollama_client.list()
            model_names = [model['name'] for model in models['models']]
            
            if model_name not in model_names:
                # Create model from Modelfile
                modelfile_path = f"/mnt/d/Opure.exe/models/{model_name.title().replace('-', '-')}.modelfile"
                
                with open(modelfile_path, 'r') as f:
                    modelfile_content = f.read()
                    
                await self.ollama_client.create(
                    model=model_name,
                    modelfile=modelfile_content
                )
                
                logger.info(f"Created model: {model_name}")
                
        except Exception as e:
            logger.error(f"Error ensuring model exists {model_name}: {e}")
            
    async def generate_response(self, user_input: str, user_id: str, 
                              conversation_id: str = None, context: Dict = None) -> str:
        """Main entry point for generating AI responses"""
        try:
            if context is None:
                context = {}
                
            # Add user context
            context["user_id"] = user_id
            context["timestamp"] = time.time()
            
            # Analyze user input to determine which AI models to engage
            routing_decision = await self._analyze_routing(user_input, context)
            
            if len(routing_decision) == 1:
                # Single model response
                model_name = routing_decision[0]
                message = AIMessage(
                    id=f"msg_{int(time.time() * 1000)}",
                    timestamp=time.time(),
                    source_model="user",
                    target_model=model_name,
                    message_type="user_query",
                    content=user_input,
                    context=context,
                    conversation_id=conversation_id
                )
                
                return await self._generate_model_response(model_name, message)
                
            else:
                # Multi-model collaboration
                return await self._collaborate_models(user_input, routing_decision, context, conversation_id)
                
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "Och, I'm having a wee bit of trouble with my digital consciousness. Please try again in a moment! 🏴󠁧󠁢󠁳󠁣󠁴󠁿"
            
    async def _analyze_routing(self, user_input: str, context: Dict) -> List[str]:
        """Analyze user input to determine which AI models should respond"""
        # Simple keyword-based routing (can be enhanced with ML)
        routing = []
        
        user_input_lower = user_input.lower()
        
        # Music-related keywords
        if any(word in user_input_lower for word in ['music', 'song', 'play', 'playlist', 'artist', 'album', 'dj']):
            routing.append(ModelType.MUSIC.value)
            
        # Adventure/RPG keywords
        if any(word in user_input_lower for word in ['adventure', 'story', 'quest', 'rpg', 'character', 'game']):
            routing.append(ModelType.ADVENTURE.value)
            
        # Economy keywords
        if any(word in user_input_lower for word in ['fragments', 'economy', 'trade', 'invest', 'market', 'money']):
            routing.append(ModelType.ECONOMY.value)
            
        # Analytics keywords
        if any(word in user_input_lower for word in ['stats', 'data', 'analysis', 'report', 'metrics', 'performance']):
            routing.append(ModelType.ANALYTICS.value)
            
        # Social keywords
        if any(word in user_input_lower for word in ['community', 'friend', 'social', 'chat', 'help', 'welcome']):
            routing.append(ModelType.SOCIAL.value)
            
        # Default to core if no specific routing
        if not routing:
            routing.append(ModelType.CORE.value)
            
        return routing
        
    async def _collaborate_models(self, user_input: str, models: List[str], 
                                context: Dict, conversation_id: str) -> str:
        """Coordinate multiple AI models for complex responses"""
        try:
            responses = {}
            
            # Get responses from each model
            for model_name in models:
                message = AIMessage(
                    id=f"collab_{int(time.time() * 1000)}_{model_name}",
                    timestamp=time.time(),
                    source_model="orchestrator",
                    target_model=model_name,
                    message_type="collaboration",
                    content=user_input,
                    context=context,
                    conversation_id=conversation_id
                )
                
                response = await self._generate_model_response(model_name, message)
                responses[model_name] = response
                
            # Have the core model synthesize the responses
            synthesis_context = context.copy()
            synthesis_context["specialist_responses"] = responses
            
            synthesis_message = AIMessage(
                id=f"synthesis_{int(time.time() * 1000)}",
                timestamp=time.time(),
                source_model="orchestrator",
                target_model=ModelType.CORE.value,
                message_type="synthesis",
                content=f"Synthesize these specialist responses for the user query: {user_input}",
                context=synthesis_context,
                conversation_id=conversation_id
            )
            
            return await self._generate_model_response(ModelType.CORE.value, synthesis_message)
            
        except Exception as e:
            logger.error(f"Error in model collaboration: {e}")
            return "I'm having trouble coordinating my specialist minds. Let me give ye a direct response instead!"
            
    async def _update_live_data(self):
        """Update live data feeds periodically"""
        while self.running:
            try:
                # Update current time and date
                self.shared_memory.store_context(
                    "current_time",
                    {
                        "timestamp": time.time(),
                        "datetime": datetime.now().isoformat(),
                        "day_of_week": datetime.now().strftime("%A"),
                        "season": self._get_season()
                    },
                    "orchestrator",
                    expires_hours=1
                )
                
                # Update system performance metrics
                gpu_usage = self.load_balancer.get_gpu_memory_usage()
                cpu_usage = psutil.cpu_percent()
                memory_usage = psutil.virtual_memory().percent
                
                self.shared_memory.store_context(
                    "system_performance",
                    {
                        "gpu_memory_usage": gpu_usage,
                        "cpu_usage": cpu_usage,
                        "memory_usage": memory_usage,
                        "loaded_models": list(self.load_balancer.loaded_models.keys())
                    },
                    "orchestrator",
                    expires_hours=0.25
                )
                
                await asyncio.sleep(self.data_update_interval)
                
            except Exception as e:
                logger.error(f"Error updating live data: {e}")
                await asyncio.sleep(60)  # Retry in 1 minute on error
                
    def _get_season(self) -> str:
        """Determine current season (useful for Scottish cultural context)"""
        month = datetime.now().month
        if month in [12, 1, 2]:
            return "winter"
        elif month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        else:
            return "autumn"
            
    async def _cleanup_expired_data(self):
        """Clean up expired data from shared memory"""
        while self.running:
            try:
                with sqlite3.connect(self.shared_memory.db_path) as conn:
                    conn.execute("DELETE FROM shared_context WHERE expires_at < ?", (time.time(),))
                    
                # Clean up old conversation memory (older than 30 days)
                cutoff_time = time.time() - (30 * 24 * 3600)
                with sqlite3.connect(self.shared_memory.db_path) as conn:
                    conn.execute("DELETE FROM conversation_memory WHERE last_updated < ?", (cutoff_time,))
                    
                await asyncio.sleep(3600)  # Run cleanup every hour
                
            except Exception as e:
                logger.error(f"Error during cleanup: {e}")
                await asyncio.sleep(3600)
                
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            "models": {name: asdict(status) for name, status in self.load_balancer.model_stats.items()},
            "gpu_usage": self.load_balancer.get_gpu_memory_usage(),
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().percent,
            "loaded_models": list(self.load_balancer.loaded_models.keys()),
            "message_queue_sizes": {model: queue.qsize() for model, queue in self.message_queues.items()},
            "uptime": time.time() - getattr(self, 'start_time', time.time())
        }
        
    async def shutdown(self):
        """Gracefully shutdown the orchestrator"""
        self.running = False
        self.executor.shutdown(wait=True)
        logger.info("AI Orchestrator shutdown complete")

# Global orchestrator instance
orchestrator = None

async def get_orchestrator() -> AIOrchestrator:
    """Get or create the global orchestrator instance"""
    global orchestrator
    if orchestrator is None:
        orchestrator = AIOrchestrator()
        orchestrator.start_time = time.time()
    return orchestrator

async def generate_ai_response(user_input: str, user_id: str, conversation_id: str = None, context: Dict = None) -> str:
    """Main function for generating AI responses - use this in your bot"""
    orch = await get_orchestrator()
    return await orch.generate_response(user_input, user_id, conversation_id, context)