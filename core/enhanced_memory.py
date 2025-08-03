# core/enhanced_memory.py - Advanced Memory Management for Sentient AI

import asyncio
import sqlite3
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import numpy as np
from collections import defaultdict, deque
import hashlib
import pickle
import os

logger = logging.getLogger(__name__)

class MemoryType(Enum):
    EPISODIC = "episodic"      # Specific interactions and events
    SEMANTIC = "semantic"      # General knowledge and facts
    PROCEDURAL = "procedural"  # How-to knowledge and patterns
    SOCIAL = "social"          # Relationships and social dynamics
    EMOTIONAL = "emotional"    # Emotional associations and states
    CULTURAL = "cultural"      # Scottish cultural knowledge

class MemoryImportance(Enum):
    CRITICAL = 5    # Never forget
    HIGH = 4        # Long-term memory
    MEDIUM = 3      # Medium-term memory
    LOW = 2         # Short-term memory
    TEMPORARY = 1   # Fade quickly

@dataclass
class MemoryEntry:
    id: str
    user_id: str
    memory_type: MemoryType
    importance: MemoryImportance
    content: Dict[str, Any]
    context: Dict[str, Any]
    timestamp: float
    last_accessed: float
    access_count: int
    emotional_weight: float = 0.0
    associated_memories: List[str] = None
    tags: List[str] = None
    confidence: float = 1.0
    expires_at: Optional[float] = None
    
    def __post_init__(self):
        if self.associated_memories is None:
            self.associated_memories = []
        if self.tags is None:
            self.tags = []

class PersonalityMemory:
    """Advanced memory system for each AI personality"""
    
    def __init__(self, personality_name: str, db_path: str = None):
        self.personality_name = personality_name
        self.db_path = db_path or f"memory_{personality_name.lower()}.db"
        self.lock = threading.RLock()
        
        # In-memory caches for fast access
        self.recent_memories = deque(maxlen=100)  # Last 100 memories
        self.user_profiles = {}  # Cached user profiles
        self.memory_associations = defaultdict(set)  # Memory ID associations
        
        # Memory consolidation settings
        self.consolidation_threshold = 0.7
        self.max_memory_age_days = 365
        self.cleanup_interval = 3600  # 1 hour
        
        self.init_database()
        self.start_background_tasks()
        
    def init_database(self):
        """Initialize memory database with advanced schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Main memory table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    memory_type TEXT,
                    importance INTEGER,
                    content TEXT,
                    context TEXT,
                    timestamp REAL,
                    last_accessed REAL,
                    access_count INTEGER,
                    emotional_weight REAL,
                    tags TEXT,
                    confidence REAL,
                    expires_at REAL,
                    INDEX(user_id),
                    INDEX(memory_type),
                    INDEX(importance),
                    INDEX(timestamp),
                    INDEX(expires_at)
                )
            """)
            
            # Memory associations table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memory_associations (
                    memory_id_1 TEXT,
                    memory_id_2 TEXT,
                    association_strength REAL,
                    association_type TEXT,
                    created_at REAL,
                    PRIMARY KEY (memory_id_1, memory_id_2)
                )
            """)
            
            # User profiles table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    user_id TEXT PRIMARY KEY,
                    profile_data TEXT,
                    personality_traits TEXT,
                    preferences TEXT,
                    interaction_patterns TEXT,
                    last_updated REAL
                )
            """)
            
            # Memory consolidation log
            conn.execute("""
                CREATE TABLE IF NOT EXISTS consolidation_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    consolidated_memories TEXT,
                    new_memory_id TEXT,
                    consolidation_type TEXT,
                    timestamp REAL
                )
            """)
            
    def start_background_tasks(self):
        """Start background memory management tasks"""
        asyncio.create_task(self._memory_consolidation_loop())
        asyncio.create_task(self._memory_cleanup_loop())
        
    def generate_memory_id(self, content: str, context: str) -> str:
        """Generate unique memory ID"""
        unique_string = f"{content}_{context}_{time.time()}"
        return hashlib.md5(unique_string.encode()).hexdigest()
        
    def store_memory(self, user_id: str, memory_type: MemoryType, content: Dict[str, Any],
                    context: Dict[str, Any] = None, importance: MemoryImportance = MemoryImportance.MEDIUM,
                    emotional_weight: float = 0.0, tags: List[str] = None) -> str:
        """Store a new memory entry"""
        
        if context is None:
            context = {}
        if tags is None:
            tags = []
            
        memory_id = self.generate_memory_id(json.dumps(content), json.dumps(context))
        
        # Calculate expiration based on importance
        expires_at = None
        if importance == MemoryImportance.TEMPORARY:
            expires_at = time.time() + (24 * 3600)  # 1 day
        elif importance == MemoryImportance.LOW:
            expires_at = time.time() + (7 * 24 * 3600)  # 1 week
        elif importance == MemoryImportance.MEDIUM:
            expires_at = time.time() + (30 * 24 * 3600)  # 1 month
        # HIGH and CRITICAL memories don't expire
        
        memory = MemoryEntry(
            id=memory_id,
            user_id=user_id,
            memory_type=memory_type,
            importance=importance,
            content=content,
            context=context,
            timestamp=time.time(),
            last_accessed=time.time(),
            access_count=1,
            emotional_weight=emotional_weight,
            tags=tags,
            expires_at=expires_at
        )
        
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO memories 
                    (id, user_id, memory_type, importance, content, context, timestamp, 
                     last_accessed, access_count, emotional_weight, tags, confidence, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    memory.id, memory.user_id, memory.memory_type.value, memory.importance.value,
                    json.dumps(memory.content), json.dumps(memory.context), memory.timestamp,
                    memory.last_accessed, memory.access_count, memory.emotional_weight,
                    json.dumps(memory.tags), memory.confidence, memory.expires_at
                ))
                
            # Add to recent memories cache
            self.recent_memories.append(memory)
            
            # Update user profile
            self._update_user_profile(user_id, content, context, memory_type)
            
            # Create associations with recent memories
            self._create_memory_associations(memory_id, user_id)
            
        logger.debug(f"Stored memory {memory_id} for user {user_id}")
        return memory_id
        
    def retrieve_memories(self, user_id: str, memory_type: MemoryType = None, 
                         importance_min: MemoryImportance = MemoryImportance.LOW,
                         limit: int = 50, tags: List[str] = None) -> List[MemoryEntry]:
        """Retrieve memories with filtering"""
        
        with self.lock:
            query = """
                SELECT * FROM memories 
                WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)
            """
            params = [user_id, time.time()]
            
            if memory_type:
                query += " AND memory_type = ?"
                params.append(memory_type.value)
                
            if importance_min:
                query += " AND importance >= ?"
                params.append(importance_min.value)
                
            query += " ORDER BY importance DESC, last_accessed DESC LIMIT ?"
            params.append(limit)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(query, params)
                results = cursor.fetchall()
                
            memories = []
            for row in results:
                memory = self._row_to_memory(row)
                
                # Filter by tags if specified
                if tags and not any(tag in memory.tags for tag in tags):
                    continue
                    
                # Update access information
                self._update_memory_access(memory.id)
                memories.append(memory)
                
            return memories
            
    def get_contextual_memories(self, user_id: str, context_keywords: List[str],
                              limit: int = 20) -> List[MemoryEntry]:
        """Get memories relevant to current context"""
        
        relevant_memories = []
        
        # Search in content and context fields
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                for keyword in context_keywords:
                    cursor = conn.execute("""
                        SELECT * FROM memories 
                        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)
                        AND (content LIKE ? OR context LIKE ? OR tags LIKE ?)
                        ORDER BY importance DESC, last_accessed DESC
                        LIMIT ?
                    """, (user_id, time.time(), f"%{keyword}%", f"%{keyword}%", f"%{keyword}%", limit))
                    
                    results = cursor.fetchall()
                    for row in results:
                        memory = self._row_to_memory(row)
                        if memory not in relevant_memories:
                            relevant_memories.append(memory)
                            self._update_memory_access(memory.id)
                            
        # Sort by relevance score
        return sorted(relevant_memories, key=lambda m: self._calculate_relevance_score(m, context_keywords), reverse=True)[:limit]
        
    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user profile"""
        
        if user_id in self.user_profiles:
            return self.user_profiles[user_id]
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user_id,))
            result = cursor.fetchone()
            
            if result:
                profile = {
                    "profile_data": json.loads(result[1]),
                    "personality_traits": json.loads(result[2]),
                    "preferences": json.loads(result[3]),
                    "interaction_patterns": json.loads(result[4]),
                    "last_updated": result[5]
                }
            else:
                profile = self._create_default_profile(user_id)
                
        self.user_profiles[user_id] = profile
        return profile
        
    def _create_default_profile(self, user_id: str) -> Dict[str, Any]:
        """Create default user profile"""
        profile = {
            "profile_data": {
                "user_id": user_id,
                "first_interaction": time.time(),
                "total_interactions": 0,
                "favorite_topics": [],
                "communication_style": "unknown"
            },
            "personality_traits": {
                "openness": 0.5,
                "conscientiousness": 0.5,
                "extraversion": 0.5,
                "agreeableness": 0.5,
                "neuroticism": 0.5
            },
            "preferences": {
                "music_genres": [],
                "adventure_types": [],
                "economic_strategies": [],
                "social_activities": []
            },
            "interaction_patterns": {
                "active_hours": [],
                "response_preferences": [],
                "engagement_topics": []
            },
            "last_updated": time.time()
        }
        
        # Store in database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO user_profiles 
                (user_id, profile_data, personality_traits, preferences, interaction_patterns, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                json.dumps(profile["profile_data"]),
                json.dumps(profile["personality_traits"]),
                json.dumps(profile["preferences"]),
                json.dumps(profile["interaction_patterns"]),
                profile["last_updated"]
            ))
            
        return profile
        
    def _update_user_profile(self, user_id: str, content: Dict[str, Any], 
                           context: Dict[str, Any], memory_type: MemoryType):
        """Update user profile based on new memory"""
        profile = self.get_user_profile(user_id)
        
        # Update interaction count
        profile["profile_data"]["total_interactions"] += 1
        
        # Extract topics and preferences
        content_text = json.dumps(content).lower()
        
        # Music preferences
        if memory_type == MemoryType.SEMANTIC and "music" in content_text:
            music_prefs = profile["preferences"]["music_genres"]
            for genre in ["rock", "pop", "classical", "electronic", "folk", "jazz"]:
                if genre in content_text and genre not in music_prefs:
                    music_prefs.append(genre)
                    
        # Update personality traits based on interaction style
        if "question" in content_text:
            profile["personality_traits"]["openness"] = min(1.0, profile["personality_traits"]["openness"] + 0.01)
            
        if memory_type == MemoryType.SOCIAL:
            profile["personality_traits"]["extraversion"] = min(1.0, profile["personality_traits"]["extraversion"] + 0.01)
            
        # Update last interaction time
        profile["last_updated"] = time.time()
        
        # Store updated profile
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE user_profiles 
                SET profile_data = ?, personality_traits = ?, preferences = ?, 
                    interaction_patterns = ?, last_updated = ?
                WHERE user_id = ?
            """, (
                json.dumps(profile["profile_data"]),
                json.dumps(profile["personality_traits"]),
                json.dumps(profile["preferences"]),
                json.dumps(profile["interaction_patterns"]),
                profile["last_updated"],
                user_id
            ))
            
        self.user_profiles[user_id] = profile
        
    def _create_memory_associations(self, memory_id: str, user_id: str):
        """Create associations between memories"""
        
        # Get recent memories for the same user
        recent_memories = [m for m in self.recent_memories if m.user_id == user_id][-10:]
        
        for recent_memory in recent_memories:
            if recent_memory.id != memory_id:
                # Calculate association strength
                strength = self._calculate_association_strength(memory_id, recent_memory.id)
                
                if strength > 0.3:  # Only store significant associations
                    with sqlite3.connect(self.db_path) as conn:
                        conn.execute("""
                            INSERT OR REPLACE INTO memory_associations
                            (memory_id_1, memory_id_2, association_strength, association_type, created_at)
                            VALUES (?, ?, ?, ?, ?)
                        """, (memory_id, recent_memory.id, strength, "temporal", time.time()))
                        
    def _calculate_association_strength(self, memory_id_1: str, memory_id_2: str) -> float:
        """Calculate association strength between two memories"""
        # Simple temporal association for now
        # Could be enhanced with semantic similarity, user context, etc.
        return 0.5  # Placeholder implementation
        
    def _calculate_relevance_score(self, memory: MemoryEntry, context_keywords: List[str]) -> float:
        """Calculate relevance score for a memory given context"""
        score = 0.0
        
        # Base score from importance
        score += memory.importance.value * 0.3
        
        # Recency score
        age_hours = (time.time() - memory.timestamp) / 3600
        recency_score = max(0, 1 - (age_hours / (30 * 24)))  # Decay over 30 days
        score += recency_score * 0.2
        
        # Access frequency score
        access_score = min(1.0, memory.access_count / 10)
        score += access_score * 0.2
        
        # Keyword relevance
        content_text = json.dumps(memory.content).lower()
        context_text = json.dumps(memory.context).lower()
        tags_text = " ".join(memory.tags).lower()
        
        keyword_matches = 0
        for keyword in context_keywords:
            if (keyword.lower() in content_text or 
                keyword.lower() in context_text or 
                keyword.lower() in tags_text):
                keyword_matches += 1
                
        keyword_score = keyword_matches / len(context_keywords) if context_keywords else 0
        score += keyword_score * 0.3
        
        return score
        
    def _update_memory_access(self, memory_id: str):
        """Update memory access statistics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE memories 
                SET last_accessed = ?, access_count = access_count + 1
                WHERE id = ?
            """, (time.time(), memory_id))
            
    def _row_to_memory(self, row) -> MemoryEntry:
        """Convert database row to MemoryEntry object"""
        return MemoryEntry(
            id=row[0],
            user_id=row[1],
            memory_type=MemoryType(row[2]),
            importance=MemoryImportance(row[3]),
            content=json.loads(row[4]),
            context=json.loads(row[5]),
            timestamp=row[6],
            last_accessed=row[7],
            access_count=row[8],
            emotional_weight=row[9],
            tags=json.loads(row[10]) if row[10] else [],
            confidence=row[11],
            expires_at=row[12]
        )
        
    async def _memory_consolidation_loop(self):
        """Background task for memory consolidation"""
        while True:
            try:
                await self._consolidate_memories()
                await asyncio.sleep(self.cleanup_interval)
            except Exception as e:
                logger.error(f"Error in memory consolidation: {e}")
                await asyncio.sleep(self.cleanup_interval)
                
    async def _consolidate_memories(self):
        """Consolidate related memories to improve efficiency"""
        # Find groups of related memories
        # Merge similar memories
        # Create higher-level abstractions
        # This is a placeholder for advanced consolidation logic
        pass
        
    async def _memory_cleanup_loop(self):
        """Background task for memory cleanup"""
        while True:
            try:
                await self._cleanup_expired_memories()
                await asyncio.sleep(self.cleanup_interval)
            except Exception as e:
                logger.error(f"Error in memory cleanup: {e}")
                await asyncio.sleep(self.cleanup_interval)
                
    async def _cleanup_expired_memories(self):
        """Clean up expired memories"""
        with sqlite3.connect(self.db_path) as conn:
            # Delete expired memories
            conn.execute("DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at < ?", (time.time(),))
            
            # Clean up orphaned associations
            conn.execute("""
                DELETE FROM memory_associations 
                WHERE memory_id_1 NOT IN (SELECT id FROM memories) 
                OR memory_id_2 NOT IN (SELECT id FROM memories)
            """)
            
        logger.debug("Memory cleanup completed")

class CollectiveMemory:
    """Shared memory system across all AI personalities"""
    
    def __init__(self, db_path: str = "collective_memory.db"):
        self.db_path = db_path
        self.personality_memories = {}
        self.shared_insights = {}
        self.lock = threading.RLock()
        
        self.init_database()
        
    def init_database(self):
        """Initialize collective memory database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS shared_insights (
                    id TEXT PRIMARY KEY,
                    insight_type TEXT,
                    content TEXT,
                    contributing_personalities TEXT,
                    confidence REAL,
                    created_at REAL,
                    last_updated REAL,
                    access_count INTEGER
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cross_personality_patterns (
                    pattern_id TEXT PRIMARY KEY,
                    pattern_type TEXT,
                    description TEXT,
                    personalities_involved TEXT,
                    pattern_data TEXT,
                    strength REAL,
                    discovered_at REAL
                )
            """)
            
    def get_personality_memory(self, personality_name: str) -> PersonalityMemory:
        """Get or create memory system for a specific personality"""
        if personality_name not in self.personality_memories:
            self.personality_memories[personality_name] = PersonalityMemory(personality_name)
        return self.personality_memories[personality_name]
        
    def share_insight(self, personality_name: str, insight_type: str, 
                     content: Dict[str, Any], confidence: float = 1.0):
        """Share an insight across all personalities"""
        insight_id = f"{personality_name}_{insight_type}_{int(time.time())}"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO shared_insights
                (id, insight_type, content, contributing_personalities, confidence, 
                 created_at, last_updated, access_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight_id, insight_type, json.dumps(content), 
                json.dumps([personality_name]), confidence,
                time.time(), time.time(), 0
            ))
            
        logger.info(f"Shared insight {insight_id} from {personality_name}")
        
    def get_shared_insights(self, insight_type: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get shared insights across personalities"""
        query = "SELECT * FROM shared_insights"
        params = []
        
        if insight_type:
            query += " WHERE insight_type = ?"
            params.append(insight_type)
            
        query += " ORDER BY confidence DESC, last_updated DESC LIMIT ?"
        params.append(limit)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, params)
            results = cursor.fetchall()
            
        insights = []
        for row in results:
            insights.append({
                "id": row[0],
                "insight_type": row[1],
                "content": json.loads(row[2]),
                "contributing_personalities": json.loads(row[3]),
                "confidence": row[4],
                "created_at": row[5],
                "last_updated": row[6],
                "access_count": row[7]
            })
            
        return insights

# Global collective memory instance
collective_memory = CollectiveMemory()

def get_collective_memory() -> CollectiveMemory:
    """Get global collective memory instance"""
    return collective_memory

def get_personality_memory(personality_name: str) -> PersonalityMemory:
    """Get memory system for specific personality"""
    return collective_memory.get_personality_memory(personality_name)