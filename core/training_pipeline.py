# core/training_pipeline.py - Continuous Learning Pipeline for Sentient AI

import asyncio
import logging
import json
import time
import os
import sqlite3
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import tempfile
import shutil
from pathlib import Path

# Machine learning imports
try:
    import torch
    import numpy as np
    from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
    from datasets import Dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    TRAINING_AVAILABLE = True
except ImportError:
    TRAINING_AVAILABLE = False
    logging.warning("Training dependencies not available - continuous learning disabled")

logger = logging.getLogger(__name__)

class TrainingDataType(Enum):
    CONVERSATION = "conversation"
    PREFERENCE = "preference"
    CORRECTION = "correction"
    FEEDBACK = "feedback"
    CULTURAL = "cultural"
    DOMAIN_SPECIFIC = "domain_specific"

class TrainingPhase(Enum):
    DATA_COLLECTION = "data_collection"
    DATA_PREPARATION = "data_preparation"
    TRAINING = "training"
    VALIDATION = "validation"
    DEPLOYMENT = "deployment"
    COMPLETE = "complete"

@dataclass
class TrainingDataPoint:
    """Individual training data point"""
    id: str
    user_id: str
    model_source: str
    data_type: TrainingDataType
    input_text: str
    target_text: str
    context: Dict[str, Any]
    quality_score: float
    importance: int  # 1-5 scale
    timestamp: float
    validated: bool = False
    used_in_training: bool = False

@dataclass
class TrainingJob:
    """Training job configuration"""
    job_id: str
    model_name: str
    training_data_ids: List[str]
    training_config: Dict[str, Any]
    phase: TrainingPhase
    started_at: float
    completed_at: Optional[float] = None
    success: bool = False
    error_message: Optional[str] = None
    metrics: Dict[str, float] = None

class ContinuousLearningPipeline:
    """Continuous learning system for AI model adaptation"""
    
    def __init__(self, base_model_path: str = "gpt-oss:20b"):
        self.base_model_path = base_model_path
        self.db_path = "training_data.db"
        self.models_dir = Path("/mnt/d/Opure.exe/models/trained")
        self.models_dir.mkdir(exist_ok=True)
        
        self.training_active = False
        self.lock = threading.RLock()
        
        # Training configuration
        self.training_config = {
            "batch_size": 2,  # Small for RTX 5070 Ti
            "learning_rate": 5e-5,
            "max_length": 512,
            "gradient_accumulation_steps": 8,
            "warmup_steps": 100,
            "save_steps": 500,
            "eval_steps": 250,
            "fp16": True,  # Use mixed precision
            "dataloader_num_workers": 2,
            "remove_unused_columns": False
        }
        
        # LoRA configuration for parameter-efficient training
        self.lora_config = {
            "r": 16,
            "lora_alpha": 32,
            "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj"],
            "lora_dropout": 0.1,
            "bias": "none",
            "task_type": "CAUSAL_LM"
        }
        
        self.init_database()
        
        # Data collection queues
        self.data_queues = {data_type: [] for data_type in TrainingDataType}
        self.training_jobs = {}
        
        if TRAINING_AVAILABLE:
            # Initialize tokenizer
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(self.base_model_path)
                if self.tokenizer.pad_token is None:
                    self.tokenizer.pad_token = self.tokenizer.eos_token
                logger.info("Training pipeline initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing tokenizer: {e}")
                TRAINING_AVAILABLE = False
        
    def init_database(self):
        """Initialize training data database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_data (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    model_source TEXT,
                    data_type TEXT,
                    input_text TEXT,
                    target_text TEXT,
                    context TEXT,
                    quality_score REAL,
                    importance INTEGER,
                    timestamp REAL,
                    validated BOOLEAN,
                    used_in_training BOOLEAN,
                    INDEX(user_id),
                    INDEX(model_source),
                    INDEX(data_type),
                    INDEX(quality_score),
                    INDEX(timestamp)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_jobs (
                    job_id TEXT PRIMARY KEY,
                    model_name TEXT,
                    training_data_ids TEXT,
                    training_config TEXT,
                    phase TEXT,
                    started_at REAL,
                    completed_at REAL,
                    success BOOLEAN,
                    error_message TEXT,
                    metrics TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS model_versions (
                    version_id TEXT PRIMARY KEY,
                    model_name TEXT,
                    base_model TEXT,
                    training_job_id TEXT,
                    model_path TEXT,
                    performance_metrics TEXT,
                    created_at REAL,
                    deployed BOOLEAN
                )
            """)
            
    def collect_interaction_data(self, user_id: str, model_source: str, 
                               user_input: str, ai_response: str, 
                               context: Dict[str, Any] = None,
                               quality_feedback: float = None):
        """Collect interaction data for training"""
        
        if not context:
            context = {}
            
        # Calculate quality score if not provided
        if quality_feedback is None:
            quality_score = self._calculate_interaction_quality(user_input, ai_response, context)
        else:
            quality_score = quality_feedback
            
        # Determine importance based on context and quality
        importance = self._calculate_importance(user_input, ai_response, context, quality_score)
        
        data_point = TrainingDataPoint(
            id=self._generate_data_id(user_input, ai_response),
            user_id=user_id,
            model_source=model_source,
            data_type=TrainingDataType.CONVERSATION,
            input_text=user_input,
            target_text=ai_response,
            context=context,
            quality_score=quality_score,
            importance=importance,
            timestamp=time.time()
        )
        
        self._store_training_data(data_point)
        
    def collect_preference_data(self, user_id: str, query: str, 
                              preferred_response: str, rejected_response: str,
                              context: Dict[str, Any] = None):
        """Collect preference data for RLHF-style training"""
        
        if not context:
            context = {}
            
        # Store preference pair
        preference_data = TrainingDataPoint(
            id=self._generate_data_id(query, preferred_response),
            user_id=user_id,
            model_source="preference",
            data_type=TrainingDataType.PREFERENCE,
            input_text=query,
            target_text=preferred_response,
            context={**context, "rejected_response": rejected_response},
            quality_score=0.8,  # Preferred responses get high score
            importance=4,  # High importance
            timestamp=time.time()
        )
        
        self._store_training_data(preference_data)
        
    def collect_correction_data(self, user_id: str, original_query: str,
                              incorrect_response: str, corrected_response: str,
                              context: Dict[str, Any] = None):
        """Collect correction data from user feedback"""
        
        if not context:
            context = {}
            
        correction_data = TrainingDataPoint(
            id=self._generate_data_id(original_query, corrected_response),
            user_id=user_id,
            model_source="correction",
            data_type=TrainingDataType.CORRECTION,
            input_text=original_query,
            target_text=corrected_response,
            context={**context, "incorrect_response": incorrect_response},
            quality_score=0.9,  # Corrections are high quality
            importance=5,  # Critical importance
            timestamp=time.time()
        )
        
        self._store_training_data(correction_data)
        
    def collect_cultural_data(self, cultural_context: str, appropriate_response: str,
                            tags: List[str] = None):
        """Collect Scottish cultural context data"""
        
        if not tags:
            tags = []
            
        cultural_data = TrainingDataPoint(
            id=self._generate_data_id(cultural_context, appropriate_response),
            user_id="system",
            model_source="cultural",
            data_type=TrainingDataType.CULTURAL,
            input_text=cultural_context,
            target_text=appropriate_response,
            context={"tags": tags, "cultural_importance": True},
            quality_score=0.85,
            importance=4,
            timestamp=time.time()
        )
        
        self._store_training_data(cultural_data)
        
    def _store_training_data(self, data_point: TrainingDataPoint):
        """Store training data in database"""
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO training_data
                    (id, user_id, model_source, data_type, input_text, target_text,
                     context, quality_score, importance, timestamp, validated, used_in_training)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    data_point.id, data_point.user_id, data_point.model_source,
                    data_point.data_type.value, data_point.input_text, data_point.target_text,
                    json.dumps(data_point.context), data_point.quality_score,
                    data_point.importance, data_point.timestamp, data_point.validated,
                    data_point.used_in_training
                ))
                
        logger.debug(f"Stored training data point: {data_point.id}")
        
    def _calculate_interaction_quality(self, user_input: str, ai_response: str, 
                                     context: Dict[str, Any]) -> float:
        """Calculate quality score for an interaction"""
        
        quality_score = 0.5  # Base score
        
        # Length appropriateness
        response_length = len(ai_response)
        if 50 <= response_length <= 500:
            quality_score += 0.1
        elif response_length > 1000:
            quality_score -= 0.1
            
        # Scottish cultural elements
        scottish_terms = ["ken", "bonnie", "wee", "och", "highland", "clan"]
        scottish_count = sum(1 for term in scottish_terms if term.lower() in ai_response.lower())
        if scottish_count > 0:
            quality_score += min(0.2, scottish_count * 0.05)
            
        # Context relevance
        if context.get("context_relevant", False):
            quality_score += 0.1
            
        # User engagement indicators
        if context.get("user_responded", False):
            quality_score += 0.1
            
        return min(1.0, max(0.0, quality_score))
        
    def _calculate_importance(self, user_input: str, ai_response: str,
                            context: Dict[str, Any], quality_score: float) -> int:
        """Calculate importance level (1-5) for training data"""
        
        importance = 3  # Base importance
        
        # Quality influence
        if quality_score >= 0.8:
            importance += 1
        elif quality_score <= 0.3:
            importance -= 1
            
        # Context importance
        if context.get("cultural_importance", False):
            importance += 1
            
        if context.get("error_correction", False):
            importance += 2
            
        if context.get("user_preference", False):
            importance += 1
            
        # Input complexity
        if len(user_input.split()) > 20:  # Complex queries
            importance += 1
            
        return max(1, min(5, importance))
        
    def _generate_data_id(self, input_text: str, target_text: str) -> str:
        """Generate unique ID for training data"""
        unique_string = f"{input_text}_{target_text}_{time.time()}"
        return hashlib.md5(unique_string.encode()).hexdigest()
        
    async def prepare_training_data(self, model_name: str, 
                                  data_types: List[TrainingDataType] = None,
                                  min_quality: float = 0.6,
                                  max_samples: int = 1000) -> List[TrainingDataPoint]:
        """Prepare training data for a specific model"""
        
        if not data_types:
            data_types = list(TrainingDataType)
            
        training_data = []
        
        with sqlite3.connect(self.db_path) as conn:
            # Build query
            type_placeholders = ",".join("?" * len(data_types))
            query = f"""
                SELECT * FROM training_data 
                WHERE data_type IN ({type_placeholders})
                AND quality_score >= ?
                AND NOT used_in_training
                ORDER BY importance DESC, quality_score DESC, timestamp DESC
                LIMIT ?
            """
            
            params = [dt.value for dt in data_types] + [min_quality, max_samples]
            cursor = conn.execute(query, params)
            
            for row in cursor.fetchall():
                data_point = TrainingDataPoint(
                    id=row[0], user_id=row[1], model_source=row[2],
                    data_type=TrainingDataType(row[3]), input_text=row[4],
                    target_text=row[5], context=json.loads(row[6]),
                    quality_score=row[7], importance=row[8], timestamp=row[9],
                    validated=bool(row[10]), used_in_training=bool(row[11])
                )
                training_data.append(data_point)
                
        logger.info(f"Prepared {len(training_data)} training samples for {model_name}")
        return training_data
        
    async def create_training_job(self, model_name: str, 
                                training_data: List[TrainingDataPoint],
                                custom_config: Dict[str, Any] = None) -> str:
        """Create a new training job"""
        
        if not TRAINING_AVAILABLE:
            raise RuntimeError("Training dependencies not available")
            
        job_id = f"train_{model_name}_{int(time.time())}"
        
        # Merge custom config with defaults
        config = self.training_config.copy()
        if custom_config:
            config.update(custom_config)
            
        job = TrainingJob(
            job_id=job_id,
            model_name=model_name,
            training_data_ids=[dp.id for dp in training_data],
            training_config=config,
            phase=TrainingPhase.DATA_PREPARATION,
            started_at=time.time()
        )
        
        # Store job in database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO training_jobs
                (job_id, model_name, training_data_ids, training_config, phase,
                 started_at, completed_at, success, error_message, metrics)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job.job_id, job.model_name, json.dumps(job.training_data_ids),
                json.dumps(job.training_config), job.phase.value,
                job.started_at, job.completed_at, job.success,
                job.error_message, json.dumps(job.metrics) if job.metrics else None
            ))
            
        self.training_jobs[job_id] = job
        
        # Start training asynchronously
        asyncio.create_task(self._execute_training_job(job_id))
        
        logger.info(f"Created training job: {job_id}")
        return job_id
        
    async def _execute_training_job(self, job_id: str):
        """Execute a training job"""
        
        job = self.training_jobs[job_id]
        
        try:
            # Phase 1: Data Preparation
            job.phase = TrainingPhase.DATA_PREPARATION
            await self._update_job_status(job)
            
            training_dataset = await self._prepare_dataset(job)
            
            # Phase 2: Training
            job.phase = TrainingPhase.TRAINING
            await self._update_job_status(job)
            
            model_path = await self._train_model(job, training_dataset)
            
            # Phase 3: Validation
            job.phase = TrainingPhase.VALIDATION
            await self._update_job_status(job)
            
            metrics = await self._validate_model(job, model_path)
            job.metrics = metrics
            
            # Phase 4: Deployment (if validation passes)
            if metrics.get("validation_score", 0) > 0.7:
                job.phase = TrainingPhase.DEPLOYMENT
                await self._update_job_status(job)
                
                await self._deploy_model(job, model_path)
                
            job.phase = TrainingPhase.COMPLETE
            job.success = True
            job.completed_at = time.time()
            
        except Exception as e:
            logger.error(f"Training job {job_id} failed: {e}")
            job.error_message = str(e)
            job.success = False
            job.completed_at = time.time()
            
        finally:
            await self._update_job_status(job)
            
    async def _prepare_dataset(self, job: TrainingJob) -> Dataset:
        """Prepare dataset for training"""
        
        # Get training data
        training_data = []
        with sqlite3.connect(self.db_path) as conn:
            for data_id in job.training_data_ids:
                cursor = conn.execute("SELECT * FROM training_data WHERE id = ?", (data_id,))
                row = cursor.fetchone()
                if row:
                    training_data.append({
                        "input_text": row[4],
                        "target_text": row[5],
                        "context": json.loads(row[6])
                    })
                    
        # Format for training
        formatted_data = []
        for item in training_data:
            # Create conversation format
            conversation = f"<|start_header_id|>user<|end_header_id|>\n{item['input_text']}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n{item['target_text']}<|eot_id|>"
            
            formatted_data.append({
                "text": conversation,
                "input_ids": None,  # Will be tokenized later
                "attention_mask": None
            })
            
        # Create dataset
        dataset = Dataset.from_list(formatted_data)
        
        # Tokenize
        def tokenize_function(examples):
            tokenized = self.tokenizer(
                examples["text"],
                padding="max_length",
                truncation=True,
                max_length=job.training_config["max_length"],
                return_tensors="pt"
            )
            
            # For causal LM, labels are the same as input_ids
            tokenized["labels"] = tokenized["input_ids"].clone()
            
            return tokenized
            
        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=["text"]
        )
        
        return tokenized_dataset
        
    async def _train_model(self, job: TrainingJob, dataset: Dataset) -> str:
        """Train the model using LoRA"""
        
        # Load base model
        model = AutoModelForCausalLM.from_pretrained(
            self.base_model_path,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )
        
        # Prepare for LoRA
        model = prepare_model_for_kbit_training(model)
        
        # Apply LoRA
        lora_config = LoraConfig(**self.lora_config)
        model = get_peft_model(model, lora_config)
        
        # Training arguments
        output_dir = self.models_dir / f"{job.model_name}_lora_{job.job_id}"
        
        training_args = TrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=3,
            per_device_train_batch_size=job.training_config["batch_size"],
            gradient_accumulation_steps=job.training_config["gradient_accumulation_steps"],
            warmup_steps=job.training_config["warmup_steps"],
            learning_rate=job.training_config["learning_rate"],
            fp16=job.training_config["fp16"],
            logging_steps=10,
            save_steps=job.training_config["save_steps"],
            eval_steps=job.training_config["eval_steps"],
            evaluation_strategy="steps",
            save_strategy="steps",
            load_best_model_at_end=True,
            dataloader_num_workers=job.training_config["dataloader_num_workers"],
            remove_unused_columns=job.training_config["remove_unused_columns"],
            report_to=None  # Disable wandb
        )
        
        # Create trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            eval_dataset=dataset.train_test_split(test_size=0.1)["test"],
            tokenizer=self.tokenizer,
        )
        
        # Train
        trainer.train()
        
        # Save model
        trainer.save_model()
        
        return str(output_dir)
        
    async def _validate_model(self, job: TrainingJob, model_path: str) -> Dict[str, float]:
        """Validate trained model"""
        
        # Basic validation metrics
        metrics = {
            "validation_score": 0.8,  # Placeholder
            "perplexity": 15.0,       # Placeholder
            "cultural_accuracy": 0.85  # Placeholder
        }
        
        # TODO: Implement proper validation
        # - Test on held-out dataset
        # - Evaluate Scottish cultural accuracy
        # - Test response quality
        
        return metrics
        
    async def _deploy_model(self, job: TrainingJob, model_path: str):
        """Deploy validated model"""
        
        # Create Ollama modelfile for the trained model
        modelfile_content = self._generate_deployment_modelfile(job.model_name, model_path)
        
        # Save modelfile
        modelfile_path = self.models_dir / f"{job.model_name}_trained.modelfile"
        with open(modelfile_path, 'w') as f:
            f.write(modelfile_content)
            
        # Store model version info
        version_id = f"{job.model_name}_v{int(time.time())}"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO model_versions
                (version_id, model_name, base_model, training_job_id, model_path,
                 performance_metrics, created_at, deployed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                version_id, job.model_name, self.base_model_path, job.job_id,
                model_path, json.dumps(job.metrics), time.time(), True
            ))
            
        logger.info(f"Deployed model version: {version_id}")
        
    def _generate_deployment_modelfile(self, model_name: str, model_path: str) -> str:
        """Generate Ollama modelfile for trained model"""
        
        # Read original modelfile
        original_modelfile_path = Path(f"/mnt/d/Opure.exe/models/{model_name.title().replace('-', '-')}.modelfile")
        
        if original_modelfile_path.exists():
            with open(original_modelfile_path, 'r') as f:
                original_content = f.read()
        else:
            original_content = f"FROM {self.base_model_path}\nSYSTEM \"You are {model_name}, a Scottish AI assistant.\""
            
        # Add training note
        training_note = f"""
# This model has been enhanced through continuous learning
# Training completed: {datetime.now().isoformat()}
# Base model: {self.base_model_path}
# LoRA adapters applied from: {model_path}

"""
        
        return training_note + original_content
        
    async def _update_job_status(self, job: TrainingJob):
        """Update job status in database"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE training_jobs
                SET phase = ?, completed_at = ?, success = ?, error_message = ?, metrics = ?
                WHERE job_id = ?
            """, (
                job.phase.value, job.completed_at, job.success,
                job.error_message, json.dumps(job.metrics) if job.metrics else None,
                job.job_id
            ))
            
    def get_training_stats(self) -> Dict[str, Any]:
        """Get training pipeline statistics"""
        
        with sqlite3.connect(self.db_path) as conn:
            # Data statistics
            cursor = conn.execute("""
                SELECT data_type, COUNT(*), AVG(quality_score), AVG(importance)
                FROM training_data
                GROUP BY data_type
            """)
            
            data_stats = {}
            for row in cursor.fetchall():
                data_stats[row[0]] = {
                    "count": row[1],
                    "avg_quality": row[2],
                    "avg_importance": row[3]
                }
                
            # Job statistics
            cursor = conn.execute("""
                SELECT phase, COUNT(*), AVG(CASE WHEN success THEN 1 ELSE 0 END)
                FROM training_jobs
                GROUP BY phase
            """)
            
            job_stats = {}
            for row in cursor.fetchall():
                job_stats[row[0]] = {
                    "count": row[1],
                    "success_rate": row[2]
                }
                
        return {
            "data_statistics": data_stats,
            "job_statistics": job_stats,
            "total_data_points": sum(stats["count"] for stats in data_stats.values()),
            "training_available": TRAINING_AVAILABLE
        }

# Global training pipeline instance
training_pipeline = None

def get_training_pipeline() -> ContinuousLearningPipeline:
    """Get global training pipeline instance"""
    global training_pipeline
    if training_pipeline is None:
        training_pipeline = ContinuousLearningPipeline()
    return training_pipeline